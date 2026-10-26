import { Router } from "express";
import { getSlotById, getSlotsByDate } from "../controllers/slot.controller.js";

const router = Router();

router.get("/", getSlotsByDate);
router.get("/:id", getSlotById);

export default router;
