const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Role = require("./models/roleModel");

dotenv.config({ path: "./.env" });

const roles = [
  {
    name: "Admin",
    permissions: [
      "users:create",
      "users:read",
      "users:update",
      "users:delete",
      "roles:manage",
      "listings:manage",
    ],
  },
  {
    name: "Manager",
    permissions: [
      "users:create_employee",
      "users:read",
      "users:update_employee",
      "agencies:manage",
    ],
  },
  {
    name: "Employees",
    permissions: ["listings:create", "listings:approve", "listings:read"],
  },
  {
    name: "Agency",
    permissions: [
      "agents:create",
      "agents:manage",
      "listings:create",
      "listings:read_own",
    ],
  },
  { name: "Agent", permissions: ["listings:create", "listings:read_own"] },
  { name: "User", permissions: ["listings:create_own", "listings:read_own"] },
];

const seedRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Đang xóa các vai trò cũ...");
    await Role.deleteMany({});
    console.log("Đang tạo các vai trò mới...");
    await Role.insertMany(roles);
    console.log("✅ Tạo vai trò thành công!");
  } catch (error) {
    console.error("❌ Lỗi:", error);
  } finally {
    await mongoose.disconnect();
  }
};

seedRoles();
