import { Router } from "express";
import { login } from "../controllers/userController.js";
import { authenticateToken } from "../middleware/auth.js";


const router = Router();

/* PUBLIC */
router.post("/login", login);
router.post("/logout", authenticateToken, logout);
// router.post("/", createUser); // (register) keep public ONLY if your project wants it



export default router;
