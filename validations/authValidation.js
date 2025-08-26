const Joi = require("joi");

/**
 * Schema xác thực dữ liệu đầu vào khi đăng nhập.
 * - email: bắt buộc, phải đúng định dạng email
 * - password: bắt buộc
 */
const login = (t) => ({
  body: Joi.object().keys({
    email: Joi.string()
      .email()
      .required()
      .messages({
        "string.email": t("validation.invalidEmail"),
        "any.required": t("validation.emailRequired"),
      }),
    password: Joi.string()
      .required()
      .messages({
        "any.required": t("validation.passwordRequired"),
      }),
    rememberMe: Joi.boolean().optional(),
  }),
});

/**
 * Schema xác thực dữ liệu khi xác minh OTP.
 * - email: bắt buộc, phải đúng định dạng email
 * - otp: bắt buộc, 6 ký tự
 */
const verifyOtp = (t) => ({
  body: Joi.object().keys({
    email: Joi.string()
      .email()
      .required()
      .messages({
        "string.email": t("validation.invalidEmail"),
        "any.required": t("validation.emailRequired"),
      }),
    otp: Joi.string()
      .length(6)
      .required()
      .messages({
        "string.length": t("validation.otpLength"),
        "any.required": t("validation.otpRequired"),
      }),
    rememberMe: Joi.boolean().optional(),
  }),
});

/**
 * Schema xác thực dữ liệu khi làm mới token.
 * - refreshToken: bắt buộc
 */
const refreshToken = (t) => ({
  body: Joi.object().keys({
    refreshToken: Joi.string()
      .required()
      .messages({
        "any.required": t("validation.refreshTokenRequired"),
      }),
  }),
});

/**
 * Schema xác thực dữ liệu khi quên mật khẩu.
 * - email: bắt buộc, phải đúng định dạng email
 */
const forgotPassword = (t) => ({
  body: Joi.object().keys({
    email: Joi.string()
      .email()
      .required()
      .messages({
        "string.email": t("validation.invalidEmail"),
        "any.required": t("validation.emailRequired"),
      }),
  }),
});

/**
 * Schema xác thực dữ liệu khi đặt lại mật khẩu.
 * - password: bắt buộc, tối thiểu 6 ký tự, phải có chữ hoa, chữ thường, số và ký tự đặc biệt
 * - token: bắt buộc, chuỗi hex 40 ký tự
 */
const resetPassword = (t) => ({
  body: Joi.object().keys({
    password: Joi.string()
      .min(6)
      .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])"))
      .required()
      .messages({
        "string.min": t("validation.passwordMin"),
        "string.pattern.base": t("validation.passwordPattern"),
        "any.required": t("validation.passwordRequired"),
      }),
  }),
  params: Joi.object().keys({
    // <-- Kiểm tra cả params
    token: Joi.string().hex().length(40).required(), // Token là chuỗi hex 40 ký tự
  }),
});

module.exports = {
  login,
  verifyOtp,
  refreshToken,
  forgotPassword,
  resetPassword,
};
