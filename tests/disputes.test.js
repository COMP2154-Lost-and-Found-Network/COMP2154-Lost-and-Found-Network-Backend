import request from "supertest";
import app from "../app.js";
import { cleanDb } from "./helpers/db.js";

let reporterToken;
let reporterId;
let claimantAToken;
let claimantBToken;
let adminToken;
let itemId;

const REPORTER = { email: "dispute.reporter@test.com", password: "pass123", first_name: "Reporter", last_name: "User" };
const CLAIMANT_A = { email: "dispute.claimantA@test.com", password: "pass123", first_name: "ClaimantA", last_name: "User" };
const CLAIMANT_B = { email: "dispute.claimantB@test.com", password: "pass123", first_name: "ClaimantB", last_name: "User" };
const ADMIN = { email: "dispute.admin@test.com", password: "pass123", first_name: "Admin", last_name: "Tester", role: "admin" };

const BASE_ITEM = (userId) => ({
    user_id: userId, type: "found", title: "Disputed Wallet", description: "Black leather wallet found in library",
    category_id: 3, location_id: 1, date: "2026-03-15", image_url: "http://example.com/wallet.jpg",
});

beforeAll(async () => {
    await cleanDb();

    await request(app).post("/api/auth/").send(REPORTER);
    const r1 = await request(app).post("/api/auth/login").send({ email: REPORTER.email, password: REPORTER.password });
    reporterToken = r1.body.token;
    reporterId = r1.body.user.id;

    await request(app).post("/api/auth/").send(CLAIMANT_A);
    const r2 = await request(app).post("/api/auth/login").send({ email: CLAIMANT_A.email, password: CLAIMANT_A.password });
    claimantAToken = r2.body.token;

    await request(app).post("/api/auth/").send(CLAIMANT_B);
    const r3 = await request(app).post("/api/auth/login").send({ email: CLAIMANT_B.email, password: CLAIMANT_B.password });
    claimantBToken = r3.body.token;

    await request(app).post("/api/auth/").send(ADMIN);
    const r4 = await request(app).post("/api/auth/login").send({ email: ADMIN.email, password: ADMIN.password });
    adminToken = r4.body.token;

    const itemRes = await request(app)
        .post("/api/items")
        .set("Authorization", `Bearer ${reporterToken}`)
        .send(BASE_ITEM(reporterId));
    itemId = itemRes.body.id;
});

afterAll(async () => {
    await cleanDb();
});

describe("Dispute Resolution Flow", () => {
    let claimAId;
    let claimBId;

    // TC-DISPUTE-001
    test("TC-DISPUTE-001: first claim on an item is pending", async () => {
        const res = await request(app)
            .post("/api/claims")
            .set("Authorization", `Bearer ${claimantAToken}`)
            .send({ item_id: itemId, verification_details: "It's my wallet, has my student ID inside" });
        expect(res.status).toBe(201);
        expect(res.body.status).toBe("pending");
        claimAId = res.body.id;
    });

    // TC-DISPUTE-002
    test("TC-DISPUTE-002: second claim auto-escalates both claims", async () => {
        const res = await request(app)
            .post("/api/claims")
            .set("Authorization", `Bearer ${claimantBToken}`)
            .send({ item_id: itemId, verification_details: "That's mine, has a photo of my dog in it" });
        expect(res.status).toBe(201);
        expect(res.body.status).toBe("escalated");
        claimBId = res.body.id;

        // Verify first claim was also escalated
        const claimARes = await request(app)
            .get(`/api/claims/${claimAId}`)
            .set("Authorization", `Bearer ${claimantAToken}`);
        expect(claimARes.body.status).toBe("escalated");
    });

    // TC-DISPUTE-003
    test("TC-DISPUTE-003: GET /api/claims/escalated returns escalated claims for admin", async () => {
        const res = await request(app)
            .get("/api/claims/escalated")
            .set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(2);
        expect(res.body.every(c => c.status === "escalated")).toBe(true);
    });

    // TC-DISPUTE-004
    test("TC-DISPUTE-004: GET /api/claims/escalated denied for non-admin", async () => {
        const res = await request(app)
            .get("/api/claims/escalated")
            .set("Authorization", `Bearer ${claimantAToken}`);
        expect(res.status).toBe(403);
    });

    // TC-DISPUTE-005
    test("TC-DISPUTE-005: POST /api/claims/resolve approves winner and rejects others", async () => {
        const res = await request(app)
            .post("/api/claims/resolve")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ approved_claim_id: claimAId, reporter_feedback: "Student ID matches" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("approved");

        // Verify loser was rejected
        const claimBRes = await request(app)
            .get(`/api/claims/${claimBId}`)
            .set("Authorization", `Bearer ${adminToken}`);
        expect(claimBRes.body.status).toBe("rejected");
    });

    // TC-DISPUTE-006
    test("TC-DISPUTE-006: item status changes to claimed after resolution", async () => {
        const res = await request(app)
            .get(`/api/items/${itemId}`)
            .set("Authorization", `Bearer ${reporterToken}`);
        expect(res.body.status).toBe("claimed");
    });

    // TC-DISPUTE-007
    test("TC-DISPUTE-007: POST /api/claims/resolve denied for non-admin", async () => {
        const res = await request(app)
            .post("/api/claims/resolve")
            .set("Authorization", `Bearer ${claimantAToken}`)
            .send({ approved_claim_id: claimAId });
        expect(res.status).toBe(403);
    });

    // TC-DISPUTE-008
    test("TC-DISPUTE-008: manual escalation of a pending claim", async () => {
        // Create a fresh item and claim
        const freshItem = await request(app)
            .post("/api/items")
            .set("Authorization", `Bearer ${reporterToken}`)
            .send({ ...BASE_ITEM(reporterId), title: "Another Wallet" });

        const freshClaim = await request(app)
            .post("/api/claims")
            .set("Authorization", `Bearer ${claimantAToken}`)
            .send({ item_id: freshItem.body.id, verification_details: "Manual escalation test" });
        expect(freshClaim.body.status).toBe("pending");

        const res = await request(app)
            .put(`/api/claims/${freshClaim.body.id}/escalate`)
            .set("Authorization", `Bearer ${claimantAToken}`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("escalated");
    });

    // TC-DISPUTE-009
    test("TC-DISPUTE-009: cannot escalate a non-pending claim", async () => {
        // claimAId is already approved from TC-DISPUTE-005
        const res = await request(app)
            .put(`/api/claims/${claimAId}/escalate`)
            .set("Authorization", `Bearer ${claimantAToken}`);
        expect(res.status).toBe(400);
    });

    // TC-DISPUTE-010
    test("TC-DISPUTE-010: cannot resolve a non-escalated claim", async () => {
        const res = await request(app)
            .post("/api/claims/resolve")
            .set("Authorization", `Bearer ${adminToken}`)
            .send({ approved_claim_id: claimAId });
        expect(res.status).toBe(400);
    });
});
