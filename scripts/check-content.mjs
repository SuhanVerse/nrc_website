import { access, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { club } from '../src/content/public.ts';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL('public/images/manifest.json', root), 'utf8'),
);
for (const file of manifest.files) {
  const target = new URL(`public${file.path}`, root);
  const bytes = await readFile(target);
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== file.sha256)
    throw new Error(`Asset changed without manifest update: ${file.path}`);
}
for (const member of club.members)
  await access(fileURLToPath(new URL(`public${member.portrait}`, root)));
for (const project of club.projects) {
  if (project.preview)
    await access(new URL(`public/images/${project.preview}`, root));
}
for (const photo of club.events.yatra5.photos)
  await access(new URL(`public${photo.src}`, root));
console.log(
  `Public content valid: ${club.members.length} members, ${club.projects.length} projects, ${manifest.files.length} asset hashes.`,
);
