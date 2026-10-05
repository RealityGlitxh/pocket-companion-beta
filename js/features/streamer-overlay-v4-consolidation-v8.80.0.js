/* PocketNexus V8.80.0 — canonical Streamer/Overlay v4 UI ownership */
(function(){
'use strict';
if(window.PPCStreamerOverlayV4Consolidation)return;
const MODES=['ranked','tournament','caster'];
const safe=(fn,f=null)=>{try{return fn()}catch{return f}};
function mode(){const m=safe(()=>state.streamer?.overlayMode,'ranked');return MODES.includes(m)?m:'ranked'}
function label(m=mode()){return m==='caster'?'Tournament Caster':m==='tournament'?'Tournament Player':'Ranked'}
function loadCss(){if(document.querySelector('link[data-overlay-v4-consolidation]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href='css/streamer-overlay-v4-consolidation-v8.80.0.css?v=880000';l.dataset.overlayV4Consolidation='1';document.head.appendChild(l)}
function removeDuplicates(app){
 const selectors=['[data-streamer-section="scene-rotation"]','[data-streamer-section="overlay-settings"]','[data-streamer-section="diagnostics"]','[data-streamer-section="obs"]','.pnScenePreset'];
 app.querySelectorAll(selectors.join(',')).forEach(el=>{if(el.closest('.pnObsStudio'))return;el.hidden=true;el.style.display='none';el.setAttribute('aria-hidden','true')});
 app.querySelectorAll('#streamPreview').forEach(el=>{el.hidden=true;el.style.display='none';el.setAttribute('aria-hidden','true')});
}
function setBool(key,checked){safe(()=>window.PPCStreamerOBS2?.set?.(key,!!checked,mode()));safe(()=>window.PPCStreamerOBSRemote?.publish?.(true))}
function test(){safe(()=>window.testStreamerOverlayUpdate?.());safe(()=>window.PPCStreamerOBSRemote?.publish?.(true));window.ppcNotice?.('Test overlay state sent. No match, RP, session, tournament record, or caster score was changed.')}
function studioExtras(studio,m){
 const settings=studio.querySelector('.pnObsSettings');if(!settings)return;
 studio.querySelector('.pnOverlayLiveLabel')?.remove();
 const card=studio.querySelector('.pnObsPreviewCard');
 if(card){const tag=document.createElement('div');tag.className='pnOverlayLiveLabel';tag.innerHTML='<span>LIVE PREVIEW</span><strong>1920 × 1080</strong>';card.prepend(tag)}
 if(settings.querySelector('.pnOverlayCanonical'))return;
 const cfg=safe(()=>window.PPCStreamerOBS2?.config?.(m),{})||{};
 const fields=[['showRank','Rank'],['showRecord','Record'],['showWinRate','Win Rate'],['showStreak','Streak'],['showDeck','Deck'],['showSession','Session'],['showTimer','Timer'],['showSessionRP','Session RP'],['showOpponent','Opponent'],['showMatchup','Matchup']];
 const box=document.createElement('div');box.className='pnOverlayCanonical';
 box.innerHTML='<h3>Visible Elements</h3><div class="pnOverlayToggleGrid">'+fields.map(([k,n])=>'<label class="pnOverlayToggle"><input type="checkbox" data-pn-overlay-toggle="'+k+'" '+(cfg[k]!==false?'checked':'')+'> '+n+'</label>').join('')+'</div><div class="pnOverlayActions"><button class="secondary" data-pn-test-overlay>Test Overlay</button><button class="secondary" data-pn-copy-overlay>Copy OBS URL</button></div><details class="pnOverlayAdvanced"><summary>Advanced</summary><div class="pnOverlayAdvancedBody"><label>Scene duration <select data-pn-scene-seconds>'+[10,30,60,120].map(n=>'<option value="'+n+'" '+(Number(cfg.sceneSeconds||120)===n?'selected':'')+'>'+n+' seconds</option>').join('')+'</select></label><label class="pnOverlayToggle"><input type="checkbox" data-pn-scene-rotation '+(safe(()=>state.streamer?.sceneRotation,false)?'checked':'')+'> Auto rotate overlay scenes</label><span class="muted tiny">Overlay v4 respects your browser reduced-motion preference automatically.</span></div></details>';
 settings.appendChild(box);
 box.querySelectorAll('[data-pn-overlay-toggle]').forEach(input=>input.addEventListener('change',()=>setBool(input.dataset.pnOverlayToggle,input.checked)));
 box.querySelector('[data-pn-test-overlay]')?.addEventListener('click',test);
 box.querySelector('[data-pn-copy-overlay]')?.addEventListener('click',()=>window.PPCStreamerOBSRemote?.copySource?.()||window.PPCStreamerOBS2?.copySource?.());
 box.querySelector('[data-pn-scene-seconds]')?.addEventListener('change',e=>{const n=Number(e.target.value);safe(()=>window.PPCStreamerScenePresets?.setTiming?.(n));safe(()=>window.PPCStreamerOBS2?.set?.('sceneSeconds',n,m))});
 box.querySelector('[data-pn-scene-rotation]')?.addEventListener('change',e=>safe(()=>window.PPCStreamerScenePresets?.setRotation?.(e.target.checked)));
}
function canonicalizeStudio(app){
 const m=mode(),studios=[...app.querySelectorAll('.pnObsStudio')];
 studios.forEach(s=>{if(s.dataset.mode!==m)s.remove()});
 const studio=app.querySelector('.pnObsStudio[data-mode="'+m+'"]');if(!studio)return false;
 studio.dataset.overlayOwner='v4';
 const eyebrow=studio.querySelector('.pnObsEyebrow');if(eyebrow)eyebrow.textContent='OVERLAY V4 • '+label(m).toUpperCase();
 const h=studio.querySelector('h2');if(h)h.textContent='Overlay Studio';
 const p=studio.querySelector('.pnObsStudioHead p');if(p)p.textContent='One preview, one settings source, and one OBS browser-source pipeline for this workspace.';
 const canvas=studio.querySelector('.pnObsCanvas');if(canvas)canvas.textContent='Output: 1920 × 1080';
 studioExtras(studio,m);
 return true;
}
let queued=false;
function apply(){
 if(safe(()=>state.page,'')!=='streamer')return;
 loadCss();const app=document.getElementById('app');if(!app)return;
 app.dataset.overlaySystem='v4';removeDuplicates(app);
 if(!canonicalizeStudio(app)){safe(()=>window.PPCStreamerOBS2?.apply?.());requestAnimationFrame(()=>{const a=document.getElementById('app');if(a){removeDuplicates(a);canonicalizeStudio(a)}})}
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;apply()}))}
function install(){
 loadCss();
 if(typeof window.streamerPage==='function'&&!window.streamerPage.__overlayV4Consolidated){const base=window.streamerPage;window.streamerPage=function(){const out=base.apply(this,arguments);schedule();return out};window.streamerPage.__overlayV4Consolidated=true}
 schedule();
}
let observer=null;
function observe(){if(observer)return;observer=new MutationObserver(()=>{if(safe(()=>state.page,'')==='streamer')schedule()});observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true})}
install();observe();
window.PPCStreamerOverlayV4Consolidation={version:'8.80.0',apply,install,test,setBool};
})();