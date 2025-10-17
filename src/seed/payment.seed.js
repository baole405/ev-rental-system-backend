import Payment from "../models/payment.model.js";
import Brand from "../models/brand.model.js";

const DEFAULT_PAYMENTS = [
  {
    rentalKey: "alice-june-trip",
    method: "card",
    status: "paid",
    surchargeAmount: 50000,
    txnRef: "EVPAY-20240601-0001",
  },
  {
    rentalKey: "alice-august-ongoing",
    method: "card",
    status: "pending",
    surchargeAmount: 0,
    txnRef: null,
  },
  {
    rentalKey: "minh-danang-trip",
    method: "wallet",
    status: "paid",
    surchargeAmount: 30000,
    txnRef: "EVPAY-20240817-0003",
  },
];

export const seedPayments = async ({ rentalMap }) => {
  for (const payment of DEFAULT_PAYMENTS) {
    const rental = rentalMap.get(payment.rentalKey);
    if (!rental) {
      continue;
    }

    const rentalBooking = rental.booking ?? null;
    const rentalVehicle = rental.vehicle ?? null;

    const brandId =
      (rentalBooking?.brand?._id ?? rentalBooking?.brand) ??
      (rentalVehicle?.brand?._id ?? rentalVehicle?.brand) ??
      null;
    const brand = brandId ? await Brand.findById(brandId) : null;

    const rentalDays = Math.max(1, Number(rentalBooking?.rentalDays ?? 1));
    const baseDailyRate = Number(brand?.baseDailyRate ?? 0);
    const baseAmount =
      payment.baseAmount ?? Math.round(baseDailyRate * rentalDays);
    const depositAmount = Math.round(Number(brand?.depositAmount ?? 0));
    const surchargeAmount = payment.surchargeAmount ?? 0;
    const totalAmount =
      payment.totalAmount ?? baseAmount + depositAmount + surchargeAmount;

    let doc = await Payment.findOneAndUpdate(
      {
        rental: rental._id,
        method: payment.method,
      },
      {
        rental: rental._id,
        method: payment.method,
        status: payment.status,
        baseAmount,
        depositAmount,
        surchargeAmount,
        totalAmount,
        txnRef: payment.txnRef ?? null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    doc = await doc.populate(["rental"]);
  }

  const count = await Payment.estimatedDocumentCount();
  console.log(`Payment seed complete. Total payments: ${count}`);
};

export default seedPayments;
