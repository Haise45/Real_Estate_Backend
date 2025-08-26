const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const Role = require("../models/roleModel");

let mongoServer;

// Chạy một lần trước tất cả các test
before(async () => {
  // Tạo replica set
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1 }, // chỉ cần 1 node replica
  });

  const mongoUri = mongoServer.getUri();
  // Thiết lập các tùy chọn để xử lý việc đóng kết nối tốt hơn
  const mongooseOpts = {
    serverSelectionTimeoutMS: 5000, // Tăng thời gian chờ
  };
  await mongoose.connect(mongoUri, mongooseOpts);
  console.log("Kết nối thành công tới CSDL Test (Replica Set).");

  // Seed dữ liệu
  const roles = [
    {
      name: "Admin",
      permissions: [
        "users:read",
        "users:create",
        "users:update",
        "users:delete",
      ],
    },
    { name: "User", permissions: ["listings:create_own"] },
    { name: "Agent", permissions: ["listings:create"] },
    { name: "Agency", permissions: [] },
  ];
  await Role.insertMany(roles);
});

// Sau khi xong hết test
after(async () => {
  await mongoose.disconnect();
  console.log("Đã ngắt kết nối Mongoose.");
  if (mongoServer) {
    await mongoServer.stop();
    console.log("Đã dừng CSDL Test trong bộ nhớ.");
  }
});

// Dọn dữ liệu trước mỗi test case
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    if (collections[key].name !== "roles") {
      await collections[key].deleteMany({});
    }
  }
});
