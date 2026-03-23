import pool from "../db.js";

export const create = async (claim) => {
    const [result] = await pool.query(
        `INSERT INTO claims (item_id, claimant_id, verification_details, status)
         VALUES (?, ?, ?, ?)`,
        [
            claim.item_id,
            claim.claimant_id,
            claim.verification_details,
            claim.status
        ]
    );

    const [rows] = await pool.query(
        "SELECT * FROM claims WHERE id = ?",
        [result.insertId]
    );

    return rows[0] || null;
};

export const findExistingClaim = async (item_id, claimant_id) => {
    const [rows] = await pool.query(
        "SELECT * FROM claims WHERE item_id = ? AND claimant_id = ? AND status = 'pending'",
        [item_id, claimant_id]
    );

    return rows[0];
};

export const updateStatus = async (id, status) => {
    const [result] = await pool.query(
        "UPDATE claims SET status = ?, reviewed_at = NOW() WHERE id = ?",
        [status, id]
    );

    if (result.affectedRows === 0) return null;

    const [rows] = await pool.query(
        "SELECT * FROM claims WHERE id = ?",
        [id]
    );

    return rows[0] || null;
};

export const findById = async (id) => {
    const [rows] = await pool.query(
        "SELECT * FROM claims WHERE id = ?",
        [id]
    );
    return rows[0] || null;
};

export const findApprovedClaimForItem = async (item_id) => {
    const [rows] = await pool.query(
        "SELECT * FROM claims WHERE item_id = ? AND status = 'approved'",
        [item_id]
    );
    return rows[0] || null;
};