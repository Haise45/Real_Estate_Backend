/**
 * Bắt lỗi cho các hàm async mà không cần khối try...catch lặp lại.
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
