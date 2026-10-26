import type { Request, Response } from "express";
import { fetchSlotsByDate, fetchSlotById } from "../services/slot.service.js";

export async function getSlotsByDate(
  req: Request,
  res: Response
) {
  try {
    const date = req.query.date;

    if (typeof date !== "string") {
      return res.status(400).json({
        message: "dateを指定してください",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        message: "dateはYYYY-MM-DD形式で指定してください",
      });
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        message: "実在する日付を指定してください",
      });
    }

    const data = await fetchSlotsByDate(date);

    return res.status(200).json(data);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getSlotById(
  req: Request,
  res: Response
) {
  try {
    const id = req.params.id;

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        message: "idを指定してください",
      });
    }

    const data = await fetchSlotById(id);

    if(!data) {
      return res.status(404).json({
        message: "データが見つかりませんでした",
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: 'Internal server error'
    })
  }
}
