import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import itemsRouter from "./routes/items.js";
import claimsRoutes from "./routes/claims.js";
import uploadRouter from "./routes/upload.js";
import adminRouter from "./routes/admin.js";
import locationsRouter from "./routes/locations.js";
import categoriesRouter from "./routes/categories.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

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
app.use("/api/admin", adminRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/categories", categoriesRouter);

export default app;
