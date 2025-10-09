import User from "../models/user.model.js";

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
  {
    email: "minh.pham@example.com",
    fullName: "Minh Phạm",
    phone: "0988666777",
    passwordHash: "$2a$10$evrentalminhplaceholder",
    role: "renter",
    status: "active",
  },
  {
    email: "linh.vu@example.com",
    fullName: "Linh Vũ",
    phone: "0911222333",
    passwordHash: "$2a$10$evrentalstafflinhplaceholder",
    role: "staff",
    status: "active",
  },
];

export const seedUsers = async () => {
  const userMap = new Map();

  for (const user of DEFAULT_USERS) {
    const doc = await User.findOneAndUpdate(
      { email: user.email },
      user,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    userMap.set(user.email, doc);
  }

  const count = await User.estimatedDocumentCount();
  console.log(`User seed complete. Total users: ${count}`);

  return userMap;
};

export default seedUsers;
