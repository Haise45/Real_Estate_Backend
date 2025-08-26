/**
 * Định nghĩa Lược đồ (Schema) cho User trong MongoDB.
 */
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    // 'name' ở đây có thể là tên hiển thị chung (tên cá nhân hoặc tên agency)
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // --- Tích hợp Phân quyền (RBAC) ---
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      require: true,
    },
    // --- Trạng thái tài khoản ---
    isActive: {
      // Dùng cho việc vô hiệu hóa / xóa mềm
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      // Đánh dấu email đã được xác minh hay chưa
      type: Boolean,
      default: false,
    },
    isVerified: {
      // Dùng cho các tài khoản cần duyệt (Agency, Agent)
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String, // Lưu token xác minh email
    // --- Cấu trúc phân cấp quản lý ---
    managedBy: {
      // Ai quản lý tài khoản này (Manager quản lý Employee, Admin quản lý Manager...)
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    agency: {
      // Dành riêng cho Agent để biết họ thuộc Agency nào
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // --- LIÊN KẾT ĐỘNG TỚI PROFILE ---
    profileModel: {
      type: String,
      required: true,
      // Enum này đảm bảo giá trị phải là một trong các tên Model Profile
      enum: ["AgencyProfile", "AgentProfile", "UserProfile"],
    },
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      // `refPath` sẽ đọc giá trị từ trường `profileModel` để biết
      // cần populate từ collection nào.
      refPath: "profileModel",
      required: true,
    },

    // --- Chức năng Quên mật khẩu ---
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    // --- Giới hạn tin đăng (Business Logic) ---
    monthlyListingLimit: { type: Number, default: 5 },
    monthlyListingCount: { type: Number, default: 0 },
    lastListingResetDate: { type: Date, default: Date.now },

    lastLoginIp: {
      type: String,
    },
    otp: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        // Xóa các trường không mong muốn khỏi object `ret` (return)
        delete ret.password;
        delete ret.otp;
        delete ret.otpExpires;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpires;
        delete ret.emailVerificationToken;
        delete ret.__v; // Xóa trường version key của Mongoose
        return ret;
      },
    },
  }
);

// HOOK CHẠY TRƯỚC KHI LƯU
userSchema.pre("save", async function (next) {
  // Hash mật khẩu nếu nó được thay đổi
  if (this.isModified("password") && this.password) {
    // Thêm kiểm tra this.password tồn tại
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Hash OTP nếu nó tồn tại và được thay đổi
  if (this.isModified("otp") && this.otp) {
    const salt = await bcrypt.genSalt(10);
    this.otp = await bcrypt.hash(this.otp, salt);
  }
  next();
});

// PHƯƠNG THỨC SO SÁNH OTP
userSchema.methods.compareOtp = async function (enteredOtp) {
  // Nếu không có OTP được nhập vào hoặc không có OTP trong CSDL, trả về false
  if (!enteredOtp || !this.otp) {
    return false;
  }
  return await bcrypt.compare(enteredOtp, this.otp);
};

// PHƯƠNG THỨC SO SÁNH MẬT KHẨU
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!enteredPassword || !this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
