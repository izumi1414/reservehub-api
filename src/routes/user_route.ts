import { Router } from "express";
import { authenticateToken } from "../middleware/authenticateToken.js";
import { deleteMyAccount, getMyProfile, patchMyProfile, patchPassword } from "../controllers/user.controller.js";

const router = Router();

router.get("/me", authenticateToken, getMyProfile)
router.patch("/me", authenticateToken, patchMyProfile)
router.patch("/me/password", authenticateToken, patchPassword)
router.delete("/me", authenticateToken, deleteMyAccount)

export default router;
