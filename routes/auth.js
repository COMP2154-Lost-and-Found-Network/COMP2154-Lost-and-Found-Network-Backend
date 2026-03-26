import { Router } from "express";
import { login, logout, createUser } from "../controllers/userController.js";
import { authenticateToken } from "../middleware/auth.js";


const router = Router();

/* PUBLIC */
router.post("/login", login);
router.post("/logout", authenticateToken, logout);
router.post("/", createUser); 



export default router;
