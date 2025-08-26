/**
 * Bộ test cho các API liên quan đến xác thực (/api/auth).
 * Bao gồm các chức năng đăng nhập, kiểm tra trạng thái tài khoản, và quên mật khẩu.
 */
const request = require("supertest");
const { expect } = require("chai");
const sinon = require("sinon");
const app = require("../app");
const User = require("../models/userModel");
const mailUtil = require("../utils/mailUtil");
require("./test-setup");

describe("API - Authentication (/api/auth)", () => {
  // Tạo đối tượng chứa các stub
  let mailStub;

  // Trước mỗi test, giả lập các hàm gửi email
  beforeEach(() => {
    mailStub = {
      sendOtpEmail: sinon.stub(mailUtil, "sendOtpEmail"),
      sendPasswordResetEmail: sinon.stub(mailUtil, "sendPasswordResetEmail"),
      sendVerificationEmail: sinon.stub(mailUtil, "sendVerificationEmail"), // Dùng trong setup
    };
  });

  // Sau mỗi test, khôi phục lại các hàm thật
  afterEach(() => {
    sinon.restore();
  });

  // === BỘ TEST CHO LUỒNG ĐĂNG NHẬP CƠ BẢN ===
  describe("POST /login - Luồng đăng nhập cơ bản", () => {
    const userEmail = "loginuser@test.com";
    const userPassword = "Password123!";

    // Chuẩn bị một user đã được xác minh email
    beforeEach(async () => {
      const userData = {
        name: "Login User",
        email: userEmail,
        password: userPassword,
        passwordConfirmation: userPassword,
        roleName: "User",
        profileData: {
          firstName: "Login",
          lastName: "User",
          contactInfo: { phone: "333" },
        },
      };
      await request(app).post("/api/users/register").send(userData);
      // Kích hoạt tài khoản thủ công cho các test case đăng nhập
      await User.findOneAndUpdate(
        { email: userEmail },
        { isEmailVerified: true }
      );
    });

    it("should FORBID login if email is not verified", async () => {
      // Arrange: Tạo một user khác nhưng không kích hoạt email
      const unverifiedEmail = "neververified@test.com";
      const unverifiedData = {
        name: "Unverified",
        email: unverifiedEmail,
        password: userPassword,
        passwordConfirmation: userPassword,
        roleName: "User",
        profileData: {
          firstName: "Unverified",
          lastName: "User",
          contactInfo: { phone: "666" },
        },
      };
      await request(app).post("/api/users/register").send(unverifiedData);

      // Act: Cố gắng đăng nhập
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: unverifiedEmail, password: userPassword });

      // Assert: Kỳ vọng bị từ chối với lỗi 403
      expect(res.status).to.equal(403);
      expect(res.body.message).to.equal(
        "Tài khoản của bạn chưa được kích hoạt. Vui lòng kiểm tra email để xác minh."
      );
    });

    it("should require OTP for a verified user logging in from a new IP", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: userEmail, password: userPassword });

      expect(res.status).to.equal(200);
      expect(res.body.requiresOtp).to.be.true;
      expect(mailStub.sendOtpEmail.calledOnce).to.be.true;
    });

    it("should login directly for a verified user if IP is known", async () => {
      // Arrange: Giả lập IP đã quen thuộc
      await User.findOneAndUpdate(
        { email: userEmail },
        { lastLoginIp: "::ffff:127.0.0.1" }
      );

      const res = await request(app)
        .post("/api/auth/login")
        .set("User-Agent", "Supertest")
        .send({ email: userEmail, password: userPassword });

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body).to.have.property("accessToken");
      expect(mailStub.sendOtpEmail.called).to.be.false; // Email OTP không được gửi
    });
  });

  // === BỘ TEST CHO LUỒNG QUÊN MẬT KHẨU ===
  describe("Password Reset Flow", () => {
    beforeEach(async () => {
      // Chuẩn bị một user đã kích hoạt để test
      const userData = {
        name: "Reset User",
        email: "reset@test.com",
        password: "Password123!",
        passwordConfirmation: "Password123!",
        roleName: "User",
        profileData: {
          firstName: "Reset",
          lastName: "User",
          contactInfo: { phone: "444" },
        },
      };
      await request(app).post("/api/users/register").send(userData);
      await User.findOneAndUpdate(
        { email: "reset@test.com" },
        { isEmailVerified: true }
      );
    });

    it("should send a password reset email if user exists", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "reset@test.com" });

      expect(res.status).to.equal(200);
      expect(mailStub.sendPasswordResetEmail.calledOnce).to.be.true;
    });

    it("should successfully reset the password with a valid token", async () => {
      // Bước 1: Yêu cầu reset, lấy token từ stub
      await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "reset@test.com" });
      const resetUrl = mailStub.sendPasswordResetEmail.getCall(0).args[1];
      const resetToken = resetUrl.split("/").pop();

      // Bước 2: Dùng token để đặt lại mật khẩu
      const res = await request(app)
        .post(`/api/auth/reset-password/${resetToken}`)
        .send({ password: "NewPassword456!" });
      expect(res.status).to.equal(200);

      // Sau khi reset, cập nhật IP để mô phỏng đăng nhập thành công
      await User.findOneAndUpdate({ email: 'reset@test.com' }, { lastLoginIp: '::ffff:127.0.0.1' });
      
      // Bước 3: Xác minh mật khẩu mới hoạt động
      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("User-Agent", "Supertest")
        .send({ email: "reset@test.com", password: "NewPassword456!" });
      expect(loginRes.status).to.equal(200);
      expect(loginRes.body.success).to.be.true;
    });
  });
});
