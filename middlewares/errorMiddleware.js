const logger = require("../config/logger");
/**
 * Xử lý lỗi tập trung, định dạng response lỗi nhất quán.
 */
const errorMiddleware = (err, req, res, next) => {
  logger.error(
    `${err.statusCode || 500} - ${err.message} - ${req.originalUrl} - ${
      req.method
    } - ${req.ip}`
  );
  const statusCode = err.statusCode || 500;
  const message = err.message || req.t("errors.serverError");
  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

module.exports = errorMiddleware;
