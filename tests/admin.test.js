import request from "supertest";
import app from "../app.js";
import { cleanDb } from "./helpers/db.js";

let adminToken;
let userToken;
let userId;
let itemId;

const ADMIN_USER = { email: "admin.test@test.com", password: "pass123", first_name: "Admin", last_name: "Tester", role: "admin" };
const REGULAR_USER = { email: "regular.test@test.com", password: "pass123", first_name: "Regular", last_name: "User" };

beforeAll(async () => {
    await cleanDb();

    await request(app).post("/api/auth/").send(ADMIN_USER);
    const r1 = await request(app).post("/api/auth/login").send({ email: ADMIN_USER.email, password: ADMIN_USER.password });
    adminToken = r1.body.token;

    await request(app).post("/api/auth/").send(REGULAR_USER);
    const r2 = await request(app).post("/api/auth/login").send({ email: REGULAR_USER.email, password: REGULAR_USER.password });
    userToken = r2.body.token;
    userId = r2.body.user.id;

    const itemRes = await request(app)
        .post("/api/items")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ user_id: userId, type: "lost", title: "Admin Test Item", description: "Testing admin endpoints", category_id: 1, location_id: 1, date: "2026-03-01" });
    itemId = itemRes.body.id;
});

afterAll(async () => {
    await cleanDb();
});

describe("Admin Endpoints", () => {
    // TC-ADMIN-001
    test("TC-ADMIN-001: GET /api/admin/stats returns stats for admin", async () => {
        const res = await request(app)
            .get("/api/admin/stats")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("itemStats");
        expect(res.body).toHaveProperty("claimStats");
        expect(res.body.itemStats).toHaveProperty("Total_Items");
        expect(res.body.claimStats).toHaveProperty("Total_Claims");
    });

    // TC-ADMIN-002
    test("TC-ADMIN-002: GET /api/admin/stats denied for non-admin", async () => {
        const res = await request(app)
            .get("/api/admin/stats")
            .set("Authorization", `Bearer ${userToken}`);
        expect(res.status).toBe(403);
    });

    // TC-ADMIN-003
    test("TC-ADMIN-003: GET /api/admin/items returns all items for admin", async () => {
        const res = await request(app)
            .get("/api/admin/items")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("data");
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    // TC-ADMIN-004
    test("TC-ADMIN-004: PUT /api/admin/item/:id updates item as admin", async () => {
        const res = await request(app)
            .put(`/api/admin/item/${itemId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ title: "Updated by Admin" });
        expect(res.status).toBe(200);
        expect(res.body.title).toBe("Updated by Admin");
    });

    // TC-ADMIN-005
    test("TC-ADMIN-005: DELETE /api/admin/item/:id soft deletes item as admin", async () => {
        const res = await request(app)
            .delete(`/api/admin/item/${itemId}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Deleted item");

        // Verify item is no longer visible
        const getRes = await request(app)
            .get(`/api/items/${itemId}`)
            .set("Authorization", `Bearer ${userToken}`);
        expect(getRes.body).toBeFalsy();
    });

    // TC-ADMIN-006
    test("TC-ADMIN-006: non-admin cannot access admin item endpoints", async () => {
        const res = await request(app)
            .get("/api/admin/items")
            .set("Authorization", `Bearer ${userToken}`);
        expect(res.status).toBe(403);
    });
});
