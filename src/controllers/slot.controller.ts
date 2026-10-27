import type { Request, Response } from "express";
import { fetchSlotsByDate, fetchSlotById, fetchAllSlot, registerSlot, editSlot, deleteSlotById } from "../services/slot.service.js";
import { AppError } from "../errors/app.error.js";

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

export async function getAllSlots(
  req: Request,
  res: Response
) {
  try {
    const data = await fetchAllSlot();

    return res.status(200).json(data);
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: 'Internal Server error'
    })
  }
}

export async function postSlot(
  req: Request,
  res: Response
) {
  try {
    const body = req.body;

    if (!body || typeof body !== "object") {
      return res.status(400).json({
        message: "リクエストボディが正しくありません"
      })
    }

    const { startAt, endAt } = body;

    if (!startAt || typeof startAt !== "string") {
      return res.status(400).json({
        message: "startAtを正しく指定してください"
      })
    }
    if (!endAt || typeof endAt !== "string") {
      return res.status(400).json({
        message: "endAtを正しく指定してください"
      })
    }

    const data = await registerSlot(startAt, endAt);

    return res.status(201).json(data);

  } catch (error) {
    console.error(error)

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Internal Server error'
    })
  }
}

export async function patchSlot(
  req: Request,
  res: Response
) {
  try {
    const id = req.params.id;
    const body = req.body;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        message: "idを正しく設定してください"
      })
    }

    if (!body || typeof body !== "object") {
      return res.status(400).json({
        message: "リクエストボディが正しくありません"
      })
    }

    const { startAt, endAt } = body;

    if (!startAt || typeof startAt !== "string") {
      return res.status(400).json({
        message: "startAtを正しく指定してください"
      })
    }
    if (!endAt || typeof endAt !== "string") {
      return res.status(400).json({
        message: "endAtを正しく指定してください"
      })
    }

    const data = await editSlot(id, startAt, endAt);

    return res.status(200).json(data);

  } catch (error) {
    console.error(error)

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Internal Server error'
    })
  }
}

export async function deleteSlot(
  req: Request,
  res: Response
) {
  try {
    const id = req.params.id;

  if (!id || typeof id !== "string") {
    return res.status(400).json({
      message: "idを正しく設定してください"
    })
  }

  await deleteSlotById(id);

  return res.status(204).send();
  } catch (error) {
    console.error(error)

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Internal Server error'
    })
  }

}
