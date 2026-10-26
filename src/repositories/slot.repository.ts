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
