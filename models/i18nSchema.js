const mongoose = require("mongoose");

// Schema này sẽ được nhúng vào các model khác
const i18nString = new mongoose.Schema(
  {
    vi: {
      type: String,
      trim: true,
    },
    en: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

module.exports = i18nString;
