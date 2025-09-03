/**
 * Định nghĩa Lược đồ cho Refresh Token.
 * Mỗi document đại diện cho một phiên đăng nhập hợp lệ.
 */
const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ip: { type: String, required: true },
    userAgent: { type: String, required: true },
    expires: { type: Date, required: true },
    isValid: { type: Boolean, default: true },
    rememberMe: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

module.exports = RefreshToken;
