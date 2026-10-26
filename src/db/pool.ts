import "dotenv/config";
import { Pool } from "pg";

export const pool = new Pool({
  port: Number(process.env.PORT) ?? 3000,
  connectionString: process.env.DATABASE_URL
})
