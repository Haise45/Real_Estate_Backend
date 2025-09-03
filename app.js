const express = require("express");
const cookieParser = require("cookie-parser");
const errorMiddleware = require("./middlewares/errorMiddleware");
const i18nMiddleware = require("./middlewares/i18nMiddleware");
const authRoutes = require("./routes/authRoute");
const userRoutes = require("./routes/userRoute");
const cors = require("cors");
const app = express();
require("dotenv").config();

app.use(express.json());
app.use(cookieParser());
app.set("trust proxy", true); // Để lấy đúng IP khi chạy sau proxy

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
); // Áp dụng middleware CORS

app.use(i18nMiddleware); // Áp dụng middleware đa ngôn ngữ toàn cục

// Gắn các route
app.get("/", (req, res) => res.send("API đang chạy..."));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use(errorMiddleware); // Middleware xử lý lỗi luôn đặt cuối cùng

module.exports = app;
