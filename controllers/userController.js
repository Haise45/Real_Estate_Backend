const asyncHandler = require("../middlewares/asyncMiddleware");
const userService = require("../services/userService");
const { BusinessError } = require("../utils/errors");

/**
 * Đăng ký người dùng mới.
 */
const register = asyncHandler(async (req, res) => {
  try {
    const user = await userService.registerUser(req.body);
    res.status(201).json({
      success: true,
      // Sử dụng req.t cho thông báo thành công
      message: req.t("users.register_success"),
      data: user,
    });
  } catch (error) {
    // Chỉ xử lý các lỗi nghiệp vụ đã biết
    if (error instanceof BusinessError) {
      // Tạo một map để liên kết key lỗi từ service với key dịch
      const errorMap = {
        PROFILE_DATA_REQUIRED: "users.profile_data_required",
        EMAIL_ALREADY_EXISTS: "users.email_exists",
        AGENCY_ID_REQUIRED: "users.agency_id_required",
        INVALID_AGENCY: "users.invalid_agency",
        INVALID_ROLE_FOR_REGISTRATION: "users.invalid_role_for_registration",
      };

      const messageKey = errorMap[error.message];
      // Nếu có key dịch, trả về lỗi 400 Bad Request
      if (messageKey) {
        return res.status(400).json({ message: req.t(messageKey) });
      }
    }
    // Nếu là lỗi khác, ném ra để errorMiddleware xử lý
    throw error;
  }
});

/**
 * Xác thực email người dùng.
 */
const verifyEmail = asyncHandler(async (req, res) => {
  try {
    const result = await userService.verifyUserEmail(req.params.token);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    if (error instanceof BusinessError) {
      const errorMap = {
        INVALID_VERIFICATION_TOKEN: "errors.invalidVerificationToken",
      };
      const messageKey = errorMap[error.message];
      if (messageKey) {
        return res.status(400).json({ message: req.t(messageKey) });
      }
    }
    throw error;
  }
});

// Các hàm khác như getUser, updateUser, deleteUser sẽ được thêm ở đây sau
// Ví dụ:
const getUsers = asyncHandler(async (req, res) => {
  // Logic phân trang và lọc sẽ ở đây, gọi đến service
  res
    .status(200)
    .json({ success: true, message: "Lấy danh sách người dùng thành công" });
});

module.exports = { register, getUsers, verifyEmail };
