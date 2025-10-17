import Payment from "../models/payment.model.js";
import Rental from "../models/rental.model.js";
import { createCrudHandlers } from "../utils/crudFactory.js";

const PAYMENT_RENTAL_POPULATE = [
  {
    path: "booking",
    populate: [{ path: "brand" }, { path: "pickupStation" }],
  },
  { path: "vehicle", populate: [{ path: "brand" }] },
  { path: "renter" },
  { path: "pickupStation" },
  { path: "returnStation" },
];

const PAYMENT_POPULATE = [
  {
    path: "rental",
    populate: PAYMENT_RENTAL_POPULATE,
  },
];

const { list, get, remove } = createCrudHandlers(Payment, {
  populate: PAYMENT_POPULATE,
});

const normalizeCurrency = (value, fallback = 0) => {
  if (value === undefined || value === null) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.round(parsed);
};

const resolveRental = async (rentalId) =>
  Rental.findById(rentalId).populate(PAYMENT_RENTAL_POPULATE);

const resolveBrandFromRental = (rental) => {
  if (!rental) {
    return null;
  }
  if (rental.booking?.brand) {
    return rental.booking.brand;
  }
  if (rental.vehicle?.brand) {
    return rental.vehicle.brand;
  }
  return null;
};

const computePaymentAmounts = (rental, surchargeAmount) => {
  const brand = resolveBrandFromRental(rental);
  if (!brand) {
    return {
      error: {
        status: 400,
        message: "Unable to determine brand for rental pricing",
      },
    };
  }

  const rentalDays = Math.max(1, Number(rental.booking?.rentalDays ?? 1));
  const baseDailyRate = Number(brand.baseDailyRate ?? 0);
  const baseAmount = Math.round(baseDailyRate * rentalDays);
  const depositAmount = Math.round(Number(brand.depositAmount ?? 0));
  const surcharge = normalizeCurrency(surchargeAmount, 0);
  const totalAmount = baseAmount + depositAmount + surcharge;

  return {
    baseAmount,
    depositAmount,
    surchargeAmount: surcharge,
    totalAmount,
  };
};

export const listPayments = list;
export const getPayment = get;
export const deletePayment = remove;

export const createPayment = async (req, res, next) => {
  try {
    if (!req.body.rental) {
      return res.status(400).json({ message: "rental field is required" });
    }

    const rental = await resolveRental(req.body.rental);
    if (!rental) {
      return res.status(400).json({ message: "Invalid rental specified" });
    }

    const amounts = computePaymentAmounts(
      rental,
      req.body.surchargeAmount ?? 0
    );

    if (amounts.error) {
      return res
        .status(amounts.error.status)
        .json({ message: amounts.error.message });
    }

    const paymentPayload = {
      ...req.body,
      rental: rental._id,
      baseAmount: amounts.baseAmount,
      depositAmount: amounts.depositAmount,
      surchargeAmount: amounts.surchargeAmount,
      totalAmount: amounts.totalAmount,
    };

    const payment = await Payment.create(paymentPayload);
    const populated = await payment.populate(PAYMENT_POPULATE);

    res.status(201).json({
      data: {
        ...populated.toObject(),
        pricing: {
          baseAmount: amounts.baseAmount,
          depositAmount: amounts.depositAmount,
          surchargeAmount: amounts.surchargeAmount,
          totalAmount: amounts.totalAmount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const rentalId = req.body.rental ?? payment.rental;
    const rental = await resolveRental(rentalId);
    if (!rental) {
      return res.status(400).json({ message: "Invalid rental specified" });
    }

    const surchargeAmount =
      req.body.surchargeAmount ?? payment.surchargeAmount ?? 0;
    const amounts = computePaymentAmounts(rental, surchargeAmount);

    if (amounts.error) {
      return res
        .status(amounts.error.status)
        .json({ message: amounts.error.message });
    }

    const updatePayload = {
      ...req.body,
      rental: rental._id,
      baseAmount: amounts.baseAmount,
      depositAmount: amounts.depositAmount,
      surchargeAmount: amounts.surchargeAmount,
      totalAmount: amounts.totalAmount,
    };

    const updated = await Payment.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    ).populate(PAYMENT_POPULATE);

    res.json({
      data: {
        ...updated.toObject(),
        pricing: {
          baseAmount: amounts.baseAmount,
          depositAmount: amounts.depositAmount,
          surchargeAmount: amounts.surchargeAmount,
          totalAmount: amounts.totalAmount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
};
