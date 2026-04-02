import { Router } from "express";

import { authenticateToken } from "../middleware/auth.js";
import { createClaim, updateClaimStatus, getClaim, getClaimsInbox, getClaimById, withdrawClaim, assignClaim } from "../controllers/claimsController.js";

const router = Router();

router.post("/", authenticateToken, createClaim);
router.put("/:id", authenticateToken, updateClaimStatus);
router.put("/:id/assign", authenticateToken, assignClaim);
router.get("/", authenticateToken, getClaim);
// must come before /:id so Express doesn't treat "inbox" as an id param
router.get("/inbox", authenticateToken, getClaimsInbox);
router.get("/:id", authenticateToken, getClaimById);
router.delete("/:id/withdraw", authenticateToken, withdrawClaim);


export default router;