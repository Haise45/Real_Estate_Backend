const mongoose = require("mongoose");
const crypto = require("crypto");
const mailUtil = require("../utils/mailUtil");
const User = require("../models/userModel");
const Role = require("../models/roleModel");
const AgencyProfile = require("../models/profiles/agencyProfileModel");
const AgentProfile = require("../models/profiles/agentProfileModel");
const UserProfile = require("../models/profiles/userProfileModel");
const { BusinessError } = require("../utils/errors");

/**
 * Đăng ký người dùng mới với vai trò chỉ định.
 * Quy trình:
 * 1. Kiểm tra email đã tồn tại trong hệ thống chưa.
 * 2. Tìm role theo tên role trong CSDL.
 * 3. Tạo user mới với thông tin (email, password, name, role).
 * 4. Xử lý logic nghiệp vụ theo từng vai trò:
 *    - User: tự động được duyệt, giới hạn 5 tin/tháng.
 *    - Agency: cần Admin/Manager duyệt, giới hạn 30 tin/tháng.
 *    - Agent: cần Agency/Manager duyệt, phải có agencyId hợp lệ, giới hạn 15 tin/tháng.
 * 5. Lưu user vào CSDL, ẩn password trước khi trả về.
 *
 * @param {Object} userData - Thông tin đăng ký người dùng.
 * @param {string} userData.email - Email người dùng.
 * @param {string} userData.password - Mật khẩu người dùng.
 * @param {string} userData.name - Tên người dùng.
 * @param {string} userData.roleName - Vai trò của người dùng (User, Agency, Agent).
 * @param {string} [userData.agencyId] - ID của Agency (bắt buộc nếu role là Agent).
 * @returns {Promise<User>} Đối tượng User đã được lưu (không bao gồm password).
 * @throws {BusinessError} EMAIL_ALREADY_EXISTS - Nếu email đã tồn tại.
 * @throws {BusinessError} AGENCY_ID_REQUIRED - Nếu role là Agent nhưng thiếu agencyId.
 * @throws {BusinessError} INVALID_AGENCY - Nếu agencyId không hợp lệ hoặc không phải Agency.
 * @throws {BusinessError} INVALID_ROLE_FOR_REGISTRATION - Nếu roleName không hợp lệ.
 */
const registerUser = async (userData) => {
  const { email, password, name, roleName, agencyId, profileData } = userData;

  // Kiểm tra dữ liệu profile
  if (!profileData) {
    throw new BusinessError("PROFILE_DATA_REQUIRED");
  }

  // Kiểm tra email tồn tại
  if (await User.findOne({ email })) {
    throw new BusinessError("EMAIL_ALREADY_EXISTS");
  }

  // Tìm vai trò trong CSDL
  const role = await Role.findOne({ name: roleName });
  if (!role) throw new Error(`Vai trò '${roleName}' không tồn tại.`);

  let profile = null;
  let profileModelName = "";

  // Sử dụng transaction để đảm bảo cả User và Profile đều được tạo thành công,
  // hoặc cả hai đều thất bại, tránh dữ liệu mồ côi.
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newUser = new User({ email, password, name, role: role._id });

    // 1. Tạo một token xác minh ngẫu nhiên
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // 2. Hash token này trước khi lưu vào CSDL (bảo mật)
    newUser.emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    // Logic nghiệp vụ dựa trên vai trò
    switch (roleName) {
      case "User":
        profileModelName = "UserProfile";
        profile = new UserProfile({ user: newUser._id, ...profileData });
        newUser.isVerified = true; // User tự đăng ký thì được duyệt luôn
        newUser.monthlyListingLimit = 5;
        break;
      case "Agency":
        profileModelName = "AgencyProfile";
        profile = new AgencyProfile({ user: newUser._id, ...profileData });
        // Agency cần Admin/Manager duyệt
        newUser.isVerified = false;
        newUser.monthlyListingLimit = 30;
        break;
      case "Agent":
        profileModelName = "AgentProfile";
        profile = new AgentProfile({ user: newUser._id, ...profileData });
        // Agent cần Agency hoặc Manager duyệt
        if (!agencyId) throw new BusinessError("AGENCY_ID_REQUIRED");
        const agency = await User.findById(agencyId);
        if (!agency || agency.role.name !== "Agency") {
          throw new BusinessError("INVALID_AGENCY");
        }
        newUser.agency = agencyId;
        newUser.isVerified = false;
        newUser.monthlyListingLimit = 15;
        break;
      default:
        throw new BusinessError("INVALID_ROLE_FOR_REGISTRATION");
    }

    // Lưu profile trước
    await profile.save({ session });

    // Gán thông tin profile vào user
    newUser.profile = profile._id;
    newUser.profileModel = profileModelName;

    // Lưu user
    await newUser.save({ session });

    // Nếu mọi thứ thành công, commit transaction
    await session.commitTransaction();

    // 4. Gửi email xác minh SAU KHI đã tạo user thành công
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    await mailUtil.sendVerificationEmail(newUser.email, verificationUrl);

    newUser.password = undefined;
    return newUser;
  } catch (error) {
    // Nếu có lỗi, abort transaction
    await session.abortTransaction();
    // Ném lại lỗi để controller xử lý
    throw error;
  } finally {
    // Kết thúc session
    session.endSession();
  }
};

/**
 * Xác minh email của người dùng bằng token.
 * @param {string} token - Token xác minh nhận từ URL.
 */
const verifyUserEmail = async (token) => {
  // 1. Hash token nhận được để so sánh với token trong CSDL
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // 2. Tìm user với token tương ứng và chưa xác minh email
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    isEmailVerified: false,
  });

  // Nếu không tìm thấy user, token đã hết hạn hoặc không hợp lệ
  if (!user) {
    throw new BusinessError("INVALID_VERIFICATION_TOKEN");
  }

  // 3. Nếu tìm thấy, kích hoạt tài khoản
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined; // Vô hiệu hóa token
  await user.save();

  // Bạn có thể trả về user hoặc một thông báo thành công
  return { message: "Email đã được xác minh thành công!" };
};

module.exports = { registerUser, verifyUserEmail };
