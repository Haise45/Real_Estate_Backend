const nodemailer = require("nodemailer");
const config = require("../config");

// Khởi tạo transporter của Nodemailer để gửi email qua SMTP
const transporter = nodemailer.createTransport({
  host: config.mail.host, // SMTP host
  port: config.mail.port, // SMTP port
  auth: {
    user: config.mail.user, // Tên đăng nhập SMTP
    pass: config.mail.pass, // Mật khẩu SMTP
  },
});

/**
 * Gửi email chung với nội dung chỉ định.
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} text - Nội dung email dạng text
 */
const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: `"${config.mail.from}" <${config.mail.from}>`, // Người gửi
      to, // Người nhận
      subject, // Tiêu đề
      text, // Nội dung
    });
    console.log("Email đã được gửi thành công");
  } catch (error) {
    console.error("Lỗi khi gửi email:", error);
  }
};

/**
 * Gửi email chứa mã OTP cho người dùng.
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} otp - Mã OTP cần gửi
 */
const sendOtpEmail = async (to, otp) => {
  const subject = "Mã xác thực đăng nhập (OTP) của bạn";
  const text = `Mã OTP của bạn là: ${otp}. Mã này có hiệu lực trong ${config.otp.expirationMinutes} phút.`;
  await sendEmail(to, subject, text);
};

/**
 * Gửi email cảnh báo khi phát hiện đăng nhập từ thiết bị/IP mới.
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} ip - Địa chỉ IP phát hiện
 * @param {string} userAgent - Thông tin thiết bị/trình duyệt
 */
const sendWarningEmail = async (to, ip, userAgent) => {
  const subject = "Cảnh báo bảo mật: Phát hiện đăng nhập mới";
  const text = `Tài khoản của bạn vừa được truy cập từ một thiết bị mới.\n\nĐịa chỉ IP: ${ip}\nThiết bị: ${userAgent}\n\nNếu đây không phải là bạn, hãy bảo mật tài khoản của bạn ngay lập tức.`;
  await sendEmail(to, subject, text);
};

/**
 * Gửi email chứa link đặt lại mật khẩu.
 * @param {string} to - Địa chỉ email người nhận.
 * @param {string} resetUrl - Đường link đầy đủ để đặt lại mật khẩu.
 */
const sendPasswordResetEmail = async (to, resetUrl) => {
  const subject = "Yêu cầu đặt lại mật khẩu";
  const text = `Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n\nVui lòng nhấn vào đường link sau, hoặc sao chép và dán vào trình duyệt của bạn để hoàn tất quá trình:\n\n${resetUrl}\n\nNếu bạn không yêu cầu điều này, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.`;
  const html = `<p>Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p><p>Vui lòng nhấn vào đường link sau để hoàn tất quá trình:</p><p><a href="${resetUrl}">Đặt lại mật khẩu</a></p><p>Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không thay đổi.</p>`;

  // In ra console để dễ dàng lấy link khi test
  console.log("--- PASSWORD RESET LINK (FOR TESTING) ---");
  console.log(resetUrl);
  console.log("-----------------------------------------");

  await sendEmail(to, subject, text, html);
};

/**
 * Gửi email chứa link xác minh tài khoản.
 * @param {string} to - Địa chỉ email người nhận.
 * @param {string} verificationUrl - Đường link đầy đủ để xác minh.
 */
const sendVerificationEmail = async (to, verificationUrl) => {
  const subject = "Chào mừng! Vui lòng xác minh tài khoản của bạn";
  const text = `Cảm ơn bạn đã đăng ký. Vui lòng nhấn vào đường link sau để kích hoạt tài khoản của bạn:\n\n${verificationUrl}\n\nNếu bạn không đăng ký, vui lòng bỏ qua email này.`;
  const html = `<p>Cảm ơn bạn đã đăng ký.</p><p>Vui lòng nhấn vào đường link sau để kích hoạt tài khoản của bạn:</p><p><a href="${verificationUrl}">Kích hoạt tài khoản</a></p><p>Nếu bạn không đăng ký, vui lòng bỏ qua email này.</p>`;

  // In ra console để dễ test
  console.log("--- EMAIL VERIFICATION LINK (FOR TESTING) ---");
  console.log(verificationUrl);
  console.log("-------------------------------------------");

  await sendEmail(to, subject, text, html);
};

module.exports = {
  sendOtpEmail,
  sendWarningEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
};
