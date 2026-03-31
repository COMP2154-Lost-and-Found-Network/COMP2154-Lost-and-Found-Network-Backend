import request from "supertest";
import app from "../index.js";

describe("Auth API", () => {
    test("should return error for invalid login", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({
                email: "wrong@example.com",
                password: "wrongpass"
            });

        expect([400, 401, 404]).toContain(res.statusCode);
    });
});

test("should return 400 when email is missing", async () => {
    const res = await request(app)
        .post("/api/auth/login")
        .send({
            password: "123456"
        });

    expect([400, 401]).toContain(res.statusCode);
});