import { expect, Page, test } from '@playwright/test';
import { apiResponse, user } from './fixtures';

const WIDTHS = [320, 390, 768, 1024, 1440];
const PAGES = ['/dashboard', '/about', '/projects', '/skills', '/experiences', '/education', '/tags', '/contacts', '/github', '/users'];

/** Éléments qui dépassent du viewport hors de tout conteneur défilant ou rogné. */
async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders: string[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const r = el.getBoundingClientRect();
      if (!r.width || getComputedStyle(el).position === 'fixed') continue;
      let parent = el.parentElement;
      let contained = false;
      while (parent && parent !== document.body) {
        if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(parent).overflowX)) {
          contained = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!contained && r.right > vw + 1) {
        offenders.push(`<${el.tagName.toLowerCase()}> dépasse de ${Math.round(r.right - vw)} px : « ${(el.textContent || '').trim().slice(0, 40)} »`);
      }
    }
    return { scrollWidth: document.documentElement.scrollWidth, viewport: vw, offenders: offenders.slice(0, 5) };
  });
}

test.beforeEach(async ({ page, context }) => {
  // Session déjà ouverte : cookie du jeton + utilisateur persistant
  await context.addCookies([{ name: 'portfolio_token', value: 'tok', url: 'http://localhost:3100' }]);
  await context.addInitScript((u) => {
    localStorage.setItem('portfolio-admin-auth', JSON.stringify({ state: { user: u }, version: 0 }));
  }, user);
  await page.route('**/api/v1/**', (route) => route.fulfill({ json: apiResponse(route.request().url()) }));
});

for (const width of WIDTHS) {
  for (const path of PAGES) {
    test(`${path} — aucun défilement horizontal à ${width} px`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForLoadState('networkidle');

      const result = await horizontalOverflow(page);
      expect(result.offenders, result.offenders.join('\n')).toEqual([]);
      expect(result.scrollWidth).toBeLessThanOrEqual(result.viewport);
      expect(errors).toEqual([]);
    });
  }
}

test('connexion — aucun défilement horizontal à 320 px', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  const result = await horizontalOverflow(page);
  expect(result.offenders).toEqual([]);
  await page.close();
});

test("les actions d'une compétence restent visibles et dans l'écran sur mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/skills');
  const card = page.locator('.group', { hasText: 'Un nom de compétence' });
  const box = await card.boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  const buttons = card.getByRole('button');
  for (const b of await buttons.all()) {
    await expect(b).toBeVisible();
    const bb = await b.boundingBox();
    expect(bb!.x + bb!.width).toBeLessThanOrEqual(320);
  }
});
