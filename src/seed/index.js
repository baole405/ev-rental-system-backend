import User from "../models/user.model.js";
import UserDocument from "../models/userDocument.model.js";
import Station from "../models/station.model.js";
import Booking from "../models/booking.model.js";
import Rental from "../models/rental.model.js";
import Handover from "../models/handover.model.js";
import Payment from "../models/payment.model.js";
import { seedVehicles } from "./vehicle.seed.js";

const DEFAULT_USERS = [
  {
    email: "alice.nguyen@example.com",
    fullName: "Alice Nguyen",
    phone: "0900123456",
    passwordHash: "$2a$10$evrentalaliceplaceholder",
    role: "renter",
    status: "active",
  },
  {
    email: "bao.tran@example.com",
    fullName: "Bảo Trần",
    phone: "0900765432",
    passwordHash: "$2a$10$evrentalstaffplaceholder",
    role: "staff",
    status: "active",
  },
  {
    email: "admin.le@example.com",
    fullName: "Admin Lê",
    phone: null,
    passwordHash: "$2a$10$evrentaladminplaceholder",
    role: "admin",
    status: "active",
  },
];

const DEFAULT_USER_DOCUMENTS = [
  {
    userEmail: "alice.nguyen@example.com",
    docType: "driver_license",
    docNumber: "DL-123456",
    docImageUrl: "https://example.com/docs/dl-123456.jpg",
    verifyStatus: "approved",
    uploadedAt: new Date("2024-01-10T02:00:00.000Z"),
    verifiedAt: new Date("2024-01-12T04:30:00.000Z"),
    verifiedByEmail: "bao.tran@example.com",
  },
  {
    userEmail: "alice.nguyen@example.com",
    docType: "id_card",
    docNumber: "ID-987654",
    docImageUrl: "https://example.com/docs/id-987654.jpg",
    verifyStatus: "pending",
    uploadedAt: new Date("2024-01-15T07:00:00.000Z"),
  },
];

const DEFAULT_STATIONS = [
  {
    code: "station-hcm-01",
    name: "Ho Chi Minh EV Hub",
    address: "12 Nguyễn Huệ, Quận 1, TP. HCM",
    lat: 10.776889,
    lng: 106.700806,
    openHours: "08:00-22:00",
    status: "active",
  },
  {
    code: "station-hcm-02",
    name: "Saigon Riverfront Station",
    address: "45 Bến Vân Đồn, Quận 4, TP. HCM",
    lat: 10.758187,
    lng: 106.706932,
    openHours: "07:00-21:00",
    status: "maintenance",
  },
  {
    code: "station-hn-01",
    name: "Hanoi Old Quarter Station",
    address: "23 Hàng Gai, Hoàn Kiếm, Hà Nội",
    lat: 21.033781,
    lng: 105.852412,
    openHours: "06:30-21:30",
    status: "active",
  },
];

const DEFAULT_BOOKINGS = [
  {
    key: "alice-early-june",
    renterEmail: "alice.nguyen@example.com",
    pickupStationCode: "station-hcm-01",
    vehicleVin: "EVR-2024-0001",
    pickupTimeExpected: new Date("2024-06-01T08:00:00.000Z"),
    status: "confirmed",
  },
  {
    key: "alice-july-hold",
    renterEmail: "alice.nguyen@example.com",
    pickupStationCode: "station-hn-01",
    vehicleVin: null,
    pickupTimeExpected: new Date("2024-07-10T09:00:00.000Z"),
    status: "pending",
  },
];

const DEFAULT_RENTALS = [
  {
    key: "alice-june-trip",
    bookingKey: "alice-early-june",
    renterEmail: "alice.nguyen@example.com",
    vehicleVin: "EVR-2024-0001",
    pickupStationCode: "station-hcm-01",
    returnStationCode: "station-hcm-02",
    pickupTime: new Date("2024-06-01T08:15:00.000Z"),
    returnTime: new Date("2024-06-01T10:00:00.000Z"),
    odoStart: 12450,
    odoEnd: 12530,
    conditionNotes: "Returned with clean interior.",
    status: "completed",
  },
];

const DEFAULT_HANDOVERS = [
  {
    rentalKey: "alice-june-trip",
    vehicleVin: "EVR-2024-0001",
    staffEmail: "bao.tran@example.com",
    action: "pickup",
    notes: "Battery at 85% before departure.",
    photosUrl: "https://example.com/photos/pickup-evr-2024-0001.jpg",
  },
  {
    rentalKey: "alice-june-trip",
    vehicleVin: "EVR-2024-0001",
    staffEmail: "bao.tran@example.com",
    action: "return",
    notes: "Minor dust cleaned after inspection.",
    photosUrl: "https://example.com/photos/return-evr-2024-0001.jpg",
  },
];

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
];

export const seedDatabase = async () => {
  const userMap = new Map();
  for (const user of DEFAULT_USERS) {
    const doc = await User.findOneAndUpdate(
      { email: user.email },
      user,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    userMap.set(user.email, doc);
  }
  console.log(`User seed complete. Total users: ${await User.estimatedDocumentCount()}`);

  const stationMap = new Map();
  for (const station of DEFAULT_STATIONS) {
    const { code, ...payload } = station;
    const doc = await Station.findOneAndUpdate(
      { code },
      { code, ...payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    stationMap.set(code, doc);
  }
  console.log(
    `Station seed complete. Total stations: ${await Station.estimatedDocumentCount()}`
  );

  const vehicles = await seedVehicles({ stationMap });
  const vehicleMap = new Map(vehicles.map((vehicle) => [vehicle.vin, vehicle]));

  const bookingMap = new Map();
  for (const booking of DEFAULT_BOOKINGS) {
    const renter = userMap.get(booking.renterEmail);
    const pickupStation = stationMap.get(booking.pickupStationCode);
    if (!renter || !pickupStation) {
      continue;
    }
    const payload = {
      renter: renter._id,
      pickupStation: pickupStation._id,
      vehicle: booking.vehicleVin
        ? vehicleMap.get(booking.vehicleVin)?._id ?? null
        : null,
      pickupTimeExpected: booking.pickupTimeExpected,
      status: booking.status,
    };

    let doc = await Booking.findOneAndUpdate(
      {
        renter: renter._id,
        pickupTimeExpected: booking.pickupTimeExpected,
      },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    doc = await doc.populate(["renter", "pickupStation", "vehicle"]);
    bookingMap.set(booking.key, doc);
  }
  console.log(
    `Booking seed complete. Total bookings: ${await Booking.estimatedDocumentCount()}`
  );

  for (const document of DEFAULT_USER_DOCUMENTS) {
    const user = userMap.get(document.userEmail);
    if (!user) {
      continue;
    }
    const payload = {
      user: user._id,
      docType: document.docType,
      docNumber: document.docNumber,
      docImageUrl: document.docImageUrl,
      verifyStatus: document.verifyStatus,
      uploadedAt: document.uploadedAt,
      verifiedAt: document.verifiedAt ?? null,
      verifiedBy: document.verifiedByEmail
        ? userMap.get(document.verifiedByEmail)?._id ?? null
        : null,
    };

    let doc = await UserDocument.findOneAndUpdate(
      { user: user._id, docType: document.docType },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    doc = await doc.populate(["user", "verifiedBy"]);
  }
  console.log(
    `User documents seed complete. Total documents: ${await UserDocument.estimatedDocumentCount()}`
  );

  const rentalMap = new Map();
  for (const rental of DEFAULT_RENTALS) {
    const renter = userMap.get(rental.renterEmail);
    const vehicle = vehicleMap.get(rental.vehicleVin);
    const pickupStation = stationMap.get(rental.pickupStationCode);
    const returnStation = rental.returnStationCode
      ? stationMap.get(rental.returnStationCode)
      : null;
    if (!renter || !vehicle || !pickupStation) {
      continue;
    }

    const payload = {
      booking: rental.bookingKey ? bookingMap.get(rental.bookingKey)?._id ?? null : null,
      renter: renter._id,
      vehicle: vehicle._id,
      pickupStation: pickupStation._id,
      returnStation: returnStation?._id ?? null,
      pickupTime: rental.pickupTime,
      returnTime: rental.returnTime ?? null,
      odoStart: rental.odoStart ?? null,
      odoEnd: rental.odoEnd ?? null,
      conditionNotes: rental.conditionNotes ?? null,
      status: rental.status,
    };

    let doc = await Rental.findOneAndUpdate(
      {
        renter: renter._id,
        vehicle: vehicle._id,
        pickupTime: rental.pickupTime,
      },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    doc = await doc.populate([
      "booking",
      "renter",
      "vehicle",
      "pickupStation",
      "returnStation",
    ]);
    rentalMap.set(rental.key, doc);
  }
  console.log(
    `Rental seed complete. Total rentals: ${await Rental.estimatedDocumentCount()}`
  );

  for (const handover of DEFAULT_HANDOVERS) {
    const rental = rentalMap.get(handover.rentalKey);
    const vehicle = vehicleMap.get(handover.vehicleVin);
    const staff = userMap.get(handover.staffEmail);
    if (!rental || !vehicle || !staff) {
      continue;
    }

    let doc = await Handover.findOneAndUpdate(
      {
        rental: rental._id,
        action: handover.action,
      },
      {
        rental: rental._id,
        vehicle: vehicle._id,
        staff: staff._id,
        action: handover.action,
        notes: handover.notes ?? null,
        photosUrl: handover.photosUrl ?? null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    doc = await doc.populate(["rental", "vehicle", "staff"]);
  }
  console.log(
    `Handover seed complete. Total handovers: ${await Handover.estimatedDocumentCount()}`
  );

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
  console.log(
    `Payment seed complete. Total payments: ${await Payment.estimatedDocumentCount()}`
  );
};

export default seedDatabase;
