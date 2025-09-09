/**
 * DTO cho dữ liệu đăng nhập.
 */
class LoginDto {
  constructor(body) {
    this.email = body.email;
    this.password = body.password;
    this.rememberMe = body.rememberMe || false;
  }
}

/**
 * DTO cho dữ liệu xác minh OTP.
 */
class VerifyOtpDto {
  constructor(body) {
    this.email = body.email;
    this.otp = body.otp;
    this.rememberMe = body.rememberMe || false;
  }
}

/**
 * DTO cho dữ liệu quên mật khẩu.
 */
class ForgotPasswordDto {
  constructor(body) {
    this.email = body.email;
  }
}

/**
 * DTO cho dữ liệu đặt lại mật khẩu.
 */
class ResetPasswordDto {
  constructor(body, params) {
    this.password = body.password;
    this.token = params.token;
  }
}

module.exports = {
  LoginDto,
  VerifyOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
};
