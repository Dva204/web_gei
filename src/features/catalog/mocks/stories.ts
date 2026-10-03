import type { Story, Status } from '@/features/catalog/types/story';
const seeds = [
  ['Mùa Hạ Nằm Trong Tách Trà', 'Lâm Miên', 'hien-dai,chua-lanh', 72],
  ['Hẹn Nhau Dưới Mái Hiên Mưa', 'Tô Vãn Lam', 'hien-dai,sung', 24],
  [
    'Gió Qua Thành Cũ, Người Qua Năm Tháng, Chỉ Có Lời Hẹn Dưới Tán Ngọc Lan Còn Ở Lại',
    'An Dạ Thư',
    'co-dai,ngược',
    3000,
  ],
  ['Thư Gửi Người Ở Cuối Con Dốc', 'Mộc Hạ Nhiên', 'hoc-duong,chua-lanh', 18],
  ['Bếp Nhỏ Có Người Chờ', 'Hứa Thanh Chi', 'dien-van,sung', 45],
  ['Một Vé Về Phía Bình Minh', 'Cố Trúc Yên', 'hien-dai,hai-huoc', 12],
  ['Ngọc Bội Của Nàng', 'Liễu Khê', 'co-dai,cung-dau', 220],
  ['Sau Cánh Gà Là Anh', 'Diệp Tinh Hà', 'showbiz,sung', 66],
  ['Ngày Tổng Tài Học Trồng Rau', 'Tống Hòa Phong', 'hao-mon,hai-huoc', 36],
  ['Trở Lại Năm Mười Chín', 'Kiều Vị Ương', 'trong-sinh,hoc-duong', 158],
  ['Xuyên Qua Chỉ Để Mở Tiệm Bánh', 'Bạch Du Ninh', 'xuyen-khong,dien-van', 28],
  ['Đèn Sáng Bên Khung Cửa', 'Vân Mặc', 'hien-dai,chua-lanh', 15],
  ['Ba Lá Thư Không Gửi', 'Ninh Sơ Tuyết', 'doan-van,ngược', 3],
  ['Ngày Mai Hoa Sẽ Nở', 'Thẩm Nghi Lam', 'doan-van,chua-lanh', 1],
  ['Người Giữ Mùa Trăng', 'Tạ Chiêu Nguyệt', 'co-dai,doan-van', 5],
  ['Cà Phê Không Đường, Anh Có Em', 'Quý Noãn', 'hien-dai,sung', 20],
  ['Phượng Hoàng Chẳng Về Cung', 'Đường Uyển Ca', 'co-dai,cung-dau', 380],
  ['Kịch Bản Này Thiếu Một Nụ Cười', 'La Tinh Vũ', 'showbiz,hai-huoc', 52],
  ['Từ Ban Công Nhìn Thấy Biển', 'Hạ Lam Khê', 'hien-dai,chua-lanh', 16],
  ['Chàng Kỹ Sư Hay Quên', 'Đào Nhược Vy', 'hien-dai,hai-huoc', 9],
  ['Nhặt Được Một Vị Hôn Phu', 'Khương Tử Miên', 'co-dai,sung', 23],
  ['Lời Thì Thầm Sau Tiết Ba', 'Tần Mộc Ca', 'hoc-duong,sung', 11],
  ['Bên Kia Rèm Châu', 'Phó Yên Nhi', 'co-dai,ngược', 4],
  ['Hộp Nhạc Trong Ngày Tuyết', 'Sầm Tuyết Chi', 'doan-van,chua-lanh', 2],
  ['Hành Trình Gió Mùa Thu', 'Haruki', 'nhat-ban,chua-lanh', 14],
  ['Anh Đào Mùa Xuân', 'Sakura', 'nhat-ban,hoc-duong', 20],
  ['Lá Phong Đỏ', 'Yuki', 'nhat-ban,ngược', 10],
  ['Bản Tình Ca Mùa Đông', 'Kim Ji Won', 'han-quoc,ngược', 16],
  ['Ánh Dương Ngày Mới', 'Lee Min Ho', 'han-quoc,sung', 24],
  ['Hoa Nở Về Đêm', 'Song Hye Kyo', 'han-quoc,showbiz', 32],
  ['Tam Sinh Tam Thế', 'Đường Thất', 'trung-quoc,co-dai', 58],
  ['Mộng Hoa Lục', 'Quan Hán Khanh', 'trung-quoc,co-dai', 40],
  ['Bí Mật Của Thời Gian', 'Đồng Hoa', 'trung-quoc,hien-dai', 45],
] as const;
const full = new Set([1, 5, 9, 12, 13, 14, 20, 23]);
const paused = new Set([18, 22]);
function rand(seed: number) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}
export const stories: Story[] = seeds.map((s, i) => {
  const status: Status = full.has(i)
    ? 'full'
    : paused.has(i)
      ? 'paused'
      : 'ongoing';
  return {
    id: String(i + 1),
    slug: s[0]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    title: s[0],
    author: s[1],
    genres: s[2].split(','),
    status,
    ending:
      status === 'full'
        ? (['HE', 'OE', 'SE'][i % 3] as 'HE' | 'OE' | 'SE')
        : undefined,
    synopsis: `${s[0]} kể về một cuộc gặp gỡ tưởng như tình cờ giữa hai con người đang học cách bình tâm trước những đổi thay. Từ những lá thư chưa gửi, bữa cơm ấm và lời hẹn giản dị, họ dần hiểu rằng yêu thương không phải là giữ ai đó bên mình, mà là cùng nhau trưởng thành. Câu chuyện đi qua nhiều hiểu lầm nhẹ nhàng, những lựa chọn tử tế và khoảnh khắc đời thường trong trẻo. Khi bí mật cũ được mở ra, cả hai phải tự quyết định sẽ bước tiếp một mình hay can đảm nắm tay người kia để viết nên một mùa mới.`,
    rating: i === 22 ? 0 : Number((3.8 + rand(i) * 1.2).toFixed(1)),
    ratingCount: i === 22 ? 0 : Math.floor(40 + rand(i + 5) * 2600),
    views: Math.floor(1200 + rand(i + 8) * 900000),
    totalChapters: s[3],
    latestChapter: s[3],
    updatedAt: new Date(Date.UTC(2026, 8, 28 - (i % 20))).toISOString(),
    createdAt: new Date(Date.UTC(2025, i % 12, 2 + (i % 20))).toISOString(),
    cover: i % 6 === 0 ? undefined : `generated:${i}`,
  };
});
