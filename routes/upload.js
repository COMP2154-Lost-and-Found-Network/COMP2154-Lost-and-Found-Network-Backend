import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { authenticateToken } from "../middleware/auth.js";

const router = Router();
const isProd = process.env.NODE_ENV === "production";

// --- Cloudinary (production) ---
if (isProd) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

// --- Local disk (development) ---
const uploadDir = "uploads/";
if (!isProd) {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = isProd
    ? multer.memoryStorage()
    : multer.diskStorage({
          destination: (_req, _file, cb) => cb(null, uploadDir),
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

        // Production: stream to Cloudinary
        if (isProd) {
            const stream = cloudinary.uploader.upload_stream(
                { folder: "lost-and-found" },
                (error, result) => {
                    if (error) {
                        return res.status(500).json({ error: "Upload to cloud failed" });
                    }
                    return res.status(201).json({ url: result.secure_url });
                }
            );
            return stream.end(req.file.buffer);
        }

        // Development: return local file URL
        const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        return res.status(201).json({ url });
    });
});

export default router;
