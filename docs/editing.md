# Editing the website

Make changes on a feature branch in your fork and open a pull request to
`nceofficialroboticsclub/website:main`. Club maintainers review public content
and media before merging. The current source is not a live content database;
changes appear on a hosted site only after its publishing workflow rebuilds.

## Club content

`src/content/club.json` contains the contact channels, committee, projects,
Yatra archive and membership state. Keep copy short and factual. Add only
approved links and media; do not include private membership, inventory or
financial records. `pnpm check` validates the public data shape and local assets.

The committee is ordered by batch, **079 → 080 → 081 → 082**. Source order is
preserved within each batch; the Home teaser uses the same rule. A public role
label does not grant access to any club system. Each profile has a name, role,
academic label, portrait and confirmed social links. Leave unknown links absent:
the design shows muted, noninteractive logo slots instead of guessed URLs.
When the roster intentionally changes, update the browser assertions for its
count, names and confirmed social destinations along with the data.

Projects use one short summary and a direct repository or video link. The 3D Printer currently
has no photograph; keep its honest missing-photo state until one is approved.
Yatra 5.0 figures are attributed to the college recap. Earlier editions link to
the college archive. Keep `upcomingEvents` empty until an actual event is ready
to announce.

The footer uses the supplied college logo as its college-website link. The
location link comes from the college's own [website](https://nce.edu.np/).

## Membership

Enrollment is initially closed:

```json
"membership": { "status": "closed", "formUrl": null }
```

When the club authorizes a cycle, set `status` to `open` and supply its public
Google Forms responder link. Supported forms are:

- `https://docs.google.com/forms/d/e/FORM_ID/viewform`
- `https://docs.google.com/forms/d/FORM_ID/viewform`
- `https://forms.gle/SHORT_ID`

Editor, response-management, unrelated document and invalid destinations fail
closed. URL shape validation does not prove ownership or the destination of a
short link: a maintainer must open the link and check the actual club form first.
A closed configuration always stays closed, even if a link is retained. Contact
and Membership share this decision. Closing the website link does not itself
stop Google Forms from collecting responses; manage that separately in Forms.
There is no separate registration questionnaire on this website.

## Photos and icons

Put approved optimized photographs in `public/images/` and retain required
credits. Portraits use rounded square frames with `object-fit: contain`.
Do not crop faces simply to fill the box. Keep original media outside the
published source and generate suitably sized WebP derivatives when replacing
large photographs.

`public/images/manifest.json` records the SHA-256 and size of distributed assets.
After an intentional replacement, update that asset's `sha256` and `bytes`;
otherwise `pnpm check` correctly reports an unrecorded change. On Linux:

```sh
sha256sum public/images/approved-photo.webp
stat -c %s public/images/approved-photo.webp
```

Use only actual approved social destinations. The withdrawn phone number must
not be restored without a new club decision. See [media notices](media.md).

Home photographs change every six seconds. The small photo-corner control
pauses or resumes the slideshow and remembers the choice on this browser.
The device's reduced-motion preference keeps photographs still.

## Before opening a pull request

Run the commands in the README. Review visible changes on desktop and phone,
check keyboard navigation and reduced motion, and include screenshots with the
pull request. Keep generated builds, screenshots, local reports and secrets out
of commits. Retain contributor and license attribution.
