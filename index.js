import "dotenv/config";
import app from "./app.js";
import pool from "./db.js";

const PORT = process.env.PORT || 3000;

pool.getConnection()
    .then((conn) => {
        console.log("Database connected successfully");
        conn.release();
    })
    .catch((err) => {
        console.error("Database connection failed:", err.message);
        process.exit(1);
    });

// only start server outside test environment
if (process.env.NODE_ENV !== "test") {
    pool.getConnection()
        .then((conn) => {
            console.log("Database connected successfully");
            conn.release();

            app.listen(PORT, () => {
                console.log(`Server started on port ${PORT}`);
            });
        })
        .catch((err) => {
            console.error("Database connection failed:", err.message);
            process.exit(1);
        });
}