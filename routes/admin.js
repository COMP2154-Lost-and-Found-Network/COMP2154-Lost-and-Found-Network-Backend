import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { adminAuth } from "../middleware/adminAuth.js";
import {deleteItem, getItems, updateItem, getStats} from "../controllers/adminController.js";

const router = Router();

router.put("/item/:id", authenticateToken, adminAuth, updateItem);
router.delete("/item/:id", authenticateToken, adminAuth, deleteItem);
router.get("/items", authenticateToken, adminAuth, getItems);
router.get("/stats", getStats);

export default router;