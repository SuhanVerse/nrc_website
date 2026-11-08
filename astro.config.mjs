import { defineConfig } from 'astro/config';

const base = process.env.SITE_BASE || '/';
if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(base))
  throw new Error('SITE_BASE must be / or a slash-delimited repository path');
const site =
  process.env.SITE_ORIGIN || 'https://nceofficialroboticsclub.github.io';
export default defineConfig({
  output: 'static',
  site,
  base,
  trailingSlash: 'always',
  vite: { build: { assetsInlineLimit: 0 } },
});
