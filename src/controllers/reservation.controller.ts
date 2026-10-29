
import type { Request, Response } from "express";
import { cancelReservation, fetchAllReservations, fetchReservationById, fetchReservations, registerReservation } from "../services/reservation.service.js";
import { ReservationError } from "../errors/reservation.error.js";

function getAuthenticatedUserId(
  req: Request,
  res: Response
): string | null {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      message: "認証が必要です",
    });
    return null;
  }

  return userId;
}

export async function getAllReservations(
  req: Request,
  res: Response
) {
  try {
    const data = await fetchAllReservations();

    return res.status(200).json(data);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getReservationsByUserId(
  req: Request,
  res: Response
) {
  try {
    const userId = getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const data = await fetchReservations(userId);

    return res.status(200).json(data);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function getReservationById(
  req: Request,
  res: Response
) {
  try {
    const userId = getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const id = req.params.id;

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        message: "idを指定してください",
      });
    }

    const data = await fetchReservationById(id, userId);

    if (!data) {
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

export async function postReservation(
  req: Request,
  res: Response
) {
  try {
    const userId = getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const body = req.body;

    if (
      !body ||
      typeof body.slotId !== "string" ||
      !body.slotId.trim() ||
      typeof body.customerName !== "string" ||
      !body.customerName.trim() ||
      typeof body.customerEmail !== "string" ||
      !body.customerEmail.trim()
    ) {
      return res.status(400).json({
        message: "slotId、customerName、customerEmailを正しく指定してください",
      });
    }

    const reservation = await registerReservation(
      body.slotId,
      body.customerName,
      body.customerEmail,
      userId
    );

    return res.status(201).json(reservation);
  } catch (error) {
    console.error(error);

    if (error instanceof ReservationError) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function patchReservationCancellation(
  req: Request,
  res: Response
) {
  try {
    const userId = getAuthenticatedUserId(req, res);

    if (!userId) {
      return;
    }

    const id = req.params.id;

    if (typeof id !== "string" || !id) {
      return res.status(400).json({
        message: "idを指定してください",
      });
    }

    const cancelledReservation = await cancelReservation(id, userId);

    return res.status(200).json(cancelledReservation)
  } catch(error) {
    console.error(error);

    if (error instanceof ReservationError) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
