import * as itemModel from "../models/itemModel.js";
import * as claimModel from "../models/claimModel.js";

export const updateItem = async (req, res) => {
    try {
        const existing = await itemModel.getItem(req.params.id);
        if (!existing) return res.status(404).json({ error: "Item not found" });
        const result = await itemModel.updateItem(req.params.id, req.body);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json(err);
    }
}

export const deleteItem = async (req, res) => {
    try {
        const existing = await itemModel.getItem(req.params.id);
        if (!existing) return res.status(404).json({ error: "Item not found" });
        await itemModel.deleteItem(req.params.id);
        res.status(200).json({ message: "Deleted item" });
    }
    catch (err) {
        return res.status(500).json(err);
    }
}

export const getItems = async (req, res) => {
    try {
        res.json(await itemModel.getItems(req.query));
    }
    catch (err) {
        return res.status(500).json(err);
    }
}

export const getStats = async (req, res) => {
    try {
        const itemStats = await itemModel.getItemStats()
        const claimStats = await claimModel.getClaimStats()
        const stats = {
            itemStats: itemStats,
            claimStats: claimStats
        }
        res.json(stats);
    }
    catch (err) {
        return res.status(500).json(err);
    }
}