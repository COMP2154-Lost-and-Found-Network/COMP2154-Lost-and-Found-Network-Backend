import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db.js";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import itemsRouter from "./routes/items.js";
import claimsRoutes from "./routes/claims.js";
import uploadRouter from "./routes/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (_req, res) => {
    res.json("Hello Team!");
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/items", itemsRouter);
app.use("/api/claims", claimsRoutes);
app.use("/api/upload", uploadRouter);

pool.getConnection()
    .then((conn) => {
        console.log("Database connected successfully");
        conn.release();
    })
    .catch((err) => {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    });

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
    });
}

export default app;