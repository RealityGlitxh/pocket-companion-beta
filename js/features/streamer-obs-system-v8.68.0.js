/* PocketNexus V8.68.0 — Streamer OBS System 2.0
   Three independent broadcast products over the existing Streamer runtime. */
(function(){
'use strict';
if(window.PPCStreamerOBS2)return;
const MODES=['ranked','tournament','caster'];
const STORE_PREFIX='ppc_stream_overlay_v868_';
const CHANNEL_PREFIX='ppc-stream-v868-';
const LEGACY_KEYS=['preset','theme','opacity','fontScale','recentCount','showRank','showRecord','showWinRate','showStreak','showDeck','showSession','showRecent','showOpponent','showMatchup','showTimer','showSessionRP','sceneRotation','sceneSeconds','sceneIndex','persistentHud','scenes'];
const DEFAULTS={
 ranked:{preset:'full',theme:'dark',opacity:92,fontScale:100,recentCount:5,showRank:true,showRecord:true,showWinRate:true,showStreak:true,showDeck:true,showSession:true,showRecent:true,showOpponent:true,showMatchup:true,showTimer:true,showSessionRP:true,anchor:'bottom-center',scale:100,marginX:24,marginY:24,entrance:'fade',sceneRotation:false,sceneSeconds:10,sceneIndex:0,persistentHud:true,scenes:{}},
 tournament:{preset:'full',theme:'dark',opacity:94,fontScale:100,recentCount:5,showTournamentName:true,showStage:true,showRound:true,showRecord:true,showDeckA:true,showDeckB:true,showDeck:true,showOpponent:true,showScore:true,showJourney:true,anchor:'bottom-center',scale:100,marginX:24,marginY:24,entrance:'fade'},
 caster:{preset:'top',theme:'dark',opacity:96,fontScale:100,showTournamentName:true,showStage:true,showRound:true,showPlayerA:true,showPlayerB:true,showScores:true,showPlayerDecks:true,showTeams:true,showBestOf:true,showMatchup:true,anchor:'top-center',scale:100,marginX:24,marginY:24,entrance:'slide'}
};
const SOURCE={ranked:'overlay-ranked.html',tournament:'overlay-tournament.html',caster:'overlay-caster.html'};
const safe=(fn,f=null)=>{try{return fn()}catch{return f}};
function mode(){return safe(()=>state.streamer.overlayMode,'ranked')||'ranked'}
function ensure(){
 const s=state.streamer||(state.streamer={});s.overlays=s.overlays||{};
 for(const m of MODES)s.overlays[m]={...DEFAULTS[m],...(s.overlays[m]||{})};
 if(!s.__obs2Migrated){for(const k of LEGACY_KEYS)if(s[k]!==undefined)s.overlays.ranked[k]=s[k];s.__obs2Migrated=true;safe(()=>save())}
 return s.overlays;
}
function config(m=mode()){return ensure()[m]||ensure().ranked}
function syncLegacy(m=mode()){
 const s=state.streamer,c=config(m);for(const k of LEGACY_KEYS)if(c[k]!==undefined)s[k]=c[k];s.overlayMode=m;return c;
}
function sourceUrl(m=mode()){try{return new URL(SOURCE[m]||SOURCE.ranked,location.href).href}catch{return SOURCE[m]||SOURCE.ranked}}
function payloadFor(m){
 syncLegacy(m);const d=safe(()=>window.__ppcObs2BaseBuild?window.__ppcObs2BaseBuild():buildStreamerOverlayState(),{})||{};
 d.config={...(d.config||{}),...config(m),overlayMode:m};d.overlayProduct=m;d.version='8.68.0';return d;
}
function publishOne(m){
 const d=payloadFor(m);safe(()=>localStorage.setItem(STORE_PREFIX+m,JSON.stringify(d)));
 safe(()=>{const c=new BroadcastChannel(CHANNEL_PREFIX+m);c.postMessage({type:'state',data:d,at:Date.now()});c.close()});return d;
}
function publishAll(){const current=mode(),out={};for(const m of MODES)out[m]=publishOne(m);syncLegacy(current);safe(()=>window.__ppcObs2BasePublish?.());return out}
function set(key,value,m=mode()){
 const c=config(m);if(['opacity','fontScale','recentCount','scale','marginX','marginY','sceneSeconds','sceneIndex'].includes(key))value=Number(value);if(/^show|sceneRotation|persistentHud/.test(key))value=!!value;c[key]=value;syncLegacy(m);safe(()=>save());publishAll();refreshPreview(m);return value;
}
function reset(m=mode()){
 const label=m==='caster'?'Caster':m==='tournament'?'Tournament':'Ranked';
 const doReset=()=>{state.streamer.overlays[m]={...DEFAULTS[m],scenes:{}};syncLegacy(m);safe(()=>save());publishAll();safe(()=>streamerPage())};
 if(window.PPCUI?.open)return PPCUI.open({eyebrow:'OBS SETTINGS',title:`Reset ${label} Overlay?`,message:'Only this overlay’s visual settings will reset. Matches, RP, sessions, decks and tournament data stay untouched.',actions:[{label:'Cancel',className:'secondary',onclick:'PPCUI.close()'},{label:'Reset Overlay',className:'danger',onclick:`PPCUI.close();PPCStreamerOBS2.confirmReset('${m}')`}]});
 if(confirm(`Reset ${label} overlay settings?`))doReset();
}
function confirmReset(m){state.streamer.overlays[m]={...DEFAULTS[m],scenes:{}};syncLegacy(m);safe(()=>save());publishAll();safe(()=>streamerPage())}
function copySource(m=mode()){
 const u=sourceUrl(m),label=m==='caster'?'Caster':m==='tournament'?'Tournament':'Ranked';
 const done=()=>safe(()=>ppcNotice(`✓ ${label} OBS Source Copied`));
 if(navigator.clipboard?.writeText)navigator.clipboard.writeText(u).then(done,()=>safe(()=>copyFallbackDialog(u,`${label} OBS source`)));else safe(()=>copyFallbackDialog(u,`${label} OBS source`));
}
function refreshPreview(m=mode()){const f=document.querySelector(`iframe[data-obs-mode="${m}"]`);if(f){const u=new URL(SOURCE[m],location.href);u.searchParams.set('embedded','1');u.searchParams.set('t',Date.now());f.src=u.href}}
function visibilityList(m){return m==='ranked'?[['showRank','Rank'],['showRecord','Record'],['showWinRate','Win Rate'],['showStreak','Streak'],['showDeck','Current Deck'],['showSession','Session'],['showTimer','Session Timer'],['showSessionRP','Session RP'],['showOpponent','Opponent'],['showMatchup','Matchup'],['showRecent','Recent Matches']]:m==='tournament'?[['showTournamentName','Tournament Name'],['showStage','Stage'],['showRound','Round'],['showRecord','Record'],['showDeckA','Deck A'],['showDeckB','Deck B'],['showDeck','Current Deck'],['showOpponent','Opponent'],['showScore','Match Score'],['showJourney','Tournament Journey']]:[['showTournamentName','Tournament Name'],['showStage','Stage'],['showRound','Round'],['showPlayerA','Player A'],['showPlayerB','Player B'],['showScores','Scores'],['showPlayerDecks','Player Decks'],['showTeams','Team Names'],['showBestOf','Best-of'],['showMatchup','Matchup']];}
function presetOptions(m){const a=m==='ranked'?[['full','Full'],['compact','Compact'],['minimal','Minimal'],['match','Match Focus']]:m==='tournament'?[['full','Full Event'],['match','Match'],['minimal','Minimal Event'],['deck','Deck Showcase']]:[['top','Top Bar'],['bottom','Bottom Bar'],['side','Side Panels'],['center','Center Matchup'],['minimal','Minimal Score']];return a.map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}
function editorHtml(m){const c=config(m),label=m==='caster'?'Tournament Caster':m==='tournament'?'Tournament Player':'Ranked';const vis=visibilityList(m).map(([k,n])=>`<label class="pnObsToggle"><input type="checkbox" ${c[k]!==false?'checked':''} onchange="PPCStreamerOBS2.set('${k}',this.checked,'${m}')"><span>${n}</span></label>`).join('');return `<section class="pnObsStudio" data-mode="${m}"><header class="pnObsStudioHead"><div><span class="pnObsEyebrow">${label.toUpperCase()} STREAM STUDIO</span><h2>${label} OBS Studio</h2><p>Configure this broadcast without leaving PocketNexus.</p></div><div class="pnObsActions"><button class="secondary" onclick="PPCStreamerOBS2.copySource('${m}')">Copy OBS Source</button><button class="secondary" onclick="window.open('${SOURCE[m]}','_blank')">Open Full Overlay</button><button class="secondary" onclick="PPCStreamerOBS2.refreshPreview('${m}')">Refresh Preview</button></div></header><div class="pnObsStatusRow"><span class="pnObsStatus active">Preview: Active</span><span class="pnObsStatus" id="pnObsExternalStatus">OBS Browser Source: Waiting</span><span class="pnObsCanvas">1920 × 1080</span></div><div class="pnObsStudioGrid"><div class="pnObsPreviewCard"><div class="pnObsViewport"><iframe data-obs-mode="${m}" title="${label} OBS preview" src="${SOURCE[m]}?embedded=1&v=868000"></iframe></div></div><aside class="pnObsSettings"><div class="pnObsField"><label>Layout</label><select onchange="PPCStreamerOBS2.set('preset',this.value,'${m}')">${presetOptions(m)}</select></div><div class="pnObsField"><label>Theme</label><select onchange="PPCStreamerOBS2.set('theme',this.value,'${m}')"><option value="dark">Dark</option><option value="light">Light</option><option value="transparent">Transparent</option><option value="blue">PocketNexus Blue</option></select></div>${m==='ranked'?`<div class="pnObsField"><label>Recent Matches</label><select onchange="PPCStreamerOBS2.set('recentCount',this.value,'${m}')">${[3,5,8,10].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></div>`:''}<h3>Visibility</h3><div class="pnObsToggleGrid">${vis}</div><details class="pnObsAdvanced"><summary>Advanced</summary><div class="pnObsAdvancedGrid"><label>Opacity <input type="range" min="10" max="100" value="${c.opacity||90}" oninput="PPCStreamerOBS2.set('opacity',this.value,'${m}')"></label><label>Scale <input type="range" min="70" max="150" value="${c.scale||100}" oninput="PPCStreamerOBS2.set('scale',this.value,'${m}')"></label><label>Anchor <select onchange="PPCStreamerOBS2.set('anchor',this.value,'${m}')">${['top-left','top-center','top-right','center-left','center','center-right','bottom-left','bottom-center','bottom-right'].map(x=>`<option value="${x}">${x.replaceAll('-',' ')}</option>`).join('')}</select></label><label>Entrance <select onchange="PPCStreamerOBS2.set('entrance',this.value,'${m}')"><option value="none">None</option><option value="fade">Fade</option><option value="slide">Slide</option><option value="scale">Scale</option></select></label></div></details><details class="pnObsSetup"><summary>OBS Setup</summary><ol><li>Copy Browser Source</li><li>OBS → Sources → Browser</li><li>Paste the URL</li><li>Set 1920 × 1080</li><li>Enable refresh when scene becomes active if desired</li></ol></details><button class="secondary dangerText" onclick="PPCStreamerOBS2.reset('${m}')">Reset ${label} Overlay</button></aside></div></section>`}
function apply(){
 if(safe(()=>state.page,'')!=='streamer')return;ensure();const app=document.getElementById('app');if(!app)return;const m=mode();
 app.querySelectorAll('.pnObsStudio').forEach(x=>x.remove());
 const legacyObs=[...app.querySelectorAll('[data-streamer-section="obs"],#streamPreview')];legacyObs.forEach(x=>{const p=x.id==='streamPreview'?x.closest('.panel'):x;if(p)p.style.display='none'});
 const settings=app.querySelector('[data-streamer-section="overlay-settings"]');if(settings)settings.style.display='none';
 const diag=app.querySelector('[data-streamer-section="diagnostics"]');const host=document.createElement('div');host.innerHTML=editorHtml(m);const studio=host.firstElementChild;(diag||app.lastElementChild)?.before(studio);
 const c=config(m);const selects=studio.querySelectorAll('select');selects.forEach(s=>{const lab=s.closest('.pnObsField,.pnObsAdvancedGrid label')?.textContent||'';if(/Layout/i.test(lab))s.value=c.preset;if(/Theme/i.test(lab))s.value=c.theme;if(/Recent/i.test(lab))s.value=String(c.recentCount);if(/Anchor/i.test(lab))s.value=c.anchor;if(/Entrance/i.test(lab))s.value=c.entrance});
 studio.querySelector('iframe')?.addEventListener('load',()=>publishAll());publishAll();
}
function install(){
 ensure();
 if(typeof window.buildStreamerOverlayState==='function'&&!window.__ppcObs2BaseBuild)window.__ppcObs2BaseBuild=window.buildStreamerOverlayState.bind(window);
 if(typeof window.publishStreamerOverlayState==='function'&&!window.__ppcObs2BasePublish){window.__ppcObs2BasePublish=window.publishStreamerOverlayState.bind(window);window.publishStreamerOverlayState=function(){return publishAll()[mode()]}}
 if(typeof window.streamerOverlayFileUrl==='function')window.streamerOverlayFileUrl=()=>sourceUrl(mode());
 if(typeof window.copyOverlayPath==='function')window.copyOverlayPath=()=>copySource(mode());
 if(typeof window.streamerMode==='function'&&!window.streamerMode.__obs2){const base=window.streamerMode;window.streamerMode=function(v){ensure();syncLegacy(v);const out=base.call(this,v);requestAnimationFrame(()=>requestAnimationFrame(apply));return out};window.streamerMode.__obs2=true}
 if(typeof window.streamerPage==='function'&&!window.streamerPage.__obs2){const base=window.streamerPage;window.streamerPage=function(){syncLegacy(mode());const out=base.apply(this,arguments);requestAnimationFrame(()=>requestAnimationFrame(apply));return out};window.streamerPage.__obs2=true}
 requestAnimationFrame(()=>requestAnimationFrame(apply));
}
let tries=0,t=setInterval(()=>{install();if(++tries>120)clearInterval(t)},50);window.PPCStreamerOBS2={version:'8.68.0',ensure,config,set,reset,confirmReset,sourceUrl,copySource,publishAll,refreshPreview,apply,install};
})();