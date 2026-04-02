import pool from "../db.js";
import { findById as findUser } from "./userModel.js";
import { findById as findItem } from "./itemModel.js";
import { sendEmail } from "../controllers/emailController.js";

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
    let query = "UPDATE claims SET status = ?, reviewed_at = NOW()"
    query += status === "approved" ? ", contact_shared_at = NOW()" : "";
    query += " WHERE id = ?"
    const [result] = await pool.query(query, [status, id]);

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

export const findDetailById = async (id) => {
    const [rows] = await pool.query(
        `SELECT c.*,
                CASE WHEN c.status = 'approved' THEN u.email ELSE NULL END AS claimant_email,
                CASE WHEN c.status = 'approved' THEN r.email ELSE NULL END AS reporter_email
         FROM claims AS c
         JOIN users AS u ON c.claimant_id = u.id
         JOIN items AS i ON c.item_id = i.id
         JOIN users AS r ON i.user_id = r.id
         WHERE c.id = ?`,
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

export const findByClaimantId = async (claimant_id) => {
    const [rows] = await pool.query(
        "SELECT * FROM claims WHERE claimant_id = ?",
        [claimant_id]
    );
    return rows || null;
}

export const findByItemOwnerId = async (owner_id) => {
    const [rows] = await pool.query(
        `SELECT c.*, i.title AS item_title, i.type AS item_type, u.first_name AS claimant_first_name, u.last_name AS claimant_last_name
         FROM claims AS c
         JOIN items AS i ON c.item_id = i.id
         JOIN users AS u ON c.claimant_id = u.id
         WHERE i.user_id = ? AND i.is_deleted = false
         ORDER BY c.created_at DESC`,
        [owner_id]
    );
    return rows;
}

export const withdrawClaim = async (claim) => {
    const query = `DELETE
                   FROM claims
                   WHERE id = ?`;
    const result = await pool.query(query, [claim.id]);
    if (result.affectedRows === 0) throw new Error("Claim not found");
    await notifyWithdrawal(claim)
    return result;
}

export const assignClaim = async (id, assigned_to_user_id) => {
    const [result] = await pool.query(
        "UPDATE claims SET assigned_to_user_id = ? WHERE id = ?",
        [assigned_to_user_id, id]
    );

    if (result.affectedRows === 0) return null;

    const [rows] = await pool.query(
        "SELECT * FROM claims WHERE id = ?",
        [id]
    );

    return rows[0] || null;
};


export const notifyApproval = async (user_id, claim) => {
    const user = await findUser(user_id);
    const claimant = await findUser(claim.claimant_id);
    const item = await findItem(claim.item_id);
    const user_message = `
        <p>Hello ${user.first_name}</p>
        <p>We are reaching out to you regarding your found item, ${item.title}.</p>
        <p>It has been flagged in our system as having an approved claim</p>
        <p>You can contact the owner of the item at ${claimant.email}</p>
    `;
    await sendEmail(user.email, "Found Item Claim Approved", user_message);
    const claimant_message = `
        <p>Hello ${claimant.first_name}</p>
        <p>We are reaching out to you regarding your lost item, ${item.title}.</p>
        <p>Your claim to this item has been flagged as approved</p>
        <p>You can contact the finder of the item at ${user.email}</p>
    `;
    await sendEmail(claimant.email, "Lost Item Claim Approved", claimant_message);
}

export const notifyWithdrawal = async (claim) => {
    const claimant = await findUser(claim.claimant_id);
    const item = await findItem(claim.item_id);
    const finder = await findUser(item.user_id);
    const claimant_message = `
        <p>Hello ${claimant.first_name}</p>
        <p>We are reaching out to you regarding your lost item, ${item.title}.</p>
        <p>It has been flagged in our system as having the claim withdrawn.</p>
        <p>If you did not withdraw the claim please contact our admin team.</p>
    `;
    await sendEmail(claimant.email, "Lost Item Claim Withdrawn", claimant_message);
    const finder_message = `
        <p>Hello ${finder.first_name}</p>
        <p>A claim on your item, ${item.title}, has been withdrawn by the claimant.</p>
        <p>The item is still listed and open for other claims.</p>
    `;
    await sendEmail(finder.email, "Claim Withdrawn on Your Item", finder_message);
}