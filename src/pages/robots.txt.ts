import { siteConfig, url } from '../content/site';

export function GET() {
  const sitemap = new URL(url('/sitemap.xml'), siteConfig.siteOrigin).href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
