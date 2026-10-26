import { Router } from "express";
import { getAllReservations, getReservationById, patchReservationCancellation, postReservation } from "../controllers/reservation.controller.js";

const router = Router();

router.get("/", getAllReservations);
router.get("/:id", getReservationById);
router.post("/", postReservation);
router.patch("/:id/cancel", patchReservationCancellation)

export default router;
