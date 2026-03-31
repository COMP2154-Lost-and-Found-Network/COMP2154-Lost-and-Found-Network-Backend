import request from "supertest";
import app from "../index.js";

describe("Item API", () => {
    test("should reject item creation without token", async () => {
        const res = await request(app)
            .post("/api/items")
            .send({
                user_id: 1,
                category_id: 1,
                location_id: 1,
                type: "lost",
                title: "Lost Phone",
                description: "Black iPhone",
                date: "2025-03-01"
            });

        expect([401, 403]).toContain(res.statusCode);
    });
});