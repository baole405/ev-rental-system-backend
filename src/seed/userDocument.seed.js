import UserDocument from "../models/userDocument.model.js";

const DEFAULT_USER_DOCUMENTS = [
  {
    userEmail: "alice.nguyen@example.com",
    documentType: "national_id",
    identityNumber: "012345678901",
    drivingLicenseNumber: "DL-123456",
    frontImageUrl: "https://example.com/docs/alice-id-front.jpg",
    backImageUrl: "https://example.com/docs/alice-id-back.jpg",
    drivingLicenseImageUrl: "https://example.com/docs/alice-license.jpg",
    status: "verified",
    notes: "Verified for long-term rental",
    submittedAt: new Date("2024-01-10T02:00:00.000Z"),
    verifiedAt: new Date("2024-01-12T04:30:00.000Z"),
    verifiedByEmail: "bao.tran@example.com",
  },
  {
    userEmail: "alice.nguyen@example.com",
    documentType: "national_id",
    identityNumber: "012345678902",
    drivingLicenseNumber: "DL-987650",
    frontImageUrl: "https://example.com/docs/alice-id2-front.jpg",
    backImageUrl: "https://example.com/docs/alice-id2-back.jpg",
    drivingLicenseImageUrl: "https://example.com/docs/alice-license2.jpg",
    status: "pending",
    notes: "Awaiting verification for updated address",
    submittedAt: new Date("2024-01-15T07:00:00.000Z"),
  },
  {
    userEmail: "minh.pham@example.com",
    documentType: "national_id",
    identityNumber: "098765432101",
    drivingLicenseNumber: "DL-654321",
    frontImageUrl: "https://example.com/docs/minh-id-front.jpg",
    backImageUrl: "https://example.com/docs/minh-id-back.jpg",
    drivingLicenseImageUrl: "https://example.com/docs/minh-license.jpg",
    status: "verified",
    notes: "Qualified for premium vehicles",
    submittedAt: new Date("2024-02-05T03:00:00.000Z"),
    verifiedAt: new Date("2024-02-06T09:30:00.000Z"),
    verifiedByEmail: "linh.vu@example.com",
  },
];

export const seedUserDocuments = async ({ userMap }) => {
  for (const document of DEFAULT_USER_DOCUMENTS) {
    const user = userMap.get(document.userEmail);
    if (!user) {
      continue;
    }

    const payload = {
      user: user._id,
      documentType: document.documentType,
      identityNumber: document.identityNumber,
      drivingLicenseNumber: document.drivingLicenseNumber,
      frontImageUrl: document.frontImageUrl,
      backImageUrl: document.backImageUrl,
      drivingLicenseImageUrl: document.drivingLicenseImageUrl,
      status: document.status ?? "pending",
      notes: document.notes ?? null,
      submittedAt: document.submittedAt ?? new Date(),
      verifiedAt: document.verifiedAt ?? null,
      verifiedBy: document.verifiedByEmail
        ? userMap.get(document.verifiedByEmail)?._id ?? null
        : null,
    };

    let doc = await UserDocument.findOneAndUpdate(
      { user: user._id, documentType: document.documentType, identityNumber: document.identityNumber },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    doc = await doc.populate(["user", "verifiedBy"]);
  }

  const count = await UserDocument.estimatedDocumentCount();
  console.log(`User documents seed complete. Total documents: ${count}`);
};

export default seedUserDocuments;
