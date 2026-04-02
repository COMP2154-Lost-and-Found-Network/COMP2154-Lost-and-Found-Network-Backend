import request from "supertest";
import app from "../app.js";
import { cleanDb } from "./helpers/db.js";

let token;

// Minimal valid JPEG bytes (SOI + APP0 + EOI markers)
const VALID_JPEG = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

beforeAll(async () => {
    await cleanDb();
    await request(app).post("/api/auth/").send({
        email: "upload.user@test.com",
        password: "pass123",
        first_name: "Upload",
        last_name: "User",
    });
    const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "upload.user@test.com", password: "pass123" });
    token = loginRes.body.token;
});

afterAll(async () => {
    await cleanDb();
});

describe("Image Upload", () => {
    // TC-IMG-002
    test("TC-IMG-002: upload with no file returns 400", async () => {
        const res = await request(app)
            .post("/api/upload")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(400);
    });

    // TC-IMG-003
    test("TC-IMG-003: upload invalid file type (PDF) returns 400", async () => {
        const res = await request(app)
            .post("/api/upload")
            .set("Authorization", `Bearer ${token}`)
            .attach("image", Buffer.from("fake pdf content"), {
                filename: "test.pdf",
                contentType: "application/pdf",
            });
        expect(res.status).toBe(400);
    });

    // TC-IMG-004
    test("TC-IMG-004: upload file over 5MB returns 400", async () => {
        const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB
        const res = await request(app)
            .post("/api/upload")
            .set("Authorization", `Bearer ${token}`)
            .attach("image", largeBuffer, {
                filename: "large.jpg",
                contentType: "image/jpeg",
            });
        expect(res.status).toBe(400);
    });

    // TC-IMG-001
    test("TC-IMG-001: successful image upload returns 201 and URL", async () => {
        const res = await request(app)
            .post("/api/upload")
            .set("Authorization", `Bearer ${token}`)
            .attach("image", VALID_JPEG, {
                filename: "test.jpg",
                contentType: "image/jpeg",
            });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("url");
    });
});
