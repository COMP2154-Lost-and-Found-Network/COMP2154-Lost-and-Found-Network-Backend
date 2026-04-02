import request from "supertest";
import app from "../app.js";
import { cleanDb } from "./helpers/db.js";

let token;
let userId;
let userBToken;
let createdItemId;

const USER_A = {
    email: "items.userA@test.com",
    password: "password123",
    first_name: "Item",
    last_name: "UserA",
};

const USER_B = {
    email: "items.userB@test.com",
    password: "password123",
    first_name: "Item",
    last_name: "UserB",
};

// Seed data IDs from lost_and_found.sql
const CATEGORY_ID = 1; // Electronics
const LOCATION_ID = 1; // St. James – Building A

beforeAll(async () => {
    await cleanDb();

    await request(app).post("/api/auth/").send(USER_A);
    const loginA = await request(app)
        .post("/api/auth/login")
        .send({ email: USER_A.email, password: USER_A.password });
    token = loginA.body.token;
    userId = loginA.body.user.id;

    await request(app).post("/api/auth/").send(USER_B);
    const loginB = await request(app)
        .post("/api/auth/login")
        .send({ email: USER_B.email, password: USER_B.password });
    userBToken = loginB.body.token;
});

afterAll(async () => {
    await cleanDb();
});

const BASE_ITEM = () => ({
    user_id: userId,
    type: "lost",
    title: "Test Lost Wallet",
    description: "Black leather wallet lost near cafeteria",
    category_id: CATEGORY_ID,
    location_id: LOCATION_ID,
    date: "2026-03-01",
});

describe("Item Management", () => {
    // TC-ITEM-006
    test("TC-ITEM-006: no Authorization header returns 401", async () => {
        const res = await request(app).get("/api/items");
        expect(res.status).toBe(401);
    });

    // TC-ITEM-001
    test("TC-ITEM-001: create lost item returns 201 and saves to DB", async () => {
        const res = await request(app)
            .post("/api/items")
            .set("Authorization", `Bearer ${token}`)
            .send(BASE_ITEM());
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("id");
        createdItemId = res.body.id;
    });

    // TC-ITEM-003
    test("TC-ITEM-003: missing required field on item creation returns 400", async () => {
        const res = await request(app)
            .post("/api/items")
            .set("Authorization", `Bearer ${token}`)
            .send({ type: "lost", title: "No description" });
        expect(res.status).toBe(400);
    });

    // TC-ITEM-005
    test("TC-ITEM-005: invalid item type returns 400", async () => {
        const res = await request(app)
            .post("/api/items")
            .set("Authorization", `Bearer ${token}`)
            .send({ ...BASE_ITEM(), type: "stolen" });
        expect(res.status).toBe(400);
    });

    // TC-ITEM-013
    test("TC-ITEM-013: found item without image returns 400", async () => {
        const res = await request(app)
            .post("/api/items")
            .set("Authorization", `Bearer ${token}`)
            .send({ ...BASE_ITEM(), type: "found" }); // no image_url
        expect(res.status).toBe(400);
    });

    // TC-ITEM-004
    test("TC-ITEM-004: get item by valid ID returns 200 and correct data", async () => {
        const res = await request(app)
            .get(`/api/items/${createdItemId}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(createdItemId);
    });

    // TC-ITEM-007
    test("TC-ITEM-007: get all items returns 200 with paginated response", async () => {
        const res = await request(app)
            .get("/api/items")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body).toHaveProperty("total");
        expect(res.body).toHaveProperty("page");
        expect(res.body).toHaveProperty("limit");
        expect(res.body).toHaveProperty("totalPages");
    });

    // TC-ITEM-011
    test("TC-ITEM-011: filter items by category returns filtered list", async () => {
        const res = await request(app)
            .get(`/api/items?category=Electronics`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    // TC-ITEM-014
    test("TC-ITEM-014: pagination returns correct page and limit", async () => {
        const res = await request(app)
            .get("/api/items?page=1&limit=2")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.page).toBe(1);
        expect(res.body.limit).toBe(2);
        expect(res.body.data.length).toBeLessThanOrEqual(2);
        expect(typeof res.body.total).toBe("number");
        expect(typeof res.body.totalPages).toBe("number");
    });

    // TC-ITEM-010
    test("TC-ITEM-010: update item returns 200", async () => {
        const res = await request(app)
            .put(`/api/items/${createdItemId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Updated Wallet Title" });
        expect(res.status).toBe(200);
    });

    // TC-ITEM-002
    test("TC-ITEM-002: update non-existent item returns 404", async () => {
        const res = await request(app)
            .put("/api/items/999999")
            .set("Authorization", `Bearer ${token}`)
            .send({ title: "Ghost Item" });
        expect(res.status).toBe(404);
    });

    // TC-ITEM-012
    test("TC-ITEM-012: user editing another user's item returns 403", async () => {
        const res = await request(app)
            .put(`/api/items/${createdItemId}`)
            .set("Authorization", `Bearer ${userBToken}`)
            .send({ title: "Unauthorized Edit" });
        expect(res.status).toBe(403);
    });

    // TC-ITEM-008
    test("TC-ITEM-008: create found item with image returns 201", async () => {
        const res = await request(app)
            .post("/api/items")
            .set("Authorization", `Bearer ${token}`)
            .send({ ...BASE_ITEM(), type: "found", image_url: "http://example.com/photo.jpg" });
        expect(res.status).toBe(201);
        expect(res.body.type).toBe("found");
    });

    // TC-ITEM-009 — delete last so item is available for prior tests
    test("TC-ITEM-009: delete item returns 200", async () => {
        const res = await request(app)
            .delete(`/api/items/${createdItemId}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    });
});
