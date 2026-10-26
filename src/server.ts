import "dotenv/config"
import app from "./app.js"
import { pool } from "./db/pool.js";

const PORT = process.env.PORT ?? 3000;

async function startServer() {
  try {
    await pool.query("SELECT 1")
    console.log("Database Connected Successfully!");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    });

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

startServer();
