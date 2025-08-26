const mongoose = require("mongoose");

// Lược đồ con có thể tái sử dụng cho thông tin liên hệ
const contactSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    address: {
      street: String,
      ward: String,
      district: String,
      city: String,
    },
    socialLinks: {
      facebook: String,
      linkedin: String,
      zalo: String,
      website: String,
    },
  },
  { _id: false }
);

module.exports = contactSchema;
