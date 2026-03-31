import pool from "../db.js";

export const getAll = async () => {
    const [rows] = await pool.query("SELECT * FROM locations");
    return rows;
};

export const getById = async (id) => {
    const [rows] = await pool.query(
        "SELECT * FROM locations WHERE id = ?",
        [id]
    );
    return rows[0] || null;
};

export const create = async (location) => {
    const [result] = await pool.query(
        `INSERT INTO locations (campus, building_name, room_number, display_name, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [
            location.campus,
            location.building_name,
            location.room_number ?? null,
            location.display_name,
            location.is_active ?? true
        ]
    );

    const [rows] = await pool.query(
        "SELECT * FROM locations WHERE id = ?",
        [result.insertId]
    );

    return rows[0] || null;
};

export const update = async (id, location) => {
    const existing = await getById(id);

    if (!existing) return null;

    const updatedLocation = {
        campus: location.campus ?? existing.campus,
        building_name: location.building_name ?? existing.building_name,
        room_number: location.room_number ?? existing.room_number,
        display_name: location.display_name ?? existing.display_name,
        is_active: location.is_active ?? existing.is_active
    };

    await pool.query(
        `UPDATE locations
         SET campus = ?, building_name = ?, room_number = ?, display_name = ?, is_active = ?
         WHERE id = ?`,
        [
            updatedLocation.campus,
            updatedLocation.building_name,
            updatedLocation.room_number,
            updatedLocation.display_name,
            updatedLocation.is_active,
            id
        ]
    );

    return await getById(id);
};

export const remove = async (id) => {
    const [result] = await pool.query(
        "DELETE FROM locations WHERE id = ?",
        [id]
    );
    return result.affectedRows > 0;
};