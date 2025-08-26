/**
 * Đọc tất cả các biến từ file .env và tập hợp vào một object `config`.
 */
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoURI: process.env.MONGO_URI,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION,
  },
  otp: {
    expirationMinutes: parseInt(process.env.OTP_EXPIRATION_MINUTES, 10) || 10,
  },
  session: {
    refreshTokenExpirationDays:
      parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS, 10) || 7,
    refreshTokenRememberMeExpirationDays:
      parseInt(process.env.REFRESH_TOKEN_REMEMBER_ME_EXPIRATION_DAYS, 10) || 30,
    maxActiveSessions: parseInt(process.env.MAX_ACTIVE_SESSIONS, 10) || 3,
  },
  mail: {
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM,
  },
};
