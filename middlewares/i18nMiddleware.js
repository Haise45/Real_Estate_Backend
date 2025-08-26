const fs = require("fs");
const path = require("path");

const translations = {};
const localesPath = path.join(__dirname, "../locales");

try {
  // Đọc tất cả file JSON trong thư mục locales và load vào biến translations
  fs.readdirSync(localesPath).forEach((file) => {
    if (file.endsWith(".json")) {
      const lang = file.split(".")[0]; // ví dụ: "en.json" => lang = "en"
      translations[lang] = JSON.parse(
        fs.readFileSync(path.join(localesPath, file), "utf8")
      );
    }
  });
  console.log("Các file ngôn ngữ đã được tải:", Object.keys(translations));
} catch (error) {
  console.error("Không thể tải các file ngôn ngữ:", error);
}

/**
 * Middleware i18n:
 * - Tự động phát hiện ngôn ngữ từ header `Accept-Language` của request.
 * - Gắn vào `req` một hàm dịch `req.t(key, replacements)`.
 * - Nếu không tìm thấy bản dịch theo ngôn ngữ của người dùng, fallback sang tiếng Việt.
 *
 * @example
 * req.t('errors.unauthorized')
 * req.t('welcome', { name: 'John' })
 */
const i18nMiddleware = (req, res, next) => {
  let lang = "vi";

  // Lấy ngôn ngữ ưu tiên từ header "Accept-Language"
  const acceptLanguage = req.headers["accept-language"];
  if (acceptLanguage) {
    const preferredLang = acceptLanguage
      .split(",")[0]
      .split("-")[0]
      .toLowerCase();
    if (translations[preferredLang]) {
      lang = preferredLang;
    }
  }

  req.lang = lang;

  /**
   * Hàm dịch chuỗi theo key.
   * @param {string} key - key của chuỗi trong file JSON, ví dụ: "errors.invalidToken"
   * @param {Object} [replacements] - đối tượng chứa giá trị thay thế cho placeholder
   * @returns {string} Chuỗi đã dịch hoặc key nếu không tìm thấy
   */
  req.t = (key, replacements) => {
    const keys = key.split(".");

    // Lấy bản dịch theo ngôn ngữ hiện tại
    let text = keys.reduce((obj, k) => (obj || {})[k], translations[lang]);

    // Fallback sang tiếng Việt nếu chưa có bản dịch
    if (!text) {
      text = keys.reduce((obj, k) => (obj || {})[k], translations["vi"]);
    }

    // Nếu vẫn không có => trả về key
    if (!text) return key;

    // Thay thế các placeholder {name}, {count}, ...
    if (replacements) {
      Object.keys(replacements).forEach((r) => {
        text = text.replace(`{${r}}`, replacements[r]);
      });
    }

    return text;
  };

  next();
};

module.exports = i18nMiddleware;
