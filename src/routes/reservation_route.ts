import { Router } from "express";
import { getReservationById, getReservationsByUserId, patchReservationCancellation, postReservation } from "../controllers/reservation.controller.js";
import { authenticateToken } from "../middleware/authenticateToken.js";

const router = Router();

router.get("/", authenticateToken, getReservationsByUserId);
router.get("/:id", authenticateToken, getReservationById);
router.post("/", authenticateToken, postReservation);
router.patch("/:id/cancel", authenticateToken, patchReservationCancellation)

export default router;
