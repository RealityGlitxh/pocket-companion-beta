const { chromium } = require('playwright');
const viewports=[['desktop-1440',1440,1000],['desktop-1280',1280,900],['laptop-1024',1024,900],['tablet-768',768,1024],['mobile-430',430,900],['mobile-390',390,844]];
const seed={user:'Navigation QA',page:'meta',decks:[],matches:[],sessions:[],rankHistory:[],collection:{},rank:{tier:'Unranked',points:0,streak:0},battlePrefs:{experienceMode:'standard',statsTab:'overview'},metaIntel:{windowHours:168}};
(async()=>{
 const browser=await chromium.launch({headless:true});const failures=[];
 for(const [name,width,height] of viewports){
  const ctx=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e.message||e)));
  await page.goto('http://127.0.0.1:8123/index.html',{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(900);
  const stateResult=await page.evaluate(seed=>{Object.assign(state,JSON.parse(JSON.stringify(seed)));if(typeof cloudSession!=='undefined')cloudSession=null;nav();const header=document.querySelector('.appHeader'),brand=document.querySelector('.appBrand'),img=document.querySelector('.appBrandLogo'),search=document.getElementById('globalSearchButton'),profiles=document.querySelector('.userChip'),cog=document.querySelector('.headerUtilityButton'),active=document.querySelector('.navCategory.active>summary')?.textContent||document.querySelector('.navPrimaryBtn.active')?.textContent||'';const labels=[...document.querySelectorAll('.headerUtilityGroupLabel')].map(x=>x.textContent.trim());const navText=document.querySelector('.headerNav')?.textContent||'';const utilityText=document.querySelector('.headerUtilityDropdown')?.textContent||'';return {version:header?.dataset.navVersion||'',brand:brand?.textContent.trim()||'',img:!!img&&img.getAttribute('src')?.includes('icons/icon-192.png'),searchVisible:!!search&&getComputedStyle(search).display!=='none',profiles:!!profiles,cog:!!cog,active:active.trim(),labels,navText,utilityText,overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,headerHeight:header?.getBoundingClientRect().height||0,mobileNavVisible:!!document.getElementById('mobileNav')&&getComputedStyle(document.getElementById('mobileNav')).display!=='none'}},seed);
  if(stateResult.version!=='8.76.0')failures.push({name,type:'version',stateResult});
  if(!/PocketNexus/.test(stateResult.brand)||!stateResult.img)failures.push({name,type:'brand',stateResult});
  if(!stateResult.searchVisible)failures.push({name,type:'search-hidden',stateResult});
  if(!stateResult.profiles)failures.push({name,type:'profiles-missing',stateResult});
  if(width>900&&!stateResult.cog)failures.push({name,type:'settings-missing',stateResult});
  if(width>900&&!/Meta|Compete/.test(stateResult.active))failures.push({name,type:'active-meta-state',stateResult});
  if(width>900&&!['ACCOUNT','TOOLS','APPLICATION','INFORMATION'].every(x=>stateResult.labels.includes(x)))failures.push({name,type:'utility-groups',stateResult});
  if(width>900&&!['Home','Play','Build','Compete','Improve'].every(x=>stateResult.navText.includes(x)))failures.push({name,type:'primary-nav-hierarchy',stateResult});
  if(width>900&&!['Profiles','Pocket Sync','Account & Cloud','About & Privacy','Settings'].every(x=>(stateResult.utilityText+' Profiles').includes(x)))failures.push({name,type:'utility-destinations',stateResult});
  if(stateResult.overflow>4)failures.push({name,type:'horizontal-overflow',stateResult});
  if(width<=430&&stateResult.headerHeight>70)failures.push({name,type:'mobile-header-too-tall',stateResult});
  if(width<=900&&!stateResult.mobileNavVisible)failures.push({name,type:'mobile-navigation-hidden',stateResult});
  if(name==='desktop-1440'){
   await page.locator('.navCategory[data-category="Play"] > summary').click();
   await page.waitForTimeout(40);
   await page.locator('.headerUtilityButton').click();
   await page.waitForTimeout(40);
   const popovers=await page.evaluate(()=>{const play=document.querySelector('.navCategory[data-category="Play"]'),settings=document.querySelector('.headerUtilityMenu');return {play:play.open,settings:settings.open,settingsExpanded:settings.querySelector('summary')?.getAttribute('aria-expanded')}});
   if(popovers.play||!popovers.settings||popovers.settingsExpanded!=='true')failures.push({name,type:'single-popover',popovers});
   await page.keyboard.press('Escape');const escaped=await page.evaluate(()=>({open:document.querySelectorAll('.navCategory[open]').length}));if(escaped.open)failures.push({name,type:'escape-menu-close',escaped});
   await page.keyboard.press('Control+K');await page.waitForTimeout(150);const searchOpen=await page.evaluate(()=>({input:!!document.getElementById('globalSearchInput'),focused:document.activeElement?.id==='globalSearchInput'}));if(!searchOpen.input)failures.push({name,type:'ctrl-k-search',searchOpen});
   await page.keyboard.press('Escape');
   const logoRoute=await page.evaluate(()=>{state.page='meta';document.querySelector('.appBrand')?.click();return state.page});if(logoRoute!=='dashboard')failures.push({name,type:'logo-home-route',logoRoute});
  }
  if(errors.length)failures.push({name,type:'page-errors',errors});await ctx.close();
 }
 await browser.close();console.log('NAVIGATION_HEADER_QA_RESULTS',JSON.stringify(failures,null,2));if(failures.length)process.exit(1);console.log('NAVIGATION_HEADER_QA_OK');
})().catch(e=>{console.error('NAVIGATION_HEADER_QA_FAILURE',e);process.exit(1)});
