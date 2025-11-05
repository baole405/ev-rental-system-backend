import { BOOKING_STATUS, RENTAL_STATUS } from "../constants/statusCodes.js";
import Booking from "../models/booking.model.js";
import Rental from "../models/rental.model.js";
import { applyRentalStatus } from "../services/rentalStatus.js";

/**
 * @swagger
 * /api/rentals/{rentalId}/staff-confirm-checkin:
 *   post:
 *     summary: Staff xác nhận khách đã đến check-in
 *     tags: [Rentals]
 *     parameters:
 *       - in: path
 *         name: rentalId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rental ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               staffId:
 *                 type: string
 *                 description: ID của staff xác nhận
 *               checkinTime:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian check-in (mặc định = now)
 *               notes:
 *                 type: string
 *                 description: Ghi chú của staff
 *     responses:
 *       200:
 *         description: Check-in confirmed successfully
 *       404:
 *         description: Rental not found
 *       400:
 *         description: Invalid status
 */
export const staffConfirmCheckin = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { staffId, checkinTime, notes } = req.body;

    const rental = await Rental.findById(rentalId)
      .populate("booking")
      .populate("vehicle");

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    // Kiểm tra rental phải ở trạng thái READY_FOR_PICKUP
    if (rental.status !== RENTAL_STATUS.READY_FOR_PICKUP) {
      return res.status(400).json({
        message: `Rental must be in READY_FOR_PICKUP status, currently: ${rental.status}`,
      });
    }

    const now = checkinTime ? new Date(checkinTime) : new Date();

    // Chuyển rental sang CHECKED_IN
    applyRentalStatus(rental, RENTAL_STATUS.CHECKED_IN, {
      userId: staffId || null,
      note: notes || "Customer checked in at station",
      timestamp: now,
    });

    rental.actualPickupTime = now;
    rental.checkedInAt = now;
    rental.checkedInBy = staffId || null;
    rental.checkinNotes = notes || null;

    await rental.save();

    // Cập nhật booking status history
    const booking = await Booking.findById(rental.booking);
    if (booking) {
      booking.statusHistory = booking.statusHistory || [];
      booking.statusHistory.push({
        status: BOOKING_STATUS.PAID,
        changedAt: now,
        changedBy: staffId || null,
        note: "Customer checked in, waiting for contract signature",
      });
      booking.markModified("statusHistory");
      await booking.save();
    }

    res.json({
      success: true,
      message: "Customer check-in confirmed. Contract ready for signature.",
      data: {
        rental: {
          id: rental._id,
          status: rental.status,
          checkedInAt: rental.checkedInAt,
          checkedInBy: rental.checkedInBy,
        },
        booking: {
          id: booking?._id,
          status: booking?.status,
        },
      },
    });
  } catch (error) {
    console.error("❌ Staff confirm check-in error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @swagger
 * /api/rentals/{rentalId}/customer-sign-contract:
 *   post:
 *     summary: Khách hàng ký hợp đồng điện tử
 *     tags: [Rentals]
 *     parameters:
 *       - in: path
 *         name: rentalId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rental ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               signature:
 *                 type: string
 *                 description: Base64 encoded signature image
 *               agreedTerms:
 *                 type: boolean
 *                 description: Khách đồng ý điều khoản
 *               signedAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Contract signed successfully
 *       404:
 *         description: Rental not found
 *       400:
 *         description: Invalid status or missing signature
 */
export const customerSignContract = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { signature, agreedTerms, signedAt } = req.body;

    if (!signature || !agreedTerms) {
      return res.status(400).json({
        message: "Signature and terms agreement are required",
      });
    }

    const rental = await Rental.findById(rentalId)
      .populate("booking")
      .populate("vehicle")
      .populate("renter");

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    // Kiểm tra rental phải ở trạng thái CHECKED_IN
    if (rental.status !== RENTAL_STATUS.CHECKED_IN) {
      return res.status(400).json({
        message: `Rental must be in CHECKED_IN status, currently: ${rental.status}`,
      });
    }

    const now = signedAt ? new Date(signedAt) : new Date();

    // Lưu thông tin chữ ký
    rental.contract = {
      signedAt: now,
      signature: signature,
      agreedTerms: agreedTerms,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.["user-agent"],
    };

    // Chuyển sang IN_PROGRESS (đang thuê)
    applyRentalStatus(rental, RENTAL_STATUS.IN_PROGRESS, {
      userId: rental.renter?._id || null,
      note: "Contract signed, rental in progress",
      timestamp: now,
    });

    rental.contractSignedAt = now;
    await rental.save();

    // Cập nhật booking sang SUCCESS (hoàn tất)
    const booking = await Booking.findById(rental.booking);
    if (booking) {
      booking.statusHistory = booking.statusHistory || [];
      booking.statusHistory.push({
        status: BOOKING_STATUS.SUCCESS,
        changedAt: now,
        changedBy: rental.renter?._id || null,
        note: "Contract signed, vehicle handed over",
      });
      booking.markModified("statusHistory");
      booking.status = BOOKING_STATUS.SUCCESS;
      booking.successAt = now;
      booking.lastStatusChangedAt = now;
      await booking.save();
    }

    res.json({
      success: true,
      message: "Contract signed successfully. Rental is now in progress.",
      data: {
        rental: {
          id: rental._id,
          status: rental.status,
          contractSignedAt: rental.contractSignedAt,
          startTime: rental.actualPickupTime,
        },
        booking: {
          id: booking?._id,
          status: booking?.status,
        },
      },
    });
  } catch (error) {
    console.error("❌ Customer sign contract error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @swagger
 * /api/rentals/ready-for-pickup:
 *   get:
 *     summary: Lấy danh sách rental đang chờ khách check-in (cho Staff)
 *     tags: [Rentals]
 *     parameters:
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: string
 *         description: Lọc theo trạm
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc theo ngày (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of rentals ready for pickup
 */
export const getReadyForPickupRentals = async (req, res) => {
  try {
    const { stationId, date } = req.query;

    const filter = {
      status: RENTAL_STATUS.READY_FOR_PICKUP,
    };

    if (stationId) {
      filter.pickupStation = stationId;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      filter.plannedPickupTime = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const rentals = await Rental.find(filter)
      .populate("renter", "name email phone")
      .populate("vehicle", "licensePlate model brand batteryLevel")
      .populate("booking", "bookingCode")
      .populate("pickupStation", "name address")
      .sort({ plannedPickupTime: 1 });

    res.json({
      success: true,
      count: rentals.length,
      data: rentals,
    });
  } catch (error) {
    console.error("❌ Get ready for pickup rentals error:", error);
    res.status(500).json({ message: error.message });
  }
};

export default {
  staffConfirmCheckin,
  customerSignContract,
  getReadyForPickupRentals,
};
