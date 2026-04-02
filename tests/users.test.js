import request from "supertest";
import app from "../app.js";
import { cleanDb } from "./helpers/db.js";

let token;
let userId;

beforeAll(async () => {
    await cleanDb();
    await request(app).post("/api/auth/").send({
        email: "users.profile@test.com",
        password: "pass123",
        first_name: "Profile",
        last_name: "User",
    });
    const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "users.profile@test.com", password: "pass123" });
    token = loginRes.body.token;
    userId = loginRes.body.user.id;
});

afterAll(async () => {
    await cleanDb();
});

describe("User Profile", () => {
    // TC-USER-001
    test("TC-USER-001: GET /api/users/:id returns 200 and user profile", async () => {
        const res = await request(app)
            .get(`/api/users/${userId}`)
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(userId);
        expect(res.body).not.toHaveProperty("password_hash");
    });

    // TC-USER-002
    test("TC-USER-002: PUT /api/users/:id updates and returns updated profile", async () => {
        const res = await request(app)
            .put(`/api/users/${userId}`)
            .set("Authorization", `Bearer ${token}`)
            .send({ first_name: "Updated" });
        expect(res.status).toBe(200);
        expect(res.body.first_name).toBe("Updated");
    });

    // TC-USER-003
    test("TC-USER-003: GET /api/users/:id with non-existent ID returns 404", async () => {
        const res = await request(app)
            .get("/api/users/999999")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(404);
    });
});
