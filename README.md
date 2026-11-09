# NCE Robotics Club

Public website for the student-led robotics club at National College of
Engineering, Lalitpur, Nepal. Built with Astro, TypeScript and self-hosted assets.
The member portal is a separate application; this website contains no member
records or live authentication.

[College website](https://nce.edu.np/) ·
[Contact the club](mailto:nceofficialroboticsclub@gmail.com)

## Local development

Use Node **24.16.0** and pnpm **10.34.3**, recorded in `.nvmrc` and
`package.json`.

```sh
corepack pnpm install --frozen-lockfile --ignore-scripts
corepack pnpm dev
```

Open the local URL printed by Astro. For a static production preview:

```sh
corepack pnpm build
corepack pnpm preview
```

## Checks

```sh
corepack pnpm format:check
corepack pnpm check
corepack pnpm test:unit
corepack pnpm build
corepack pnpm exec playwright install chromium
corepack pnpm test:browser
```

On Linux, Playwright may need browser system libraries. Its
`install --with-deps chromium` command installs those libraries when the host
permits it. The browser suite serves the built `dist/` locally on port **8051**;
leave that port free. Reports and screenshots are saved in ignored `.local/`
and `test-results/` folders.

## Project layout

- `src/pages/`: static public routes and metadata.
- `src/content/`: approved club, committee, project and event records.
- `src/features/`: committee ordering, membership state and browser interactions.
- `src/components/`, `src/layouts/`, `src/styles/`: shared presentation.
- `public/`: optimized photographs, fonts, icons and their notices.
- `tests/`: unit rules and browser journeys.

See [editing content](docs/editing.md), [hosting and rollback](docs/deployment.md)
and [media notices](docs/media.md). Source code is licensed under
[Apache-2.0](LICENSE); photographs, fonts and brand marks have separate terms.

Changes are reviewed by club maintainers through pull requests. See
[Contributing](CONTRIBUTING.md). A club maintainer publishes a reviewed `main`
revision through the manual **Publish website** workflow after completing the
[Pages setup](docs/deployment.md#publish-a-reviewed-release).
