import { Router } from "express";

import { authenticateToken } from "../middleware/auth.js";
import { createClaim, updateClaimStatus, getClaim, withdrawClaim } from "../controllers/claimsController.js";

const router = Router();

router.post("/", authenticateToken, createClaim);
router.put("/:id", authenticateToken, updateClaimStatus);
router.get("/", authenticateToken, getClaim);
router.delete("/:id/withdraw", authenticateToken, withdrawClaim);

export default router;