import pool from "../db.js";

export const findAll = async () => {
    const [rows] = await pool.query(
        "SELECT * FROM categories WHERE is_active = true ORDER BY name"
    );
    return rows;
};

export const findById = async (id) => {
    const [rows] = await pool.query(
        "SELECT * FROM categories WHERE id = ? AND is_active = true",
        [id]
    );
    return rows[0] || null;
};

export const create = async (category) => {
    const [result] = await pool.query(
        "INSERT INTO categories (name, description) VALUES (?, ?)",
        [category.name, category.description ?? null]
    );
    const [rows] = await pool.query("SELECT * FROM categories WHERE id = ?", [result.insertId]);
    return rows[0];
};

export const update = async (id, category) => {
    const existing = await findById(id);
    if (!existing) return null;

    const updated = {
        name: category.name ?? existing.name,
        description: category.description !== undefined ? category.description : existing.description,
    };

    await pool.query(
        "UPDATE categories SET name = ?, description = ? WHERE id = ?",
        [updated.name, updated.description, id]
    );

    return findById(id);
};

export const remove = async (id) => {
    const [result] = await pool.query(
        "UPDATE categories SET is_active = false WHERE id = ? AND is_active = true",
        [id]
    );
    return result.affectedRows > 0;
};
