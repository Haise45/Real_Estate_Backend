/**
 * DTO này định hình dữ liệu người dùng sẽ được trả về cho client.
 * Nó đảm bảo rằng không có thông tin nhạy cảm nào bị lộ.
 */
class UserDto {
  constructor(userModel) {
    this._id = userModel._id;
    this.email = userModel.email;
    this.name = userModel.name;
    this.role = userModel.role.name; // Làm phẳng dữ liệu, chỉ lấy tên vai trò
    this.isActive = userModel.isActive;
    this.isEmailVerified = userModel.isEmailVerified;
    this.isVerified = userModel.isVerified;
    if (userModel.profile) {
      this.avatarUrl = userModel.profile.avatarUrl;
    }
  }
}

module.exports = UserDto;
