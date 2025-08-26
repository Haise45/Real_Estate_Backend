/**
 * Lớp Service chứa toàn bộ logic nghiệp vụ cho việc xác thực.
 */
const userRepository = require("../repositories/userRepository");
const tokenRepository = require("../repositories/refreshTokenRepository");
const jwtUtil = require("../utils/jwtUtil");
const otpUtil = require("../utils/otpUtil");
const mailUtil = require("../utils/mailUtil");
const { BusinessError, AuthError, ForbiddenError } = require("../utils/errors");
const config = require("../config");
const crypto = require("crypto");

/**
 * Hàm nội bộ: Quản lý phiên và cấp token.
 * @private
 */
const _grantTokens = async (user, ip, userAgent, rememberMe = false) => {
  // 1. Đếm số lượng phiên đang hoạt động của user
  const activeSessions = await tokenRepository.countActiveTokensForUser(
    user._id
  );

  // 2. Nếu vượt quá giới hạn, vô hiệu hóa token cũ nhất
  if (activeSessions >= config.session.maxActiveSessions) {
    await tokenRepository.findAndInvalidateOldestTokenForUser(user._id);
  }

  // 3. Cập nhật thông tin đăng nhập của user
  user.lastLoginIp = ip; // Lưu IP đăng nhập gần nhất
  user.otp = undefined; // Xóa mã OTP
  user.otpExpires = undefined; // Xóa thời gian xác nhận OTP
  await user.save();

  // 4. Tạo Access Token và Refresh Token mới
  const expirationDays = rememberMe
    ? config.session.refreshTokenRememberMeExpirationDays
    : config.session.refreshTokenExpirationDays;

  // Populate role để nhúng permissions vào JWT
  await user.populate("role");

  const accessToken = jwtUtil.generateAccessToken(user);
  const refreshToken = await tokenRepository.createRefreshToken(
    user._id,
    ip,
    userAgent,
    expirationDays
  );

  // 5. Trả về cặp token
  return { accessToken, refreshToken };
};

/**
 * Xử lý logic đăng nhập.
 * @returns {object} - Trả về token hoặc thông tin yêu cầu OTP.
 */
const loginUser = async ({ email, password, ip, userAgent, rememberMe }) => {
  // 1. Tìm user theo email
  const user = await userRepository.findUserByEmail(email);

  // 2. Nếu không tìm thấy hoặc mật khẩu sai => báo lỗi
  if (!user || !(await user.comparePassword(password))) {
    throw new AuthError("INVALID_CREDENTIALS");
  }

  // Kiểm tra tài khoản có bị vô hiệu hóa không
  if (!user.isActive) {
    throw new ForbiddenError("ACCOUNT_DISABLED");
  }

  // Kiểm tra email đã được xác minh chưa
  if (!user.isEmailVerified) {
    throw new ForbiddenError("EMAIL_NOT_VERIFIED");
  }

  // Kiểm tra tài khoản đã được duyệt chưa (trừ User)
  await user.populate("role");
  if (user.role.name !== "User" && !user.isVerified) {
    throw new ForbiddenError("ACCOUNT_NOT_VERIFIED");
  }

  // 3. Nếu IP khác IP đăng nhập trước đó => yêu cầu OTP xác minh
  if (user.lastLoginIp !== ip) {
    const otp = otpUtil.generateOtp(); // Tạo mã OTP mới

    // Lưu OTP và thời gian hết hạn vào user
    user.otp = otp;
    user.otpExpires = Date.now() + config.otp.expirationMinutes * 60 * 1000;
    await user.save();

    // Gửi OTP qua email
    await mailUtil.sendOtpEmail(user.email, otp);

    // Trả về thông báo yêu cầu OTP
    return { requiresOtp: true, email: user.email, rememberMe };
  }

  // 4. Nếu IP trùng, cấp token luôn
  return await _grantTokens(user, ip, userAgent, rememberMe);
};

/**
 * Xử lý logic xác thực OTP và đăng nhập.
 * @returns {object} - Cặp access/refresh token.
 */
const verifyOtpAndLogin = async ({ email, otp, ip, userAgent, rememberMe }) => {
  // 1. Tìm user theo email
  const user = await userRepository.findUserByEmail(email);

  // 2. Populate thông tin 'role' TRƯỚC KHI thực hiện các hành động khác.
  //    Điều này đảm bảo đối tượng `user` luôn có đầy đủ thông tin quyền hạn
  //    trước khi được truyền vào _grantTokens.
  if (user) {
    await user.populate("role");
  }

  // 3. Kiểm tra OTP và hạn sử dụng
  if (!user || !(await user.compareOtp(otp)) || user.otpExpires < Date.now()) {
    throw new BusinessError("INVALID_OTP");
  }

  // 4. Nếu OTP hợp lệ, cấp token mới
  return await _grantTokens(user, ip, userAgent, rememberMe);
};

/**
 * Xử lý logic làm mới token.
 * @returns {object} - Cặp access/refresh token mới.
 */
const refreshAuthToken = async ({ refreshToken, ip, userAgent }) => {
  // 1. Kiểm tra refresh token trong DB
  const existingToken = await tokenRepository.findRefreshToken(refreshToken);
  if (
    !existingToken ||
    !existingToken.isValid ||
    existingToken.expires < Date.now()
  ) {
    throw new AuthError("INVALID_REFRESH_TOKEN");
  }

  // 2. Kiểm tra tính toàn vẹn: IP và UserAgent phải trùng khớp
  if (existingToken.ip !== ip || existingToken.userAgent !== userAgent) {
    // Nếu phát hiện token reuse => vô hiệu hóa tất cả token của user
    await tokenRepository.invalidateAllTokensForUser(existingToken.user);

    // Gửi email cảnh báo cho user
    const user = await userRepository.findUserById(existingToken.user);
    if (user) await mailUtil.sendWarningEmail(user.email, ip, userAgent);

    throw new ForbiddenError("TOKEN_REUSE_DETECTED");
  }

  // 3. Vô hiệu hóa refresh token cũ
  await tokenRepository.invalidateToken(existingToken.token);

  // 4. Tạo access token và refresh token mới
  const user = await userRepository
    .findUserById(existingToken.user)
    .populate("role");
  if (!user) throw new AuthError("USER_NOT_FOUND_FOR_TOKEN");

  const accessToken = jwtUtil.generateAccessToken(user);
  const newRefreshToken = await tokenRepository.createRefreshToken(
    existingToken.user,
    ip,
    userAgent
  );

  return { accessToken, refreshToken: newRefreshToken };
};

/**
 * Gửi email đặt lại mật khẩu cho người dùng.
 * Quy trình:
 * 1. Kiểm tra user tồn tại qua email.
 * 2. Sinh reset token ngẫu nhiên, hash và lưu cùng thời gian hết hạn (1 giờ).
 * 3. Gửi email cho user kèm link reset password.
 *
 * @param {string} email - Email của người dùng cần đặt lại mật khẩu.
 * @throws {BusinessError} USER_NOT_FOUND - Nếu không tìm thấy user theo email.
 */
const forgotPassword = async (email) => {
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    throw new BusinessError("USER_NOT_FOUND");
  }

  // 1. Tạo token ngẫu nhiên
  const resetToken = crypto.randomBytes(20).toString("hex");

  // 2. Hash token và lưu vào CSDL, kèm thời gian hết hạn (1 giờ)
  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordExpires = Date.now() + 3600000; // 1 giờ
  await user.save();

  // 3. Gửi email cho người dùng
  // Link này frontend sẽ xử lý để hiển thị form reset password
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  await mailUtil.sendPasswordResetEmail(user.email, resetUrl);
};

/**
 * Đặt lại mật khẩu bằng reset token.
 * Quy trình:
 * 1. Hash token từ URL và so khớp với token trong CSDL.
 * 2. Kiểm tra token còn hạn.
 * 3. Nếu hợp lệ: cập nhật mật khẩu mới và xóa token.
 *
 * @param {string} token - Reset token nhận từ URL.
 * @param {string} newPassword - Mật khẩu mới của người dùng.
 * @throws {BusinessError} INVALID_OR_EXPIRED_TOKEN - Nếu token không hợp lệ hoặc đã hết hạn.
 */
const resetPassword = async (token, newPassword) => {
  // 1. Hash token nhận được từ URL để so sánh với CSDL
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // 2. Tìm user bằng token và kiểm tra thời gian hết hạn
  const user = await userRepository.findUserBy({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new BusinessError("INVALID_OR_EXPIRED_TOKEN");
  }

  // 3. Cập nhật mật khẩu và xóa các trường token
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
};

/**
 * Xử lý logic đăng xuất.
 */
const logoutUser = async (refreshToken) => {
  // Nếu có refresh token => vô hiệu hóa nó
  if (refreshToken) {
    await tokenRepository.invalidateToken(refreshToken);
  }
};

module.exports = {
  loginUser,
  verifyOtpAndLogin,
  refreshAuthToken,
  forgotPassword,
  resetPassword,
  logoutUser,
};
