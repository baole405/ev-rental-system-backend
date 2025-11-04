import mongoose from "mongoose";
import Booking from "../models/booking.model.js";
import Vehicle from "../models/vehicle.model.js";

/**
 * Confirms a pending booking by validating vehicle availability and updating booking status
 * @param {string} bookingId - The ID of the booking to confirm
 * @returns {Promise<Object>} The updated booking object
 * @throws {Error} When booking validation fails
 */
export const confirmBookingOnPending = async (bookingId) => {
  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(session);
      
      if (!booking) {
        throw new Error("Booking not found");
      }
      
      // If already confirmed, return without error
      if (booking.status === "confirmed") {
        updated = booking;
        return;
      }
      
      // Validate booking status
      if (booking.status !== "pending") {
        throw new Error("Booking is not in pending status");
      }
      
      // Validate vehicle assignment
      if (!booking.vehicle) {
        throw new Error("No vehicle assigned to booking");
      }

      // Validate vehicle existence and availability
      const vehicle = await Vehicle.findById(booking.vehicle).session(session);
      if (!vehicle) {
        throw new Error("Vehicle not found");
      }
      
      if (vehicle.status !== "reserved" && vehicle.status !== "available") {
        throw new Error("Vehicle is not available for booking");
      }

      // Update booking status
      booking.status = "confirmed";
      updated = await booking.save({ session });
    });
    
    return updated;
  } catch (error) {
    // Re-throw with original message for specific error handling
    throw error;
  } finally {
    await session.endSession();
  }
};
