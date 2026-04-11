import { Router } from "express";
import { createItem, getItem, updateItem, deleteItem, getItems } from "../controllers/itemsController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// protected routes
router.get("/", authenticateToken, getItems);
router.post("/", authenticateToken, createItem);
router.get("/:id", authenticateToken, getItem);
router.put("/:id", authenticateToken, updateItem);
router.delete("/:id", authenticateToken, deleteItem);

export default router;