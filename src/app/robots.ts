import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/tim-kiem',
        '/tu-truyen',
        '/lich-su',
        '/chat',
        '/cai-dat',
        '/dang-nhap',
        '/dang-ky',
        '/go/',
        '/admin',
      ],
    },
    sitemap: 'https://vuonngontinh.example/sitemap.xml',
  };
}
