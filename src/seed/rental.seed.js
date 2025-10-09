import Rental from "../models/rental.model.js";

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
  {
    key: "alice-august-ongoing",
    bookingKey: "alice-august-getaway",
    renterEmail: "alice.nguyen@example.com",
    vehicleVin: "EVR-2024-0005",
    pickupStationCode: "station-hcm-01",
    returnStationCode: null,
    pickupTime: new Date("2024-08-05T02:15:00.000Z"),
    returnTime: null,
    odoStart: 12540,
    odoEnd: null,
    conditionNotes: "Vehicle dispatched for coastal tour.",
    status: "ongoing",
  },
  {
    key: "minh-danang-trip",
    bookingKey: "minh-danang-weekend",
    renterEmail: "minh.pham@example.com",
    vehicleVin: "EVR-2024-0003",
    pickupStationCode: "station-dn-01",
    returnStationCode: "station-dn-01",
    pickupTime: new Date("2024-08-17T02:45:00.000Z"),
    returnTime: new Date("2024-08-17T11:30:00.000Z"),
    odoStart: 8450,
    odoEnd: 8725,
    conditionNotes: "Returned fully charged after complimentary wash.",
    status: "completed",
  },
];

export const seedRentals = async ({
  userMap,
  stationMap,
  vehicleMap,
  bookingMap,
}) => {
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
      booking: rental.bookingKey
        ? bookingMap.get(rental.bookingKey)?._id ?? null
        : null,
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

  const count = await Rental.estimatedDocumentCount();
  console.log(`Rental seed complete. Total rentals: ${count}`);

  return rentalMap;
};

export default seedRentals;
