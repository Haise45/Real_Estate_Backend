const User = require("../models/userModel");

/**
 * Tìm người dùng bằng email.
 * @param {string} email - Địa chỉ email của người dùng
 * @returns {Promise<User|null>} - Người dùng tìm thấy hoặc null nếu không tồn tại
 */
const findUserByEmail = (email) => User.findOne({ email });

/**
 * Cập nhật người dùng bằng ID.
 * @param {string|ObjectId} userId - ID của người dùng
 * @param {object} updateData - Dữ liệu cần cập nhật
 * @returns {Promise<User|null>} - Người dùng sau khi cập nhật hoặc null nếu không tìm thấy
 */
const updateUser = (userId, updateData) =>
  User.findByIdAndUpdate(userId, updateData, { new: true });

/**
 * Tìm người dùng bằng ID.
 * @param {string|ObjectId} userId - ID của người dùng
 * @returns {Promise<User|null>} - Người dùng tìm thấy hoặc null nếu không tồn tại
 */
const findUserById = (userId) => User.findById(userId);

/**
 * Tìm người dùng bằng một query tùy chỉnh.
 * @param {object} query - Điều kiện tìm kiếm
 * @returns {Promise<User|null>} - Người dùng tìm thấy hoặc null nếu không tồn tại
 */
const findUserBy = (query) => User.findOne(query);

module.exports = { findUserByEmail, updateUser, findUserById, findUserBy };
