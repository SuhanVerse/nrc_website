import data from './club.json' with { type: 'json' };

export interface SocialLink {
  label: 'Facebook' | 'Instagram' | 'LinkedIn' | 'GitHub';
  url: string;
}

export interface Member {
  slug: string;
  name: string;
  role: string;
  academicLabel: string;
  portrait: string;
  socials: SocialLink[];
}

export interface Project {
  slug: string;
  title: string;
  summary: string;
  url: string;
  linkLabel: string;
  category: string;
  preview: string | null;
  detailAsset: string | null;
  width: number;
  height: number;
  fit: 'contain' | 'cover';
  alt: string;
}

export interface GalleryPhoto {
  name: string;
  caption: string;
  src: string;
}

export interface PublicContent {
  asOf: string;
  club: {
    name: string;
    college: string;
    email: string;
    location: string;
    address: string;
    socials: SocialLink[];
  };
  membership: { status: 'open' | 'closed'; formUrl: string | null };
  upcomingEvents: { title: string; date: string; url: string }[];
  committeeTerm: string | null;
  members: Member[];
  projects: Project[];
  events: {
    yatra5: {
      dates: string;
      reported: string;
      attribution: string;
      activities: string;
      recapUrl: string;
      photos: GalleryPhoto[];
    };
    editions: { label: string; href: string }[];
  };
}

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid public content: ${message}`);
}

function record(value: unknown, where: string): Record<string, unknown> {
  ensure(value && typeof value === 'object' && !Array.isArray(value), where);
  return value as Record<string, unknown>;
}

function keys(
  value: Record<string, unknown>,
  allowed: string[],
  where: string,
) {
  ensure(
    Object.keys(value).every((key) => allowed.includes(key)),
    `${where} contains an unexpected field`,
  );
}

function text(value: unknown, where: string): asserts value is string {
  ensure(typeof value === 'string' && value.trim().length > 0, where);
}

function https(value: unknown, where: string) {
  text(value, where);
  const url = new URL(value);
  ensure(url.protocol === 'https:' && !url.username && !url.password, where);
}

function image(value: unknown, where: string) {
  text(value, where);
  ensure(/^\/images\/[a-z0-9-]+\.webp$/.test(value), where);
}

function socialLinks(value: unknown, where: string) {
  ensure(Array.isArray(value), where);
  const seen = new Set<string>();
  for (const item of value) {
    const social = record(item, where);
    keys(social, ['label', 'url'], where);
    ensure(
      ['Facebook', 'Instagram', 'LinkedIn', 'GitHub'].includes(
        String(social.label),
      ),
      `${where} label`,
    );
    https(social.url, `${where} URL`);
    ensure(!seen.has(String(social.label)), `${where} duplicate label`);
    seen.add(String(social.label));
  }
}

export function validatePublicContent(
  value: unknown,
): asserts value is PublicContent {
  const content = record(value, 'root');
  keys(
    content,
    [
      'asOf',
      'club',
      'membership',
      'upcomingEvents',
      'committeeTerm',
      'members',
      'projects',
      'events',
    ],
    'root',
  );
  ensure(
    typeof content.asOf === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(content.asOf),
    'asOf',
  );
  const identity = record(content.club, 'club');
  keys(
    identity,
    ['name', 'college', 'email', 'location', 'address', 'socials'],
    'club',
  );
  for (const key of ['name', 'college', 'email', 'location', 'address'])
    text(identity[key], `club.${key}`);
  ensure(
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(identity.email)),
    'club.email',
  );
  socialLinks(identity.socials, 'club.socials');
  const enrollment = record(content.membership, 'membership');
  keys(enrollment, ['status', 'formUrl'], 'membership');
  ensure(
    enrollment.status === 'open' || enrollment.status === 'closed',
    'membership.status',
  );
  ensure(
    enrollment.formUrl === null || typeof enrollment.formUrl === 'string',
    'membership.formUrl',
  );
  ensure(
    content.committeeTerm === null || typeof content.committeeTerm === 'string',
    'committeeTerm',
  );
  ensure(Array.isArray(content.upcomingEvents), 'upcomingEvents');
  for (const item of content.upcomingEvents) {
    const event = record(item, 'upcoming event');
    keys(event, ['title', 'date', 'url'], 'upcoming event');
    text(event.title, 'upcoming event title');
    text(event.date, 'upcoming event date');
    https(event.url, 'upcoming event URL');
  }
  ensure(
    Array.isArray(content.members) && content.members.length > 0,
    'members',
  );
  const memberSlugs = new Set<string>();
  for (const item of content.members) {
    const member = record(item, 'member');
    keys(
      member,
      ['slug', 'name', 'role', 'academicLabel', 'portrait', 'socials'],
      'member',
    );
    for (const key of ['slug', 'name', 'role', 'academicLabel'])
      text(member[key], `member.${key}`);
    ensure(/^[a-z0-9-]+$/.test(String(member.slug)), 'member.slug');
    ensure(!memberSlugs.has(String(member.slug)), 'duplicate member slug');
    memberSlugs.add(String(member.slug));
    ensure(
      /^(BCT|BEI) \d{3}$/.test(String(member.academicLabel)),
      'member.academicLabel',
    );
    image(member.portrait, 'member.portrait');
    socialLinks(member.socials, 'member.socials');
  }
  ensure(Array.isArray(content.projects), 'projects');
  const projectSlugs = new Set<string>();
  for (const item of content.projects) {
    const project = record(item, 'project');
    keys(
      project,
      [
        'slug',
        'title',
        'summary',
        'url',
        'linkLabel',
        'category',
        'preview',
        'detailAsset',
        'width',
        'height',
        'fit',
        'alt',
      ],
      'project',
    );
    for (const key of ['slug', 'title', 'summary', 'linkLabel', 'category'])
      text(project[key], `project.${key}`);
    ensure(/^[a-z0-9-]+$/.test(String(project.slug)), 'project.slug');
    ensure(!projectSlugs.has(String(project.slug)), 'duplicate project slug');
    projectSlugs.add(String(project.slug));
    https(project.url, 'project.url');
    ensure(project.fit === 'contain' || project.fit === 'cover', 'project.fit');
    ensure(
      project.preview === null ||
        (typeof project.preview === 'string' &&
          /^[a-z0-9-]+\.webp$/.test(project.preview)),
      'project.preview',
    );
    ensure(
      project.detailAsset === null ||
        (typeof project.detailAsset === 'string' &&
          /^[a-z0-9-]+$/.test(project.detailAsset)),
      'project.detailAsset',
    );
    ensure(
      Number.isInteger(project.width) &&
        Number(project.width) >= 0 &&
        Number.isInteger(project.height) &&
        Number(project.height) >= 0,
      'project dimensions',
    );
    ensure(typeof project.alt === 'string', 'project.alt');
    if (project.preview !== null)
      ensure(
        Number(project.width) > 0 &&
          Number(project.height) > 0 &&
          project.alt.trim().length > 0,
        'project image metadata',
      );
  }
  const events = record(content.events, 'events');
  keys(events, ['yatra5', 'editions'], 'events');
  const yatra = record(events.yatra5, 'events.yatra5');
  keys(
    yatra,
    ['dates', 'reported', 'attribution', 'activities', 'recapUrl', 'photos'],
    'events.yatra5',
  );
  for (const key of ['dates', 'reported', 'attribution', 'activities'])
    text(yatra[key], `events.yatra5.${key}`);
  https(yatra.recapUrl, 'events.yatra5.recapUrl');
  ensure(Array.isArray(yatra.photos), 'events.yatra5.photos');
  for (const item of yatra.photos) {
    const photo = record(item, 'gallery photo');
    keys(photo, ['name', 'caption', 'src'], 'gallery photo');
    text(photo.name, 'gallery photo name');
    text(photo.caption, 'gallery photo caption');
    image(photo.src, 'gallery photo src');
  }
  ensure(Array.isArray(events.editions), 'events.editions');
  for (const item of events.editions) {
    const edition = record(item, 'archive edition');
    keys(edition, ['label', 'href'], 'archive edition');
    text(edition.label, 'archive edition label');
    text(edition.href, 'archive edition href');
    if (!/^\/[a-z0-9-/]+\/$/.test(edition.href))
      https(edition.href, 'archive edition href');
  }
}

validatePublicContent(data);
export const club: PublicContent = data;
export const identity = club.club;
export const members = club.members;
export const projects = club.projects;
export const events = club.events;
export const membership = club.membership;
