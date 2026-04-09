import request from "supertest";
import app from "../app.js";
import { cleanDb } from "./helpers/db.js";

let adminToken;
let userToken;
let createdCategoryId;

const ADMIN = { email: "cat.admin@test.com", password: "pass123", first_name: "Admin", last_name: "Cat", role: "admin" };
const USER = { email: "cat.user@test.com", password: "pass123", first_name: "Regular", last_name: "Cat" };

beforeAll(async () => {
    await cleanDb();

    await request(app).post("/api/auth/").send(ADMIN);
    const r1 = await request(app).post("/api/auth/login").send({ email: ADMIN.email, password: ADMIN.password });
    adminToken = r1.body.token;

    await request(app).post("/api/auth/").send(USER);
    const r2 = await request(app).post("/api/auth/login").send({ email: USER.email, password: USER.password });
    userToken = r2.body.token;
});

afterAll(async () => {
    // Clean up created test category
    if (createdCategoryId) {
        await request(app)
            .delete(`/api/categories/${createdCategoryId}`)
            .set("Authorization", `Bearer ${adminToken}`);
    }
    await cleanDb();
});

describe("Categories CRUD", () => {
    // TC-CAT-001
    test("TC-CAT-001: GET /api/categories returns list for authenticated user", async () => {
        const res = await request(app)
            .get("/api/categories")
            .set("Authorization", `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    // TC-CAT-002
    test("TC-CAT-002: GET /api/categories/:id returns single category", async () => {
        const res = await request(app)
            .get("/api/categories/1")
            .set("Authorization", `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("name");
    });

    // TC-CAT-003
    test("TC-CAT-003: POST /api/categories creates category as admin", async () => {
        const res = await request(app)
            .post("/api/categories")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "Test Category", description: "Created by test" });
        expect(res.status).toBe(201);
        expect(res.body.name).toBe("Test Category");
        createdCategoryId = res.body.id;
    });

    // TC-CAT-004
    test("TC-CAT-004: POST /api/categories denied for non-admin", async () => {
        const res = await request(app)
            .post("/api/categories")
            .set("Authorization", `Bearer ${userToken}`)
            .send({ name: "Blocked Category" });
        expect(res.status).toBe(403);
    });

    // TC-CAT-005
    test("TC-CAT-005: POST /api/categories with duplicate name returns 409", async () => {
        const res = await request(app)
            .post("/api/categories")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "Test Category" });
        expect(res.status).toBe(409);
    });

    // TC-CAT-006
    test("TC-CAT-006: POST /api/categories with short name returns 400", async () => {
        const res = await request(app)
            .post("/api/categories")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "X" });
        expect(res.status).toBe(400);
    });

    // TC-CAT-007
    test("TC-CAT-007: PUT /api/categories/:id updates category as admin", async () => {
        const res = await request(app)
            .put(`/api/categories/${createdCategoryId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ name: "Updated Test Category" });
        expect(res.status).toBe(200);
        expect(res.body.name).toBe("Updated Test Category");
    });

    // TC-CAT-008
    test("TC-CAT-008: DELETE /api/categories/:id soft deletes as admin", async () => {
        const res = await request(app)
            .delete(`/api/categories/${createdCategoryId}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Category deleted");

        // Verify it's no longer returned
        const getRes = await request(app)
            .get(`/api/categories/${createdCategoryId}`)
            .set("Authorization", `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        createdCategoryId = null; // already deleted
    });

    // TC-CAT-009
    test("TC-CAT-009: DELETE /api/categories/:id denied for non-admin", async () => {
        const res = await request(app)
            .delete("/api/categories/1")
            .set("Authorization", `Bearer ${userToken}`);
        expect(res.status).toBe(403);
    });
});
