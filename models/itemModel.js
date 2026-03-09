import pool from "../db.js";

const mapItem = (row) => ({
    id: row.id,
    user_id: row.user_id,
    category_id: row.category_id,
    location_id: row.location_id,
    type: row.type,
    title: row.title,
    description: row.description,
    location_details: row.location_details,
    date: row.date,
    status: row.status,
    is_deleted: !!row.is_deleted,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

export async function create(item) {
    const [result] = await pool.query(
        `INSERT INTO items
      (user_id, category_id, location_id, type, title, description, location_details, date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            item.user_id,
            item.category_id,
            item.location_id,
            item.type,
            item.title,
            item.description,
            item.location_details ?? null,
            item.date,
            item.status ?? "active",
        ]
    );

    const [rows] = await pool.query("SELECT * FROM items WHERE id = ?", [result.insertId]);
    return rows.length ? mapItem(rows[0]) : null;
}