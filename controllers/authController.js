/**
 * Lớp Controller chỉ chịu trách nhiệm xử lý request & response.
 * Nó gọi đến authService để thực hiện các logic nghiệp vụ và trả về kết quả cho client.
 */
const asyncHandler = require("../middlewares/asyncMiddleware");
const authService = require("../services/authService");
const config = require("../config");
const { BusinessError, AuthError, ForbiddenError } = require("../utils/errors");

// --- HÀM TIỆN ÍCH ---
/**
 * Gửi refreshToken qua một cookie an toàn.
 * @param {object} res - Đối tượng response của Express.
 * @param {string} token - Chuỗi refreshToken.
 * @param {boolean} rememberMe - Người dùng có chọn "nhớ tôi" không.
 */
const sendRefreshTokenAsCookie = (res, token, rememberMe = false) => {
  const expirationDays = rememberMe
    ? config.session.refreshTokenRememberMeExpirationDays
    : config.session.refreshTokenExpirationDays;

  const cookieOptions = {
    httpOnly: true, // Ngăn JavaScript phía client truy cập cookie (chống XSS)
    secure: process.env.NODE_ENV === "production", // Chỉ gửi cookie qua HTTPS ở môi trường production
    sameSite: "strict", // Ngăn chặn tấn công CSRF
    path: "/api/auth", // Giới hạn cookie chỉ được gửi đến các path /api/auth
  };

  // Nếu người dùng không chọn "Remember Me", cookie sẽ là một "session cookie".
  // Nó sẽ tự động bị xóa khi người dùng đóng trình duyệt.
  // Nếu người dùng chọn "Remember Me", chúng ta sẽ set thời gian hết hạn cụ thể.
  if (rememberMe) {
    cookieOptions.expires = new Date(
      Date.now() + expirationDays * 24 * 60 * 60 * 1000
    );
  }

  res.cookie("refreshToken", token, cookieOptions);
};

/**
 * Đăng nhập tài khoản.
 * - Nhận email & password từ body.
 * - Nếu cần OTP, trả về thông báo OTP đã gửi kèm thời gian hết hạn.
 * - Nếu không, trả về accessToken & refreshToken.
 */
const login = asyncHandler(async (req, res) => {
  try {
    const { rememberMe } = req.body;
    const result = await authService.loginUser({
      ...req.body,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (result.requiresOtp) {
      return res.status(200).json({
        message: req.t("auth.otpSent", {
          minutes: config.otp.expirationMinutes,
        }),
        requiresOtp: true,
        email: result.email,
        rememberMe: result.rememberMe,
      });
    }

    sendRefreshTokenAsCookie(res, result.refreshToken, rememberMe);
    res.status(200).json({ success: true, accessToken: result.accessToken });
  } catch (error) {
    if (error instanceof AuthError && error.message === "INVALID_CREDENTIALS") {
      return res
        .status(error.statusCode)
        .json({ message: req.t("auth.invalidCredentials") });
    }
    if (error instanceof ForbiddenError) {
      const messageKey = {
        ACCOUNT_DISABLED: "auth.accountDisabled",
        ACCOUNT_NOT_VERIFIED: "auth.accountNotVerified",
        EMAIL_NOT_VERIFIED: "auth.emailNotVerified",
      }[error.message];
      return res.status(error.statusCode).json({ message: req.t(messageKey) });
    }
    throw error; // Chuyển các lỗi khác cho errorMiddleware
  }
});

/**
 * Xác thực OTP và đăng nhập.
 * - Nhận email & otp từ body.
 * - Trả về accessToken & refreshToken nếu thành công.
 */
const verifyOtp = asyncHandler(async (req, res) => {
  try {
    const { rememberMe } = req.body;
    const tokens = await authService.verifyOtpAndLogin({
      ...req.body,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    sendRefreshTokenAsCookie(res, tokens.refreshToken, rememberMe);
    res.status(200).json({ success: true, accessToken: tokens.accessToken });
  } catch (error) {
    if (error instanceof BusinessError && error.message === "INVALID_OTP") {
      return res
        .status(error.statusCode)
        .json({ message: req.t("auth.invalidOtp") });
    }
    throw error;
  }
});

/**
 * Làm mới Access Token bằng Refresh Token.
 * - Nhận refreshToken từ body.
 * - Trả về cặp accessToken & refreshToken mới.
 */
const refreshToken = asyncHandler(async (req, res) => {
  // Đọc refreshToken từ cookie
  const requestToken = req.cookies.refreshToken;

  if (!requestToken) {
    throw new AuthError("REFRESH_TOKEN_NOT_FOUND");
  }

  try {
    const tokens = await authService.refreshAuthToken({
      refreshToken: requestToken,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    sendRefreshTokenAsCookie(res, tokens.refreshToken, tokens.rememberMe);
    res.status(200).json({ success: true, accessToken: tokens.accessToken });
  } catch (error) {
    if (error instanceof AuthError || error instanceof ForbiddenError) {
      const i18nKey = {
        INVALID_REFRESH_TOKEN: "auth.invalidRefreshToken",
        TOKEN_REUSE_DETECTED: "auth.tokenReuseDetected",
        REFRESH_TOKEN_NOT_FOUND: "auth.refreshTokenNotFound",
        USER_NOT_FOUND_FOR_TOKEN: "errors.serverError", // Lỗi nội bộ, không nên lộ chi tiết
      }[error.message];
      return res.status(error.statusCode).json({ message: req.t(i18nKey) });
    }
    throw error;
  }
});

/**
 * Xử lý logic quên mật khẩu.
 * Gửi email chứa liên kết đặt lại mật khẩu.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  try {
    await authService.forgotPassword(req.body.email);
    res
      .status(200)
      .json({ success: true, message: req.t("passwords.reset_email_sent") });
  } catch (error) {
    if (error instanceof BusinessError && error.message === "USER_NOT_FOUND") {
      // Trả về thông báo thành công ngay cả khi không tìm thấy user
      // để tránh việc kẻ xấu dò tìm email tồn tại trong hệ thống.
      return res
        .status(200)
        .json({ success: true, message: req.t("passwords.reset_email_sent") });
    }
    throw error;
  }
});

/**
 * Xử lý logic đặt lại mật khẩu.
 * - Nhận token và mật khẩu mới từ body.
 * - Cập nhật mật khẩu cho người dùng.
 */
const resetPassword = asyncHandler(async (req, res) => {
  try {
    await authService.resetPassword(req.params.token, req.body.password);
    res
      .status(200)
      .json({ success: true, message: req.t("passwords.reset_success") });
  } catch (error) {
    if (
      error instanceof BusinessError &&
      error.message === "INVALID_OR_EXPIRED_TOKEN"
    ) {
      return res
        .status(400)
        .json({ message: req.t("passwords.invalid_token") });
    }
    throw error;
  }
});

/**
 * Đăng xuất tài khoản.
 * - Xóa refreshToken khỏi DB/Redis.
 */
const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.body.refreshToken);
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.status(200).json({ success: true, message: req.t("auth.logoutSuccess") });
});

module.exports = {
  login,
  verifyOtp,
  refreshToken,
  forgotPassword,
  resetPassword,
  logout,
};
