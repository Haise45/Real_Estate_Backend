/**
 * Script này dùng để tạo các tài khoản người dùng mẫu trong cơ sở dữ liệu.
 * Chạy script này một lần để có dữ liệu cho việc kiểm thử.
 * Lệnh để chạy: node seed.js
 */
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/userModel"); // Đảm bảo đường dẫn chính xác

// Tải các biến môi trường từ file .env
dotenv.config({ path: "./.env" });

// Dữ liệu người dùng mẫu
const users = [
  {
    email: "user1@test.com",
    password: "Password123!", // Mật khẩu sẽ được tự động hash bởi model
  },
  {
    email: "user2@test.com",
    password: "Password123!",
  },
  {
    email: "user3@test.com",
    password: "Password123!",
  },
];

const seedUsers = async () => {
  try {
    // 1. Kết nối đến MongoDB
    console.log("Đang kết nối tới cơ sở dữ liệu...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Kết nối MongoDB thành công.");

    // 2. Xóa các tài khoản test cũ (nếu có) để tránh trùng lặp
    console.log("Đang xóa các tài khoản test cũ...");
    const userEmails = users.map((u) => u.email);
    await User.deleteMany({ email: { $in: userEmails } });
    console.log("Đã xóa tài khoản cũ.");

    // 3. Tạo các tài khoản mới
    // Model User sẽ tự động hash mật khẩu trước khi lưu
    console.log("Đang tạo các tài khoản mới...");
    await User.create(users);
    console.log("✅ Tạo tài khoản người dùng thành công!");
  } catch (error) {
    console.error("❌ Đã xảy ra lỗi trong quá trình tạo dữ liệu:", error);
  } finally {
    // 4. Ngắt kết nối khỏi cơ sở dữ liệu
    await mongoose.disconnect();
    console.log("Đã ngắt kết nối khỏi cơ sở dữ liệu.");
    process.exit();
  }
};

// Chạy hàm tạo dữ liệu
seedUsers();
