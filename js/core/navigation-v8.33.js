/* V8.33 core navigation: desktop categories, active context, mobile More sheet */
function closeHeaderMenus(except){
 document.querySelectorAll('.navCategory[open]').forEach(d=>{if(d!==except)d.removeAttribute('open')});
 document.querySelectorAll('.navCategory>summary').forEach(s=>s.setAttribute('aria-expanded',s.parentElement.hasAttribute('open')?'true':'false'));
}
function headerNavigate(page){closeHeaderMenus();goPage(page)}
function navItemActive(x){
 if(x.search)return false;
 if(x.action==='battle')return state.page==='matches' && (state.battlePrefs?.experienceMode||'standard')!=='gym';
 if(x.action==='gym')return state.page==='matches' && state.battlePrefs?.experienceMode==='gym' && ensureGymBattleState().view!=='pairing';
 if(x.action==='pairing')return state.page==='matches' && state.battlePrefs?.experienceMode==='gym' && ensureGymBattleState().view==='pairing';
 if(x.action==='coaching')return state.page==='stats' && (state.battlePrefs?.statsTab||'overview')==='coaching';
 return state.page===x.page;
}
function navAction(x){
 if(x.search)return "closeHeaderMenus();openGlobalSearch()";
 if(x.action==='battle')return "closeHeaderMenus();state.battlePrefs.experienceMode='standard';save();headerNavigate('matches')";
 if(x.action==='gym')return "closeHeaderMenus();state.battlePrefs.experienceMode='gym';const g=ensureGymBattleState();if(g.view==='pairing')g.view='setup';save();headerNavigate('matches')";
 if(x.action==='pairing')return "closeHeaderMenus();state.battlePrefs.experienceMode='gym';const g=ensureGymBattleState();g.view='pairing';save();headerNavigate('matches')";
 if(x.action==='coaching')return "closeHeaderMenus();state.battlePrefs.statsTab='coaching';save();headerNavigate('stats')";
 return `headerNavigate('${x.page}')`;
}
function navCategoryHtml(label,items){
 const active=items.some(navItemActive);
 return `<details class="navCategory ${active?'active':''}" data-category="${esc(label)}"><summary aria-haspopup="menu" aria-expanded="false">${esc(label)}<span class="navChevron">⌄</span></summary><div class="navCategoryMenu" role="menu">${items.map(x=>`<button class="navCategoryItem ${navItemActive(x)?'active':''}" role="menuitem" onclick="${navAction(x)}"><span class="navCategoryIcon">${x.icon}</span><span><strong>${esc(x.title)}</strong><small>${esc(x.description)}</small></span></button>`).join('')}</div></details>`;
}
function utilityMenuHtml(items){
 const active=items.some(navItemActive);
 return `<details class="navCategory headerUtilityMenu ${active?'active':''}" data-category="Utilities"><summary class="headerUtilityButton" aria-label="Open utilities and settings" title="Utilities & Settings" aria-haspopup="menu" aria-expanded="false">⚙</summary><div class="navCategoryMenu headerUtilityDropdown" role="menu">${items.map(x=>`<button class="navCategoryItem ${navItemActive(x)?'active':''}" role="menuitem" onclick="${navAction(x)}"><span class="navCategoryIcon">${x.icon}</span><span><strong>${esc(x.title)}</strong><small>${esc(x.description)}</small></span></button>`).join('')}</div></details>`;
}
function mobileMoreSheetHtml(){
 const groups=[
  ['PLAY',[{page:'rank',icon:'↗',title:'Rank'},{action:'gym',icon:'⚔',title:'Gym Battle'}]],
  ['BUILD',[{page:'collection',icon:'◇',title:'Collection'}]],
  ['COMPETE',[{page:'tournaments',icon:'♜',title:'Tournaments'},{action:'pairing',icon:'⇆',title:'Pairing Lab'},{page:'teamwars',icon:'⚔',title:'Team Wars'}]],
  ['IMPROVE',[{page:'stats',icon:'⌁',title:'Performance'},{page:'stats',action:'coaching',icon:'✦',title:'Coaching'},{page:'optimizer',icon:'◎',title:'Simulation Lab'},{page:'coach',icon:'✦',title:'Pocket Coach'},{page:'training',icon:'?',title:'Brain Teasers'}]],
  ['SOCIAL',[{page:'profile',icon:'◉',title:'Profiles'}]],
  ['UTILITIES',[{page:'trade',icon:'⇄',title:'Trade'},{page:'streamer',icon:'▤',title:'Streamer'},{search:true,icon:'⌕',title:'Search'},{page:'sync',icon:'↻',title:'Pocket Sync'},{page:'account',icon:'◉',title:'Account & Cloud'},{page:'about',icon:'ⓘ',title:'About & Privacy'},{page:'more',icon:'⚙',title:'Settings'}]]
 ];
 return `<div class="mobileMoreBackdrop" id="mobileMoreBackdrop"><section class="mobileMoreSheet" role="dialog" aria-modal="true" aria-labelledby="mobileMoreTitle"><div class="mobileMoreHandle" aria-hidden="true"></div><div class="between"><div><span class="eyebrow">POCKETNEXUS</span><h2 id="mobileMoreTitle">More</h2></div><button class="secondary" type="button" onclick="closeMobileMoreSheet()">Close</button></div>${groups.map(([label,items])=>`<div class="mobileMoreGroup"><h3>${label}</h3><div class="mobileMoreGrid">${items.map(x=>`<button type="button" class="mobileMoreItem ${navItemActive(x)?'active':''}" onclick="mobileMoreNavigate(${JSON.stringify(x).replace(/\"/g,'&quot;')})"><span>${x.icon}</span><strong>${esc(x.title)}</strong></button>`).join('')}</div></div>`).join('')}</section></div>`;
}
function openMobileMoreSheet(){
 closeHeaderMenus();document.getElementById('mobileMoreBackdrop')?.remove();
 document.body.insertAdjacentHTML('beforeend',mobileMoreSheetHtml());
 const root=document.getElementById('mobileMoreBackdrop');root?.addEventListener('click',e=>{if(e.target===root)closeMobileMoreSheet()});
 setTimeout(()=>root?.querySelector('button')?.focus(),0);
}
function closeMobileMoreSheet(){document.getElementById('mobileMoreBackdrop')?.remove()}
function mobileMoreNavigate(x){
 closeMobileMoreSheet();
 if(x.search)return openGlobalSearch();
 if(x.action==='gym'){state.battlePrefs.experienceMode='gym';const g=ensureGymBattleState();if(g.view==='pairing')g.view='setup';save();return headerNavigate('matches')}
 if(x.action==='pairing'){state.battlePrefs.experienceMode='gym';const g=ensureGymBattleState();g.view='pairing';save();return headerNavigate('matches')}
 if(x.action==='coaching'){state.battlePrefs.statsTab='coaching';save();return headerNavigate('stats')}
 headerNavigate(x.page);
}
function nav(){
 const n=document.getElementById("nav");
 const identity=state.user||(cloudSession?.user?(cloudProfile?.display_name||cloudSession.user.email||"Account"):null);
 if(!identity){n.innerHTML="";document.getElementById("user").innerHTML="";const m=document.getElementById("mobileNav");if(m)m.innerHTML="";return}
 const play=[
  {page:"matches",action:"battle",icon:"◉",title:"Battle Tracker",description:"Record ranked or casual matches in seconds."},
  {page:"rank",icon:"↗",title:"Rank",description:"RP, season progress, and border intelligence."},
  {page:"matches",action:"gym",icon:"⚔",title:"Gym Battle",description:"Run your 5-player, 2-deck team battle."}
 ];
 const build=[
  {page:"decks",icon:"▣",title:"Decks",description:"Build, import, favorite, and analyze 20-card decks."},
  {page:"collection",icon:"◇",title:"Collection",description:"Track owned, wanted, tradeable, and missing cards."}
 ];
 const compete=[
  {page:"meta",icon:"◆",title:"Meta",description:"See the current competitive field and archetypes."},
  {page:"tournaments",icon:"♜",title:"Tournaments",description:"Placings, decks, event snapshots, and scouting."},
  {page:"matches",action:"pairing",icon:"⇆",title:"Pairing Lab",description:"Find complementary deck pairs for a target field."},
  {page:"teamwars",icon:"⚔",title:"Team Wars",description:"Teams, 5-player lineups, wars, and standings."}
 ];
 const improve=[
  {page:"stats",icon:"⌁",title:"Performance",description:"Review match trends, deck results, and matchup data."},
  {page:"stats",action:"coaching",icon:"✦",title:"Coaching",description:"Turn your recorded matches into practice priorities."},
  {page:"optimizer",icon:"◎",title:"Simulation Lab",description:"Test draws and deck consistency."},
  {page:"coach",icon:"✦",title:"Pocket Coach",description:"Ask grounded questions across your PocketNexus data."},
  {page:"training",icon:"?",title:"Brain Teasers",description:"Daily What’s This Card? and competitive training challenges."}
 ];
 const utilities=[
  {page:"trade",icon:"⇄",title:"Trade",description:"Trading tools and trade planning."},
  {page:"streamer",icon:"▤",title:"Streamer",description:"OBS overlays and stream controls."},
  {search:true,icon:"⌕",title:"Search",description:"Jump to any page, deck, card, or tool."},
  {page:"sync",icon:"↻",title:"Pocket Sync",description:"Prepare automatic Collection, Rank, and Battle History imports."},
  {page:"account",icon:"◉",title:"Account & Cloud",description:"Cloud sync, backups, profile, and security."},
  {page:"about",icon:"ⓘ",title:"About & Privacy",description:"Independent-project positioning and data policy."},
  {page:"more",icon:"⚙",title:"Settings",description:"Appearance, backups, diagnostics, and advanced tools."}
 ];
 n.innerHTML=`<div class="categorizedNav foundationNav"><button class="navHome navPrimaryBtn ${state.page==='dashboard'?'active':''}" onclick="headerNavigate('dashboard')" aria-current="${state.page==='dashboard'?'page':'false'}">Home</button>${navCategoryHtml('Play',play)}${navCategoryHtml('Build',build)}${navCategoryHtml('Compete',compete)}${navCategoryHtml('Improve',improve)}</div>`;
 n.querySelectorAll('.navCategory').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)closeHeaderMenus(d);const sm=d.querySelector(':scope>summary');if(sm)sm.setAttribute('aria-expanded',d.open?'true':'false')}));
 const userRoot=document.getElementById("user");
 userRoot.innerHTML=`<div class="headerUserActions"><button class="userChip" onclick="headerNavigate('profile')" title="Open Profiles"><span class="userChipAvatar">${esc(String(identity).trim().charAt(0).toUpperCase()||"P")}</span><span class="userChipText">Profiles</span></button>${utilityMenuHtml(utilities)}</div>`;
 userRoot.querySelectorAll('.navCategory').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)closeHeaderMenus(d);const sm=d.querySelector(':scope>summary');if(sm)sm.setAttribute('aria-expanded',d.open?'true':'false')}));
 const mobile=document.getElementById("mobileNav");
 if(mobile){
  const mobileItems=[
   {page:'dashboard',icon:'⌂',label:'Home'},
   {page:'matches',action:'battle',icon:'◉',label:'Play'},
   {page:'decks',icon:'▣',label:'Decks'},
   {page:'meta',icon:'◆',label:'Meta'}
  ];
  mobile.innerHTML=mobileItems.map(x=>{const active=navItemActive(x);return `<button class="${active?'active':''}" onclick="${navAction(x)}" aria-current="${active?'page':'false'}"><span>${x.icon}</span><small>${x.label}</small></button>`}).join('')+`<button class="${!mobileItems.some(navItemActive)?'active':''}" onclick="openMobileMoreSheet()" aria-label="Open more PocketNexus tools"><span>•••</span><small>More</small></button>`;
 }
}
if(!window.__ppcHeaderMenuHandlers){
 window.__ppcHeaderMenuHandlers=true;
 document.addEventListener('click',e=>{if(!e.target.closest?.('.navCategory'))closeHeaderMenus()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeHeaderMenus();closeMobileMoreSheet()}});
}

/* v8.76.0 navigation/header final polish — presentation and interaction hardening only. */
(function(){
 if(window.__PPC_NAV_HEADER_FINAL_8760)return;
 window.__PPC_NAV_HEADER_FINAL_8760=true;
 const VERSION='8.76.0';
 const originalNav=window.nav;
 const originalOpenSearch=window.openGlobalSearch;
 const signedIn=()=>!!(window.state?.user||window.cloudSession?.user);
 const editable=t=>!!t?.closest?.('input,textarea,select,[contenteditable="true"]');
 const closeSearch=()=>{try{window.closeGlobalSearch?.()}catch{}};
 function home(){if(signedIn()){try{headerNavigate('dashboard')}catch{try{goPage('dashboard')}catch{}};return}document.getElementById('staticEntry')?.scrollIntoView?.({block:'start',behavior:'smooth'});setTimeout(()=>document.getElementById('entryEmail')?.focus?.(),120)}
 function polish(){
  const header=document.querySelector('.appHeader');if(header)header.dataset.navVersion=VERSION;
  const brand=document.querySelector('.appBrand'),img=brand?.querySelector('.appBrandLogo');
  if(brand&&img){if(!brand.querySelector('.appBrandFallback'))img.insertAdjacentHTML('afterend','<span class="appBrandFallback" aria-hidden="true">PN</span>');if(!img.dataset.fallbackBound){img.dataset.fallbackBound='1';img.addEventListener('error',()=>brand.classList.add('logoFailed'),{once:true});img.addEventListener('load',()=>brand.classList.remove('logoFailed'))}brand.onclick=home;brand.setAttribute('aria-label','PocketNexus Home')}
  const sb=document.getElementById('globalSearchButton');if(sb){const txt=sb.querySelector('.globalSearchButtonText'),kbd=sb.querySelector('kbd');if(txt)txt.textContent='Search';if(kbd)kbd.textContent=/Mac|iPhone|iPad/i.test(navigator.platform||navigator.userAgent||'')?'⌘ K':'Ctrl K';sb.setAttribute('aria-label','Search PocketNexus');sb.setAttribute('title','Search PocketNexus')}
  const user=document.getElementById('user');if(user&&!signedIn()&&!user.querySelector('.headerSignIn')){user.innerHTML='<button class="headerSignIn" type="button" aria-label="Sign in to PocketNexus">Sign In</button>';user.querySelector('.headerSignIn').addEventListener('click',home)}
  const chip=document.querySelector('.userChip');if(chip){chip.setAttribute('aria-label','Open public Profiles');chip.setAttribute('title','Profiles')}
  const cog=document.querySelector('.headerUtilityButton');if(cog){cog.setAttribute('aria-label','Open Settings and account tools');cog.setAttribute('title','Settings and account tools')}
  const menu=document.querySelector('.headerUtilityDropdown');if(menu&&menu.dataset.grouped8760!=='1'){
   const buttons=[...menu.querySelectorAll(':scope>.navCategoryItem')],map=new Map(buttons.map(b=>[b.querySelector('strong')?.textContent?.trim()||'',b])),groups=[['ACCOUNT',['Account & Cloud']],['TOOLS',['Pocket Sync','Search','Trade','Streamer']],['APPLICATION',['Settings']],['INFORMATION',['About & Privacy']]],used=new Set,frag=document.createDocumentFragment();
   groups.forEach(([label,titles])=>{const matches=titles.map(t=>map.get(t)).filter(Boolean);if(!matches.length)return;const h=document.createElement('div');h.className='headerUtilityGroupLabel';h.textContent=label;h.setAttribute('role','presentation');frag.appendChild(h);matches.forEach(b=>{used.add(b);frag.appendChild(b)})});buttons.filter(b=>!used.has(b)).forEach(b=>frag.appendChild(b));menu.replaceChildren(frag);menu.dataset.grouped8760='1';
  }
  document.querySelectorAll('.navPrimaryBtn,.mobileBottomNav button').forEach(b=>{if(b.classList.contains('active'))b.setAttribute('aria-current','page');else if(b.getAttribute('aria-current')==='page')b.removeAttribute('aria-current')});
  document.querySelectorAll('.navCategory').forEach(d=>{const s=d.querySelector(':scope>summary');if(s)s.setAttribute('aria-expanded',d.open?'true':'false');if(!d.dataset.safety8760){d.dataset.safety8760='1';d.addEventListener('toggle',()=>{const sm=d.querySelector(':scope>summary');sm?.setAttribute('aria-expanded',d.open?'true':'false');if(d.open){closeSearch();closeHeaderMenus(d)}})}});
 }
 window.nav=function(){const out=originalNav.apply(this,arguments);polish();return out};
 if(typeof originalOpenSearch==='function')window.openGlobalSearch=function(prefill=''){closeHeaderMenus();const out=originalOpenSearch.call(this,prefill);setTimeout(()=>{const input=document.getElementById('globalSearchInput');if(input){input.placeholder='Search';input.setAttribute('aria-label','Search PocketNexus')}document.getElementById('globalSearchResults')?.setAttribute('aria-live','polite')},0);return out};
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&String(e.key).toLowerCase()==='k'&&!e.altKey&&!editable(e.target)){e.preventDefault();closeHeaderMenus();try{window.openGlobalSearch?.()}catch{};setTimeout(()=>document.getElementById('globalSearchInput')?.focus?.(),0);return}if(e.key==='Escape'){closeHeaderMenus();try{closeMobileMoreSheet()}catch{};if(document.getElementById('globalSearchInput'))closeSearch()}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',polish,{once:true});else polish();
})();
