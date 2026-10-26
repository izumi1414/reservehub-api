import express from "express";
import slotRoutes from "./routes/slot_route.js"
import reservationRoute from "./routes/reservation_route.js"

const app = express();

app.use(express.json());

app.use("/api/slots", slotRoutes)
app.use("/api/reservations", reservationRoute)

app.get("/", (req, res) => {
  res.json({message: "ReserveHun API is Running!!!"})
});

export default app;
