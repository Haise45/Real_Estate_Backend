const mongoose = require("mongoose");
const contactSchema = require("./contactSchema");
const i18nString = require("../i18nSchema");

const agentProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  avatarUrl: String,
  bio: { type: i18nString },
  specialties: [String],
  yearsOfExperience: Number,
  certificationIds: [String],
  contactInfo: { type: contactSchema, required: true },
});

module.exports = mongoose.model("AgentProfile", agentProfileSchema);
