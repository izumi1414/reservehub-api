import "dotenv/config";
import express from "express";
import cors from "cors";
import slotRoutes from "./routes/slot_route.js"
import reservationRoute from "./routes/reservation_route.js"
import reportRoute from "./routes/report_route.js"
import adminRoute from "./routes/admin_route.js"
import authRoute from "./routes/auth_route.js"
import userRoute from "./routes/user_route.js"

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGIN ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173")
).split(",").map(origin => origin.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

app.use("/api/slots", slotRoutes)
app.use("/api/reservations", reservationRoute)
app.use("/api/reports", reportRoute)
app.use("/api/admin", adminRoute)
app.use("/api/auth", authRoute)
app.use("/api/users",userRoute)

app.get("/", (req, res) => {
  res.json({message: "ReserveHun API is Running!!!"})
});

export default app;
