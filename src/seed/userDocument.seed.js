import UserDocument from "../models/userDocument.model.js";

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
  {
    userEmail: "minh.pham@example.com",
    docType: "driver_license",
    docNumber: "DL-654321",
    docImageUrl: "https://example.com/docs/dl-654321.jpg",
    verifyStatus: "approved",
    uploadedAt: new Date("2024-02-05T03:00:00.000Z"),
    verifiedAt: new Date("2024-02-06T09:30:00.000Z"),
    verifiedByEmail: "linh.vu@example.com",
  },
  {
    userEmail: "minh.pham@example.com",
    docType: "id_card",
    docNumber: "ID-123789",
    docImageUrl: "https://example.com/docs/id-123789.jpg",
    verifyStatus: "approved",
    uploadedAt: new Date("2024-02-05T03:05:00.000Z"),
    verifiedAt: new Date("2024-02-06T09:40:00.000Z"),
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

  const count = await UserDocument.estimatedDocumentCount();
  console.log(`User documents seed complete. Total documents: ${count}`);
};

export default seedUserDocuments;
