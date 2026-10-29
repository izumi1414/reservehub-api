import { Router } from "express";
import { deleteSlot, getAllSlots, patchSlot, postSlot } from "../controllers/slot.controller.js";
import { authenticateToken } from "../middleware/authenticateToken.js";
import { authorizeAdmin } from "../middleware/authorizeAdmin.js";
import { getAllReservations } from "../controllers/reservation.controller.js";

const router = Router();

router.get("/", authenticateToken, authorizeAdmin, getAllSlots);
router.post("/", authenticateToken, authorizeAdmin, postSlot);
router.patch("/:id", authenticateToken, authorizeAdmin, patchSlot);
router.delete("/:id", authenticateToken, authorizeAdmin, deleteSlot);
router.get("/reservations", authenticateToken, authorizeAdmin, getAllReservations)

export default router;
