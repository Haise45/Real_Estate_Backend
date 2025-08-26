const jwt = require("jsonwebtoken");
const config = require("../config");

/**
 * Tạo Access Token cho người dùng.
 * @param {string|ObjectId} userId - ID của người dùng
 * @returns {string} - Chuỗi Access Token đã ký
 */
const generateAccessToken = (user) => {
  const payload = {
    sub: user._id,
    role: user.role.name, // Thêm tên vai trò
    permissions: user.role.permissions, // Thêm danh sách quyền
  };
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiration,
  });
};

/**
 * Xác minh và giải mã token JWT.
 * @param {string} token - Chuỗi token cần xác minh
 * @param {string} secret - Khóa bí mật dùng để xác minh
 * @returns {object} - Payload đã giải mã nếu token hợp lệ
 * @throws {Error} - Nếu token không hợp lệ hoặc hết hạn
 */
const verifyToken = (token, secret) => jwt.verify(token, secret);

module.exports = { generateAccessToken, verifyToken };
