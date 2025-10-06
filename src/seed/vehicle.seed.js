import Vehicle from "../models/vehicle.model.js";

export const DEFAULT_VEHICLES = [
  {
    vin: "EVR-2024-0001",
    model: "Tesla Model 3",
    plateNo: "51H-123.45",
    batteryPercent: 85,
    status: "available",
    odometer: 12450,
    stationCode: "station-hcm-01",
  },
  {
    vin: "EVR-2024-0002",
    model: "Nissan Leaf",
    plateNo: "59A-678.90",
    batteryPercent: 60,
    status: "maintenance",
    odometer: 30210,
    stationCode: "station-hcm-02",
  },
];

export const seedVehicles = async ({ stationMap } = {}) => {
  const seededVehicles = [];

  for (const vehicle of DEFAULT_VEHICLES) {
    const payload = { ...vehicle };
    if (payload.stationCode && stationMap?.has(payload.stationCode)) {
      payload.station = stationMap.get(payload.stationCode)._id;
    }
    delete payload.stationCode;

    let doc = await Vehicle.findOneAndUpdate(
      { vin: payload.vin },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    doc = await doc.populate("station");
    seededVehicles.push(doc);
  }

  const count = await Vehicle.estimatedDocumentCount();
  console.log(`Vehicle seed complete. Total vehicles: ${count}`);

  return seededVehicles;
};

export default seedVehicles;
