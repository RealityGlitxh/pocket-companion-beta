/* PocketNexus V8.72.1 — mode-specific Streamer scene rotation presets.
   Keeps Ranked, Tournament and Caster scene choices/timing isolated while reusing existing OBS state. */
(function(){
'use strict';
if(window.PPCStreamerScenePresets)return;
const MODES=['ranked','tournament','caster'];
const SCENES=['hud','rank','rp','deck','decklist','qr','last','matchup','tournament'];
const DEFAULTS={
 ranked:{scenes:{hud:true,rank:true,rp:true,deck:true,decklist:true,qr:true,last:true,matchup:true,tournament:false},sceneSeconds:10,sceneRotation:false,sceneIndex:0},
 tournament:{scenes:{hud:true,rank:false,rp:false,deck:true,decklist:true,qr:true,last:true,matchup:true,tournament:true},sceneSeconds:15,sceneRotation:false,sceneIndex:0},
 caster:{scenes:{hud:true,rank:false,rp:false,deck:true,decklist:true,qr:false,last:false,matchup:true,tournament:true},sceneSeconds:15,sceneRotation:false,sceneIndex:0}
};
const clone=x=>JSON.parse(JSON.stringify(x));
function root(){state.streamer=state.streamer||{};return state.streamer}
function mode(){const m=root().overlayMode;return MODES.includes(m)?m:'ranked'}
function normalize(p,m){const d=clone(DEFAULTS[m]);p=p&&typeof p==='object'?p:{};return {scenes:{...d.scenes,...(p.scenes||{})},sceneSeconds:[5,10,15,30].includes(Number(p.sceneSeconds))?Number(p.sceneSeconds):d.sceneSeconds,sceneRotation:typeof p.sceneRotation==='boolean'?p.sceneRotation:d.sceneRotation,sceneIndex:Math.max(0,Number(p.sceneIndex)||0)}}
function ensure(){const s=root();if(!s.scenePresets||typeof s.scenePresets!=='object'){
  const legacy={scenes:{...(s.scenes||{})},sceneSeconds:Number(s.sceneSeconds)||10,sceneRotation:!!s.sceneRotation,sceneIndex:Number(s.sceneIndex)||0};
  s.scenePresets={ranked:normalize(legacy,'ranked'),tournament:normalize(null,'tournament'),caster:normalize(null,'caster')};
 }
 MODES.forEach(m=>s.scenePresets[m]=normalize(s.scenePresets[m],m));return s.scenePresets
}
function preset(m=mode()){return ensure()[MODES.includes(m)?m:'ranked']}
function syncLegacy(){const s=root(),p=preset();s.scenes={...p.scenes};s.sceneSeconds=p.sceneSeconds;s.sceneRotation=p.sceneRotation;s.sceneIndex=p.sceneIndex;return p}
function persist(){syncLegacy();try{save()}catch{}try{publishStreamerOverlayState()}catch{}try{window.PPCStreamerOBS2?.publishAll?.()}catch{}}
function setScene(k,v){if(!SCENES.includes(k))return;const p=preset();p.scenes[k]=!!v;persist();rerender()}
function setTiming(v){const n=Number(v);if(![5,10,15,30].includes(n))return;preset().sceneSeconds=n;persist();rerender()}
function setRotation(v){preset().sceneRotation=!!v;persist();rerender()}
function step(dir){const p=preset(),keys=SCENES.filter(k=>p.scenes[k]&&k!=='hud');if(!keys.length)return;p.sceneIndex=(p.sceneIndex+Number(dir||0)+keys.length)%keys.length;persist();try{renderStreamerPreview()}catch{}rerender()}
function reset(){const m=mode();ensure()[m]=clone(DEFAULTS[m]);persist();rerender();try{ppcNotice(`Restored ${m==='caster'?'Tournament Caster':m[0].toUpperCase()+m.slice(1)} scene defaults.`)}catch{}}
function rerender(){try{window.streamerPage?.()}catch{}}
function label(m=mode()){return m==='caster'?'Tournament Caster':m[0].toUpperCase()+m.slice(1)}
const LABELS={hud:'Persistent HUD',rank:'Rank / RP',rp:'RP Graph',deck:'Current Deck',decklist:'20-Card List',qr:'Deck QR',last:'Last Match',matchup:'Matchup',tournament:'Tournament / Caster'};
function allowed(k,m){if(m==='ranked')return k!=='tournament';if(m==='tournament')return !['rank','rp'].includes(k);return !['rank','rp'].includes(k)}
function render(){const m=mode(),p=preset(m);return `<section class="panel pnScenePreset" data-scene-preset="${m}"><div class="between"><div><span class="eyebrow">SCENE ROTATION</span><h3>${label(m)} Preset</h3><p class="muted">Scenes configured only for ${label(m)} mode. Other Streamer tabs are not changed.</p></div><button class="secondary" onclick="PPCStreamerScenePresets.reset()">Restore ${label(m)} Defaults</button></div><div class="pnToggleRow">${SCENES.map(k=>{const ok=allowed(k,m);return `<label title="${ok?'':'Available in another Streamer mode'}" style="${ok?'':'opacity:.45'}"><input type="checkbox" ${p.scenes[k]?'checked':''} ${ok?'':'disabled'} onchange="PPCStreamerScenePresets.setScene('${k}',this.checked)"> ${LABELS[k]}</label>`}).join('')}</div><div class="form3" style="margin-top:12px"><div><label>Seconds per scene</label><select onchange="PPCStreamerScenePresets.setTiming(this.value)">${[5,10,15,30].map(n=>`<option value="${n}" ${p.sceneSeconds===n?'selected':''}>${n}s</option>`).join('')}</select></div><div><label>Rotation</label><label><input type="checkbox" ${p.sceneRotation?'checked':''} onchange="PPCStreamerScenePresets.setRotation(this.checked)"> Auto rotate scenes</label></div><div><label>Manual scene</label><div class="row"><button class="secondary" onclick="PPCStreamerScenePresets.step(-1)">← Scene</button><button class="secondary" onclick="PPCStreamerScenePresets.step(1)">Scene →</button></div></div></div></section>`}
function mount(){if(state?.page!=='streamer')return;syncLegacy();const shell=document.querySelector('.pnStreamerShell');if(!shell)return;const old=shell.querySelector('[data-scene-preset]');if(old)old.remove();const obs=shell.querySelector('.pnObsCard,.pnObsStudio');if(obs)obs.insertAdjacentHTML('beforebegin',render());else shell.insertAdjacentHTML('beforeend',render())}
const oldMode=window.pnSRMode;window.pnSRMode=function(v){ensure();if(MODES.includes(v)){root().overlayMode=v;syncLegacy();try{save()}catch{}}if(typeof oldMode==='function')return oldMode(v);rerender()};
const oldPage=window.streamerPage;if(typeof oldPage==='function'&&!oldPage.__scenePresets){window.streamerPage=function(){syncLegacy();const out=oldPage.apply(this,arguments);requestAnimationFrame(()=>requestAnimationFrame(mount));return out};window.streamerPage.__scenePresets=true}
ensure();syncLegacy();requestAnimationFrame(()=>requestAnimationFrame(mount));
window.PPCStreamerScenePresets={version:'8.72.1',defaults:DEFAULTS,ensure,preset,syncLegacy,setScene,setTiming,setRotation,step,reset,render,mount};
})();