import { withBase } from '../components/paths';

const origin = new URL(
  import.meta.env.SITE_ORIGIN || 'https://nceofficialroboticsclub.github.io',
);
if (
  origin.protocol !== 'https:' ||
  origin.pathname !== '/' ||
  origin.search ||
  origin.hash ||
  origin.username ||
  origin.password
) {
  throw new Error(
    'SITE_ORIGIN must be an HTTPS origin without a path or credentials',
  );
}
const basePath = import.meta.env.BASE_URL;
withBase('/', basePath);
const portal = import.meta.env.PUBLIC_PORTAL_URL?.trim() || null;
if (portal) {
  const url = new URL(portal);
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('PUBLIC_PORTAL_URL must be an approved HTTPS destination');
}

export const siteConfig = {
  siteOrigin: origin.origin,
  basePath,
  portalUrl: portal,
};
export const url = (path: string) => withBase(path, basePath);
export const navigation = [
  ['Home', '/'],
  ['About', '/about/'],
  ['Projects', '/projects/'],
  ['Events', '/events/'],
  ['Team', '/team/'],
  ['Membership', '/membership/'],
  ['Contact', '/contact/'],
] as const;
