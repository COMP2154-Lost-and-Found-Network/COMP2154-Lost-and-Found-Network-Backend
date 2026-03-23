import { Router } from "express";
import { createClaim } from "../controllers/claimsController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

router.post("/", authenticateToken, createClaim);

export default router;