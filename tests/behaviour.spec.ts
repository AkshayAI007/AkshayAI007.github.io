import { expect, test } from '@playwright/test';

test('theme toggle switches, labels and persists across pages', async ({ page }) => {
  await page.goto('/about');
  const html = page.locator('html');
  await expect(html).not.toHaveAttribute('data-theme', 'light');
  const toggle = page.locator('#themeToggle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#themeState')).toHaveText('Light');
  await page.goto('/projects/netflix');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#hdThemeState')).toHaveText('Light');
});

test('mobile menu opens, traps focus, closes on Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'the menu button only shows on narrow screens');
  await page.goto('/writing');
  const menu = page.locator('#mobileMenu');
  await page.locator('#menuButton').click();
  await expect(menu).toHaveClass(/open/);
  await expect(menu).not.toHaveAttribute('inert');
  await expect(page.locator('#menuButton')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveClass(/open/);
  await expect(menu).toHaveAttribute('inert', '');
  await expect(page.locator('#menuButton')).toBeFocused();
});

test('Ask Akshay hydrates on first use and answers', async ({ page, isMobile }) => {
  await page.goto('/');
  const island = page.locator('astro-island[client="ask"]');
  await expect(island).toHaveAttribute('ssr', '');
  const trigger = isMobile ? page.locator('#floatingAskBtn') : page.locator('#askNavBtn');
  await trigger.click();
  const panel = page.locator('#chatPanel');
  await expect(panel).toHaveClass(/open/);
  await expect(panel).not.toHaveAttribute('inert');
  await panel.getByRole('button', { name: 'Scale' }).click();
  await expect(page.locator('#chatAnswerText')).toContainText('3M+ US SMBs');
  await page.keyboard.press('Escape');
  await expect(panel).not.toHaveClass(/open/);
});

test('React islands load only when needed', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(r.url()); });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(scripts.some((s) => /client\.[\w-]+\.js$/.test(s)), 'React runtime at load').toBe(false);
  await page.locator('#impactDeck').scrollIntoViewIfNeeded();
  await expect.poll(() => scripts.some((s) => /client\.[\w-]+\.js$/.test(s))).toBe(true);
});

test('impact deck: tabs are keyboard operable', async ({ page }) => {
  await page.goto('/');
  await page.locator('#impactDeck').scrollIntoViewIfNeeded();
  await expect(page.locator('#impactDeck')).toHaveClass(/is-auto/);
  await page.locator('#impTab0').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#impTab1')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#impTab1')).toBeFocused();
  await expect(page.locator('#impPanel1')).toBeVisible();
  await expect(page.locator('#impactDeck')).not.toHaveClass(/is-auto/);
  await page.keyboard.press('End');
  await expect(page.locator('#impTab3')).toHaveAttribute('aria-selected', 'true');
});

test('project orbit: arrows turn the ring', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#projectOrbit').scrollIntoViewIfNeeded();
  await expect(page.locator('#projectOrbit').locator('xpath=..')).not.toHaveAttribute('ssr', '');
  await expect(page.locator('#orbitNow')).toHaveText('01');
  await page.getByRole('button', { name: 'Next project' }).click();
  await expect(page.locator('#orbitNow')).toHaveText('02');
  await expect(page.locator('.orbit-card.is-front')).toHaveAttribute('href', '/projects/netflix');
});

test('architecture flow: hovering a stage updates the readout', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover');
  await page.goto('/case/voice-ai');
  const stop = page.locator('.flow-stop').first();
  await stop.hover();
  await expect(stop).toHaveClass(/is-hot/);
  await expect(page.locator('#readout-voice-ai b')).toHaveText('01 · CALLER');
});

test('reach: copy email', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/reach');
  await page.locator('#copyEmailBtn').click();
  await expect(page.locator('#copyEmailBtn')).toHaveText('COPIED');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('akshay.aispecialist@gmail.com');
});

test('resume: download saves the PDF', async ({ page }) => {
  await page.goto('/resume');
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#downloadResumeBtn').click()]);
  expect(download.suggestedFilename()).toBe('Akshay_Bawaliwale_Resume.pdf');
  await expect(page.locator('#downloadResumeNote')).toHaveText('Saved to your device.');
});

test('home nav scrolls in place and marks the section', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop nav');
  await page.goto('/');
  await page.locator('.desktop-nav a[href="/#systems"]').click();
  await expect(page).toHaveURL(/\/#systems$/);
  await expect(page.locator('.desktop-nav a[href="/#systems"]')).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('systems')!.getBoundingClientRect().top))).toBeLessThan(120);
});
