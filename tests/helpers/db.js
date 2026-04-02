import pool from "../../db.js";

/**
 * Deletes all test data seeded by @test.com users.
 * Must be called in beforeAll and afterAll of each test suite.
 */
export async function cleanDb() {
    const conn = await pool.getConnection();
    try {
        await conn.query("SET FOREIGN_KEY_CHECKS = 0");
        await conn.query("DELETE FROM claims WHERE claimant_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')");
        await conn.query("DELETE FROM images WHERE item_id IN (SELECT id FROM items WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com'))");
        await conn.query("DELETE FROM items WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')");
        await conn.query("DELETE FROM users WHERE email LIKE '%@test.com'");
        await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    } finally {
        conn.release();
    }
}
