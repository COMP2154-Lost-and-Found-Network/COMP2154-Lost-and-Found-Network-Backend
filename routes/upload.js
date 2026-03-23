import { Router } from "express";
import multer from "multer";
import path from "path";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, "uploads/"),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, unique + path.extname(file.originalname));
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPEG, PNG, GIF, or WebP images are allowed"));
        }
    },
});

router.post("/", authenticateToken, (req, res) => {
    upload.single("image")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ error: "Image must be under 5 MB" });
            }
            return res.status(400).json({ error: err.message });
        }

        if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        return res.status(201).json({ url });
    });
});

export default router;
