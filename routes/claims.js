import { Router } from "express";

import { authenticateToken } from "../middleware/auth.js";
import { createClaim, updateClaimStatus } from "../controllers/claimsController.js";

const router = Router();

router.post("/", authenticateToken, createClaim);
router.put("/:id", authenticateToken, updateClaimStatus);

export default router;