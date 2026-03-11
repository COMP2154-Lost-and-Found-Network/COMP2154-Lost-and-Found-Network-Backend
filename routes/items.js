import { Router } from "express";
import { createItem, getItem, updateItem, deleteItem, getItems } from "../controllers/itemsController.js";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

// protected route
router.post("/", authenticateToken, createItem);
router.get("/:id", authenticateToken, getItem);
router.put("/:id", authenticateToken, updateItem);
router.delete("/:id", authenticateToken, deleteItem);
router.get("/", authenticateToken, getItems);

export default router;