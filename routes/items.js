import { Router } from "express";
import { createItem } from "../controllers/itemsController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// protected route
router.post("/", authenticateToken, createItem);

export default router;