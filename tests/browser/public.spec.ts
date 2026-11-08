import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import data from '../../src/content/club.json' with { type: 'json' };

const routes = [
  ['', 'NCE Robotics Club.'],
  ['about/', 'Robotics, together.'],
  ['projects/', 'Club projects'],
  ['projects/object-sorting-system/', 'Object Sorting System'],
  ['projects/3d-printer/', '3D Printer'],
  ['projects/projectile-turret/', 'Projectile Turret'],
  ['events/', 'Events & Yatra.'],
  ['events/yatra-5/', 'Yatra 5.0.'],
  ['team/', 'Our committee'],
  ['membership/', 'Membership'],
  ['contact/', 'Contact the club.'],
  ['signin/', 'Member sign-in'],
  ['motion-settings/', 'Motion settings'],
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
          'signin/',
          'projects/',
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

test('closed enrollment, truthful sign-in and public-only navigation', async ({
  page,
}) => {
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
  await page.goto('signin/');
  await expect(
    page.getByText('The member portal isn’t available yet.'),
  ).toBeVisible();
  await expect(page.locator('input,form,[data-role]')).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'Member login', exact: true }),
  ).toBeVisible();
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(
    /\b9[678]\d{8}\b|Continue as|Design preview|Resources|Tools|Learn/,
  );
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
  const opener = page.locator('[data-photo-open]').first();
  await opener.click();
  const viewer = page.locator('#photo-viewer');
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('[data-viewer-count]')).toHaveText('1 / 6');
  await page.keyboard.press('ArrowLeft');
  await expect(viewer.locator('[data-viewer-count]')).toHaveText('6 / 6');
  await page.keyboard.press('ArrowRight');
  await expect(viewer.locator('[data-viewer-count]')).toHaveText('1 / 6');
  await page.keyboard.press('Shift+Tab');
  await expect(viewer.locator('[data-viewer-next]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(viewer).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('automatic photos rotate, persist preference and obey live reduced motion', async ({
  page,
}) => {
  await page.goto('./');
  const caption = page.locator('[data-gallery-caption]');
  await expect(caption).toHaveText('Projectile Turret at Yatra');
  await expect(caption).toHaveText('Object Sorting System demonstration', {
    timeout: 10000,
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const still = await caption.textContent();
  await page.waitForTimeout(6500);
  await expect(caption).toHaveText(still!);
  await page.goto('motion-settings/');
  await expect(page.locator('[data-reduced-note]')).toBeVisible();
  await page.getByRole('button', { name: 'Turn off', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./');
  await page.waitForTimeout(6500);
  await expect(caption).toHaveText('Projectile Turret at Yatra');
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
    for (const path of [
      '',
      'team/',
      'projects/',
      'membership/',
      'contact/',
      'signin/',
    ]) {
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
  expect(text.match(/<url>/g)).toHaveLength(11);
  expect(text).not.toMatch(/signin|review|member\/|officer/);
});
