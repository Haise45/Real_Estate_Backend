const mongoose = require("mongoose");
const contactSchema = require("./contactSchema");

const userProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  avatarUrl: String,
  contactInfo: { type: contactSchema, required: true },
});

module.exports = mongoose.model("UserProfile", userProfileSchema);
