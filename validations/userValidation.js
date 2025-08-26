const Joi = require("joi");

/**
 * Validation schema cho việc đăng ký tài khoản mới.
 * Sử dụng "factory pattern" để hỗ trợ i18n.
 */
const register = (t) => ({
  body: Joi.object().keys({
    // Thông tin cơ bản
    email: Joi.string()
      .email()
      .required()
      .messages({
        "string.email": t("validation.invalidEmail"),
        "any.required": t("validation.emailRequired"),
      }),
    name: Joi.string()
      .required()
      .messages({
        "any.required": t("validation.nameRequired"),
      }),

    // Chính sách mật khẩu mạnh
    password: Joi.string()
      .min(6) // Ít nhất 6 ký tự
      .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])")) // Regex yêu cầu có chữ thường, hoa, số, và ký tự đặc biệt
      .required()
      .messages({
        "string.min": t("validation.passwordMin"),
        "string.pattern.base": t("validation.passwordPattern"),
        "any.required": t("validation.passwordRequired"),
      }),

    // Xác nhận mật khẩu
    passwordConfirmation: Joi.string()
      .required()
      .valid(Joi.ref("password")) // Phải khớp với trường 'password'
      .messages({
        "any.only": t("validation.passwordConfirm"),
        "any.required": t("validation.passwordConfirmRequired"),
      }),

    // Thông tin vai trò
    roleName: Joi.string()
      .valid("User", "Agency", "Agent")
      .required()
      .messages({
        "any.only": t("validation.roleInvalid"),
        "any.required": t("validation.roleRequired"),
      }),

    // Dữ liệu phụ thuộc
    agencyId: Joi.string().when("roleName", {
      is: "Agent", // Nếu roleName là 'Agent'
      then: Joi.required(), // thì agencyId là bắt buộc
      otherwise: Joi.forbidden(), // nếu không thì không được có trường này
    }),

    // Dữ liệu hồ sơ
    profileData: Joi.object().required(),
  }),
});

module.exports = { register };
