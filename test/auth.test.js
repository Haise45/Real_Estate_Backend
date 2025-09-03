/**
 * Bộ test cho các API liên quan đến xác thực (/api/auth).
 * Bao gồm các chức năng đăng ký, kiểm tra trạng thái tài khoản, và quên mật khẩu.
 * Đã được cập nhật để xử lý refreshToken qua HttpOnly cookie.
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

  // Trước mỗi test, giả lập (mock) các hàm gửi email để không gửi email thật
  beforeEach(() => {
    mailStub = {
      sendOtpEmail: sinon.stub(mailUtil, "sendOtpEmail"),
      sendPasswordResetEmail: sinon.stub(mailUtil, "sendPasswordResetEmail"),
      sendVerificationEmail: sinon.stub(mailUtil, "sendVerificationEmail"),
    };
  });

  // Sau mỗi test, khôi phục lại các hàm thật để đảm bảo các test độc lập
  afterEach(() => {
    sinon.restore();
  });

  // === BỘ TEST CHO LUỒNG ĐĂNG NHẬP CƠ BẢN ===
  describe("POST /login - Luồng đăng nhập cơ bản", () => {
    const userEmail = "loginuser@test.com";
    const userPassword = "Password123!";

    // Chuẩn bị một user đã được xác minh email trước mỗi test trong block này
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

      // Assert: Kỳ vọng bị từ chối với lỗi 403 và thông báo chính xác
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
      expect(res.body.requiresOtp).to.be.true; // Phải yêu cầu OTP
      expect(mailStub.sendOtpEmail.calledOnce).to.be.true; // Email OTP phải được gửi
    });

    it("should login directly, return accessToken in body and session cookie (no rememberMe)", async () => {
      // Arrange: Giả lập IP đã quen thuộc
      await User.findOneAndUpdate(
        { email: userEmail },
        { lastLoginIp: "::ffff:127.0.0.1" }
      );

      const res = await request(app)
        .post("/api/auth/login")
        .set("User-Agent", "Supertest")
        .send({ email: userEmail, password: userPassword, rememberMe: false }); // Gửi rememberMe: false

      // Assert: Kiểm tra response
      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body).to.have.property("accessToken");
      expect(res.body).to.not.have.property("refreshToken"); // QUAN TRỌNG: refreshToken không còn trong body

      // Assert: Kiểm tra cookie
      const cookie = res.headers["set-cookie"][0];
      expect(cookie).to.exist;
      expect(cookie).to.contain("refreshToken=");
      expect(cookie).to.contain("HttpOnly");
      expect(cookie).to.contain("SameSite=Strict");
      expect(cookie).to.not.contain("Expires="); // QUAN TRỌNG: Không có 'Expires' nghĩa là đây là session cookie
    });

    it("should return a persistent cookie when rememberMe is true", async () => {
      await User.findOneAndUpdate(
        { email: userEmail },
        { lastLoginIp: "::ffff:127.0.0.1" }
      );

      const res = await request(app)
        .post("/api/auth/login")
        .set("User-Agent", "Supertest")
        .send({ email: userEmail, password: userPassword, rememberMe: true }); // Gửi rememberMe: true

      const cookie = res.headers["set-cookie"][0];
      expect(cookie).to.exist;
      expect(cookie).to.contain("Expires="); // QUAN TRỌNG: Phải có 'Expires' để cookie được lưu lại
    });
  });

  // === BỘ TEST CHO LUỒNG REFRESH TOKEN VÀ LOGOUT (DÙNG COOKIE) ===
  describe("Refresh & Logout Flow (with Cookies)", () => {
    let agent; // Supertest agent sẽ tự động quản lý cookie jar cho mỗi phiên
    const userEmail = "agentuser@test.com";
    const userPassword = "Password123!";

    // Trước mỗi test, tạo một user sạch
    beforeEach(async () => {
      agent = request.agent(app); // Tạo một agent mới cho mỗi test
      const userData = {
        name: "Agent User",
        email: userEmail,
        password: userPassword,
        passwordConfirmation: userPassword,
        roleName: "User",
        profileData: {
          firstName: "Agent",
          lastName: "User",
          contactInfo: { phone: "777" },
        },
      };
      await request(app).post("/api/users/register").send(userData);
      await User.findOneAndUpdate(
        { email: userEmail },
        { isEmailVerified: true, lastLoginIp: "::ffff:127.0.0.1" }
      );
    });

    it("should preserve session cookie status (no rememberMe) after refreshing", async () => {
      // Bước 1: Đăng nhập KHÔNG chọn "Remember Me"
      const loginRes = await agent
        .post("/api/auth/login")
        .set("User-Agent", "Supertest")
        .send({ email: userEmail, password: userPassword, rememberMe: false });

      // Kiểm tra cookie ban đầu là session cookie
      const initialCookie = loginRes.headers["set-cookie"][0];
      expect(initialCookie).to.not.contain("Expires=");

      // Bước 2: Dùng agent (đã có cookie) để làm mới token
      const refreshRes = await agent
        .post("/api/auth/refresh-token")
        .set("User-Agent", "Supertest")
        .send({});

      // Assert: Kiểm tra kết quả refresh
      expect(refreshRes.status).to.equal(200);
      expect(refreshRes.body).to.have.property("accessToken");

      // Assert: Kiểm tra cookie MỚI phải VẪN LÀ session cookie
      const newCookie = refreshRes.headers["set-cookie"][0];
      expect(newCookie).to.exist;
      expect(newCookie).to.contain("refreshToken=");
      expect(newCookie).to.not.contain("Expires="); // QUAN TRỌNG!
    });

    it("should preserve persistent cookie status (with rememberMe) after refreshing", async () => {
      // Bước 1: Đăng nhập CÓ chọn "Remember Me"
      const loginRes = await agent
        .post("/api/auth/login")
        .set("User-Agent", "Supertest")
        .send({ email: userEmail, password: userPassword, rememberMe: true });

      // Kiểm tra cookie ban đầu là persistent cookie
      const initialCookie = loginRes.headers["set-cookie"][0];
      expect(initialCookie).to.contain("Expires=");

      // Bước 2: Dùng agent để làm mới token
      const refreshRes = await agent
        .post("/api/auth/refresh-token")
        .set("User-Agent", "Supertest")
        .send({});

      // Assert: Kiểm tra kết quả refresh
      expect(refreshRes.status).to.equal(200);
      expect(refreshRes.body).to.have.property("accessToken");

      // Assert: Kiểm tra cookie MỚI phải VẪN LÀ persistent cookie
      const newCookie = refreshRes.headers["set-cookie"][0];
      expect(newCookie).to.exist;
      expect(newCookie).to.contain("refreshToken=");
      expect(newCookie).to.contain("Expires="); // QUAN TRỌNG!
    });

    it("should fail to refresh if no refreshToken cookie is present", async () => {
      // Sử dụng request thường thay vì agent để không gửi cookie
      const res = await request(app)
        .post("/api/auth/refresh-token")
        .set("User-Agent", "Supertest")
        .send({});

      expect(res.status).to.equal(401);
    });

    it("should logout and clear the refreshToken cookie", async () => {
      // Bước 1: Đảm bảo đã đăng nhập (đã làm trong beforeEach)
      // Bước 2: Gọi logout, agent tự động đính kèm cookie
      const logoutRes = await agent
        .post("/api/auth/logout")
        .set("User-Agent", "Supertest")
        .send({});

      // Assert: Kiểm tra response và cookie đã bị xóa
      expect(logoutRes.status).to.equal(200);
      const cookie = logoutRes.headers["set-cookie"][0];
      expect(cookie).to.contain("refreshToken=;");
      expect(cookie).to.contain("Expires=Thu, 01 Jan 1970");
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
      await User.findOneAndUpdate(
        { email: "reset@test.com" },
        { lastLoginIp: "::ffff:127.0.0.1" }
      );

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
