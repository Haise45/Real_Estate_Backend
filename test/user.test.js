/**
 * Bộ test cho các API liên quan đến quản lý người dùng (/api/users).
 * Bao gồm các chức năng đăng ký, xác minh email, và phân quyền.
 */
const mongoose = require("mongoose");
const request = require("supertest");
const { expect } = require("chai");
const sinon = require("sinon");
const app = require("../app");
const User = require("../models/userModel");
const Role = require("../models/roleModel");
const UserProfile = require("../models/profiles/userProfileModel");
const mailUtil = require("../utils/mailUtil");
require("./test-setup");

describe("API - User Management (/api/users)", () => {
  // Tạo một đối tượng để chứa các "stub" của Sinon
  let mailStub;

  // Hook chạy TRƯỚC MỖI test case (`it` block)
  beforeEach(() => {
    // "Stub" (giả lập) hàm sendVerificationEmail để nó không thực sự gửi email
    // mà chỉ ghi nhận lại việc nó đã được gọi hay chưa.
    mailStub = {
      sendVerificationEmail: sinon.stub(mailUtil, "sendVerificationEmail"),
    };
  });

  // Hook chạy SAU MỖI test case
  afterEach(() => {
    // Khôi phục lại hàm thật sau khi test xong để không ảnh hưởng đến các test khác
    sinon.restore();
  });

  // === BỘ TEST CHO CHỨC NĂNG ĐĂNG KÝ ===
  describe("POST /register - Đăng ký tài khoản", () => {
    it("should create a new user with isEmailVerified=false and send a verification email", async () => {
      // Arrange - Chuẩn bị dữ liệu đầu vào
      const userData = {
        name: "Test User",
        email: "verify@test.com",
        password: "Password123!",
        passwordConfirmation: "Password123!",
        roleName: "User",
        profileData: {
          firstName: "Test",
          lastName: "User",
          contactInfo: { phone: "0123456789" },
        },
      };

      // Act - Thực hiện request đến API
      const res = await request(app).post("/api/users/register").send(userData);

      // Assert - Khẳng định kết quả
      // 1. Kiểm tra response trả về từ API có đúng như mong đợi không
      expect(res.status).to.equal(201);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal(
        "Đăng ký thành công. Một email xác minh đã được gửi đến địa chỉ của bạn. Vui lòng xác minh email trước khi đăng nhập."
      );
      expect(res.body.data).to.have.property("email", "verify@test.com");
      expect(res.body.data.isEmailVerified).to.be.false; // Quan trọng: tài khoản mới phải chưa được xác minh

      // 2. Kiểm tra trực tiếp trong CSDL để đảm bảo dữ liệu được lưu đúng
      const userInDb = await User.findOne({ email: "verify@test.com" });
      expect(userInDb).to.exist; // Người dùng phải tồn tại
      expect(userInDb.isEmailVerified).to.be.false;
      expect(userInDb.emailVerificationToken).to.exist; // Phải có token xác minh

      // 3. Kiểm tra xem hàm gửi email đã được gọi chính xác 1 lần
      expect(mailStub.sendVerificationEmail.calledOnce).to.be.true;
    });

    it("should fail if email already exists", async () => {
      const userData = {
        name: "Test User",
        email: "exists@test.com",
        password: "Password123!",
        passwordConfirmation: "Password123!",
        roleName: "User",
        profileData: {
          firstName: "Test",
          lastName: "User",
          contactInfo: { phone: "0123456789" },
        },
      };
      // Tạo user lần 1
      await request(app).post("/api/users/register").send(userData);
      // Thử tạo lại với cùng email
      const res = await request(app).post("/api/users/register").send(userData);
      // Kỳ vọng API trả về lỗi 400 Bad Request
      expect(res.status).to.equal(400);
      expect(res.body.message).to.equal(
        "Email này đã được sử dụng. Vui lòng chọn một email khác."
      );
    });
  });

  // === BỘ TEST CHO CHỨC NĂNG XÁC MINH EMAIL ===
  describe("GET /verify-email/:token - Xác minh Email", () => {
    let verificationToken;
    const userEmail = "unverified@test.com";

    // Trước mỗi test, tạo sẵn một user chưa xác minh
    beforeEach(async () => {
      const userData = {
        name: "Unverified User",
        email: userEmail,
        password: "Password123!",
        passwordConfirmation: "Password123!",
        roleName: "User",
        profileData: {
          firstName: "Unverified",
          lastName: "User",
          contactInfo: { phone: "555" },
        },
      };
      await request(app).post("/api/users/register").send(userData);

      // Lấy token xác minh từ "stub" (do chúng ta không thể đọc email thật)
      const verificationUrl = mailStub.sendVerificationEmail.getCall(0).args[1];
      verificationToken = verificationUrl.split("/").pop();
    });

    it("should verify the email with a valid token", async () => {
      // Act: Gọi đến API xác minh với token hợp lệ
      const res = await request(app).get(
        `/api/users/verify-email/${verificationToken}`
      );

      // Assert: Kiểm tra response và trạng thái trong CSDL
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.message).to.equal("Email đã được xác minh thành công!");

      const userInDb = await User.findOne({ email: userEmail });
      expect(userInDb.isEmailVerified).to.be.true;
      expect(userInDb.emailVerificationToken).to.be.undefined; // Token phải bị xóa
    });

    it("should fail with an invalid token", async () => {
      const res = await request(app).get(
        "/api/users/verify-email/thisisafaketoken123"
      );

      expect(res.status).to.equal(400);
      expect(res.body.message).to.equal(
        "Token xác minh không hợp lệ hoặc đã hết hạn."
      );
    });

    it("should fail if trying to use the same token twice", async () => {
      // Lần 1: Xác minh thành công
      await request(app).get(`/api/users/verify-email/${verificationToken}`);

      // Lần 2: Thử dùng lại token đã bị vô hiệu hóa
      const res = await request(app).get(
        `/api/users/verify-email/${verificationToken}`
      );

      expect(res.status).to.equal(400);
      expect(res.body.message).to.equal(
        "Token xác minh không hợp lệ hoặc đã hết hạn."
      );
    });
  });

  // === BỘ TEST CHO CHỨC NĂNG PHÂN QUYỀN (AUTHORIZATION) ===
  describe("Authorization - Phân quyền truy cập", () => {
    let adminToken, userToken;

    // Chuẩn bị: tạo và đăng nhập 2 user với 2 vai trò khác nhau
    beforeEach(async () => {
      // ---- Tạo và đăng nhập Admin TRỰC TIẾP ----
      // 1. Tìm ObjectId của vai trò 'Admin' đã được seed
      const adminRole = await Role.findOne({ name: "Admin" });
      if (!adminRole)
        throw new Error("Vai trò Admin không được tìm thấy trong CSDL test.");

      // 2. Tạo một đối tượng User mới với vai trò Admin
      const adminUser = new User({
        name: "Admin Test",
        email: "admin@test.com",
        password: "Password123!", // Mật khẩu sẽ được hash bởi hook pre('save')
        role: adminRole._id,
        // Kích hoạt tài khoản ngay lập tức cho mục đích test
        isEmailVerified: true,
        isVerified: true,
        isActive: true,
        lastLoginIp: "::ffff:127.0.0.1", // Để bỏ qua OTP
        // Các trường profile cần được thêm vào để pass validation của model
        profileModel: "UserProfile",
        profile: new mongoose.Types.ObjectId(), // Tạo một ObjectId giả
      });
      await adminUser.save(); // Lưu vào CSDL

      // Tạo một profile giả tương ứng, vì user model yêu cầu
      const adminProfile = new UserProfile({
        _id: adminUser.profile,
        user: adminUser._id,
        firstName: "Admin",
        lastName: "Test",
        contactInfo: { phone: "111" },
      });
      await adminProfile.save();

      // 3. Đăng nhập để lấy token
      const adminLoginRes = await request(app)
        .post("/api/auth/login")
        .set("User-Agent", "Supertest")
        .send({ email: "admin@test.com", password: "Password123!" });
      adminToken = adminLoginRes.body.accessToken;

      // ---- Tạo, kích hoạt và đăng nhập User ----
      const userData = {
        name: "Normal User",
        email: "normaluser@test.com",
        password: "Password123!",
        passwordConfirmation: "Password123!",
        roleName: "User",
        profileData: {
          firstName: "Normal",
          lastName: "User",
          contactInfo: { phone: "222" },
        },
      };
      await request(app).post("/api/users/register").send(userData);
      await User.findOneAndUpdate(
        { email: "normaluser@test.com" },
        { isEmailVerified: true, lastLoginIp: "::ffff:127.0.0.1" }
      );
      const userLoginRes = await request(app)
        .post("/api/auth/login")
        .set("User-Agent", "Supertest")
        .send({ email: "normaluser@test.com", password: "Password123!" });
      userToken = userLoginRes.body.accessToken;
    });

    it("should allow Admin to get user list", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${adminToken}`); // Dùng token của Admin

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
    });

    it("should forbid a normal User from getting user list", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Authorization", `Bearer ${userToken}`); // Dùng token của User

      expect(res.status).to.equal(403);
      expect(res.body.message).to.contain(
        "Bạn không có quyền thực hiện hành động này."
      );
    });

    it("should return 401 if no token is provided", async () => {
      const res = await request(app).get("/api/users");
      expect(res.status).to.equal(401);
    });
  });
});
