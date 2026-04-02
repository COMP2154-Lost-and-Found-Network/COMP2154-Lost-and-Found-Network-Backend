import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { getCategories, getCategory, createCategory, updateCategory, deleteCategory } from "../controllers/categoryController.js";

const router = Router();

// public reads (any authenticated user)
router.get("/", authenticateToken, getCategories);
router.get("/:id", authenticateToken, getCategory);

// admin-only writes
router.post("/", adminAuth, createCategory);
router.put("/:id", adminAuth, updateCategory);
router.delete("/:id", adminAuth, deleteCategory);

export default router;
