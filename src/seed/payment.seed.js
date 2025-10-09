import Payment from "../models/payment.model.js";

const DEFAULT_PAYMENTS = [
  {
    rentalKey: "alice-june-trip",
    method: "card",
    status: "paid",
    baseAmount: 450000,
    surchargeAmount: 50000,
    totalAmount: 500000,
    txnRef: "EVPAY-20240601-0001",
  },
  {
    rentalKey: "alice-august-ongoing",
    method: "card",
    status: "pending",
    baseAmount: 0,
    surchargeAmount: 0,
    totalAmount: 0,
    txnRef: null,
  },
  {
    rentalKey: "minh-danang-trip",
    method: "wallet",
    status: "paid",
    baseAmount: 620000,
    surchargeAmount: 30000,
    totalAmount: 650000,
    txnRef: "EVPAY-20240817-0003",
  },
];

export const seedPayments = async ({ rentalMap }) => {
  for (const payment of DEFAULT_PAYMENTS) {
    const rental = rentalMap.get(payment.rentalKey);
    if (!rental) {
      continue;
    }

    let doc = await Payment.findOneAndUpdate(
      {
        rental: rental._id,
        method: payment.method,
      },
      {
        rental: rental._id,
        method: payment.method,
        status: payment.status,
        baseAmount: payment.baseAmount,
        surchargeAmount: payment.surchargeAmount,
        totalAmount: payment.totalAmount,
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
