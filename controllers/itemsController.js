import * as itemModel from "../models/itemModel.js";

export const createItem = async (req, res) => {
    try {
        const {
            user_id,
            category_id,
            location_id,
            type,
            title,
            description,
            location_details,
            date,
        } = req.body;


        // TASK-2021: allow lost and found
        if (type !== "lost" && type !== "found") {
            return res.status(400).json({ error: "Type must be either lost or found" });
        }

        // TASK-2023: image required for found items
        if (type === "found" && !req.body.image_url) {
            return res.status(400).json({ error: "Image is required for found items" });
        }

        // TASK-2018: validation + error handling
        if (!user_id) {
            return res.status(400).json({ error: "User is required" });
        }

        if (!category_id) {
            return res.status(400).json({ error: "Category is required" });
        }

        if (!location_id) {
            return res.status(400).json({ error: "Location is required" });
        }

        if (!title || title.trim().length < 3) {
            return res.status(400).json({ error: "Title must be at least 3 characters" });
        }

        if (!description || description.trim().length < 5) {
            return res.status(400).json({ error: "Description must be at least 5 characters" });
        }

        if (!date || isNaN(Date.parse(date))) {
            return res.status(400).json({ error: "Valid date is required" });
        }

        const newItem = await itemModel.create({
            user_id,
            category_id,
            location_id,
            type,
            title,
            description,
            location_details,
            date,
            image_url: req.body.image_url ?? null,
            status: "active",
        });

        return res.status(201).json(newItem);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const getItem = async (req, res) => {
    try {
        res.status(200).json(await itemModel.getItem(req.params.id));
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
}

export const updateItem = async (req, res) => {
    try {
        const existing = await itemModel.getItem(req.params.id);
        if (!existing) return res.status(404).json({ error: "Item not found" });
        if (existing.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
        const result = await itemModel.updateItem(req.params.id, req.body);
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json(err);
    }
}

export const deleteItem = async (req, res) => {
    try {
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

export const getItemById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "Item id is required" });
        }

        const item = await itemModel.findById(id);

        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }

        return res.status(200).json(item);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};