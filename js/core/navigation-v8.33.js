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
function mobileMoreSheetHtml(){
 const groups=[
  ['PLAY',[{page:'rank',icon:'↗',title:'Rank'},{action:'gym',icon:'⚔',title:'Gym Battle'}]],
  ['BUILD',[{page:'collection',icon:'◇',title:'Collection'}]],
  ['COMPETE',[{page:'tournaments',icon:'♜',title:'Tournaments'},{action:'pairing',icon:'⇆',title:'Pairing Lab'},{page:'teamwars',icon:'⚔',title:'Team Wars'}]],
  ['IMPROVE',[{page:'stats',icon:'⌁',title:'Performance'},{page:'stats',action:'coaching',icon:'✦',title:'Coaching'},{page:'optimizer',icon:'◎',title:'Simulation Lab'},{page:'coach',icon:'✦',title:'Pocket Coach'},{page:'training',icon:'?',title:'Brain Teasers'}]],
  ['SOCIAL',[{page:'profile',icon:'◉',title:'Profiles'}]],
  ['UTILITIES',[{page:'trade',icon:'⇄',title:'Trade'},{page:'streamer',icon:'▤',title:'Streamer'},{search:true,icon:'⌕',title:'Search Everything'},{page:'sync',icon:'↻',title:'Pocket Sync'},{page:'account',icon:'◉',title:'Account & Cloud'},{page:'about',icon:'ⓘ',title:'About & Privacy'},{page:'more',icon:'⚙',title:'Settings'}]]
 ];
 return `<div class="mobileMoreBackdrop" id="mobileMoreBackdrop"><section class="mobileMoreSheet" role="dialog" aria-modal="true" aria-labelledby="mobileMoreTitle"><div class="mobileMoreHandle" aria-hidden="true"></div><div class="between"><div><span class="eyebrow">POCKET COMPANION</span><h2 id="mobileMoreTitle">More</h2></div><button class="secondary" type="button" onclick="closeMobileMoreSheet()">Close</button></div>${groups.map(([label,items])=>`<div class="mobileMoreGroup"><h3>${label}</h3><div class="mobileMoreGrid">${items.map(x=>`<button type="button" class="mobileMoreItem ${navItemActive(x)?'active':''}" onclick="mobileMoreNavigate(${JSON.stringify(x).replace(/\"/g,'&quot;')})"><span>${x.icon}</span><strong>${esc(x.title)}</strong></button>`).join('')}</div></div>`).join('')}</section></div>`;
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
  {page:"coach",icon:"✦",title:"Pocket Coach",description:"Ask grounded questions across your Pocket Companion data."},
  {page:"training",icon:"?",title:"Brain Teasers",description:"Daily What’s This Card? and competitive training challenges."}
 ];
 const more=[
  {page:"profile",icon:"◉",title:"Profiles",description:"Public player stats, achievements, teams, and competitive identity."},
  {page:"trade",icon:"⇄",title:"Trade",description:"Trading tools and trade planning."},
  {page:"streamer",icon:"▤",title:"Streamer",description:"OBS overlays and stream controls."},
  {search:true,icon:"⌕",title:"Search Everything",description:"Jump to any page, deck, card, or tool."},
  {page:"sync",icon:"↻",title:"Pocket Sync",description:"Prepare automatic Collection, Rank, and Battle History imports."},
  {page:"account",icon:"◉",title:"Account & Cloud",description:"Cloud sync, backups, profile, and security."},
  {page:"about",icon:"ⓘ",title:"About & Privacy",description:"Independent-project positioning and data policy."},
  {page:"more",icon:"⚙",title:"Settings",description:"Appearance, backups, diagnostics, and advanced tools."}
 ];
 n.innerHTML=`<div class="categorizedNav foundationNav"><button class="navHome navPrimaryBtn ${state.page==='dashboard'?'active':''}" onclick="headerNavigate('dashboard')" aria-current="${state.page==='dashboard'?'page':'false'}">Home</button>${navCategoryHtml('Play',play)}${navCategoryHtml('Build',build)}${navCategoryHtml('Compete',compete)}${navCategoryHtml('Improve',improve)}${navCategoryHtml('More',more)}</div>`;
 n.querySelectorAll('.navCategory').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)closeHeaderMenus(d);const sm=d.querySelector(':scope>summary');if(sm)sm.setAttribute('aria-expanded',d.open?'true':'false')}));
 document.getElementById("user").innerHTML=`<button class="userChip" onclick="headerNavigate('account')" title="Open Account & Cloud"><span class="userChipAvatar">${esc(String(identity).trim().charAt(0).toUpperCase()||"P")}</span><span class="userChipText">${esc(identity)}</span></button>`;
 const mobile=document.getElementById("mobileNav");
 if(mobile){
  const mobileItems=[
   {page:'dashboard',icon:'⌂',label:'Home'},
   {page:'matches',action:'battle',icon:'◉',label:'Play'},
   {page:'decks',icon:'▣',label:'Decks'},
   {page:'meta',icon:'◆',label:'Meta'}
  ];
  mobile.innerHTML=mobileItems.map(x=>{const active=navItemActive(x);return `<button class="${active?'active':''}" onclick="${navAction(x)}" aria-current="${active?'page':'false'}"><span>${x.icon}</span><small>${x.label}</small></button>`}).join('')+`<button class="${!mobileItems.some(navItemActive)?'active':''}" onclick="openMobileMoreSheet()" aria-label="Open more Pocket Companion tools"><span>•••</span><small>More</small></button>`;
 }
}
if(!window.__ppcHeaderMenuHandlers){
 window.__ppcHeaderMenuHandlers=true;
 document.addEventListener('click',e=>{if(!e.target.closest?.('.navCategory'))closeHeaderMenus()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeHeaderMenus();closeMobileMoreSheet()}});
}
