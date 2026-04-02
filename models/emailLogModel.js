import pool from "../db.js";

export const createEmailLog = async ({ user_id, email_type, reference_id, sent_to }) => {
    const [result] = await pool.query(
        `INSERT INTO email_logs (user_id, email_type, reference_id, sent_to, status)
         VALUES (?, ?, ?, ?, 'sent')`,
        [user_id, email_type, reference_id, sent_to]
    );

    return result.insertId;
};