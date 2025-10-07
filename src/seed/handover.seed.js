import Handover from "../models/handover.model.js";

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
  {
    rentalKey: "alice-august-ongoing",
    vehicleVin: "EVR-2024-0005",
    staffEmail: "bao.tran@example.com",
    action: "pickup",
    notes: "Staff noted renter requested child seat.",
    photosUrl: "https://example.com/photos/pickup-evr-2024-0005.jpg",
  },
  {
    rentalKey: "minh-danang-trip",
    vehicleVin: "EVR-2024-0003",
    staffEmail: "linh.vu@example.com",
    action: "pickup",
    notes: "Battery topped up to 95% before departure.",
    photosUrl: "https://example.com/photos/pickup-evr-2024-0003.jpg",
  },
  {
    rentalKey: "minh-danang-trip",
    vehicleVin: "EVR-2024-0003",
    staffEmail: "linh.vu@example.com",
    action: "return",
    notes: "No scratches found, interior sanitized.",
    photosUrl: "https://example.com/photos/return-evr-2024-0003.jpg",
  },
];

export const seedHandovers = async ({ rentalMap, vehicleMap, userMap }) => {
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

  const count = await Handover.estimatedDocumentCount();
  console.log(`Handover seed complete. Total handovers: ${count}`);
};

export default seedHandovers;
