const express = require("express");
const authController = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const authValidation = require("../validations/authValidation");
const validate = require("../middlewares/validateMiddleware");
const router = express.Router();

// Các route công khai
router.post("/login", validate(authValidation.login), authController.login);
router.post(
  "/verify-otp",
  validate(authValidation.verifyOtp),
  authController.verifyOtp
);
router.post("/refresh-token", authController.refreshToken);
router.post(
  "/forgot-password",
  validate(authValidation.forgotPassword),
  authController.forgotPassword
);
router.post(
  "/reset-password/:token",
  validate(authValidation.resetPassword),
  authController.resetPassword
);
router.post("/logout", authController.logout);

// Route được bảo vệ
router.get("/profile", protect, authController.getProfile);

module.exports = router;
