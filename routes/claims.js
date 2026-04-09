import { Router } from "express";

import { authenticateToken } from "../middleware/auth.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { createClaim, updateClaimStatus, getClaim, getClaimsInbox, getClaimById, withdrawClaim, assignClaim, escalateClaim, getEscalatedClaims, resolveDispute } from "../controllers/claimsController.js";

const router = Router();

router.post("/", authenticateToken, createClaim);
router.put("/:id", authenticateToken, updateClaimStatus);
router.get("/", authenticateToken, getClaim);
// must come before /:id so Express doesn't treat "inbox" as an id param
router.get("/inbox", authenticateToken, getClaimsInbox);
// must come before /:id so Express doesn't treat "escalated" as an id param
router.get("/escalated", adminAuth, getEscalatedClaims);
router.post("/resolve", adminAuth, resolveDispute);
router.get("/:id", authenticateToken, getClaimById);
router.put("/:id/escalate", authenticateToken, escalateClaim);
router.put("/:id/assign", adminAuth, assignClaim);
router.delete("/:id/withdraw", authenticateToken, withdrawClaim);


export default router;