const shortid = require("shortid");
const RefreshToken = require("../models/refreshTokenModel");
const config = require("../config");

/**
 * Tạo refresh token mới cho người dùng.
 * @param {string|ObjectId} userId - ID của người dùng
 * @param {string} ip - Địa chỉ IP khi tạo token
 * @param {string} userAgent - Thông tin trình duyệt/thiết bị
 * @param {number} expirationDays - Số ngày mà token sẽ hợp lệ (linh hoạt cho tính năng "Nhớ tôi")
 * @param {boolean} rememberMe - Có sử dụng tính năng "Nhớ tôi" hay không
 * @returns {Promise<string>} - Chuỗi refresh token
 */
const createRefreshToken = async (userId, ip, userAgent, expirationDays, rememberMe = false) => {
  // Tạo token dạng: <randomId>.<base64 của userId>
  const token = `${shortid.generate()}.${Buffer.from(
    userId.toString()
  ).toString("base64")}`;

  // Sử dụng `expirationDays` được truyền vào, hoặc lấy giá trị mặc định từ config nếu không có
  const days = expirationDays || config.session.refreshTokenExpirationDays;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // Tạo document refresh token mới
  const refreshToken = new RefreshToken({
    token, // Chuỗi token đã tạo
    user: userId, // ID của user
    ip, // Địa chỉ IP khi tạo token
    userAgent, // Thông tin trình duyệt/thiết bị
    expires, // Ngày hết hạn
    rememberMe, // Trạng thái "Nhớ tôi"
  });

  // Lưu token vào database
  await refreshToken.save();

  // Trả về token để gửi cho client
  return refreshToken.token;
};

/**
 * Tìm refresh token trong cơ sở dữ liệu.
 * @param {string} token - Chuỗi token cần tìm
 * @returns {Promise<RefreshToken|null>}
 */
const findRefreshToken = (token) => RefreshToken.findOne({ token });

/**
 * Vô hiệu hóa một refresh token.
 * @param {string} token - Chuỗi token cần vô hiệu hóa
 * @returns {Promise<RefreshToken|null>} - Token đã được cập nhật
 */
const invalidateToken = (token) =>
  RefreshToken.findOneAndUpdate({ token }, { isValid: false }, { new: true });

/**
 * Vô hiệu hóa tất cả refresh token đang hoạt động của một người dùng.
 * @param {string|ObjectId} userId - ID của người dùng
 * @returns {Promise<object>} - Kết quả update
 */
const invalidateAllTokensForUser = (userId) =>
  RefreshToken.updateMany({ user: userId, isValid: true }, { isValid: false });

/**
 * Đếm số lượng refresh token đang hoạt động của một người dùng.
 * @param {string|ObjectId} userId - ID của người dùng
 * @returns {Promise<number>} - Số lượng token hợp lệ
 */
const countActiveTokensForUser = (userId) =>
  RefreshToken.countDocuments({ user: userId, isValid: true });

/**
 * Tìm và vô hiệu hóa refresh token cũ nhất của một người dùng.
 * @param {string|ObjectId} userId - ID của người dùng
 * @returns {Promise<void>}
 */
const findAndInvalidateOldestTokenForUser = async (userId) => {
  // Lấy token cũ nhất (theo thời gian tạo) của user
  const oldestToken = await RefreshToken.findOne({
    user: userId,
    isValid: true,
  }).sort({ createdAt: 1 });

  // Nếu tìm thấy, vô hiệu hóa token đó
  if (oldestToken) {
    oldestToken.isValid = false;
    await oldestToken.save();
  }
};
module.exports = {
  createRefreshToken,
  findRefreshToken,
  invalidateToken,
  invalidateAllTokensForUser,
  countActiveTokensForUser,
  findAndInvalidateOldestTokenForUser,
};
