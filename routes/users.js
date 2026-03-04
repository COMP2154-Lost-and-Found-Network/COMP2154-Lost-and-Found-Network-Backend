import { Router } from "express";
import { getUser, createUser, updateUser, getUsers, login, logout } from "../controllers/userController.js";
import { authenticateToken } from "../middleware/auth.js";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

/* PUBLIC */
router.post("/auth/login", login);
// router.post("/", createUser); // (register) keep public ONLY if your project wants it

/* PROTECTED */
router.post("/auth/logout", authenticateToken, logout);
router.get("/", authenticateToken, getUsers);
router.get("/:id", authenticateToken, getUser);
router.put("/:id", authenticateToken, updateUser);
router.post("/", createUser); // use this ONLY if register must be protected
router.get("/admin/:id", authenticateToken, adminAuth, (req, res) => {
    res.status(200).json({ message: "Welcome to the admin screen" });
});

export default router;
