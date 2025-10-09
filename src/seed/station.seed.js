import Station from "../models/station.model.js";

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
  {
    code: "station-dn-01",
    name: "Da Nang Beach Station",
    address: "85 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng",
    lat: 16.06969,
    lng: 108.241638,
    openHours: "07:30-22:00",
    status: "active",
  },
];

export const seedStations = async () => {
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

  const count = await Station.estimatedDocumentCount();
  console.log(`Station seed complete. Total stations: ${count}`);

  return stationMap;
};

export default seedStations;
