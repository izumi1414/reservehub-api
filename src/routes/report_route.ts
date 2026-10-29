import { Router } from "express";
import { getMonthlyReport } from "../controllers/report.controller.js";
import { authenticateToken } from "../middleware/authenticateToken.js";
import { authorizeAdmin } from "../middleware/authorizeAdmin.js";

const router = Router();

router.get("/monthly", authenticateToken, authorizeAdmin, getMonthlyReport);

export default router;
