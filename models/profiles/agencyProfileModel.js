const mongoose = require("mongoose");
const contactSchema = require("./contactSchema");
const i18nString = require("../i18nSchema");

const agencyProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  companyName: { type: String, required: true },
  taxCode: { type: String, required: true, unique: true },
  businessLicenseNumber: String,
  logoUrl: String,
  coverImageUrl: String,
  description: {
    type: i18nString,
  },
  foundingDate: Date,
  contactInfo: { type: contactSchema, required: true },
});

module.exports = mongoose.model("AgencyProfile", agencyProfileSchema);
