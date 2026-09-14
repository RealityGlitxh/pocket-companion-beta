const { chromium } = require('playwright');

const viewports = [
  ['desktop-1920', 1920, 1000],
  ['desktop-1600', 1600, 1000],
  ['desktop-1440', 1440, 1000],
  ['desktop-1366', 1366, 900],
  ['desktop-1280', 1280, 900],
  ['tablet', 768, 1024],
  ['mobile', 390, 844]
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];

  for (const [name, width, height] of viewports) {
    const ctx = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(String(e.message || e)));

    await page.goto('http://127.0.0.1:8123/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      if (!window.state) window.state = {};
      state.user = state.user || { id: 'header-qa', display_name: 'Header QA' };
      state.page = state.page || 'dashboard';
      window.nav?.();
      window.PocketNexusCompetitiveHub?.render?.();
      document.querySelectorAll('.ppcUpdateBackdrop,.onboardingBackdrop,#ppcWhatsNewBackdrop,.mobileMoreBackdrop').forEach(x => x.remove());
    });
    await page.waitForTimeout(200);

    const result = await page.evaluate(() => {
      const rect = el => el ? el.getBoundingClientRect() : null;
      const visible = el => !!el && getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
      const header = document.querySelector('.appHeader');
      const primary = document.querySelector('.appHeaderBar');
      const hub = document.querySelector('#pnCompetitiveBar');
      const tools = document.querySelector('.pnCompetitiveTools');
      const search = document.querySelector('#globalSearchButton');
      const brand = document.querySelector('.appBrand');
      const nav = document.querySelector('#nav');
      const user = document.querySelector('#user');
      const pr = rect(primary), hr = rect(hub), sr = rect(search), br = rect(brand), nr = rect(nav), ur = rect(user);
      const overlap = (a,b) => !!(a&&b&&Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2);
      return {
        header: rect(header), primary: pr, hub: hr,
        hubVisible: visible(hub),
        toolsOverflowScrollable: tools ? tools.scrollWidth >= tools.clientWidth : false,
        hubParentClass: hub?.parentElement?.className || '',
        searchVisible: visible(search),
        primaryOverflow: primary ? primary.scrollWidth - primary.clientWidth : 0,
        overlaps: {
          brandNav: overlap(br,nr), navSearch: visible(search) ? overlap(nr,sr) : false,
          searchUser: visible(search) ? overlap(sr,ur) : false
        },
        labels: [...document.querySelectorAll('.pnHubTool small')].map(x=>x.textContent.trim())
      };
    });

    const desktop = width > 900;
    if (desktop) {
      if (!result.hubVisible) failures.push({ name, type: 'hub-hidden', result });
      if (!String(result.hubParentClass).includes('appHeader')) failures.push({ name, type: 'hub-not-second-row', result });
      if (result.primary && result.hub && result.hub.top < result.primary.bottom - 1) failures.push({ name, type: 'rows-overlap', result });
      if (result.primaryOverflow > 4) failures.push({ name, type: 'primary-horizontal-overflow', result });
      if (Object.values(result.overlaps).some(Boolean)) failures.push({ name, type: 'primary-control-overlap', result });
      if (result.labels.length !== 9) failures.push({ name, type: 'missing-hub-tools', result });
    } else if (result.hubVisible) {
      failures.push({ name, type: 'mobile-hub-should-be-hidden', result });
    }

    if (pageErrors.length) failures.push({ name, type: 'page-errors', pageErrors });
    await ctx.close();
  }

  await browser.close();
  console.log('COMPETITIVE_HUB_HEADER_QA_RESULTS', JSON.stringify(failures, null, 2));
  if (failures.length) process.exit(1);
  console.log('COMPETITIVE_HUB_HEADER_QA_OK');
})().catch(err => {
  console.error('COMPETITIVE_HUB_HEADER_QA_FAILURE', err);
  process.exit(1);
});
