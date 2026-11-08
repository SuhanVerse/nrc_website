export type MembershipConfig = {
  status: 'open' | 'closed';
  formUrl: string | null;
};
export type MembershipState =
  { status: 'open'; formUrl: string } | { status: 'closed'; formUrl: null };

export function resolveMembershipState(
  config: MembershipConfig,
): MembershipState {
  const closed = { status: 'closed', formUrl: null } as const;
  if (config.status !== 'open' || !config.formUrl) return closed;
  try {
    const url = new URL(config.formUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.port)
      return closed;
    const responder =
      url.hostname === 'docs.google.com' &&
      /^\/forms\/d\/(?:e\/)?[\w-]+\/viewform\/?$/.test(url.pathname);
    const shortLink =
      url.hostname === 'forms.gle' &&
      /^\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname);
    return responder || shortLink
      ? { status: 'open', formUrl: config.formUrl }
      : closed;
  } catch {
    return closed;
  }
}
