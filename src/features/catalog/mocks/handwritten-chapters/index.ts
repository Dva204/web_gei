import { generateChapter } from '../generators';
const slugs = [
  'mua-ha-nam-trong-tach-tra',
  'hen-nhau-duoi-mai-hien-mua',
  'gio-qua-thanh-cu-nguoi-qua-nam-thang-chi-co-loi-hen-duoi-tan-ngoc-lan-con-o-lai',
  'thu-gui-nguoi-o-cuoi-con-doc',
  'bep-nho-co-nguoi-cho',
  'mot-ve-ve-phia-binh-minh',
];
export const handwritten: Record<string, string> = Object.fromEntries(
  slugs.flatMap((slug) =>
    [1, 2, 3].map((n) => [
      `${slug}:${n}`,
      generateChapter(`${slug}-ban-thao-goc`, n),
    ]),
  ),
);
