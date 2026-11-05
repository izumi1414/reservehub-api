import { pool } from "../db/pool.js"

export async function findMonthlyReport(
  startAt: string,
  endAt: string
) {
  const result = await pool.query(
    `
    SELECT
      COUNT(*) AS total_reservations,
      COUNT(*) FILTER (
        WHERE r.status = 'confirmed'
      ) AS confirmed_reservations,
      COUNT(*) FILTER (
        WHERE r.status = 'cancelled'
      ) AS cancelled_reservations
    FROM reservations r
    INNER JOIN reservation_slots rs
      ON r.slot_id = rs.id
    WHERE rs.start_at >= $1
      AND rs.start_at < $2
    `,
    [startAt, endAt]
  );

  return result.rows[0];
}
