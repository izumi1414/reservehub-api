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
        WHERE status = 'confirmed'
      ) AS confirmed_reservations,
      COUNT(*) FILTER (
        WHERE status = 'cancelled'
      ) AS cancelled_reservations
    FROM reservations
    WHERE created_at >= $1
      AND created_at < $2
    `,
    [startAt, endAt]
  );

  return result.rows[0];
}
