# Hosting and rollback

The public website produces ordinary static HTML, CSS, JavaScript and media in
`dist/`. It needs no application server, database or private portal to work.
The repository currently provides checks only: no workflow enables Pages,
changes DNS or publishes a deployment.

## Build configuration

Set public configuration in the shell or CI environment before building.
`.env.example` lists the available values; none is a credential.

| Setting             | Purpose                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_ORIGIN`       | HTTPS origin used for canonical URLs and sitemap entries, without a path or credentials.                                                                          |
| `SITE_BASE`         | `/` for a custom-domain root, `/website/` for the club project site, or `/nrc_website/` for the personal fork project site. Include leading and trailing slashes. |
| `PUBLIC_PORTAL_URL` | Optional approved HTTPS sign-in destination, only after the separate portal is ready. Leave unset now.                                                            |

Examples for local verification, without configuring live services:

```sh
SITE_ORIGIN=https://nceofficialroboticsclub.github.io SITE_BASE=/website/ corepack pnpm build
SITE_BASE=/website/ corepack pnpm test:browser
```

For a root-domain build:

```sh
SITE_ORIGIN=https://nrc.suhankhadka.com.np SITE_BASE=/ corepack pnpm build
```

Using a hostname in a build does not configure or claim that domain. Rebuild when
changing the origin or repository prefix; copying an artifact built for one
prefix to a different prefix will break links and media paths. `pnpm preview`
serves the current artifact locally; use the printed address and configured base.

## Separate publishing decision

When the club authorizes a launch, publish from the club's canonical repository.
Contributors work in forks and propose changes through pull requests; fork
changes do not update the club repository until a maintainer merges them.
Configure a publishing workflow and the exact domain only during that launch.
Check hosted nested routes, the generated sitemap, HTTPS, assets and external
contact links after publication.

The account icon currently opens the unavailable portal page. To connect a real
portal later, review its HTTPS URL and set `PUBLIC_PORTAL_URL` in the public build.
The portal needs its own deployment and server-enforced access rules; static
hosting alone cannot authenticate members or store private club data.

## College-server handover

Provide the source revision, Node/pnpm versions, lockfile and a verified copy of
`dist/`. A college administrator can serve the artifact with Nginx, Apache or
another static web server, using the origin and path chosen for that server.
Serve directory `index.html` files for nested routes and configure `404.html` as
the error document. There is no single-page-app rewrite requirement. Preserve
asset and font MIME types. The administrator handles the server, TLS, access
and backup policy; a college subdomain alone does not supply those services.

## Rollback

Keep each released source commit and a checksum-verified copy of its static
artifact outside the served directory. If a release fails, restore the previous
artifact built for the same origin/base, then smoke-test Home, a nested project,
Team, Membership and media. Alternatively rebuild the previous reviewed commit
with its lockfile and original environment values. Reverting website content
will not modify an external Google Form or the separately deployed portal.
