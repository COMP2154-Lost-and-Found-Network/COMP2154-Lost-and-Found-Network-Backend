import pool from "../db.js";

export const findAll = async () => {
    const [rows] = await pool.query(
        "SELECT * FROM locations WHERE is_active = true ORDER BY display_name"
    );
    return rows;
};

export const findById = async (id) => {
    const [rows] = await pool.query(
        "SELECT * FROM locations WHERE id = ? AND is_active = true",
        [id]
    );
    return rows[0] || null;
};

export const create = async (location) => {
    const [result] = await pool.query(
        `INSERT INTO locations (campus, building_name, room_number, display_name)
         VALUES (?, ?, ?, ?)`,
        [location.campus, location.building_name, location.room_number ?? null, location.display_name]
    );
    const [rows] = await pool.query("SELECT * FROM locations WHERE id = ?", [result.insertId]);
    return rows[0];
};

export const update = async (id, location) => {
    const existing = await findById(id);
    if (!existing) return null;

    const updated = {
        campus: location.campus ?? existing.campus,
        building_name: location.building_name ?? existing.building_name,
        room_number: location.room_number !== undefined ? location.room_number : existing.room_number,
        display_name: location.display_name ?? existing.display_name,
    };

    await pool.query(
        `UPDATE locations SET campus = ?, building_name = ?, room_number = ?, display_name = ? WHERE id = ?`,
        [updated.campus, updated.building_name, updated.room_number, updated.display_name, id]
    );

    return findById(id);
};

export const remove = async (id) => {
    const [result] = await pool.query(
        "UPDATE locations SET is_active = false WHERE id = ? AND is_active = true",
        [id]
    );
    return result.affectedRows > 0;
};
