import * as categoryModel from "../models/categoryModel.js";

export const getCategories = async (req, res) => {
    try {
        const categories = await categoryModel.findAll();
        return res.status(200).json(categories);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const getCategory = async (req, res) => {
    try {
        const category = await categoryModel.findById(req.params.id);
        if (!category) return res.status(404).json({ error: "Category not found" });
        return res.status(200).json(category);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim().length < 2) {
            return res.status(400).json({ error: "Name is required (at least 2 characters)" });
        }
        const category = await categoryModel.create(req.body);
        return res.status(201).json(category);
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "Category already exists" });
        }
        return res.status(500).json({ error: "Server error" });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const category = await categoryModel.update(req.params.id, req.body);
        if (!category) return res.status(404).json({ error: "Category not found" });
        return res.status(200).json(category);
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "Category name already exists" });
        }
        return res.status(500).json({ error: "Server error" });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const deleted = await categoryModel.remove(req.params.id);
        if (!deleted) return res.status(404).json({ error: "Category not found" });
        return res.status(200).json({ message: "Category deleted" });
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};
