import pool from "../db.js";


const SAFE_COLUMNS_ITEMS = "i.id, i.user_id, i.type, i.title, i.description, i.location_details, i.date, i.status, c.name AS category, l.display_name AS location";

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

export const getItem = async (id) => {
    const query = `SELECT * FROM items WHERE id = ?`;
    const [item] = await pool.query(query, [id]);
    return item[0];
}

export const updateItem = async (id, item) => {
    const existing = await getItem(id);
    const update = {
        title: item.title ?? existing.title,
        description: item.description ?? existing.description,
        location_details: item.location ?? existing.location_details,
        date: item.date ?? existing.date,
        status: item.status ?? existing.status
    }
    if (isNaN(Date.parse(update.date))) throw new TypeError("Invalid Date");
    const query = `UPDATE items
                   SET title            = ?,
                       description      = ?,
                       location_details = ?,
                       date             = ?,
                       status           = ?
                   WHERE id = ?`;
    await pool.query(query, [update.title, update.description, update.location_details, update.date, update.status, id]);
    return getItem(id);
}

export const deleteItem = async (id) => {
    const query = `DELETE
                   FROM items
                   WHERE id = ?`;
    const result = await pool.query(query, [id]);
    if (result.affectedRows === 0) throw new Error("Item not found");
    return result;
}

export const getItems = async (params = {}) => {
    let filters = []
    if (params.user_id) filters.push("i.user_id = " + params.user_id);
    if (params.category) filters.push("c.name LIKE '%" + params.category + "%'");
    if (params.location) filters.push("l.display_name LIKE '%" + params.location + "%'");
    if (params.status) filters.push("i.status = " + params.status);
    if (params.title) filters.push("i.title LIKE '%" + params.title + "%'");
    if (params.description) filters.push("i.description LIKE '%" + params.description + "%'");
    filters = filters.join(" AND ")
    if (filters) filters = " WHERE " + filters
    const itemsQuery = `SELECT ${SAFE_COLUMNS_ITEMS}
                        FROM items AS i
                                 LEFT JOIN categories AS c ON i.category_id = c.id
                                 LEFT JOIN locations AS l on i.location_id = l.id` + filters
    const [items] = await pool.query(itemsQuery)
    return items;
}

export const findById = async (id) => {
    const [rows] = await pool.query(
        "SELECT * FROM items WHERE id = ? AND is_deleted = false",
        [id]
    );
    return rows[0] || null;
};