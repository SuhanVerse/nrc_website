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
      await page.evaluate(async () => {
        // Audit the settled page, not an intermediate opacity during entry.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        await Promise.all(
          document
            .getAnimations()
            .filter((animation) => animation.id === 'content-enter')
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
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

test('continuous committee grid, order, portraits and confirmed social destinations', async ({
  page,
}) => {
  await page.goto('team/');
  const cards = page.locator('.member-card');
  await expect(cards).toHaveCount(13);
  await expect(page.locator('.member-grid')).toHaveCount(1);
  await expect(page.locator('.member-grid > .member-card')).toHaveCount(13);
  await expect(page.locator('.committee-batch')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: /^(Office holders|Batch \d{3})$/ }),
  ).toHaveCount(0);
  const names = [
    'Prabhat Rawal',
    'Bishal Gyawalli',
    'Pratham Timalsina',
    'Suhan Khadka',
    'Sudikshya Tako',
    'Arushi Pandey',
    'Shrawan Parsai',
    'Rhythm Darlami',
    'Sarad Rai',
    'Pranish Maharjan',
    'Pravin Pandey',
    'Rachana Tamrakar',
    'Samarpan Khadka',
  ];
  expect(await cards.locator('h2').allTextContents()).toEqual(names);
  const fifth = await cards.nth(4).boundingBox();
  const sixth = await cards.nth(5).boundingBox();
  expect(fifth).not.toBeNull();
  expect(sixth).not.toBeNull();
  expect(fifth!.y).toBe(sixth!.y);
  await expect(cards.locator('a.member-social-link')).toHaveCount(27);
  await expect(
    cards.locator('.is-pending, span.member-social-link'),
  ).toHaveCount(0);
  for (const [index, name] of names.entries()) {
    const member = data.members.find((record) => record.name === name)!;
    const links = cards.nth(index).locator('a.member-social-link');
    await expect(links).toHaveCount(member.socials.length);
    for (const [linkIndex, profile] of member.socials.entries()) {
      await expect(links.nth(linkIndex)).toHaveAttribute('href', profile.url);
      await expect(links.nth(linkIndex)).toHaveAccessibleName(
        `${name} on ${profile.label}`,
      );
      await expect(links.nth(linkIndex).locator('img')).toHaveAttribute(
        'src',
        new RegExp(`/icons/${profile.label.toLowerCase()}\\.svg$`),
      );
    }
  }
  await expect(cards.first().locator('.member-portrait')).toHaveCSS(
    'width',
    '180px',
  );
  await page.goto('./');
  expect(await page.locator('.person-card h3').allTextContents()).toEqual(
    names.slice(0, 3),
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
  await expect(footer.locator('.location-map')).toHaveCSS(
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

for (const width of [1440, 390, 320]) {
  test(`Contact location map and directions at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('contact/');
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      await Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation.id === 'content-enter')
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    for (const link of await page.locator('.contact-social-link').all()) {
      expect(
        await link.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
    }
    const visit = page.getByRole('region', { name: 'Visit', exact: true });
    const emailBounds = await page.locator('.contact-direct').boundingBox();
    const socialBounds = await page
      .locator('.contact-social-link')
      .last()
      .boundingBox();
    const membershipBounds = await page
      .locator('.contact-membership-note')
      .boundingBox();
    const visitBounds = await visit.boundingBox();
    expect(emailBounds).not.toBeNull();
    expect(socialBounds).not.toBeNull();
    expect(membershipBounds).not.toBeNull();
    expect(visitBounds).not.toBeNull();
    expect(
      emailBounds!.y +
        emailBounds!.height -
        socialBounds!.y -
        socialBounds!.height,
    ).toBeLessThanOrEqual(34);
    expect(membershipBounds!.width).toBeCloseTo(emailBounds!.width, 0);
    expect(
      membershipBounds!.y - emailBounds!.y - emailBounds!.height,
    ).toBeCloseTo(24, 0);
    if (width >= 1000) {
      expect(visitBounds!.y).toBeCloseTo(emailBounds!.y, 0);
      expect(membershipBounds!.x + membershipBounds!.width).toBeLessThan(
        visitBounds!.x,
      );
    } else {
      expect(visitBounds!.y).toBeGreaterThan(
        membershipBounds!.y + membershipBounds!.height,
      );
    }
    const map = visit.locator('iframe');
    await expect(visit).toContainText(data.club.location);
    await expect(visit).toContainText(data.club.address);
    await expect(map).toHaveAttribute('title', mapTitle);
    await expect(map).toHaveAttribute('src', mapSource);
    await expect(map).toHaveAttribute('loading', 'lazy');
    await map.scrollIntoViewIfNeeded();
    await expect(
      visit.frameLocator('iframe').getByText('Map frame fixture'),
    ).toBeVisible();
    await expect(visit.locator('.location-map')).toHaveCSS(
      'border-radius',
      '20px',
    );
    const bounds = await map.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThan(200);
    expect(bounds!.width / bounds!.height).toBeCloseTo(4 / 3, 1);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    const directions = visit.getByRole('link', { name: 'Get directions' });
    await expect(directions).toHaveAttribute(
      'href',
      'https://maps.app.goo.gl/DVfdNNojsxiafeM28',
    );
    await directions.focus();
    await expect(directions).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page
        .locator('.site-footer')
        .getByRole('link', { name: 'NCE Robotics Club home', exact: true }),
    ).toBeFocused();
    await expect(page.locator('.site-footer iframe')).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

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
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('events/yatra-5/');
  await expect(page.locator('[data-photo-open]')).toHaveCount(9);
  const opener = page.locator('[data-photo-open]').first();
  await opener.click();
  const viewer = page.locator('#photo-viewer');
  await expect(viewer).toBeVisible();
  await expect(viewer.locator('[data-viewer-count]')).toHaveClass(/sr-only/);
  const countBox = await viewer.locator('[data-viewer-count]').boundingBox();
  expect(countBox!.width).toBeLessThanOrEqual(1);
  expect(countBox!.height).toBeLessThanOrEqual(1);
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

test('Home photos rotate every three seconds, loop, allow quiet dot selection and obey hover and reduced motion', async ({
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
  await page.waitForTimeout(1500);
  await expect(caption).toHaveText('Projectile Turret at Yatra');
  await expect(caption).toHaveText('Object Sorting System demonstration', {
    timeout: 4500,
  });
  await expect(dots.nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(caption).toHaveText('Project workbench at the exhibition', {
    timeout: 4500,
  });
  await expect(caption).toHaveText('Projectile Turret at Yatra', {
    timeout: 4500,
  });
  await expect(dots.nth(0)).toHaveAttribute('aria-pressed', 'true');
  await dots.nth(2).click();
  await expect(caption).toHaveText('Project workbench at the exhibition');
  await expect(dots.nth(2)).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.hero-actions a').first().focus();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(3500);
  await expect(caption).toHaveText('Project workbench at the exhibition');
  await page.evaluate(() => localStorage.setItem('nce:auto-photos', 'off'));
  await page.reload();
  await expect(caption).toHaveText('Projectile Turret at Yatra');
  await expect(caption).toHaveText('Object Sorting System demonstration', {
    timeout: 4500,
  });
  await gallery.hover();
  const hovered = await caption.textContent();
  await page.waitForTimeout(3500);
  await expect(caption).toHaveText(hovered!);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(0, 0);
  const still = await caption.textContent();
  await page.waitForTimeout(3500);
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
  const lastCard = page.locator('.member-card').last();
  await lastCard.scrollIntoViewIfNeeded();
  await expect(lastCard).toBeVisible();
  await expect(lastCard).toHaveCSS('opacity', '1');
  await context.close();
});

test('committee cards settle after one entrance and stay settled when revisited', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('team/');
  const first = page.locator('.member-card').first();
  const entering = (card: typeof first) =>
    card.evaluate(
      (node) =>
        node
          .getAnimations()
          .filter((animation) => animation.id === 'content-enter').length,
    );
  await expect.poll(() => entering(first)).toBe(1);
  await first.evaluate((node) =>
    node.getAnimations().forEach((animation) => animation.finish()),
  );
  await expect(first).toHaveCSS('opacity', '1');
  await expect(first).toHaveCSS('translate', 'none');

  const last = page.locator('.member-card').last();
  await last.scrollIntoViewIfNeeded();
  await expect.poll(() => entering(last)).toBe(1);
  await last.evaluate((node) =>
    node.getAnimations().forEach((animation) => animation.finish()),
  );
  await page.locator('h1').scrollIntoViewIfNeeded();
  await last.scrollIntoViewIfNeeded();
  expect(await entering(last)).toBe(0);
  await expect(last).toHaveCSS('opacity', '1');
});

test('card focus settles motion and matches hover; reduced motion removes the lift', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('team/');
  const card = page.locator('.member-card').first();
  const link = card.getByRole('link').first();
  await link.focus();
  await expect(link).toBeFocused();
  await expect(card).toHaveCSS('opacity', '1');
  await expect(card).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -4)');
  expect(
    await card.evaluate((node) =>
      node.getAnimations().some((a) => a.id === 'content-enter'),
    ),
  ).toBe(false);
  await page.locator('.breadcrumb a').focus();
  await card.hover();
  await expect(card).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -4)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(card).toHaveCSS('transform', 'none');
  await expect(card).toHaveCSS('opacity', '1');
});

test('reduced motion skips entrances and cancels an entrance when changed', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('team/');
  const cards = page.locator('.member-card');
  await expect(cards.first()).toHaveCSS('opacity', '1');
  expect(
    await cards.evaluateAll((nodes) =>
      nodes.some((node) => node.getAnimations().length > 0),
    ),
  ).toBe(false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await expect
    .poll(() =>
      cards
        .first()
        .evaluate((node) =>
          node.getAnimations().some((a) => a.id === 'content-enter'),
        ),
    )
    .toBe(true);
  await cards.evaluateAll((nodes) =>
    nodes.forEach((node) =>
      node.getAnimations().forEach((animation) => animation.pause()),
    ),
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(
      () =>
        cards.evaluateAll((nodes) =>
          nodes.some((node) => node.getAnimations().length > 0),
        ),
      { timeout: 1000 },
    )
    .toBe(false);
  await expect(cards.first()).toHaveCSS('opacity', '1');
});

test('a failed later gallery image preserves the decoded photograph until the next usable photo', async ({
  page,
}) => {
  let failedPhotoRequested = false;
  await page.route('**/images/object-sorting*.webp', async (route) => {
    await route.abort();
    failedPhotoRequested = true;
  });
  await page.goto('./');
  await expect.poll(() => failedPhotoRequested, { timeout: 4500 }).toBe(true);
  // The Projects thumbnail can fail before the carousel attempts the same photo.
  await expect(page.locator('.photo-window img').nth(1)).toHaveAttribute(
    'src',
    /object-sorting/,
    { timeout: 4500 },
  );
  await expect(page.locator('[data-gallery-caption]')).toHaveText(
    'Projectile Turret at Yatra',
  );
  expect(
    await page
      .locator('.photo-active')
      .evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await expect(page.locator('[data-gallery-caption]')).toHaveText(
    'Project workbench at the exhibition',
    { timeout: 4500 },
  );
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

test('public pages omit playback buttons and visible carousel photo counts', async ({
  page,
}) => {
  for (const [path] of routes) {
    await page.goto(path || './');
    await expect(
      page.getByRole('button', { name: /^(pause|play)\b/i }),
    ).toHaveCount(0);
    await expect(
      page.locator(
        '[data-event-toggle], [data-gallery-toggle], [data-event-count]',
      ),
    ).toHaveCount(0);
  }
});

test('event carousel wraps with controls and keyboard and keeps photo names off the page', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('events/yatra-5/');
  const carousel = page.locator('[data-event-carousel]');
  await carousel.scrollIntoViewIfNeeded();
  await expect(carousel).toHaveClass(/is-enhanced/);
  await expect(carousel.locator('[data-event-photo]')).toHaveCount(9);
  await expect(carousel).toHaveAttribute('data-current', '0');
  await expect(carousel.locator('[data-event-count]')).toHaveCount(0);
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
  await page.keyboard.press('ArrowRight');
  await expect(carousel).toHaveAttribute('data-current', '0');
  await page.keyboard.press('ArrowLeft');
  await expect(carousel).toHaveAttribute('data-current', '8');
  await expect(carousel.locator('[data-event-toggle]')).toHaveCount(0);
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
  await page.emulateMedia({ reducedMotion: 'reduce' });
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

test('event photos advance every three seconds, loop and hold after navigation, stored preference and reduced motion', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('events/');
  const carousel = page.locator('[data-event-carousel]');
  await carousel.scrollIntoViewIfNeeded();
  await expect(carousel).toHaveClass(/is-enhanced/);
  await page.waitForTimeout(1500);
  await expect(carousel).toHaveAttribute('data-current', '0');
  for (const current of ['1', '2', '3', '4', '5', '6', '7', '8', '0']) {
    await expect(carousel).toHaveAttribute('data-current', current, {
      timeout: 4500,
    });
  }
  await carousel.locator('[data-event-prev]').click();
  await expect(carousel).toHaveAttribute('data-current', '8');
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.waitForTimeout(3500);
  await expect(carousel).toHaveAttribute('data-current', '8');

  await page.evaluate(() => localStorage.setItem('nce:auto-photos', 'off'));
  await page.reload();
  await carousel.scrollIntoViewIfNeeded();
  await expect(carousel).toHaveClass(/is-enhanced/);
  await page.waitForTimeout(3500);
  await expect(carousel).toHaveAttribute('data-current', '0');

  await page.evaluate(() => localStorage.removeItem('nce:auto-photos'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await carousel.scrollIntoViewIfNeeded();
  await expect(carousel).toHaveClass(/is-enhanced/);
  await page.waitForTimeout(3500);
  await expect(carousel).toHaveAttribute('data-current', '0');
  await carousel.locator('[data-event-next]').click();
  await expect(carousel).toHaveAttribute('data-current', '1');
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
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
  await page.emulateMedia({ reducedMotion: 'reduce' });
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
