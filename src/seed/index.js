import { seedUsers } from "./user.seed.js";
import { seedStations } from "./station.seed.js";
import { seedUserDocuments } from "./userDocument.seed.js";
import { seedBookings } from "./booking.seed.js";
import { seedRentals } from "./rental.seed.js";
import { seedHandovers } from "./handover.seed.js";
import { seedPayments } from "./payment.seed.js";
import { seedVehicles } from "./vehicle.seed.js";

export const seedDatabase = async () => {
  const userMap = await seedUsers();
  const stationMap = await seedStations();

  const vehicles = await seedVehicles({ stationMap });
  const vehicleMap = new Map((vehicles ?? []).map((vehicle) => [vehicle.vin, vehicle]));

  const bookingMap = await seedBookings({ userMap, stationMap, vehicleMap });

  await seedUserDocuments({ userMap });

  const rentalMap = await seedRentals({
    userMap,
    stationMap,
    vehicleMap,
    bookingMap,
  });

  await seedHandovers({ rentalMap, vehicleMap, userMap });
  await seedPayments({ rentalMap });
};

export default seedDatabase;
