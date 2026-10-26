import { populate } from "dotenv";
import { pool } from "../db/pool.js";
import { cancelReservedSlot, findAllReservations, findReservationById, insertReservation, markReservationAsCancelled, reserveAvailableSlot } from "../repositories/reservation.repository.js";
import { findSlotById } from "../repositories/slot.repository.js";
import { ReservationError } from "../errors/reservation.error.js";

export async function fetchAllReservations() {
  return findAllReservations();
}

export async function fetchReservationById(id: string) {
  return findReservationById(id)
}

export async function registerReservation(
  slotId: string,
  customerName: string,
  customerEmail: string
) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const reservedSlot = await reserveAvailableSlot(client, slotId);

    if (!reservedSlot) {
      const slot = await findSlotById(slotId, client);

      if (!slot) {
        throw new ReservationError(
          "予約枠が見つかりませんでした",
          404
        )
      }

      throw new ReservationError(
        "この予約枠は確保できません",
        409
      )
    }

    const insertedReservation = await insertReservation(
      client,
      slotId,
      customerName,
      customerEmail
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return insertedReservation;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function cancelReservation(
  reservationId: string
) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const reservation = await findReservationById(reservationId, client);

    if (!reservation) {
      throw new ReservationError(
        "予約が見つかりません",
        404
      );
    }

    if (reservation.status === "cancelled") {
      throw new ReservationError(
        "この予約はすでにキャンセルされています",
        409
      );
    }

    const cancelledReservation = await markReservationAsCancelled(client, reservationId);

    if (!cancelledReservation) {
      throw new ReservationError(
        "予約をキャンセルできませんでした",
        409
      )
    }

    const slotId = cancelledReservation.slot_id;

    const releasedSlot = await cancelReservedSlot(
      client,
      slotId
    );

    if (!releasedSlot) {
      throw new Error("予約枠を空き状態に戻せませんでした");
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return cancelledReservation;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }

    throw error;
  } finally {
    client.release();
  }
}
