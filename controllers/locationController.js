import * as locationModel from "../models/locationModel.js";

export const getLocations = async (req, res) => {
    try {
        const locations = await locationModel.findAll();
        return res.status(200).json(locations);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const getLocation = async (req, res) => {
    try {
        const location = await locationModel.findById(req.params.id);
        if (!location) return res.status(404).json({ error: "Location not found" });
        return res.status(200).json(location);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const createLocation = async (req, res) => {
    try {
        const { campus, building_name, display_name } = req.body;

        if (!campus || !building_name || !display_name) {
            return res.status(400).json({ error: "campus, building_name, and display_name are required" });
        }

        const location = await locationModel.create(req.body);
        return res.status(201).json(location);
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "Location already exists" });
        }
        return res.status(500).json({ error: "Server error" });
    }
};

export const updateLocation = async (req, res) => {
    try {
        const location = await locationModel.update(req.params.id, req.body);
        if (!location) return res.status(404).json({ error: "Location not found" });
        return res.status(200).json(location);
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};

export const deleteLocation = async (req, res) => {
    try {
        const deleted = await locationModel.remove(req.params.id);
        if (!deleted) return res.status(404).json({ error: "Location not found" });
        return res.status(200).json({ message: "Location deleted" });
    } catch (err) {
        return res.status(500).json({ error: "Server error" });
    }
};
