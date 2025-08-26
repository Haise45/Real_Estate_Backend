const jwtUtil = require("../utils/jwtUtil");
const config = require("../config");
const asyncHandler = require("./asyncMiddleware");
const User = require("../models/userModel");

/**
 * Middleware bảo vệ các route yêu cầu người dùng đã xác thực.
 * - Kiểm tra Access Token trong header Authorization (định dạng: "Bearer <token>").
 * - Xác minh tính hợp lệ của token.
 * - Gắn thông tin user vào `req.user` để các middleware hoặc controller sau có thể sử dụng.
 * - Trả về lỗi 401 nếu token không hợp lệ hoặc không tồn tại.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Lấy token từ header Authorization nếu tồn tại và bắt đầu bằng "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  // 2. Nếu không có token => từ chối truy cập
  if (!token) {
    return res.status(401).json({ message: req.t("errors.unauthorized") });
  }

  try {
    // 3. Giải mã token và lấy ID người dùng (sub)
    const decoded = jwtUtil.verifyToken(token, config.jwt.accessSecret);

    // 4. Tìm user trong DB và loại bỏ trường password
    req.user = await User.findById(decoded.sub)
      .select("-password")
      .populate("role");

    // 5. Chuyển sang middleware hoặc controller tiếp theo
    next();
  } catch (error) {
    // Token hết hạn hoặc không hợp lệ
    return res.status(401).json({ message: req.t("errors.invalidToken") });
  }
});

/**
 * Middleware kiểm tra quyền hạn (authorization).
 * @param {String[]} requiredPermissions - Một mảng các quyền cần có để truy cập route.
 */
const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role || !req.user.role.permissions) {
      return res.status(403).json({ message: req.t("errors.forbidden") });
    }

    // Lấy thông tin user đã được middleware `protect` giải mã và gắn vào req
    const { permissions } = req.user.role;

    // Kiểm tra xem user có đủ tất cả các quyền được yêu cầu hay không
    const hasPermission = requiredPermissions.every((p) =>
      permissions.includes(p)
    );

    if (!hasPermission) {
      // Sử dụng req.t cho thông báo lỗi
      return res.status(403).json({ message: req.t("errors.forbidden") });
    }

    next();
  };
};

module.exports = { protect, authorize };
