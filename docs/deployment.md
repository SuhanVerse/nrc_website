# Hosting and rollback

The public website produces static HTML, CSS, JavaScript and media in `dist/`.
The publishing workflow in `.github/workflows/pages.yml` uses a manual release
from the club repository's `main` branch. Publishing requires the club's review,
Pages setup and an explicit confirmation when starting the workflow.

## Build configuration

Set public configuration in the shell or CI environment before building.
`.env.example` lists the available values; none is a credential.

| Setting       | Purpose                                                                                                                                                          |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SITE_ORIGIN` | HTTPS origin used for canonical URLs and sitemap entries, without a path or credentials.                                                                         |
| `SITE_BASE`   | `/` for the club account site or a custom-domain root. A project site uses its repository prefix, such as `/nrc_website/`. Include leading and trailing slashes. |

Examples for local verification, without configuring live services:

```sh
SITE_ORIGIN=https://nceroboticsclub.github.io SITE_BASE=/ corepack pnpm build
SITE_BASE=/ corepack pnpm test:browser
```

For a root-domain build:

```sh
SITE_ORIGIN=https://nrc.suhankhadka.com.np SITE_BASE=/ corepack pnpm build
```

Using a hostname in a build does not configure or claim that domain. Rebuild when
changing the origin or repository prefix; copying an artifact built for one
prefix to a different prefix will break links and media paths. `pnpm preview`
serves the current artifact locally; use the printed address and configured base.

## Publish a reviewed release

The initial destination is `https://nceroboticsclub.github.io/`.
The workflow sets `SITE_ORIGIN=https://nceroboticsclub.github.io` and
`SITE_BASE=/` explicitly. It uses the pinned Node/pnpm versions, checks
formatting, types, content and unit rules, then builds and tests the static site
before uploading `dist/` as the Pages artifact.

Page styles are included in the generated HTML to avoid extra render-blocking
stylesheet requests. Photos, fonts and scripts remain separate static assets.

Follow these steps after the club approves the deployment pull request.

1. Merge the reviewed deployment PR into the club repository's `main` branch.
2. Using the club account, open **Settings → Pages → Build and deployment** and
   choose **GitHub Actions** as the publishing source.
3. Create or open **github-pages** under **Settings → Environments**, and
   restrict deployment branches to `main`. Apply any additional reviewer
   requirements chosen by the club.
4. Open **Actions → Publish website → Run workflow** in the club repository.
   Select `main`, enable the publishing confirmation, and start the run.
5. Check that the build and deployment jobs succeed. Open the URL shown by the
   deployment job and check Home, Projects, Team, Membership, photos,
   sitemap/canonical URLs, HTTPS and the contact links.
6. Record the released commit and successful workflow URL. Retain the source
   revision and static artifact for rollback.

Publishing confirmation defaults to off. The workflow accepts releases only
from `nceroboticsclub/nceroboticsclub.github.io` on `main`. Pull requests continue through
the separate Website checks workflow. Contributors submit changes from their
forks for club review, followed by a manual release of the merged revision.

Only the deployment job receives Pages publishing and OIDC permissions. Builds
use read-only repository access. The `github-pages` environment provides the
release URL and the club's deployment protection rules.

When a custom domain is approved, update the workflow's origin and base together
with the domain setup. For `nrc.suhankhadka.com.np`, the build values become
`SITE_ORIGIN=https://nrc.suhankhadka.com.np` and `SITE_BASE=/`. Rebuild for the
chosen host before releasing it.

GitHub documents [custom publishing workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
and [publishing-source configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Action maintenance

Recheck the pinned publishing actions for upstream security updates during the
activation review and later maintenance. The reviewed actions bundle older
Undici versions covered by network denial-of-service advisories. The publishing
job requires TLS 1.3 through `NODE_OPTIONS=--tls-min-v1.3`, addressing the TLS 1.2
renegotiation precondition in the deployment action's HTTP client. The reviewed
upload path uses the Node HTTP client and Azure blob transport.

This mitigation follows the [Undici TLS advisory](https://github.com/nodejs/undici/security/advisories/GHSA-qrxm-fqhp-jwvm).
The bundled deployment client also retains response decompression and
keep-alive response-queue issues. In this workflow, exploiting those paths
requires malicious or compromised responses from the configured GitHub API.
Include that remaining exposure in the activation review and check for updated
official action pins. The details are in the upstream
[decompression advisory](https://github.com/nodejs/undici/security/advisories/GHSA-g9mf-h72j-4rw9)
and [response-queue advisory](https://github.com/nodejs/undici/security/advisories/GHSA-35p6-xmwp-9g52).
Keep the dependency review in the release record and verify the first authorized
publishing run on GitHub's runner.

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
artifact outside the served directory. For a Pages rollback, submit a PR that
reverts the faulty change on `main`, merge it after review, then run **Publish
website** again with publishing confirmed. The workflow rebuilds the reviewed
revision with its lockfile and the configured origin/base.

For college hosting, restore the previous artifact built for the same
origin/base. Smoke-test Home, Projects, Team, Membership and media after
either recovery path. Manage Google Forms and the separate portal through their
own release and recovery procedures.
