import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./db.js";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import itemsRouter from "./routes/items.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
    res.json("Hello Team!");
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/items", itemsRouter);

pool.getConnection()
    .then((conn) => {
        console.log("Database connected successfully");
        conn.release();
    })
    .catch((err) => {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    });

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});