import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import data from '../../src/content/club.json' with { type: 'json' };

const mapSource =
  'https://maps.google.com/maps?q=National%20College%20of%20Engineering&t=m&z=11&output=embed&iwloc=near';
const mapTitle = 'National College of Engineering, Lalitpur location map';

async function mockCollegeMap(page: Page) {
  await page.route(mapSource, async (route) => {
    const request = route.request();
    expect(request.isNavigationRequest()).toBe(true);
    expect(request.frame().parentFrame()).not.toBeNull();
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html lang="en"><head><title>NCE map fixture</title></head><body><p>Map frame fixture</p></body></html>',
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockCollegeMap(page);
});

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
          !r.url().startsWith('data:') &&
          !(
            r.url() === mapSource &&
            r.isNavigationRequest() &&
            r.frame().parentFrame() !== null
          )
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
          'events/',
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

test('footer shows the college logo, club address and rounded embedded map', async ({
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
  const map = footer.locator('iframe');
  await expect(map).toHaveCount(1);
  await expect(map).toHaveAttribute('title', mapTitle);
  await expect(map).toHaveAttribute('src', mapSource);
  await expect(map).toHaveAttribute('loading', 'lazy');
  await expect(map).toHaveAttribute('width', '320');
  await expect(map).toHaveAttribute('height', '320');
  await expect(footer.locator('.footer-map-frame')).toHaveCSS(
    'border-radius',
    '20px',
  );
  await expect(footer.getByRole('link', { name: 'View on map' })).toHaveCount(
    0,
  );
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

test('Home photos rotate, allow quiet dot selection and obey hover and reduced motion', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('./');
  const caption = page.locator('[data-gallery-caption]');
  const gallery = page.locator('[data-gallery]');
  const dots = gallery.locator('[data-gallery-select]');
  await expect(gallery.locator('[data-gallery-toggle]')).toHaveCount(0);
  await expect(dots).toHaveCount(3);
  await expect(dots.nth(0)).toHaveAccessibleName('Show photo 1');
  await expect(dots.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(caption).toHaveText('Projectile Turret at Yatra');
  await expect(caption).toHaveText('Object Sorting System demonstration', {
    timeout: 10000,
  });
  await expect(dots.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await dots.nth(2).click();
  await expect(caption).toHaveText('Project workbench at the exhibition');
  await expect(dots.nth(2)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.hero-actions a').first().focus();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(6500);
  await expect(caption).toHaveText('Project workbench at the exhibition');
  await page.evaluate(() => localStorage.setItem('nce:auto-photos', 'off'));
  await page.reload();
  await expect(caption).toHaveText('Projectile Turret at Yatra');
  await expect(caption).toHaveText('Object Sorting System demonstration', {
    timeout: 10000,
  });
  await gallery.hover();
  const hovered = await caption.textContent();
  await page.waitForTimeout(6500);
  await expect(caption).toHaveText(hovered!);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(0, 0);
  const still = await caption.textContent();
  await page.waitForTimeout(6500);
  await expect(caption).toHaveText(still!);
  await dots.nth(0).click();
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
  await mockCollegeMap(page);
  const base = test.info().project.use.baseURL!;
  await page.goto(base);
  await expect(page.locator('h1')).toHaveText('NCE Robotics Club.');
  await expect(page.locator('.photo-active')).toBeVisible();
  await expect(page.locator('[data-gallery-toggle]')).toHaveCount(0);
  await expect(page.locator('[data-gallery-navigation]')).toBeHidden();
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
      'events/',
      'events/yatra-5/',
      'membership/',
      'contact/',
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
  expect(text).toContain(`https://nceroboticsclub.github.io${base}team/`);
  expect(text.match(/<url>/g)).toHaveLength(8);
  expect(text).not.toMatch(
    /signin|motion-settings|review|member\/|officer|projects\/(object-sorting-system|3d-printer|projectile-turret)/,
  );
});

test('past editions are compact collections with specific See more destinations', async ({
  page,
}) => {
  await page.goto('events/');
  const cards = page.locator('.edition-card');
  await expect(cards).toHaveCount(data.events.editions.length);
  for (const [index, edition] of data.events.editions.entries()) {
    const card = cards.nth(index);
    await expect(card.getByRole('heading')).toHaveText(edition.label);
    const link = card.getByRole('link', { name: /See more/ });
    await expect(link).toHaveCount(1);
    if (edition.href.startsWith('/')) {
      await expect(link).toHaveAttribute(
        'href',
        new RegExp(`${edition.href}$`),
      );
    } else {
      await expect(link).toHaveAttribute('href', edition.href);
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
    await expect(link).toHaveAccessibleName(new RegExp(edition.label));
  }
  await expect(page.getByRole('link', { name: /View archive/ })).toHaveCount(0);
});

test('event carousel wraps with controls and keyboard and keeps photo names off the page', async ({
  page,
}) => {
  await page.goto('events/yatra-5/');
  const carousel = page.locator('[data-event-carousel]');
  await carousel.scrollIntoViewIfNeeded();
  await expect(carousel).toHaveClass(/is-enhanced/);
  await expect(carousel.locator('[data-event-photo]')).toHaveCount(9);
  await expect(carousel).toHaveAttribute('data-current', '0');
  await expect(carousel.locator('[data-event-count]')).toHaveText('1 / 9');
  await expect(carousel.locator('figcaption')).toHaveCount(0);
  for (const photo of data.events.yatra5.photos) {
    await expect(
      carousel.getByText(photo.caption, { exact: true }),
    ).toHaveCount(0);
  }
  const next = carousel.locator('[data-event-next]');
  const previous = carousel.locator('[data-event-prev]');
  await next.click();
  await expect(carousel).toHaveAttribute('data-current', '1');
  await previous.click();
  await expect(carousel).toHaveAttribute('data-current', '0');
  await previous.click();
  await expect(carousel).toHaveAttribute('data-current', '8');
  await expect(carousel.locator('[data-event-count]')).toHaveText('9 / 9');
  await page.keyboard.press('ArrowRight');
  await expect(carousel).toHaveAttribute('data-current', '0');
  await page.keyboard.press('ArrowLeft');
  await expect(carousel).toHaveAttribute('data-current', '8');
  await expect(carousel.locator('[data-event-toggle]')).toHaveAccessibleName(
    'Play event photos',
  );
  await page.keyboard.press('ArrowRight');
  const current = carousel.locator('[data-event-photo][aria-current="true"]');
  await expect(current).toHaveAttribute('tabindex', '0');
  await expect(
    carousel.locator('[data-event-photo]:not([aria-current="true"])'),
  ).toHaveCount(8);
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test('event carousel accepts phone swipes and retains a usable centered photo', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('events/');
  const carousel = page.locator('[data-event-carousel]');
  await carousel.scrollIntoViewIfNeeded();
  await expect(carousel).toHaveClass(/is-enhanced/);
  const stage = carousel.locator('.event-stage');
  const box = await stage.boundingBox();
  expect(box).not.toBeNull();
  const y = box!.y + box!.height / 2;
  const start = box!.x + box!.width * 0.8;
  const end = box!.x + box!.width * 0.2;
  await stage.dispatchEvent('pointerdown', {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    clientX: start,
    clientY: y,
  });
  await stage.dispatchEvent('pointerup', {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    clientX: end,
    clientY: y,
  });
  await expect(carousel).toHaveAttribute('data-current', '1');
  await stage.dispatchEvent('pointerdown', {
    pointerId: 2,
    pointerType: 'touch',
    isPrimary: true,
    clientX: end,
    clientY: y,
  });
  await stage.dispatchEvent('pointerup', {
    pointerId: 2,
    pointerType: 'touch',
    isPrimary: true,
    clientX: start,
    clientY: y,
  });
  await expect(carousel).toHaveAttribute('data-current', '0');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('event photos advance automatically and pause for user preference and reduced motion', async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.goto('events/');
  const carousel = page.locator('[data-event-carousel]');
  await carousel.scrollIntoViewIfNeeded();
  const toggle = carousel.locator('[data-event-toggle]');
  await expect(toggle).toHaveAccessibleName('Pause event photos');
  await expect(carousel).toHaveAttribute('data-current', '1', {
    timeout: 10000,
  });
  await toggle.click();
  await expect(toggle).toHaveAccessibleName('Play event photos');
  expect(
    await page.evaluate(() => localStorage.getItem('nce:auto-photos')),
  ).toBe('off');
  await page.reload();
  await carousel.scrollIntoViewIfNeeded();
  await expect(toggle).toHaveAccessibleName('Play event photos');
  await page.waitForTimeout(6500);
  await expect(carousel).toHaveAttribute('data-current', '0');
  await toggle.click();
  await expect(toggle).toHaveAccessibleName('Pause event photos');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(toggle).toBeHidden();
  const still = await carousel.getAttribute('data-current');
  await page.waitForTimeout(6500);
  await expect(carousel).toHaveAttribute('data-current', still!);
  await carousel.locator('[data-event-next]').click();
  await expect(carousel).not.toHaveAttribute('data-current', still!);
});

test('event photos remain linked and browsable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await mockCollegeMap(page);
  const base = test.info().project.use.baseURL!;
  await page.goto(new URL('events/yatra-5/', base).href);
  const carousel = page.locator('[data-event-carousel]');
  await expect(carousel).not.toHaveClass(/is-enhanced/);
  await expect(carousel.locator('[data-event-photo]')).toHaveCount(9);
  await expect(carousel.locator('[data-event-next]')).toBeHidden();
  const first = carousel.locator('[data-event-photo]').first();
  await expect(first).toBeVisible();
  await expect(first).toHaveAttribute(
    'href',
    /\/images\/projectile-turret\.webp$/,
  );
  await first.click();
  expect(page.url()).toMatch(/\/images\/projectile-turret\.webp$/);
  await context.close();
});

test('a failed event photo is skipped while the last decoded photo remains usable', async ({
  page,
}) => {
  await page.route('**/images/object-sorting*.webp', (route) => route.abort());
  await page.goto('events/');
  const carousel = page.locator('[data-event-carousel]');
  await carousel.scrollIntoViewIfNeeded();
  await expect(carousel).toHaveClass(/is-enhanced/);
  await expect(carousel).toHaveAttribute('data-current', '0');
  await carousel.locator('[data-event-next]').click();
  await expect(carousel).toHaveAttribute('data-current', '2');
  const image = carousel.locator('[data-event-photo][aria-current="true"] img');
  expect(
    await image.evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
});

async function delaySortingPhotoDecode(page: Page) {
  await page.evaluate(() => {
    const state = window as Window & {
      eventPhotoDecodeWaiting?: boolean;
      releaseEventPhotoDecode?: () => Promise<void>;
    };
    const originalDecode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = function () {
      if (
        this.closest('[data-event-carousel]') &&
        /\/object-sorting(?:-\d+)?\.webp$/.test(this.currentSrc || this.src)
      ) {
        state.eventPhotoDecodeWaiting = true;
        return new Promise<void>((resolve, reject) => {
          state.releaseEventPhotoDecode = async () => {
            try {
              await originalDecode.call(this);
              resolve();
            } catch (error) {
              reject(error);
            } finally {
              HTMLImageElement.prototype.decode = originalDecode;
              delete state.eventPhotoDecodeWaiting;
              delete state.releaseEventPhotoDecode;
            }
          };
        });
      }
      return originalDecode.call(this);
    };
  });
}

async function releaseSortingPhotoDecode(page: Page) {
  await page.evaluate(async () => {
    const state = window as Window & {
      releaseEventPhotoDecode?: () => Promise<void>;
    };
    if (!state.releaseEventPhotoDecode)
      throw new Error('Expected a pending sorting-photo decode');
    await state.releaseEventPhotoDecode();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  });
}

test('pending event-photo decode preserves focus after the visitor leaves the carousel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('events/yatra-5/');
  const carousel = page.locator('[data-event-carousel]');
  await expect(carousel).toHaveClass(/is-enhanced/);
  await delaySortingPhotoDecode(page);
  const firstPhoto = carousel.locator('[data-event-photo="0"]');
  await firstPhoto.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { eventPhotoDecodeWaiting?: boolean })
            .eventPhotoDecodeWaiting,
      ),
    )
    .toBe(true);
  const home = page
    .getByRole('navigation', { name: 'Main navigation', exact: true })
    .getByRole('link', { name: 'Home', exact: true });
  await home.focus();
  await releaseSortingPhotoDecode(page);
  await expect(carousel).toHaveAttribute('data-current', '1');
  await expect(home).toBeFocused();
});

test('pending event-photo decode leaves the opened viewer and its focus return intact', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('events/yatra-5/');
  const carousel = page.locator('[data-event-carousel]');
  await expect(carousel).toHaveClass(/is-enhanced/);
  await delaySortingPhotoDecode(page);
  const firstPhoto = carousel.locator('[data-event-photo="0"]');
  await firstPhoto.focus();
  await page.keyboard.press('ArrowRight');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { eventPhotoDecodeWaiting?: boolean })
            .eventPhotoDecodeWaiting,
      ),
    )
    .toBe(true);
  await page.keyboard.press('Enter');
  const viewer = page.locator('#photo-viewer');
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('[data-viewer-count]')).toHaveText('1 / 9');
  await releaseSortingPhotoDecode(page);
  await expect(carousel).toHaveAttribute('data-current', '0');
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('[data-viewer-close]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(viewer).not.toBeVisible();
  await expect(firstPhoto).toBeFocused();
  expect(
    await firstPhoto.evaluate((link) => link.closest('[aria-hidden="true"]')),
  ).toBeNull();
});

test('event carousels reserve the same phone layout space before and after enhancement', async ({
  browser,
}) => {
  const viewport = { width: 390, height: 844 };
  const fallbackContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport,
  });
  const enhancedContext = await browser.newContext({ viewport });
  const fallbackPage = await fallbackContext.newPage();
  const enhancedPage = await enhancedContext.newPage();
  await mockCollegeMap(fallbackPage);
  await mockCollegeMap(enhancedPage);
  const base = test.info().project.use.baseURL!;
  for (const path of ['events/', 'events/yatra-5/']) {
    await fallbackPage.goto(new URL(path, base).href);
    const fallback = fallbackPage.locator('[data-event-carousel]');
    await expect(fallback).not.toHaveClass(/is-enhanced/);
    await fallbackPage.evaluate(() => document.fonts.ready);
    const before = await fallback.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      stageHeight: element
        .querySelector('.event-stage')!
        .getBoundingClientRect().height,
    }));
    await enhancedPage.goto(new URL(path, base).href);
    const enhanced = enhancedPage.locator('[data-event-carousel]');
    await expect(enhanced).toHaveClass(/is-enhanced/);
    await enhancedPage.evaluate(() => document.fonts.ready);
    const after = await enhanced.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      stageHeight: element
        .querySelector('.event-stage')!
        .getBoundingClientRect().height,
    }));
    expect(
      before.stageHeight,
      `${path} reserves a photo frame`,
    ).toBeGreaterThan(200);
    expect(
      Math.abs(after.stageHeight - before.stageHeight),
      `${path} photo stage remains stable during enhancement`,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(after.height - before.height),
      `${path} carousel height remains stable during enhancement`,
    ).toBeLessThanOrEqual(1);
  }
  await fallbackContext.close();
  await enhancedContext.close();
});
