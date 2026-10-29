import { pool } from "../db/pool.js";

export async function insertUser(
  email: string,
  passwordHash: string
) {
  const result = await pool.query(
    `
    INSERT INTO users (email, password_hash)
    VALUES ($1, $2)
    RETURNING id, email, role, created_at
    `,
    [email, passwordHash]
  )

  return result.rows[0]
}

export async function findUserByEmail(email: string) {
  const result = await pool.query(
    `
    SELECT id, email, password_hash, role
    FROM users
    WHERE email = $1
      AND deleted_at IS NULL
    `,
    [email]
  );

  return result.rows[0];
}

export async function findUserById(id: string) {
  const result = await pool.query(
    `
    SELECT id, email, password_hash, role
    FROM users
    WHERE id = $1
      AND deleted_at IS NULL
    `,
    [id]
  );

  return result.rows[0];
}

export async function updateUser(
  id: string,
  email: string
) {
  const result = await pool.query(
    `
    UPDATE users
    SET email = $2
    WHERE id = $1
      AND deleted_at IS NULL
    RETURNING id, email, role, created_at
    `,
    [id, email]
  );

  return result.rows[0];
}

export async function updatePasswordHash(
  id: string,
  passwordHash: string
) {
  const result = await pool.query(
    `
    UPDATE users
    SET password_hash = $2
    WHERE id = $1
      AND deleted_at IS NULL
    RETURNING id
    `,
    [id, passwordHash]
  );

  return result.rows[0];
}

export async function softDeleteUser(id: string) {
  const result = await pool.query(
    `
    UPDATE users
    SET deleted_at = NOW()
    WHERE id = $1
      AND deleted_at IS NULL
    RETURNING id
    `,
    [id]
  );

  return result.rows[0];
}
