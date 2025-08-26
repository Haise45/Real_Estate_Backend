/**
 * Tạo mã OTP ngẫu nhiên gồm 6 chữ số.
 * @returns {string} - Mã OTP dạng chuỗi, ví dụ: "123456"
 */
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

module.exports = { generateOtp };
