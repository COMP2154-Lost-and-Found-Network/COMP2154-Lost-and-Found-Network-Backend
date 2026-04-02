import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { getLocations, getLocation, createLocation, updateLocation, deleteLocation } from "../controllers/locationController.js";

const router = Router();

// public reads (any authenticated user)
router.get("/", authenticateToken, getLocations);
router.get("/:id", authenticateToken, getLocation);

// admin-only writes
router.post("/", adminAuth, createLocation);
router.put("/:id", adminAuth, updateLocation);
router.delete("/:id", adminAuth, deleteLocation);

export default router;
