import bcrypt from "bcryptjs";
import * as userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import { blacklistToken } from "../middleware/tokenBlacklist.js";

export const getUsers = async (_req, res) => {
    const users = await userModel.findAll();
    res.json(users);
};

export const getUser = async (req, res) => {
    const user = await userModel.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GBC_DOMAIN = "@georgebrown.ca";

export const createUser = async (req, res) => {
    const { email, password, first_name, last_name, role = "user" } = req.body;

    if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({ error: "email, password, first_name, and last_name are required" });
    }

    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    const existing = await userModel.findByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const is_verified_member = email.toLowerCase().endsWith(GBC_DOMAIN);
    const password_hash = await bcrypt.hash(password, 10);
    const user = await userModel.create({ email, password_hash, first_name, last_name, role, is_verified_member });
    res.status(201).json(user);
};

// Seyma - Login Function

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    const { password_hash: _, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, is_verified_member: !!safeUser.is_verified_member } });
};

export const logout = (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(400).json({ error: "No token provided" });
    }

    blacklistToken(token);
    return res.status(200).json({ message: "Logged out successfully" });
};

//end 

export const updateUser = async (req, res) => {
    const existing = await userModel.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "User not found" });

    const { first_name, last_name, is_verified_member } = req.body;
    const updated = await userModel.update(req.params.id, {
        first_name: first_name ?? existing.first_name,
        last_name: last_name ?? existing.last_name,
        is_verified_member: is_verified_member ?? existing.is_verified_member,
    });
    res.json(updated);
};
