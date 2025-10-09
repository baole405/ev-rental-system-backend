import Vehicle from "../models/vehicle.model.js";

const DEFAULT_VEHICLES = [
  {
    vin: "EVR-2024-0001",
    model: "Tesla Model 3",
    plateNo: "51H-123.45",
    batteryPercent: 85,
    status: "available",
    odometer: 12450,
    stationId: "station-hcm-01",
  },
  {
    vin: "EVR-2024-0002",
    model: "Nissan Leaf",
    plateNo: "59A-678.90",
    batteryPercent: 60,
    status: "maintenance",
    odometer: 30210,
    stationId: "station-hcm-02",
  },
  {
    vin: "EVR-2024-0003",
    model: "VinFast VF e34",
    plateNo: "43A-456.78",
    batteryPercent: 92,
    status: "available",
    odometer: 8450,
    stationId: "station-dn-01",
  },
  {
    vin: "EVR-2024-0004",
    model: "Hyundai Kona Electric",
    plateNo: "30H-246.80",
    batteryPercent: 70,
    status: "rented",
    odometer: 17890,
    stationId: "station-hn-01",
  },
  {
    vin: "EVR-2024-0005",
    model: "Kia EV6",
    plateNo: "51K-555.88",
    batteryPercent: 40,
    status: "maintenance",
    odometer: 22010,
    stationId: "station-hcm-02",
  },
];

export const seedVehicles = async ({ stationMap } = {}) => {
  const seededVehicles = [];
  for (const vehicle of DEFAULT_VEHICLES) {
    const station = stationMap?.get(vehicle.stationId);
    const payload = {
      ...vehicle,
      stationId: station?.code ?? vehicle.stationId,
    };

    const doc = await Vehicle.findOneAndUpdate(
      { vin: vehicle.vin },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    seededVehicles.push(doc);
  }

  const count = await Vehicle.estimatedDocumentCount();
  console.log(`Vehicle seed complete. Total vehicles: ${count}`);

  return seededVehicles;
};

export default seedVehicles;
