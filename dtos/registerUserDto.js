/**
 * DTO này đại diện cho dữ liệu cần thiết để đăng ký một người dùng mới.
 * Nó hoạt động như một bộ lọc và một cấu trúc dữ liệu rõ ràng.
 */
class RegisterUserDto {
  constructor(body) {
    this.email = body.email;
    this.password = body.password;
    this.name = body.name;
    this.roleName = body.roleName;
    this.agencyId = body.agencyId; // Sẽ là undefined nếu không có
    this.profileData = body.profileData;
  }
}

module.exports = RegisterUserDto;
