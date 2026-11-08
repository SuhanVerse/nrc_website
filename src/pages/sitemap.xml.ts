import { siteConfig, url, navigation } from '../content/site';
import { club } from '../content/public';

export function GET() {
  const routes = [
    ...navigation.map(([, path]) => path),
    ...club.projects.map((p) => `/projects/${p.slug}/`),
    '/events/yatra-5/',
  ];
  const entries = routes
    .map(
      (path) =>
        `<url><loc>${new URL(url(path), siteConfig.siteOrigin).href}</loc></url>`,
    )
    .join('');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}
