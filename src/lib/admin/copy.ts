export const ADMIN_COPY = {
  brand: 'Vườn quản trị',
  openMenu: 'Mở menu quản trị', closeMenu: 'Đóng menu', logout: 'Đăng xuất',
  search: 'Tìm kiếm', save: 'Lưu thay đổi', cancel: 'Hủy', loading: 'Đang tải…',
  loginTitle: 'Đăng nhập quản trị', loginHint: 'Dùng tài khoản mẫu để khám phá giao diện quản trị.',
  email: 'Email', password: 'Mật khẩu', continue: 'Tiếp tục', twoFactor: 'Xác thực hai bước', twoFactorHint: 'Nhập mã mẫu 123456 để hoàn tất.', code: 'Mã xác thực', verify: 'Xác nhận',
  roleSwitcher: 'Xem với vai trò', lightDark: 'Đổi chế độ sáng tối',
  dashboard: { title: 'Tổng quan', description: 'Việc cần xử lý và nhịp vận hành hôm nay.' },
  nav: {
    overview: 'Tổng quan', stories: 'Truyện', import: 'Nhập hàng loạt', taxonomy: 'Thể loại', authors: 'Tác giả', comments: 'Bình luận', reports: 'Báo lỗi chap', takedowns: 'Yêu cầu gỡ', chat: 'Kiểm duyệt chat', users: 'Người dùng', ads: 'Quảng cáo', affiliate: 'Affiliate', stats: 'Thống kê', seo: 'SEO', content: 'Nội dung trang', settings: 'Cài đặt', audit: 'Nhật ký', backup: 'Sao lưu',
  },
  statuses: { draft: 'Bản nháp', translating: 'Đang dịch', editing: 'Đang edit', beta: 'Chờ beta', ready: 'Sẵn sàng', published: 'Đã đăng', scheduled: 'Lên lịch', public: 'Công khai', hidden: 'Đã ẩn', pending: 'Chờ duyệt', visible: 'Đang hiện' } as Record<string, string>,
  roles: { admin: 'Quản trị viên', mod: 'Điều hành viên', editor: 'Biên tập viên', author: 'Tác giả/Dịch giả', beta: 'Beta' } as Record<string, string>,
  forbidden: 'Bạn không có quyền truy cập màn hình này.', backDashboard: 'Về tổng quan',
};
