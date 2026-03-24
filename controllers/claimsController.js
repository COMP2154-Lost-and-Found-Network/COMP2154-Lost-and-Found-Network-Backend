import * as claimModel from "../models/claimModel.js";
import { updateItem } from "../models/itemModel.js";
import { notifyUsersOfApproval } from "./emailController.js"

export const createClaim = async (req, res) => {
    try {
        const { item_id, verification_details } = req.body;
        const claimant_id = req.user.id; // from JWT

        if (!item_id || !verification_details) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const existingClaim = await claimModel.findExistingClaim(item_id, claimant_id);

        if (existingClaim) {
            return res.status(400).json({ error: "You already have a pending claim for this item" });
        }

        const newClaim = await claimModel.create({
            item_id,
            claimant_id,
            verification_details,
            status: "pending"
        });

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

        // only allow valid statuses
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

        const updatedClaim = await claimModel.updateStatus(id, status)

        if (status === "approved") {
            await updateItem(claim.item_id, {status: "claimed"})
            await notifyUsersOfApproval(req.user.id, claim.claimant_id, claim.item_id);
        }

        return res.status(200).json(updatedClaim);

    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const getClaim = async (req, res) => {
    if (parseInt(req.query.claimant_id) !== req.user.id) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    try {
        const test = await claimModel.findByClaimantId(req.query.claimant_id);
        return res.status(200).json(test);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
}