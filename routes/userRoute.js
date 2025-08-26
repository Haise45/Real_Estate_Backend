const express = require("express");
const userController = require("../controllers/userController");
const { protect, authorize } = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validateMiddleware");
const userValidation = require("../validations/userValidation");

const router = express.Router();

// Route đăng ký công khai
router.post(
  "/register",
  validate(userValidation.register),
  userController.register
);

router.get("/verify-email/:token", userController.verifyEmail);

// Các route cần xác thực và phân quyền
router.get("/", protect, authorize("users:read"), userController.getUsers);

module.exports = router;
