/**
 * Chịu trách nhiệm kết nối đến cơ sở dữ liệu MongoDB.
 */
const mongoose = require("mongoose");
const config = require("./index");

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoURI);
    console.log("Kết nối MongoDB thành công.");
  } catch (error) {
    console.error("Lỗi kết nối MongoDB:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
