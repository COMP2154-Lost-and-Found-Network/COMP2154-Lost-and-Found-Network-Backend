import request from "supertest";
import app from "../app.js";
import { cleanDb } from "./helpers/db.js";

let reporterToken;
let reporterId;
let claimantToken;
let claimantId;
let otherToken;
let itemId;
let claimId;

const REPORTER  = { email: "claims.reporter@test.com",  password: "pass123", first_name: "Reporter",  last_name: "User" };
const CLAIMANT  = { email: "claims.claimant@test.com",  password: "pass123", first_name: "Claimant",  last_name: "User" };
const OTHER     = { email: "claims.other@test.com",     password: "pass123", first_name: "Other",     last_name: "User" };

const BASE_ITEM = (userId) => ({
    user_id: userId,
    type: "lost",
    title: "Lost Test Backpack",
    description: "Blue backpack left in room 101",
    category_id: 1,
    location_id: 1,
    date: "2026-03-01",
});

beforeAll(async () => {
    await cleanDb();

    // Register and login all users
    await request(app).post("/api/auth/").send(REPORTER);
    const r1 = await request(app).post("/api/auth/login").send({ email: REPORTER.email, password: REPORTER.password });
    reporterToken = r1.body.token;
    reporterId = r1.body.user.id;

    await request(app).post("/api/auth/").send(CLAIMANT);
    const r2 = await request(app).post("/api/auth/login").send({ email: CLAIMANT.email, password: CLAIMANT.password });
    claimantToken = r2.body.token;
    claimantId = r2.body.user.id;

    await request(app).post("/api/auth/").send(OTHER);
    const r3 = await request(app).post("/api/auth/login").send({ email: OTHER.email, password: OTHER.password });
    otherToken = r3.body.token;

    // Create item as reporter
    const itemRes = await request(app)
        .post("/api/items")
        .set("Authorization", `Bearer ${reporterToken}`)
        .send(BASE_ITEM(reporterId));
    itemId = itemRes.body.id;
});

afterAll(async () => {
    await cleanDb();
});

describe("Claims & Verification", () => {
    // TC-CLAIM-006
    test("TC-CLAIM-006: create claim with missing fields returns 400", async () => {
        const res = await request(app)
            .post("/api/claims")
            .set("Authorization", `Bearer ${claimantToken}`)
            .send({ item_id: itemId }); // missing verification_details
        expect(res.status).toBe(400);
    });

    // TC-CLAIM-001
    test("TC-CLAIM-001: successful claim submission returns 201", async () => {
        const res = await request(app)
            .post("/api/claims")
            .set("Authorization", `Bearer ${claimantToken}`)
            .send({ item_id: itemId, verification_details: "I can identify it by the red keychain attached" });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty("id");
        claimId = res.body.id;
    });

    // TC-CLAIM-002
    test("TC-CLAIM-002: duplicate claim submission returns 400", async () => {
        const res = await request(app)
            .post("/api/claims")
            .set("Authorization", `Bearer ${claimantToken}`)
            .send({ item_id: itemId, verification_details: "Submitting again" });
        expect(res.status).toBe(400);
    });

    // TC-CLAIM-009
    test("TC-CLAIM-009: retrieve own claims returns 200", async () => {
        const res = await request(app)
            .get(`/api/claims?claimant_id=${claimantId}`)
            .set("Authorization", `Bearer ${claimantToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    // TC-CLAIM-010
    test("TC-CLAIM-010: retrieve another user's claims returns 401", async () => {
        const res = await request(app)
            .get(`/api/claims?claimant_id=${claimantId}`)
            .set("Authorization", `Bearer ${otherToken}`);
        expect(res.status).toBe(401);
    });

    // TC-CLAIM-007
    test("TC-CLAIM-007: unauthorized claim withdrawal returns 401", async () => {
        const res = await request(app)
            .delete(`/api/claims/${claimId}/withdraw`)
            .set("Authorization", `Bearer ${otherToken}`);
        expect(res.status).toBe(401);
    });

    // TC-CLAIM-004
    test("TC-CLAIM-004: reject a claim returns 200 and updates status", async () => {
        const res = await request(app)
            .put(`/api/claims/${claimId}`)
            .set("Authorization", `Bearer ${reporterToken}`)
            .send({ status: "rejected" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("rejected");
    });

    // TC-CLAIM-003 — needs a new pending claim since previous was rejected
    test("TC-CLAIM-003: approve a claim returns 200, claim status approved, item status claimed", async () => {
        // Re-submit claim (previous was rejected so duplicate check won't block this)
        const claimRes = await request(app)
            .post("/api/claims")
            .set("Authorization", `Bearer ${claimantToken}`)
            .send({ item_id: itemId, verification_details: "Re-submitting with more detail" });
        const newClaimId = claimRes.body.id;

        const res = await request(app)
            .put(`/api/claims/${newClaimId}`)
            .set("Authorization", `Bearer ${reporterToken}`)
            .send({ status: "approved" });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("approved");

        // Verify item status changed to claimed
        const itemRes = await request(app)
            .get(`/api/items/${itemId}`)
            .set("Authorization", `Bearer ${reporterToken}`);
        expect(itemRes.body.status).toBe("claimed");
    });

    // TC-CLAIM-008 — item already has an approved claim
    test("TC-CLAIM-008: approving a second claim on an already-claimed item returns 400", async () => {
        const EXTRA = { email: "claims.extra@test.com", password: "pass123", first_name: "Extra", last_name: "User" };
        await request(app).post("/api/auth/").send(EXTRA);
        const loginRes = await request(app).post("/api/auth/login").send({ email: EXTRA.email, password: EXTRA.password });
        const extraToken = loginRes.body.token;
        const extraId = loginRes.body.user.id;

        const secondClaimRes = await request(app)
            .post("/api/claims")
            .set("Authorization", `Bearer ${extraToken}`)
            .send({ item_id: itemId, verification_details: "I also think this is mine" });

        const res = await request(app)
            .put(`/api/claims/${secondClaimRes.body.id}`)
            .set("Authorization", `Bearer ${reporterToken}`)
            .send({ status: "approved" });
        expect(res.status).toBe(400);
    });

    // TC-CLAIM-005 — use a fresh item so it isn't already claimed
    test("TC-CLAIM-005: withdraw own claim returns 200", async () => {
        const freshItem = await request(app)
            .post("/api/items")
            .set("Authorization", `Bearer ${reporterToken}`)
            .send(BASE_ITEM(reporterId));

        const freshClaim = await request(app)
            .post("/api/claims")
            .set("Authorization", `Bearer ${claimantToken}`)
            .send({ item_id: freshItem.body.id, verification_details: "Will withdraw this one" });

        const res = await request(app)
            .delete(`/api/claims/${freshClaim.body.id}/withdraw`)
            .set("Authorization", `Bearer ${claimantToken}`);
        expect(res.status).toBe(200);
    });
});
