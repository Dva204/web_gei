const paragraphs = [
  'Nắng cuối ngày rơi nghiêng trên bậc cửa, để lại một vệt màu mật ong. Cô đứng im nghe tiếng lá ngoài hiên và nhận ra lòng mình đã thôi vội vã từ lúc nào.',
  '— Anh đến lâu chưa? Cô hỏi, hai tay vẫn ôm chặt quyển sổ. — Vừa đủ lâu để biết em sẽ đến. Anh cười, giọng bình thản như một buổi chiều không gió.',
  'Con phố nhỏ sau cơn mưa sáng lên dưới những ngọn đèn. Mùi bánh mới từ tiệm góc đường theo gió bay ra, khiến ký ức tưởng đã ngủ yên bỗng dịu dàng trở lại.',
  'Cô từng nghĩ trưởng thành là học cách không cần ai. Đến khi gặp anh, cô mới hiểu trưởng thành còn là biết tin tưởng, biết nói ra nỗi sợ và cho người khác một cơ hội ở bên.',
  'Trên bàn là hai tách trà, một nóng một đã nguội. Khoảng im lặng giữa họ không còn nặng nề; nó giống một dấu lặng cần thiết để cả hai nghe rõ điều trái tim muốn nói.',
  '— Nếu ngày mai trời mưa thì sao? — Thì chúng ta mang ô. — Nếu gió lớn? — Anh sẽ đi chậm lại. Câu trả lời đơn giản đến mức cô phải quay mặt giấu nụ cười.',
  'Bà chủ quán đặt đĩa bánh xuống, kín đáo nhìn họ rồi mỉm cười. Ngoài cửa kính, dòng người vẫn đi qua, còn trong góc nhỏ ấy, thời gian dường như chậm thêm một nhịp.',
  'Anh không hứa những điều quá xa. Anh chỉ kéo chiếc ghế cho cô, nhớ cô không uống đồ quá ngọt, và luôn đợi ánh đèn phòng cô bật sáng rồi mới quay về.',
  'Có những hiểu lầm sinh ra không phải vì thiếu yêu thương, mà vì người ta quá sợ làm phiền nhau. Tối đó, lần đầu tiên cô quyết định nói hết, kể cả những điều vụn vặt nhất.',
  'Gió lật từng trang sổ, dừng ở nét chữ nghiêng: “Mong người mình thương luôn có một nơi để về.” Cô đọc lại, bất giác thấy mắt cay nhưng lòng lại nhẹ.',
  'Buổi sáng đến bằng tiếng chim trên mái ngói. Anh mở cửa, bắt gặp cô đang cúi tưới chậu bạc hà, mái tóc được buộc vội và nụ cười trong trẻo hơn mọi lời chào.',
  '— Chúng ta bắt đầu lại nhé? — Không. Anh khẽ lắc đầu. — Mình tiếp tục từ chỗ đã hiểu nhau hơn. Cô nhìn anh rất lâu rồi gật đầu.',
];
function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export function chapterTitle(n: number) {
  if (n === 7)
    return 'Lời hẹn giữa cơn mưa tháng sáu và những điều chưa kịp nói dưới vòm trời rất xanh';
  return [
    'Một ngày có gió',
    'Lá thư màu lam',
    'Sau hiên mưa',
    'Ánh đèn còn thức',
    'Đường về có hoa',
  ][n % 5];
}
export function generateChapter(slug: string, n: number, long = false) {
  let seed = hash(slug + n);
  const out: string[] = [];
  const count = long ? 90 : 28 + (seed % 16);
  for (let i = 0; i < count; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    out.push(paragraphs[seed % paragraphs.length]);
  }
  return out.join('\n\n');
}
