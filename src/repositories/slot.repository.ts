import { pool } from "../db/pool.js";
import type { PoolClient } from "pg";

type ReservationSlot = {
  id: string;
  start_at: Date;
  end_at: Date;
  status: "available" | "reserved";
};

export async function findSlotsByDate(
  startAt: string,
  endAt: string
):Promise<ReservationSlot[] | undefined> {
  const result = await pool.query(
    `
    SELECT *
    FROM reservation_slots
    WHERE start_at >= $1
    AND start_at < $2
    ORDER BY start_at
    `,
    [startAt, endAt]
  )
  return result.rows;
}

export async function findSlotById(id: string, client?: PoolClient) {
  const queryable = client ?? pool;

  const result = await queryable.query(
    `
    SELECT *
    FROM reservation_slots
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0];
}

export async function findAllSlots() {
  const result = await pool.query(
    `
    SELECT *
    FROM reservation_slots
    ORDER BY start_at ASC
    `
  );

  return result.rows;
}

export async function insertSlot(
  startAt: string,
  endAt: string
) {
  const result = await pool.query(
    `
    INSERT INTO reservation_slots (start_at, end_at)
    VALUES ($1, $2)
    RETURNING *
    `,
    [startAt, endAt]
  );

  return result.rows[0];
}

export async function updateAbailableSlot(
  id: string,
  startAt: string,
  endAt: string,
  isAccepting: boolean
) {
  const result = await pool.query(
    `
    UPDATE reservation_slots
    SET
      start_at = CASE WHEN status = 'available' THEN $2 ELSE start_at END,
      end_at = CASE WHEN status = 'available' THEN $3 ELSE end_at END,
      is_accepting = $4
    WHERE id = $1
    RETURNING *
    `,
    [id, startAt, endAt, isAccepting]
  )

  return result.rows[0];
}

export async function deleteAvailableSlot(id: string){
  const result = await pool.query(
    `
    DELETE FROM reservation_slots
    WHERE id = $1
      AND status = 'available'
      AND NOT EXISTS (
        SELECT 1
        FROM reservations
        WHERE reservations.slot_id = reservation_slots.id
      )
    RETURNING id
    `,
    [id]
  )

  return result.rows[0];
}
