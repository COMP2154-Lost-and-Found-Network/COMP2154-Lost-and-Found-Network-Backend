import * as claimModel from "../models/claimModel.js";

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