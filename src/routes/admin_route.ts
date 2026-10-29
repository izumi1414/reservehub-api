import { Router } from "express";
import { deleteSlot, getAllSlots, patchSlot, postSlot } from "../controllers/slot.controller.js";
import { authenticateToken } from "../middleware/authenticateToken.js";
import { authorizeAdmin } from "../middleware/authorizeAdmin.js";
import { getAllReservations, getReservationDetail } from "../controllers/reservation.controller.js";

const router = Router();

router.get("/slots", authenticateToken, authorizeAdmin, getAllSlots);
router.post("/slots", authenticateToken, authorizeAdmin, postSlot);
router.patch("/slots/:id", authenticateToken, authorizeAdmin, patchSlot);
router.delete("/slots/:id", authenticateToken, authorizeAdmin, deleteSlot);
router.get("/reservations", authenticateToken, authorizeAdmin, getAllReservations)
router.get("/reservations/:id", authenticateToken, authorizeAdmin, getReservationDetail)

export default router;
