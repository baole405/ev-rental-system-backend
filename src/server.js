import dotenv from "dotenv";
import express from "express";

import connectDB from "./config/mongodb.js";
import bookingRoutes from "./routes/booking.routes.js";
import handoverRoutes from "./routes/handover.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import rentalRoutes from "./routes/rental.routes.js";
import stationRoutes from "./routes/station.routes.js";
import userRoutes from "./routes/user.routes.js";
import userDocRoutes from "./routes/userDocument.routes.js";
import vehicleRoutes from "./routes/vehicle.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "EV Rental System API" });
});

app.use("/api/booking", bookingRoutes);
app.use("/api/handovers", handoverRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/userDocs", userDocRoutes);
app.use("/api/vehicles", vehicleRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "ValidationError") {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: "Internal server error" });
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server start failed:", error.message);
    process.exit(1);
  }
};

startServer();
