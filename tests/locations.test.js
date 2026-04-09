import request from "supertest";
import app from "../app.js";
import { cleanDb } from "./helpers/db.js";

let adminToken;
let userToken;
let createdLocationId;

const ADMIN = { email: "loc.admin@test.com", password: "pass123", first_name: "Admin", last_name: "Loc", role: "admin" };
const USER = { email: "loc.user@test.com", password: "pass123", first_name: "Regular", last_name: "Loc" };

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
    if (createdLocationId) {
        await request(app)
            .delete(`/api/locations/${createdLocationId}`)
            .set("Authorization", `Bearer ${adminToken}`);
    }
    await cleanDb();
});

describe("Locations CRUD", () => {
    // TC-LOC-001
    test("TC-LOC-001: GET /api/locations returns list for authenticated user", async () => {
        const res = await request(app)
            .get("/api/locations")
            .set("Authorization", `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    // TC-LOC-002
    test("TC-LOC-002: GET /api/locations/:id returns single location", async () => {
        const res = await request(app)
            .get("/api/locations/1")
            .set("Authorization", `Bearer ${userToken}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("display_name");
    });

    // TC-LOC-003
    test("TC-LOC-003: POST /api/locations creates location as admin", async () => {
        const res = await request(app)
            .post("/api/locations")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ campus: "St. James", building_name: "Test Building", room_number: "T101", display_name: "St. James – Test Building T101" });
        expect(res.status).toBe(201);
        expect(res.body.display_name).toBe("St. James – Test Building T101");
        createdLocationId = res.body.id;
    });

    // TC-LOC-004
    test("TC-LOC-004: POST /api/locations denied for non-admin", async () => {
        const res = await request(app)
            .post("/api/locations")
            .set("Authorization", `Bearer ${userToken}`)
            .send({ campus: "Casa Loma", building_name: "Blocked", display_name: "Blocked Location" });
        expect(res.status).toBe(403);
    });

    // TC-LOC-005
    test("TC-LOC-005: POST /api/locations with missing fields returns 400", async () => {
        const res = await request(app)
            .post("/api/locations")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ campus: "St. James" }); // missing building_name and display_name
        expect(res.status).toBe(400);
    });

    // TC-LOC-006
    test("TC-LOC-006: POST /api/locations with duplicate returns 409", async () => {
        const res = await request(app)
            .post("/api/locations")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ campus: "St. James", building_name: "Test Building", room_number: "T101", display_name: "Duplicate" });
        expect(res.status).toBe(409);
    });

    // TC-LOC-007
    test("TC-LOC-007: PUT /api/locations/:id updates location as admin", async () => {
        const res = await request(app)
            .put(`/api/locations/${createdLocationId}`)
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ display_name: "St. James – Updated Test Building" });
        expect(res.status).toBe(200);
        expect(res.body.display_name).toBe("St. James – Updated Test Building");
    });

    // TC-LOC-008
    test("TC-LOC-008: DELETE /api/locations/:id soft deletes as admin", async () => {
        const res = await request(app)
            .delete(`/api/locations/${createdLocationId}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Location deleted");

        // Verify it's no longer returned
        const getRes = await request(app)
            .get(`/api/locations/${createdLocationId}`)
            .set("Authorization", `Bearer ${userToken}`);
        expect(getRes.status).toBe(404);
        createdLocationId = null;
    });

    // TC-LOC-009
    test("TC-LOC-009: DELETE /api/locations/:id denied for non-admin", async () => {
        const res = await request(app)
            .delete("/api/locations/1")
            .set("Authorization", `Bearer ${userToken}`);
        expect(res.status).toBe(403);
    });
});
