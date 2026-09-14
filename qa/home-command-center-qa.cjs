const { chromium } = require('playwright');

const viewports = [
  ['desktop-1440', 1440, 1000],
  ['laptop-1024', 1024, 900],
  ['tablet-768', 768, 1024],
  ['mobile-430', 430, 900],
  ['mobile-390', 390, 844]
];

const matureState = () => ({
  user: 'QA Player',
  page: 'dashboard',
  selected: 'deck-qa-1',
  decks: [{ id: 'deck-qa-1', name: 'QA Competitive Deck', cards: [] }],
  matches: [
    { id:'m3', result:'win', deckId:'deck-qa-1', deckName:'QA Competitive Deck', opponentArchetype:'QA Opponent C', gameMode:'ranked', rankChange:12, turnOrder:'second', timestamp:Date.now()-60000 },
    { id:'m2', result:'loss', deckId:'deck-qa-1', deckName:'QA Competitive Deck', opponentArchetype:'QA Opponent B', gameMode:'ranked', rankChange:-8, turnOrder:'first', timestamp:Date.now()-120000 },
    { id:'m1', result:'win', deckId:'deck-qa-1', deckName:'QA Competitive Deck', opponentArchetype:'QA Opponent A', gameMode:'casual', rankChange:0, turnOrder:'first', timestamp:Date.now()-180000 }
  ],
  sessions: [], rankHistory: [], collection: {},
  rank: { tier:'Master Ball', points:1104, streak:2 },
  battlePrefs: { lastDeckId:'deck-qa-1', statsTab:'overview', experienceMode:'standard' },
  metaIntel: { windowHours:168 }
});
const emptyState = () => ({
  user: 'New QA Player', page:'dashboard', selected:null, decks:[], matches:[], sessions:[], rankHistory:[], collection:{},
  rank:{ tier:'Unranked', points:0, streak:0 }, battlePrefs:{ statsTab:'overview', experienceMode:'standard' }, metaIntel:{ windowHours:168 }
});

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];

  for (const [name, width, height] of viewports) {
    const ctx = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(String(e.message || e)));
    await page.goto('http://127.0.0.1:8123/index.html', { waitUntil:'domcontentloaded', timeout:30000 });
    await page.waitForTimeout(700);

    const mature = await page.evaluate((stateSeed) => {
      Object.assign(state, stateSeed);
      if (typeof cloudSession !== 'undefined') cloudSession = { user:{ id:'qa-cloud-user', email:'qa@example.com' } };
      window.dashboard();
      const root=document.querySelector('.pnHomeCommandCenter');
      const box=el=>el?.getBoundingClientRect();
      const bodyOverflow=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-window.innerWidth;
      return {
        version:root?.dataset.homeVersion||'',
        hero:document.querySelector('.pnHomeHero h1')?.textContent.trim()||'',
        snapshot:!!document.querySelector('.pnHomeSnapshot'), meta:!!document.querySelector('.pnHomeMeta'), quick:!!document.querySelector('.pnHomeQuick'),
        cont:!!document.querySelector('.pnHomeContinue'), recent:!!document.querySelector('.pnHomeRecent'), onboarding:!!document.querySelector('.pnHomeOnboarding'),
        metrics:document.querySelectorAll('.pnHomeMetric').length, quickCount:document.querySelectorAll('.pnHomeQuickGrid button').length,
        overflow:bodyOverflow,
        order:{snapshot:box(document.querySelector('.pnHomeSnapshot'))?.top||0,meta:box(document.querySelector('.pnHomeMeta'))?.top||0,quick:box(document.querySelector('.pnHomeQuick'))?.top||0,cont:box(document.querySelector('.pnHomeContinue'))?.top||0}
      };
    }, matureState());

    if (mature.version !== '8.75.0') failures.push({name,type:'wrong-home-version',mature});
    if (mature.hero !== 'Competitive Command Center') failures.push({name,type:'hero-copy-missing',mature});
    if (!mature.snapshot || !mature.meta || !mature.quick || !mature.cont || !mature.recent) failures.push({name,type:'mature-modules-missing',mature});
    if (mature.onboarding) failures.push({name,type:'mature-showed-onboarding',mature});
    if (mature.metrics < 3 || mature.metrics > 4) failures.push({name,type:'snapshot-density',mature});
    if (mature.quickCount < 4 || mature.quickCount > 6) failures.push({name,type:'quick-action-density',mature});
    if (mature.overflow > 4) failures.push({name,type:'horizontal-overflow-mature',mature});
    if (width <= 768 && !(mature.order.snapshot < mature.order.meta && mature.order.meta < mature.order.quick && mature.order.quick < mature.order.cont)) failures.push({name,type:'mobile-priority-order',mature});

    const empty = await page.evaluate((stateSeed) => {
      Object.assign(state, stateSeed);
      if (typeof cloudSession !== 'undefined') cloudSession = null;
      window.dashboard();
      return {
        onboarding:!!document.querySelector('.pnHomeOnboarding'), snapshot:!!document.querySelector('.pnHomeSnapshot'), recent:!!document.querySelector('.pnHomeRecent'),
        actions:document.querySelectorAll('.pnHomeOnboardingActions button').length,
        text:document.querySelector('.pnHomeOnboarding')?.textContent||'',
        overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-window.innerWidth
      };
    }, emptyState());
    if (!empty.onboarding || empty.snapshot || empty.recent || empty.actions !== 3) failures.push({name,type:'empty-account-state',empty});
    if (/\b0%\b|\b0-0\b|—\s*—/.test(empty.text)) failures.push({name,type:'empty-account-zero-wall',empty});
    if (empty.overflow > 4) failures.push({name,type:'horizontal-overflow-empty',empty});

    const guest = await page.evaluate((stateSeed) => {
      Object.assign(state, stateSeed, { user:'Guest' });
      if (typeof cloudSession !== 'undefined') cloudSession = null;
      window.dashboard();
      return {root:!!document.querySelector('.pnHomeCommandCenter'),meta:!!document.querySelector('.pnHomeMeta'),quick:!!document.querySelector('.pnHomeQuick')};
    }, matureState());
    if (!guest.root || !guest.meta || !guest.quick) failures.push({name,type:'guest-home-failed',guest});

    if (name === 'desktop-1440') {
      const isolated = await page.evaluate((stateSeed) => {
        Object.assign(state, stateSeed);
        const svc=window.PPCMetaService,original=svc?.getArchetypes;
        if (svc) svc.getArchetypes=()=>{throw new Error('forced meta QA failure')};
        try { window.dashboard(); } finally { if (svc&&original) svc.getArchetypes=original; }
        return {
          errorText:document.querySelector('.pnHomeMeta')?.textContent||'',
          snapshot:!!document.querySelector('.pnHomeSnapshot'),quick:!!document.querySelector('.pnHomeQuick'),continueCard:!!document.querySelector('.pnHomeContinue')
        };
      }, matureState());
      if (!/Meta temporarily unavailable/i.test(isolated.errorText) || !isolated.snapshot || !isolated.quick || !isolated.continueCard) failures.push({name,type:'module-failure-isolation',isolated});
    }

    if (pageErrors.length) failures.push({name,type:'page-errors',pageErrors});
    await ctx.close();
  }

  await browser.close();
  console.log('HOME_COMMAND_CENTER_QA_RESULTS', JSON.stringify(failures, null, 2));
  if (failures.length) process.exit(1);
  console.log('HOME_COMMAND_CENTER_QA_OK');
})().catch(err => { console.error('HOME_COMMAND_CENTER_QA_FAILURE', err); process.exit(1); });
