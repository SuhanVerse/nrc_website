import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import data from '../../src/content/club.json' with { type: 'json' };

const routes = [
  ['', 'NCE Robotics Club.'],
  ['about/', 'Robotics, together.'],
  ['projects/', 'Club projects'],
  ['events/', 'Events & Yatra.'],
  ['events/yatra-5/', 'Yatra 5.0.'],
  ['team/', 'Our committee'],
  ['membership/', 'Membership'],
  ['contact/', 'Contact the club.'],
] as const;
for (const width of [1440, 390]) {
  for (const [path, heading] of routes) {
    test(`${path || 'home'}: ${width}px, content, assets, links and accessibility`, async ({
      page,
      request,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('requestfailed', (r) =>
        errors.push(`${r.url()}: ${r.failure()?.errorText}`),
      );
      const outside: string[] = [];
      page.on('request', (r) => {
        if (
          !r.url().startsWith('http://127.0.0.1:8051') &&
          !r.url().startsWith('data:')
        )
          outside.push(r.url());
      });
      const response = await page.goto(path || './');
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveText(heading);
      await expect(
        page.getByRole('link', { name: 'Member login', exact: true }),
      ).toHaveCount(0);
      await expect(
        page.locator('a[href*="/signin/"],a[href*="/motion-settings/"]'),
      ).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(150);
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const asset of await page
        .locator('img[src]')
        .evaluateAll((nodes) =>
          nodes.map((n) => (n as HTMLImageElement).src),
        )) {
        expect((await request.get(asset)).status(), asset).toBe(200);
      }
      for (const link of await page
        .locator('a[href]')
        .evaluateAll((nodes) => [
          ...new Set(nodes.map((n) => (n as HTMLAnchorElement).href)),
        ])) {
        if (link.startsWith('http://127.0.0.1:8051') && !link.includes('#'))
          expect((await request.get(link)).status(), link).toBe(200);
      }
      const audit = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(audit.violations).toEqual([]);
      expect(errors).toEqual([]);
      expect(outside).toEqual([]);
      if (
        [
          '',
          'team/',
          'membership/',
          'contact/',
          'projects/',
          'events/yatra-5/',
        ].includes(path)
      ) {
        await page.screenshot({
          path: `.local/screenshots/${path.replaceAll('/', '-') || 'home'}-${width}.png`,
          fullPage: true,
        });
        if (path === '')
          await page.screenshot({
            path: `.local/screenshots/home-fold-${width}.png`,
          });
      }
    });
  }
}

test('committee order, portrait frames and confirmed social destinations', async ({
  page,
}) => {
  await page.goto('team/');
  const cards = page.locator('.member-card');
  await expect(cards).toHaveCount(13);
  const expected = [...data.members].sort(
    (a, b) =>
      Number(a.academicLabel.slice(-3)) - Number(b.academicLabel.slice(-3)),
  );
  expect(await cards.locator('h2').allTextContents()).toEqual(
    expected.map((m) => m.name),
  );
  await expect(cards.locator('a.member-social-link')).toHaveCount(4);
  await expect(cards.locator('.is-pending')).toHaveCount(35);
  await expect(cards.first().locator('.member-portrait')).toHaveCSS(
    'width',
    '180px',
  );
  await page.goto('./');
  expect(await page.locator('.person-card h3').allTextContents()).toEqual(
    expected.slice(0, 3).map((m) => m.name),
  );
});

test('closed enrollment and public-only navigation', async ({ page }) => {
  await page.goto('membership/');
  await expect(
    page.getByText('Applications are currently closed.'),
  ).toBeVisible();
  await expect(
    page.locator('a[href*="forms.gle"],a[href*="docs.google.com/forms"],form'),
  ).toHaveCount(0);
  await page.goto('contact/');
  await expect(
    page.getByText('Applications are currently closed.'),
  ).toBeVisible();
  await expect(page.locator('input,form,[data-role]')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Member login', exact: true }),
  ).toHaveCount(0);
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(
    /\b9[678]\d{8}\b|Continue as|Design preview|Resources|Tools|Learn|Member sign-in|Motion settings/,
  );
});

test('footer shows the college logo, club address and map destination', async ({
  page,
}) => {
  await page.goto('./');
  const footer = page.locator('.site-footer');
  const college = footer.getByRole('link', {
    name: 'National College of Engineering website',
    exact: true,
  });
  await expect(college).toHaveAttribute('href', 'https://nce.edu.np/');
  await expect(college.locator('img')).toHaveAttribute(
    'src',
    /\/images\/college-logo\.webp$/,
  );
  await expect(footer.locator('.address')).toContainText(data.club.location);
  await expect(footer.locator('.address')).toContainText(data.club.address);
  await expect(
    footer.getByRole('link', { name: 'View on map' }),
  ).toHaveAttribute('href', 'https://maps.app.goo.gl/DVfdNNojsxiafeM28');
  await expect(
    footer.getByRole('link', { name: 'College website', exact: true }),
  ).toHaveCount(0);
});

test('Home and Projects open project repositories or videos directly', async ({
  page,
}) => {
  for (const path of ['./', 'projects/']) {
    await page.goto(path);
    const rows = page.locator('.project-row');
    await expect(rows).toHaveCount(data.projects.length);
    for (const [index, project] of data.projects.entries()) {
      const row = rows.nth(index);
      await expect(row.locator('.project-title a')).toHaveCount(0);
      const action = row.getByRole('link');
      await expect(action).toHaveCount(1);
      await expect(action).toHaveAttribute('href', project.url);
      await expect(action).toHaveAttribute('target', '_blank');
      await expect(action).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(action).toHaveAccessibleName(
        `${project.linkLabel} for ${project.title} (opens in a new tab)`,
      );
    }
    await expect(
      page.getByRole('link', { name: /Project details/ }),
    ).toHaveCount(0);
  }
});

test('removed sign-in, settings and project detail routes return the useful 404', async ({
  page,
}) => {
  for (const path of [
    'signin/',
    'motion-settings/',
    ...data.projects.map((project) => `projects/${project.slug}/`),
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.locator('h1')).toHaveText('Page not found.');
    await expect(
      page.getByRole('link', { name: 'Back to the club', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Member login', exact: true }),
    ).toHaveCount(0);
  }
});

test('skip link and mobile navigation keyboard focus restoration', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.getByText('Skip to content')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const opener = page.getByRole('button', { name: 'Menu', exact: true });
  await opener.click();
  const menu = page.getByRole('dialog', { name: 'Club menu' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('button', { name: 'Close menu' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(menu.getByRole('link', { name: 'Contact' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(opener).toBeFocused();
  await opener.click();
  await menu.getByRole('link', { name: 'Team' }).click();
  await expect(page.locator('h1')).toHaveText('Our committee');
});

test('photo viewer wraps, traps focus and restores its opener', async ({
  page,
}) => {
  await page.goto('events/yatra-5/');
  await expect(page.locator('[data-photo-open]')).toHaveCount(9);
  const opener = page.locator('[data-photo-open]').first();
  await opener.click();
  const viewer = page.locator('#photo-viewer');
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('[data-viewer-count]')).toHaveText('1 / 9');
  await page.keyboard.press('ArrowLeft');
  await expect(viewer.locator('[data-viewer-count]')).toHaveText('9 / 9');
  await page.keyboard.press('ArrowRight');
  await expect(viewer.locator('[data-viewer-count]')).toHaveText('1 / 9');
  await page.keyboard.press('Shift+Tab');
  await expect(viewer.locator('[data-viewer-next]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(viewer).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('automatic photos rotate, persist preference and obey live reduced motion', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('./');
  const caption = page.locator('[data-gallery-caption]');
  const toggle = page.locator('[data-gallery-toggle]');
  await expect(toggle).toHaveAccessibleName('Pause slideshow');
  await expect(caption).toHaveText('Projectile Turret at Yatra');
  await expect(caption).toHaveText('Object Sorting System demonstration', {
    timeout: 10000,
  });
  await toggle.click();
  await expect(toggle).toHaveAccessibleName('Play slideshow');
  expect(
    await page.evaluate(() => localStorage.getItem('nce:auto-photos')),
  ).toBe('off');
  await page.locator('.hero-actions a').first().focus();
  await page.goto('./');
  await expect(toggle).toHaveAccessibleName('Play slideshow');
  await page.waitForTimeout(6500);
  await expect(caption).toHaveText('Projectile Turret at Yatra');
  await toggle.click();
  await expect(toggle).toHaveAccessibleName('Pause slideshow');
  expect(
    await page.evaluate(() => localStorage.getItem('nce:auto-photos')),
  ).toBe('on');
  await page.locator('.hero-actions a').first().focus();
  await expect(caption).toHaveText('Object Sorting System demonstration', {
    timeout: 10000,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(toggle).toBeHidden();
  const still = await caption.textContent();
  await page.waitForTimeout(6500);
  await expect(caption).toHaveText(still!);
});

test('content and navigation remain usable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const base = test.info().project.use.baseURL!;
  await page.goto(base);
  await expect(page.locator('h1')).toHaveText('NCE Robotics Club.');
  await expect(page.locator('.photo-active')).toBeVisible();
  await expect(page.locator('[data-gallery-toggle]')).toBeHidden();
  await page
    .locator('.no-script-nav')
    .getByRole('link', { name: 'Team' })
    .click();
  await expect(page.locator('.member-card')).toHaveCount(13);
  await context.close();
});

test('a failed later gallery image preserves the decoded photograph', async ({
  page,
}) => {
  await page.route('**/images/object-sorting*.webp', (route) => route.abort());
  await page.goto('./');
  await page.waitForTimeout(6800);
  await expect(page.locator('[data-gallery-caption]')).toHaveText(
    'Projectile Turret at Yatra',
  );
  expect(
    await page
      .locator('.photo-active')
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
});

test('reflow, landscape and 200% equivalent layout widths', async ({
  page,
}) => {
  for (const width of [1024, 768, 720, 568, 320]) {
    await page.setViewportSize({ width, height: width === 568 ? 320 : 900 });
    for (const path of ['', 'team/', 'projects/', 'membership/', 'contact/']) {
      await page.goto(path || './');
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}`,
      ).toBe(true);
    }
  }
});

test('unknown page has a useful 404 and valid home link', async ({ page }) => {
  const response = await page.goto('does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Page not found.');
  await page
    .getByRole('link', { name: 'Back to the club', exact: true })
    .click();
  await expect(page.locator('h1')).toHaveText('NCE Robotics Club.');
});

test('sitemap lists canonical public routes and excludes account/review pages', async ({
  request,
  baseURL,
}) => {
  const response = await request.get('sitemap.xml');
  expect(response.status()).toBe(200);
  const text = await response.text();
  const base = new URL(baseURL!).pathname;
  expect(text).toContain(
    `https://nceofficialroboticsclub.github.io${base}team/`,
  );
  expect(text.match(/<url>/g)).toHaveLength(8);
  expect(text).not.toMatch(
    /signin|motion-settings|review|member\/|officer|projects\/(object-sorting-system|3d-printer|projectile-turret)/,
  );
});
