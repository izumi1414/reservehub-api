import { pool } from "../db/pool.js";
import type { PoolClient } from "pg";

export async function findAllReservations() {
  const result = await pool.query(
    `
    SELECT *
    FROM reservations
    ORDER BY created_at DESC
    `
  );
  return result.rows;
}

export async function findReservationsByUserId(
  userId: string
) {
  const result = await pool.query(
    `
    SELECT *
    FROM reservations
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );
  return result.rows;
}

export async function findReservationById(
  id: string,
  userId: string,
  client?: PoolClient
) {
  const queryable = client ?? pool;
  const result = await queryable.query(
    `
    SELECT *
    FROM reservations
    WHERE id = $1
      AND user_id = $2
    `,
    [id, userId]
  )
  return result.rows[0];
}

export async function reserveAvailableSlot(
  client: PoolClient,
  slotId: string
) {
  const result = await client.query(
    `
    UPDATE reservation_slots
    SET status = 'reserved'
    WHERE id = $1
      AND status = 'available'
    RETURNING id
    `,
    [slotId]
  )
  return result.rows[0];
}

export async function insertReservation(
  client: PoolClient,
  slotId: string,
  customerName: string,
  customerEmail: string,
  userId: string
) {
  const result = await client.query(
    `
    INSERT INTO reservations (
      slot_id,
      customer_name,
      customer_email,
      user_id
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [slotId, customerName, customerEmail, userId]
  );

  return result.rows[0];
}

export async function cancelReservedSlot(
  client: PoolClient,
  slotId: string
) {
  const result = await client.query(
    `
    UPDATE reservation_slots
    SET status = 'available'
    WHERE id = $1
      AND status = 'reserved'
    RETURNING id
    `,
    [slotId]
  )
  return result.rows[0];
}

export async function markReservationAsCancelled(
  client: PoolClient,
  reservationId: string,
  userId: string
) {
  const result = await client.query(
    `
    UPDATE reservations
    SET status = 'cancelled'
    WHERE id = $1
      AND user_id = $2
      AND status = 'confirmed'
    RETURNING id, slot_id
    `,
    [reservationId, userId]
  )
  return result.rows[0];
}
