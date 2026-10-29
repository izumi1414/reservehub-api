import type { Request, Response } from "express";
import { fetchMonthlyReport } from "../services/report.service.js";
import { AppError } from "../errors/app.error.js";

export async function getMonthlyReport(
  req: Request,
  res: Response
) {
  try {
    const month = req.query.month;

    if (!month || typeof month !== "string") {
      return res.status(400).json({
        message: "monthを指定してください"
      })
    }

    const data = await fetchMonthlyReport(month);
    return res.status(200).json(data)
  } catch(error) {
    console.error(error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
  
}
