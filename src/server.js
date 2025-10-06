import express from "express";
import dotenv from "dotenv";

import connectDB from "./config/mongodb.js";
import userRoutes from "./routes/user.routes.js";
import userDocumentRoutes from "./routes/userDocument.routes.js";
import stationRoutes from "./routes/station.routes.js";
import vehicleRoutes from "./routes/vehicle.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import rentalRoutes from "./routes/rental.routes.js";
import handoverRoutes from "./routes/handover.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import seedDatabase from "./seed/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "EV Rental System API" });
});

app.use("/api/users", userRoutes);
app.use("/api/user-documents", userDocumentRoutes);
app.use("/api/stations", stationRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/handovers", handoverRoutes);
app.use("/api/payments", paymentRoutes);

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
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server start failed:", error.message);
    process.exit(1);
  }
};

startServer();
