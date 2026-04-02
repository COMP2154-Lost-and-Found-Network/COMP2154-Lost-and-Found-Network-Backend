import pool from "../db.js";


const SAFE_COLUMNS_ITEMS = "i.id, i.user_id, i.type, i.title, i.description, i.location_details, i.date, i.status, c.name AS category, l.display_name AS location, img.image_url";

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

    const itemId = result.insertId;

    if (item.image_url) {
        await pool.query(
            `INSERT INTO images (item_id, image_url) VALUES (?, ?)`,
            [itemId, item.image_url]
        );
    }

    const [rows] = await pool.query("SELECT * FROM items WHERE id = ?", [itemId]);
    return rows.length ? mapItem(rows[0]) : null;
}

export const getItem = async (id) => {
    const query = `SELECT i.*, c.name AS category, l.display_name AS location, img.image_url
                   FROM items AS i
                   LEFT JOIN categories AS c ON i.category_id = c.id
                   LEFT JOIN locations AS l ON i.location_id = l.id
                   LEFT JOIN images AS img ON img.item_id = i.id
                   WHERE i.id = ? AND i.is_deleted = false`;
    const [rows] = await pool.query(query, [id]);
    return rows[0];
}

export const updateItem = async (id, item) => {
    const existing = await getItem(id);
    const update = {
        title: item.title ?? existing.title,
        description: item.description ?? existing.description,
        location_id: item.location_id ?? existing.location_id,
        location_details: item.location ?? existing.location_details,
        date: item.date ?? existing.date,
        status: item.status ?? existing.status,
    }
    if (isNaN(Date.parse(update.date))) throw new TypeError("Invalid Date");
    const query = `UPDATE items
                   SET title            = ?,
                       description      = ?,
                       location_id      = ?,
                       location_details = ?,
                       date             = ?,
                       status           = ?
                   WHERE id = ?`;
    await pool.query(query, [update.title, update.description, update.location_id, update.location_details, update.date, update.status, id]);

    if (item.image_url) {
        await pool.query(`DELETE FROM images WHERE item_id = ?`, [id]);
        await pool.query(`INSERT INTO images (item_id, image_url) VALUES (?, ?)`, [id, item.image_url]);
    }

    return getItem(id);
}

export const deleteItem = async (id) => {
    const [result] = await pool.query(
        `UPDATE items SET is_deleted = true WHERE id = ? AND is_deleted = false`,
        [id]
    );
    if (result.affectedRows === 0) throw new Error("Item not found");
    return result;
}

export const getItems = async (params = {}) => {
    const conditions = [];
    const values = [];

    if (params.user_id) {
        conditions.push("i.user_id = ?");
        values.push(params.user_id);
    }
    if (params.category) {
        conditions.push("c.name LIKE ?");
        values.push(`%${params.category}%`);
    }
    if (params.location) {
        conditions.push("l.display_name LIKE ?");
        values.push(`%${params.location}%`);
    }
    if (params.status) {
        conditions.push("i.status = ?");
        values.push(params.status);
    }
    if (params.title) {
        conditions.push("i.title LIKE ?");
        values.push(`%${params.title}%`);
    }
    if (params.description) {
        conditions.push("i.description LIKE ?");
        values.push(`%${params.description}%`);
    }

    conditions.push("i.is_deleted = false");
    const whereClause = " WHERE " + conditions.join(" AND ");

    const baseQuery = `FROM items AS i
                       LEFT JOIN categories AS c ON i.category_id = c.id
                       LEFT JOIN locations AS l ON i.location_id = l.id
                       LEFT JOIN images AS img ON img.item_id = i.id` + whereClause;

    const [countResult] = await pool.query(`SELECT COUNT(*) AS total ${baseQuery}`, values);
    const total = countResult[0].total;

    const page = Math.max(parseInt(params.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(params.limit) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const [items] = await pool.query(
        `SELECT ${SAFE_COLUMNS_ITEMS} ${baseQuery} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
        [...values, limit, offset]
    );

    return {
        data: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
}

export const findById = async (id) => {
    const [rows] = await pool.query(
        "SELECT * FROM items WHERE id = ? AND is_deleted = false",
        [id]
    );
    return rows[0] || null;
};