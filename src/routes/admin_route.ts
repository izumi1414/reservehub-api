import { Router } from "express";
import { deleteSlot, getAllSlots, patchSlot, postSlot } from "../controllers/slot.controller.js";

const router = Router();

router.get("/", getAllSlots);
router.post("/", postSlot);
router.patch("/:id", patchSlot);
router.delete("/:id", deleteSlot);

export default router;
