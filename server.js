/**
 * Điểm vào (entry point) để khởi chạy máy chủ.
 * File này sẽ chịu trách nhiệm kết nối CSDL và lắng nghe các request.
 */
const app = require("./app");
const config = require("./config");
const connectDB = require("./config/db");
const logger = require("./config/logger");

// Hàm khởi động server
const startServer = async () => {
  try {
    // 1. Kết nối đến cơ sở dữ liệu
    await connectDB();

    // 2. SAU KHI kết nối thành công, mới khởi động server
    const server = app.listen(config.port, () => {
      logger.info(`Máy chủ đang chạy trên cổng ${config.port}`);
    });

    // Bắt các lỗi promise chưa được xử lý
    process.on("unhandledRejection", (err) => {
      logger.error(`Lỗi Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    logger.error("Không thể khởi động server do lỗi kết nối CSDL:", error);
    process.exit(1);
  }
};

// Chạy hàm khởi động
startServer();
