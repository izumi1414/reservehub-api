import express from "express";
import slotRoutes from "./routes/slot_route.js"
import reservationRoute from "./routes/reservation_route.js"
import reportRoute from "./routes/report_route.js"
import adminRoute from "./routes/admin_route.js"
import authRoute from "./routes/auth_route.js"

const app = express();

app.use(express.json());

app.use("/api/slots", slotRoutes)
app.use("/api/reservations", reservationRoute)
app.use("/api/reports", reportRoute)
app.use("/api/admin/slots", adminRoute)
app.use("/api/auth", authRoute)

app.get("/", (req, res) => {
  res.json({message: "ReserveHun API is Running!!!"})
});

export default app;
