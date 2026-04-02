import request from "supertest";
import app from "../app.js";
import { cleanDb } from "./helpers/db.js";

const TEST_USER = {
    email: "auth.user@test.com",
    password: "password123",
    first_name: "Auth",
    last_name: "User",
};

beforeAll(async () => {
    await cleanDb();
    // Pre-register user so login tests have a valid account
    await request(app).post("/api/auth/").send(TEST_USER);
});

afterAll(async () => {
    await cleanDb();
});

describe("Authentication", () => {
    // TC-AUTH-001
    test("TC-AUTH-001: successful login returns 200 and JWT token", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: TEST_USER.email, password: TEST_USER.password });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("token");
        expect(res.body).toHaveProperty("user");
    });

    // TC-AUTH-002
    test("TC-AUTH-002: successful registration returns 201 and user object", async () => {
        const res = await request(app)
            .post("/api/auth/")
            .send({
                email: "auth.new@test.com",
                password: "password123",
                first_name: "New",
                last_name: "User",
            });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("id");
        expect(res.body).not.toHaveProperty("password_hash");
    });

    // TC-AUTH-003
    test("TC-AUTH-003: login with incorrect password returns 401", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: TEST_USER.email, password: "wrongpassword" });
        expect(res.status).toBe(401);
    });

    // TC-AUTH-004
    test("TC-AUTH-004: registration with missing required field returns 400", async () => {
        const res = await request(app)
            .post("/api/auth/")
            .send({ email: "missing@test.com", password: "password123" }); // missing first_name, last_name
        expect(res.status).toBe(400);
    });

    // TC-AUTH-005
    test("TC-AUTH-005: logout with valid token returns 200", async () => {
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: TEST_USER.email, password: TEST_USER.password });
        const token = loginRes.body.token;

        const res = await request(app)
            .post("/api/auth/logout")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    });

    // TC-AUTH-006
    test("TC-AUTH-006: duplicate email registration returns 409", async () => {
        const res = await request(app)
            .post("/api/auth/")
            .send(TEST_USER); // already registered in beforeAll
        expect(res.status).toBe(409);
    });

    // TC-AUTH-007
    test("TC-AUTH-007: invalid token on protected route returns 401", async () => {
        const res = await request(app)
            .get("/api/items")
            .set("Authorization", "Bearer invalidtoken123");
        expect([401, 403]).toContain(res.status);
    });

    // TC-AUTH-008
    test("TC-AUTH-008: reusing blacklisted token after logout returns 401", async () => {
        const loginRes = await request(app)
            .post("/api/auth/login")
            .send({ email: TEST_USER.email, password: TEST_USER.password });
        const token = loginRes.body.token;

        await request(app)
            .post("/api/auth/logout")
            .set("Authorization", `Bearer ${token}`);

        const res = await request(app)
            .get("/api/items")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(401);
    });
});
