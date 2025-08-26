/**
 * Middleware xác thực dữ liệu đầu vào một cách linh hoạt.
 *
 * Middleware này giờ đây nhận vào một "schema factory" (một hàm trả về schema)
 * thay vì một object schema tĩnh.
 *
 * @param {function} schemaFactory - Hàm nhận vào `req.t` và trả về một object schema.
 * Ví dụ: authValidation.login
 */
const validate = (schemaFactory) => (req, res, next) => {
  // 1. Tạo schema động bằng cách gọi factory và truyền vào hàm dịch `req.t`.
  // `req.t` đã được cung cấp bởi `i18nMiddleware` chạy trước đó.
  const schema = schemaFactory(req.t);

  const errors = [];

  // 2. Phần còn lại của logic xác thực giữ nguyên.
  ["body", "params", "query"].forEach((key) => {
    if (schema[key]) {
      const { error } = schema[key].validate(req[key], {
        abortEarly: false,
      });

      if (error) {
        errors.push(...error.details.map((detail) => detail.message));
      }
    }
  });

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors.join(", "),
    });
  }

  return next();
};

module.exports = validate;
