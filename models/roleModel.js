const mongoose = require("mongoose");

/**
 * Các quyền hạn được định nghĩa dưới dạng chuỗi: 'resource:action'
 * Ví dụ: 'users:create', 'listings:approve', 'agencies:manage'
 * -> Giúp việc kiểm tra quyền trở nên rất rõ ràng và chi tiết.
 */
const ROLES = ["Admin", "Manager", "Employees", "Agency", "Agent", "User"];

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ROLES, // Đảm bảo tên vai trò luôn nằm trong danh sách được định nghĩa
  },
  permissions: {
    type: [String],
    default: [],
  },
  description: String,
});

module.exports = mongoose.model("Role", roleSchema);
