import {
  PAYMENT_STATUS,
  RENTAL_STATUS,
  VEHICLE_STATUS,
} from "../constants/statusCodes.js";
import Payment from "../models/payment.model.js";
import Rental from "../models/rental.model.js";
import { applyRentalStatus } from "../services/rentalStatus.js";

/**
 * @swagger
 * /api/rentals/{rentalId}/customer-initiate-return:
 *   post:
 *     summary: Khách hàng bắt đầu quy trình trả xe
 *     tags: [Rentals - Return]
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
 *               returnStationId:
 *                 type: string
 *                 description: Trạm trả xe (có thể khác trạm pickup)
 *               estimatedReturnTime:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian dự kiến trả (mặc định = now)
 *     responses:
 *       200:
 *         description: Return initiated successfully
 *       404:
 *         description: Rental not found
 *       400:
 *         description: Invalid status
 */
export const customerInitiateReturn = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { returnStationId, estimatedReturnTime } = req.body;

    const rental = await Rental.findById(rentalId)
      .populate("renter", "name email phone")
      .populate("vehicle", "licensePlate model brand")
      .populate("pickupStation", "name address");

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    // Chỉ cho phép return nếu đang IN_PROGRESS hoặc LATE
    if (
      ![RENTAL_STATUS.IN_PROGRESS, RENTAL_STATUS.LATE].includes(rental.status)
    ) {
      return res.status(400).json({
        message: `Cannot initiate return. Rental status: ${rental.status}`,
      });
    }

    const now = estimatedReturnTime
      ? new Date(estimatedReturnTime)
      : new Date();

    // Chuyển sang RETURNING
    applyRentalStatus(rental, RENTAL_STATUS.RETURNING, {
      userId: rental.renter?._id || null,
      note: "Customer initiated return process",
      timestamp: now,
    });

    rental.returnStation = returnStationId || rental.pickupStation?._id;
    rental.estimatedReturnTime = now;

    await rental.save();

    res.json({
      success: true,
      message:
        "Return initiated. Please proceed to the station for inspection.",
      data: {
        rental: {
          id: rental._id,
          status: rental.status,
          returnStation: rental.returnStation,
          estimatedReturnTime: rental.estimatedReturnTime,
        },
      },
    });
  } catch (error) {
    console.error("❌ Customer initiate return error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @swagger
 * /api/rentals/{rentalId}/staff-inspect-return:
 *   post:
 *     summary: Staff kiểm tra xe khi khách trả
 *     tags: [Rentals - Return]
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
 *             required:
 *               - staffId
 *               - vehicleCondition
 *             properties:
 *               staffId:
 *                 type: string
 *                 description: ID của staff kiểm tra
 *               vehicleCondition:
 *                 type: object
 *                 properties:
 *                   batteryLevel:
 *                     type: number
 *                     description: Mức pin hiện tại (%)
 *                   mileage:
 *                     type: number
 *                     description: Số km hiện tại
 *                   exteriorPhotos:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: URLs ảnh ngoại thất (4 góc)
 *                   interiorPhotos:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: URLs ảnh nội thất
 *                   damages:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                           enum: [scratch, dent, broken, missing, stain]
 *                         location:
 *                           type: string
 *                         severity:
 *                           type: string
 *                           enum: [minor, moderate, severe]
 *                         estimatedCost:
 *                           type: number
 *                         photo:
 *                           type: string
 *                   notes:
 *                     type: string
 *               checklist:
 *                 type: object
 *                 properties:
 *                   cleanInterior:
 *                     type: boolean
 *                   cleanExterior:
 *                     type: boolean
 *                   tireCondition:
 *                     type: string
 *                     enum: [good, fair, poor]
 *                   lightsWorking:
 *                     type: boolean
 *                   brakesWorking:
 *                     type: boolean
 *               returnTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Inspection completed, fees calculated
 *       404:
 *         description: Rental not found
 *       400:
 *         description: Invalid status
 */
export const staffInspectReturn = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { staffId, vehicleCondition, checklist, returnTime } = req.body;

    if (!staffId || !vehicleCondition) {
      return res.status(400).json({
        message: "staffId and vehicleCondition are required",
      });
    }

    const rental = await Rental.findById(rentalId)
      .populate("renter", "name email phone")
      .populate("vehicle")
      .populate("booking")
      .populate("returnStation", "name address code");

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    // Phải ở trạng thái RETURNING
    if (rental.status !== RENTAL_STATUS.RETURNING) {
      return res.status(400).json({
        message: `Rental must be in RETURNING status, currently: ${rental.status}`,
      });
    }

    const now = returnTime ? new Date(returnTime) : new Date();

    // Lưu thông tin kiểm tra
    rental.returnInspection = {
      inspectedAt: now,
      inspectedBy: staffId,
      batteryLevel: vehicleCondition.batteryLevel || null,
      mileage: vehicleCondition.mileage || null,
      exteriorPhotos: vehicleCondition.exteriorPhotos || [],
      interiorPhotos: vehicleCondition.interiorPhotos || [],
      damages: vehicleCondition.damages || [],
      notes: vehicleCondition.notes || null,
      checklist: checklist || {},
    };

    rental.actualEndTime = now;
    rental.returnedAt = now;
    rental.odoEnd = vehicleCondition.mileage || rental.odoEnd || null;

    // 💰 Tính phí phát sinh
    const charges = calculateExtraCharges(rental, vehicleCondition);

    rental.extraCharges = charges.totalExtra;
    rental.extraChargeNotes = charges.notes;
    rental.lateDays = charges.lateDays;
    rental.lateFeeAmount = charges.lateFee;
    rental.damageCharges = charges.damageCharges;
    rental.cleaningFee = charges.cleaningFee;
    rental.batteryFee = charges.batteryFee;

    // Tổng tiền cần thanh toán thêm hoặc hoàn lại
    rental.amountDue = charges.totalExtra;
    rental.refundAmount =
      charges.totalExtra < 0 ? Math.abs(charges.totalExtra) : 0;

    // Chuyển sang RETURNED
    applyRentalStatus(rental, RENTAL_STATUS.RETURNED, {
      userId: staffId,
      note: `Vehicle returned. Extra charges: ${charges.totalExtra} VND`,
      timestamp: now,
    });

    await rental.save();

    // Cập nhật vehicle status
    const vehicle = rental.vehicle;
    if (vehicle) {
      const hasDamages = vehicleCondition.damages?.length > 0;
      const hasSevereDamage = vehicleCondition.damages?.some(
        (d) => d.severity === "severe"
      );

      if (hasSevereDamage) {
        vehicle.status = VEHICLE_STATUS.DAMAGED;
        applyRentalStatus(rental, RENTAL_STATUS.DAMAGED, {
          userId: staffId,
          note: "Vehicle has severe damage, requires repair",
          timestamp: now,
        });
        rental.damagedAt = now;
      } else if (hasDamages) {
        vehicle.status = VEHICLE_STATUS.MAINTENANCE;
      } else {
        vehicle.status = VEHICLE_STATUS.AVAILABLE;
      }

      vehicle.batteryLevel =
        vehicleCondition.batteryLevel || vehicle.batteryLevel;
      vehicle.mileage = vehicleCondition.mileage || vehicle.mileage;
      vehicle.stationId =
        rental.returnStation?.code || rental.returnStation?._id;

      await vehicle.save();
    }

    await rental.save();

    res.json({
      success: true,
      message: "Return inspection completed successfully",
      data: {
        rental: {
          id: rental._id,
          status: rental.status,
          returnedAt: rental.returnedAt,
          extraCharges: rental.extraCharges,
          amountDue: rental.amountDue,
          refundAmount: rental.refundAmount,
          charges: {
            lateFee: charges.lateFee,
            damageCharges: charges.damageCharges,
            cleaningFee: charges.cleaningFee,
            batteryFee: charges.batteryFee,
            total: charges.totalExtra,
          },
        },
        vehicle: {
          id: vehicle?._id,
          status: vehicle?.status,
          batteryLevel: vehicle?.batteryLevel,
        },
      },
    });
  } catch (error) {
    console.error("❌ Staff inspect return error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Tính phí phát sinh khi trả xe
 */
function calculateExtraCharges(rental, vehicleCondition) {
  let totalExtra = 0;
  let notes = [];

  // 1. Phí trễ hạn (Late Fee)
  let lateFee = 0;
  let lateDays = 0;

  if (rental.plannedReturnTime) {
    const planned = new Date(rental.plannedReturnTime);
    const actual = new Date();
    const diffMs = actual - planned;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      lateDays = diffDays;
      // Giả sử: 200,000 VND/ngày trễ
      lateFee = lateDays * 200000;
      totalExtra += lateFee;
      notes.push(`Late fee: ${lateDays} days × 200,000 VND`);
    }
  }

  // 2. Phí hư hỏng (Damage Charges)
  let damageCharges = 0;
  if (vehicleCondition.damages?.length > 0) {
    vehicleCondition.damages.forEach((damage) => {
      const cost = damage.estimatedCost || 0;
      damageCharges += cost;
      notes.push(`${damage.type} at ${damage.location}: ${cost} VND`);
    });
    totalExtra += damageCharges;
  }

  // 3. Phí vệ sinh (Cleaning Fee)
  let cleaningFee = 0;
  if (
    vehicleCondition.checklist?.cleanInterior === false ||
    vehicleCondition.checklist?.cleanExterior === false
  ) {
    cleaningFee = 100000; // 100k VND
    totalExtra += cleaningFee;
    notes.push("Cleaning fee: 100,000 VND");
  }

  // 4. Phí pin thấp (Battery Fee)
  let batteryFee = 0;
  if (vehicleCondition.batteryLevel && vehicleCondition.batteryLevel < 20) {
    // Nếu trả xe với pin < 20%, phạt 150k
    batteryFee = 150000;
    totalExtra += batteryFee;
    notes.push(
      `Low battery fee (${vehicleCondition.batteryLevel}%): 150,000 VND`
    );
  }

  return {
    lateDays,
    lateFee,
    damageCharges,
    cleaningFee,
    batteryFee,
    totalExtra,
    notes: notes.join("; "),
  };
}

/**
 * @swagger
 * /api/rentals/{rentalId}/finalize-return:
 *   post:
 *     summary: Hoàn tất quy trình trả xe (thanh toán phí phát sinh)
 *     tags: [Rentals - Return]
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
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, bank_transfer, credit_card, e_wallet]
 *                 description: Phương thức thanh toán phí phát sinh
 *               paidAmount:
 *                 type: number
 *                 description: Số tiền thực tế thanh toán
 *               staffId:
 *                 type: string
 *                 description: ID staff xác nhận
 *     responses:
 *       200:
 *         description: Return finalized successfully
 *       404:
 *         description: Rental not found
 *       400:
 *         description: Invalid status or payment
 */
export const finalizeReturn = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { paymentMethod, paidAmount, staffId } = req.body;

    const rental = await Rental.findById(rentalId)
      .populate("renter")
      .populate("booking")
      .populate("vehicle");

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    // Phải ở trạng thái RETURNED hoặc DAMAGED
    if (
      ![RENTAL_STATUS.RETURNED, RENTAL_STATUS.DAMAGED].includes(rental.status)
    ) {
      return res.status(400).json({
        message: `Cannot finalize return. Rental status: ${rental.status}`,
      });
    }

    const now = new Date();

    // Nếu có phí phát sinh, tạo payment record
    if (rental.amountDue > 0 && paidAmount && paymentMethod) {
      const payment = await Payment.create({
        booking: rental.booking?._id,
        rental: rental._id,
        renter: rental.renter?._id,
        method: paymentMethod,
        totalAmount: paidAmount,
        status: PAYMENT_STATUS.SUCCESS,
        paidAt: now,
        note: `Extra charges payment: ${rental.extraChargeNotes}`,
      });

      rental.extraChargePayment = payment._id;
      rental.paidAmount += paidAmount;
    }

    // Hoàn tiền nếu có (ví dụ: trả sớm, không hư hỏng)
    if (rental.refundAmount > 0) {
      const refundPayment = await Payment.create({
        booking: rental.booking?._id,
        rental: rental._id,
        renter: rental.renter?._id,
        method: paymentMethod || "bank_transfer",
        totalAmount: -rental.refundAmount, // Số âm = refund
        status: PAYMENT_STATUS.REFUNDED,
        paidAt: now,
        note: "Refund for early return or no damages",
      });

      rental.refundPayment = refundPayment._id;
    }

    // Chuyển sang COMPLETED
    applyRentalStatus(rental, RENTAL_STATUS.COMPLETED, {
      userId: staffId || null,
      note: "Return process completed",
      timestamp: now,
    });

    rental.completedAt = now;
    await rental.save();

    res.json({
      success: true,
      message: "Return finalized successfully",
      data: {
        rental: {
          id: rental._id,
          status: rental.status,
          completedAt: rental.completedAt,
          extraCharges: rental.extraCharges,
          paidAmount: rental.paidAmount,
          refundAmount: rental.refundAmount,
        },
      },
    });
  } catch (error) {
    console.error("❌ Finalize return error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @swagger
 * /api/rentals/in-progress:
 *   get:
 *     summary: Lấy danh sách rental đang sử dụng (cho Customer)
 *     tags: [Rentals - Return]
 *     parameters:
 *       - in: query
 *         name: renterId
 *         schema:
 *           type: string
 *         description: ID của khách hàng
 *     responses:
 *       200:
 *         description: List of rentals in progress
 */
export const getInProgressRentals = async (req, res) => {
  try {
    const { renterId } = req.query;

    const filter = {
      status: { $in: [RENTAL_STATUS.IN_PROGRESS, RENTAL_STATUS.LATE] },
    };

    if (renterId) {
      filter.renter = renterId;
    }

    const rentals = await Rental.find(filter)
      .populate("renter", "name email phone")
      .populate("vehicle", "licensePlate model brand batteryLevel")
      .populate("booking", "bookingCode")
      .populate("pickupStation", "name address")
      .sort({ plannedReturnTime: 1 });

    res.json({
      success: true,
      count: rentals.length,
      data: rentals,
    });
  } catch (error) {
    console.error("❌ Get in-progress rentals error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @swagger
 * /api/rentals/returning:
 *   get:
 *     summary: Lấy danh sách rental đang trả xe (cho Staff)
 *     tags: [Rentals - Return]
 *     parameters:
 *       - in: query
 *         name: stationId
 *         schema:
 *           type: string
 *         description: Lọc theo trạm
 *     responses:
 *       200:
 *         description: List of rentals being returned
 */
export const getReturningRentals = async (req, res) => {
  try {
    const { stationId } = req.query;

    const filter = {
      status: RENTAL_STATUS.RETURNING,
    };

    if (stationId) {
      filter.returnStation = stationId;
    }

    const rentals = await Rental.find(filter)
      .populate("renter", "name email phone")
      .populate("vehicle", "licensePlate model brand")
      .populate("booking", "bookingCode")
      .populate("returnStation", "name address")
      .sort({ estimatedReturnTime: 1 });

    res.json({
      success: true,
      count: rentals.length,
      data: rentals,
    });
  } catch (error) {
    console.error("❌ Get returning rentals error:", error);
    res.status(500).json({ message: error.message });
  }
};

export default {
  customerInitiateReturn,
  staffInspectReturn,
  finalizeReturn,
  getInProgressRentals,
  getReturningRentals,
};
