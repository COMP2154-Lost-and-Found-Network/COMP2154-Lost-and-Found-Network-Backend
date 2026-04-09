import * as claimModel from "../models/claimModel.js";
import { updateItem } from "../models/itemModel.js";
import { sendEmail } from "./emailController.js";
import { createEmailLog } from "../models/emailLogModel.js";
import pool from "../db.js";

const sendResolutionNotification = async (claimId, status) => {
    const [rows] = await pool.query(
        `SELECT c.*, u.email AS claimant_email, u.first_name AS claimant_first_name,
                i.title AS item_title, i.type AS item_type, i.user_id AS reporter_id,
                r.email AS reporter_email, r.first_name AS reporter_first_name
         FROM claims c
         JOIN users u ON c.claimant_id = u.id
         JOIN items i ON c.item_id = i.id
         JOIN users r ON i.user_id = r.id
         WHERE c.id = ?`,
        [claimId]
    );

    const claim = rows[0];

    if (!claim) return;

    if (status !== "approved" && status !== "rejected") return;

    // item_type determines roles:
    // "found" item → reporter is the finder, claimant is the owner
    // "lost" item  → reporter is the owner, claimant is the finder
    const isFoundItem = claim.item_type === "found";
    const reporterRole = isFoundItem ? "finder" : "owner";
    const claimantRole = isFoundItem ? "owner" : "finder";

    // notify claimant
    const claimantSubject =
        status === "approved"
            ? "Your claim has been approved"
            : "Your claim has been rejected";

    const claimantBody = status === "approved"
        ? `<p>Hello ${claim.claimant_first_name}</p>
           <p>Your claim for <b>${claim.item_title}</b> has been <b>approved</b>.</p>
           <p>You can contact the ${reporterRole} at ${claim.reporter_email}</p>`
        : `<p>Hello ${claim.claimant_first_name}</p>
           <p>Your claim for <b>${claim.item_title}</b> has been <b>rejected</b>.</p>`;

    await sendEmail(claim.claimant_email, claimantSubject, claimantBody);

    await createEmailLog({
        user_id: claim.claimant_id,
        email_type: status === "approved" ? "claim_approved" : "claim_rejected",
        reference_id: claim.id,
        sent_to: claim.claimant_email
    });

    // notify item reporter on approval
    if (status === "approved") {
        const reporterBody = `
            <p>Hello ${claim.reporter_first_name}</p>
            <p>A claim on your item, <b>${claim.item_title}</b>, has been approved.</p>
            <p>You can contact the ${claimantRole} at ${claim.claimant_email}</p>`;

        await sendEmail(claim.reporter_email, "Claim Approved on Your Item", reporterBody);

        await createEmailLog({
            user_id: claim.reporter_id,
            email_type: "claim_approved",
            reference_id: claim.id,
            sent_to: claim.reporter_email
        });
    }
};

export const createClaim = async (req, res) => {
    try {
        const { item_id, verification_details } = req.body;
        const claimant_id = req.user.id;

        if (!item_id || !verification_details) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const existingClaim = await claimModel.findExistingClaim(item_id, claimant_id);

        if (existingClaim) {
            return res.status(400).json({ error: "You already have a pending claim for this item" });
        }

        // Check for existing pending claims — auto-escalate if disputed
        const existingPending = await claimModel.findPendingClaimsForItem(item_id);

        const newClaim = await claimModel.create({
            item_id,
            claimant_id,
            verification_details,
            status: existingPending.length > 0 ? "escalated" : "pending"
        });

        // Auto-escalate: if there were pending claims, escalate them too
        if (existingPending.length > 0) {
            await claimModel.escalateClaimsForItem(item_id);
        }

        // Notify item owner about the new claim
        try {
            const [rows] = await pool.query(
                `SELECT i.title AS item_title, i.type AS item_type,
                        r.id AS reporter_id, r.email AS reporter_email, r.first_name AS reporter_first_name,
                        u.first_name AS claimant_first_name, u.last_name AS claimant_last_name
                 FROM items i
                 JOIN users r ON i.user_id = r.id
                 JOIN users u ON u.id = ?
                 WHERE i.id = ?`,
                [claimant_id, item_id]
            );
            const info = rows[0];
            if (info) {
                const body = `
                    <p>Hello ${info.reporter_first_name},</p>
                    <p>A new claim has been submitted on your item, <b>${info.item_title}</b>, by ${info.claimant_first_name} ${info.claimant_last_name}.</p>
                    <p>Please review the claim in your inbox.</p>`;
                await sendEmail(info.reporter_email, "New Claim on Your Item", body);
                await createEmailLog({
                    user_id: info.reporter_id,
                    email_type: "claim_submitted",
                    reference_id: newClaim.id,
                    sent_to: info.reporter_email
                });
            }
        } catch (emailErr) {
            console.error("Claim notification error:", emailErr.message);
        }

        return res.status(201).json(newClaim);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const updateClaimStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!id || !status) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ error: "Invalid status value" });
        }

        const claim = await claimModel.findById(id);

        if (!claim) {
            return res.status(404).json({ error: "Claim not found" });
        }

        // TASK-3026: only one approved claim per item
        if (status === "approved") {
            const existingApproved = await claimModel.findApprovedClaimForItem(claim.item_id);

            if (existingApproved) {
                return res.status(400).json({ error: "An item can only have one approved claim" });
            }
        }

        const updatedClaim = await claimModel.updateStatus(id, status);

        if (status === "approved") {
            await updateItem(claim.item_id, { status: "claimed" });
        }

        // TASK-4045: notifications on resolution
        try {
            await sendResolutionNotification(id, status);
        } catch (emailErr) {
            console.error("Notification error:", emailErr.message);
        }

        return res.status(200).json(updatedClaim);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const getClaim = async (req, res) => {
    if (parseInt(req.query.claimant_id) !== req.user.id && req.user.role !== "admin") {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    try {
        const claim = await claimModel.findByClaimantId(req.query.claimant_id);
        return res.status(200).json(claim);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const getClaimsInbox = async (req, res) => {
    try {
        const claims = await claimModel.findByItemOwnerId(req.user.id);
        return res.status(200).json(claims);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
}

export const getClaimById = async (req, res) => {
    try {
        const claim = await claimModel.findDetailById(req.params.id);
        if (!claim) {
            return res.status(404).json({ error: "Claim not found" });
        }

        // Allow: claimant, item owner, or admin
        const isClaimant = claim.claimant_id === req.user.id;
        const isAdmin = req.user.role === "admin";
        let isItemOwner = false;
        if (!isClaimant && !isAdmin) {
            const [rows] = await pool.query(
                "SELECT user_id FROM items WHERE id = ?",
                [claim.item_id]
            );
            isItemOwner = rows[0]?.user_id === req.user.id;
        }

        if (!isClaimant && !isItemOwner && !isAdmin) {
            return res.status(403).json({ error: "Forbidden" });
        }

        return res.status(200).json(claim);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
}

export const withdrawClaim = async (req, res) => {
    try {
        const claim = await claimModel.findById(req.params.id);

        if (!claim) {
            return res.status(404).json({ error: "Claim not found" });
        }

        if (claim.claimant_id !== req.user.id && req.user.role !== "admin") {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        await claimModel.withdrawClaim(claim);
        return res.status(200).json("Claim withdrawn successfully");
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const escalateClaim = async (req, res) => {
    try {
        const claim = await claimModel.findById(req.params.id);
        if (!claim) return res.status(404).json({ error: "Claim not found" });
        if (claim.status !== "pending") {
            return res.status(400).json({ error: "Only pending claims can be escalated" });
        }

        const escalated = await claimModel.escalateClaim(req.params.id);

        // Notify claimant about escalation
        try {
            const [rows] = await pool.query(
                `SELECT u.email, u.first_name, i.title AS item_title
                 FROM claims c
                 JOIN users u ON c.claimant_id = u.id
                 JOIN items i ON c.item_id = i.id
                 WHERE c.id = ?`,
                [req.params.id]
            );
            const info = rows[0];
            if (info) {
                await sendEmail(info.email, "Your Claim Has Been Escalated", `
                    <p>Hello ${info.first_name},</p>
                    <p>Your claim for <b>${info.item_title}</b> has been escalated for admin review due to a dispute.</p>
                    <p>An administrator will review and resolve this shortly.</p>`);
                await createEmailLog({
                    user_id: claim.claimant_id,
                    email_type: "dispute_escalated",
                    reference_id: claim.id,
                    sent_to: info.email
                });
            }
        } catch (emailErr) {
            console.error("Escalation notification error:", emailErr.message);
        }

        return res.status(200).json(escalated);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const getEscalatedClaims = async (req, res) => {
    try {
        const claims = await claimModel.findEscalatedClaims();
        return res.status(200).json(claims);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const resolveDispute = async (req, res) => {
    try {
        const { approved_claim_id, reporter_feedback } = req.body;

        if (!approved_claim_id) {
            return res.status(400).json({ error: "approved_claim_id is required" });
        }

        const claim = await claimModel.findById(approved_claim_id);
        if (!claim) return res.status(404).json({ error: "Claim not found" });
        if (claim.status !== "escalated") {
            return res.status(400).json({ error: "Only escalated claims can be resolved" });
        }

        const resolved = await claimModel.resolveClaim(claim.item_id, approved_claim_id, reporter_feedback || null);
        await updateItem(claim.item_id, { status: "claimed" });

        // Notify all parties
        try {
            await sendResolutionNotification(approved_claim_id, "approved");

            // Notify rejected claimants
            const [rejected] = await pool.query(
                `SELECT c.id, c.claimant_id, u.email, u.first_name, i.title AS item_title
                 FROM claims c
                 JOIN users u ON c.claimant_id = u.id
                 JOIN items i ON c.item_id = i.id
                 WHERE c.item_id = ? AND c.id != ? AND c.status = 'rejected'`,
                [claim.item_id, approved_claim_id]
            );
            for (const r of rejected) {
                await sendEmail(r.email, "Dispute Resolved — Claim Rejected", `
                    <p>Hello ${r.first_name},</p>
                    <p>The dispute for <b>${r.item_title}</b> has been resolved by an administrator.</p>
                    <p>Unfortunately, your claim was not approved.</p>`);
                await createEmailLog({
                    user_id: r.claimant_id,
                    email_type: "claim_rejected",
                    reference_id: r.id,
                    sent_to: r.email
                });
            }
        } catch (emailErr) {
            console.error("Resolution notification error:", emailErr.message);
        }

        return res.status(200).json(resolved);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const assignClaim = async (req, res) => {
    try {
        const { id } = req.params;
        const { assigned_to_user_id } = req.body;

        if (!id || !assigned_to_user_id) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const updated = await claimModel.assignClaim(id, assigned_to_user_id);

        if (!updated) {
            return res.status(404).json({ error: "Claim not found" });
        }

        return res.status(200).json(updated);

    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};