import { Router } from "express";
import { getMonthlyReport } from "../controllers/report.controller.js";

const router = Router();

router.get("/monthly", getMonthlyReport);

export default router;
