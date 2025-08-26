/**
 * File này định nghĩa các lớp lỗi tùy chỉnh cho ứng dụng.
 * Việc tập trung các lớp lỗi vào một nơi giúp quản lý và tái sử dụng dễ dàng hơn.
 */

/**
 * Lớp BusinessError được sử dụng để biểu diễn các lỗi dự kiến
 * xảy ra trong logic nghiệp vụ (ví dụ: email đã tồn tại, OTP không hợp lệ).
 * Nó giúp phân biệt với các lỗi hệ thống không mong muốn.
 */
class BusinessError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "BusinessError";
    this.statusCode = statusCode; // Thêm statusCode để controller có thể sử dụng
  }
}

// Có thể định nghĩa thêm các lớp lỗi cụ thể hơn nếu cần
class AuthError extends BusinessError {
  constructor(message) {
    super(message, 401); // Lỗi xác thực thường là 401
    this.name = "AuthError";
  }
}

class ForbiddenError extends BusinessError {
  constructor(message) {
    super(message, 403); // Lỗi phân quyền thường là 403
    this.name = "ForbiddenError";
  }
}

module.exports = {
  BusinessError,
  AuthError,
  ForbiddenError,
};
