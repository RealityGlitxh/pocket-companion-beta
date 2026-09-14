/* PocketNexus V8.78.1 — manual Tournament Player Follow fallback.
   Keeps the Tournament Player Source and every OBS transport on the same fetched event. */
(function(){
'use strict';
if(window.PPCStreamerManualPlayerFollow)return;
let timer=null,busy=false,observer=null;
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const norm=s=>String(s??'').trim().toLocaleLowerCase();
function cfg(){state.streamer=state.streamer||{};state.streamer.limitlessLive=state.streamer.limitlessLive||{};return state.streamer.limitlessLive}
function mode(){return state?.streamer?.overlayMode||'ranked'}
function objectName(o){if(!o||typeof o!=='object')return '';return String(o.name??o.username??o.displayName??o.playerName??o.handle??'').trim()}
function objectId(o){if(!o||typeof o!=='object')return '';const nested=o.player&&typeof o.player==='object'?o.player:null;return String(o.playerId??o.id??o.userId??nested?.id??nested?.playerId??'').trim()}
function textValue(v,fallback=''){
 if(typeof v==='string')return v.trim()||fallback;
 if(v===null||v===undefined)return fallback;
 if(typeof v==='object'){
  const x=v.name??v.title??v.label??v.archetype??v.text??v.value;
  if(x!==undefined&&x!==null&&x!==v)return String(x).trim()||fallback;
  const wins=Number(v.wins??v.w),losses=Number(v.losses??v.l),ties=Number(v.ties??v.draws??v.t??0);
  if(Number.isFinite(wins)&&Number.isFinite(losses))return `${wins}-${losses}${Number.isFinite(ties)&&ties>0?`-${ties}`:''}`;
  return fallback;
 }
 return String(v).trim()||fallback;
}
function tournamentName(source,match){return textValue(source?.details?.name??source?.details?.title??source?.name??match?.tournamentName,'Limitless Tournament')}
function tournamentStage(source,match){return textValue(source?.details?.stage??source?.details?.currentStage??source?.details?.phase??source?.details?.currentPhase??match?.stage,'Tournament')}
function findNamedObject(root,wanted,seen=new Set()){
 if(!root||typeof root!=='object'||seen.has(root))return null;seen.add(root);
 if(norm(objectName(root))===wanted)return root;
 if(Array.isArray(root)){for(const v of root){const hit=findNamedObject(v,wanted,seen);if(hit)return hit}return null}
 for(const v of Object.values(root)){const hit=findNamedObject(v,wanted,seen);if(hit)return hit}return null;
}
function rawContainsExactName(root,wanted,seen=new Set()){
 if(root===null||root===undefined)return false;
 if(typeof root==='string')return norm(root)===wanted;
 if(typeof root!=='object'||seen.has(root))return false;seen.add(root);
 if(norm(objectName(root))===wanted)return true;
 for(const v of Object.values(root))if(rawContainsExactName(v,wanted,seen))return true;
 return false;
}
function pairingForName(data,name){
 const wanted=norm(name);if(!wanted)return null;
 const matches=(data?.pairings||[]).filter(p=>{
   if(norm(p?.playerA?.name)===wanted||norm(p?.playerB?.name)===wanted)return true;
   return rawContainsExactName(p?.raw,wanted);
 });
 if(!matches.length)return null;
 return matches.slice().sort((a,b)=>{const an=Number(a.round),bn=Number(b.round);if(Number.isFinite(an)&&Number.isFinite(bn))return bn-an;return String(b.round??'').localeCompare(String(a.round??''),undefined,{numeric:true})})[0];
}
function playerFromData(data,name,pair){
 const wanted=norm(name);
 const known=(data?.players||[]).find(p=>norm(p?.name)===wanted);if(known)return known;
 const side=[pair?.playerA,pair?.playerB].find(p=>norm(p?.name)===wanted);if(side)return side;
 const raw=findNamedObject(pair?.raw,wanted);if(raw)return {id:objectId(raw),name:objectName(raw)||name,raw};
 return {id:'',name:String(name).trim()};
}
function orient(match,pair,me,name){
 if(!match)return null;const wanted=norm(name),id=String(me?.id||'');
 if(id&&String(match.playerB?.id)===id)return {...match,playerA:match.playerB,playerB:match.playerA};
 if(norm(match.playerB?.name)===wanted)return {...match,playerA:match.playerB,playerB:match.playerA};
 if(norm(match.playerA?.name)===wanted)return match;
 const rawA=pair?.playerA?.raw||pair?.playerA,rawB=pair?.playerB?.raw||pair?.playerB;
 if(rawContainsExactName(rawB,wanted)&&!rawContainsExactName(rawA,wanted))return {...match,playerA:{...match.playerB,name:me.name},playerB:match.playerA};
 return {...match,playerA:{...match.playerA,name:me.name}};
}
function publish(match,name,sourceData){
 if(!match)return;const s=state.streamer,c=cfg();
 const me=match.playerA||{},opp=match.playerB||{};
 c.followPlayerName=textValue(me.name,name);c.followPlayerId=me.id||c.followPlayerId||'';c.round=match.round;c.table=match.table;c.followTable='';
 // The newly fetched tournament is authoritative. Never carry the previous event into OBS.
 s.tournamentName=tournamentName(sourceData,match);
 s.tournamentRound=`Round ${match.round??''}`.trim();
 s.tournamentRecord=textValue(me.record,'—');
 s.tournamentStage=tournamentStage(sourceData,match);
 s.tournamentPlayerName=textValue(me.name,name);
 s.tournamentOpponentName=textValue(opp.name,'');
 s.controlOpponent=textValue(opp.decklist?.archetype??opp.deck??opp.name,'');
 s.tournamentPublicDeck=me.decklist||null;
 s.liveTable={...match,tournamentName:s.tournamentName,publicOnly:true,source:'Limitless public API',syncedAt:Date.now()};
 try{save()}catch{}
 try{PPCStreamerOBS2?.publishAll?.()}catch{}
 try{publishStreamerOverlayState?.()}catch{}
 try{PPCStreamerOBSRemote?.publish?.(true)}catch{}
 try{PPCStreamerOBS2?.refreshPreview?.('tournament')}catch{}
}
function status(text,bad=false){let el=document.getElementById('pnManualPlayerStatus');if(!el)return;el.textContent=text;el.className='pnLiveStatus '+(bad?'bad':'good')}
async function follow(force=true,quiet=false){
 if(busy)return;const name=(document.getElementById('pnManualPlayerName')?.value||cfg().manualPlayerName||cfg().followPlayerName||'').trim();
 const input=(document.getElementById('pnLiveTournament')?.value||cfg().tournament||'').trim();
 if(!input){if(!quiet)status('Load or enter a Limitless tournament first.',true);return}
 if(!name){if(!quiet)status('Type the exact player name or Limitless username.',true);return}
 busy=true;if(!quiet)status(`Finding ${name} in public tournament pairings…`);
 try{
   const data=await PPCLimitlessLiveTable.fetchTournament(input,{force});cfg().tournament=input;cfg().manualPlayerName=name;
   const pair=pairingForName(data,name);
   if(!pair){status(`Player "${name}" was not found in the public pairings for this tournament. Check the spelling and try again.`,true);return}
   let match=PPCLimitlessLiveTable.resolveTable(data,pair.round,pair.table);
   if(!match){status(`Found ${name}, but the current public pairing could not be resolved.`,true);return}
   const me=playerFromData(data,name,pair);match=orient(match,pair,me,name);publish(match,name,data);
   status(`Following ${match.playerA?.name||name} • Round ${match.round??'—'}${match.table!==null&&match.table!==undefined?` • Table ${match.table}`:''}`);
 }catch(e){if(!quiet)status(e?.name==='AbortError'?'Limitless took too long to respond. Try again.':(e?.message||'Could not follow that player.'),true)}finally{busy=false}
}
function patch(){
 if(state?.page!=='streamer'||mode()!=='tournament')return;
 const select=document.getElementById('pnLivePlayerSelect');if(!select)return;
 const field=select.closest('.pnLiveField');if(!field||field.dataset.manualFollow==='true')return;
 field.dataset.manualFollow='true';const c=cfg();
 field.innerHTML=`<label>Player to Follow</label><div class="row" style="gap:8px"><input id="pnManualPlayerName" list="pnManualPlayerSuggestions" value="${esc(c.manualPlayerName||c.followPlayerName||'')}" placeholder="Type exact player name / username" autocomplete="off"><button type="button" onclick="PPCStreamerManualPlayerFollow.follow()">Follow Player</button></div><datalist id="pnManualPlayerSuggestions">${[...select.options].filter(o=>o.value).map(o=>`<option value="${esc(o.textContent?.split(' • ')[0]||'')}"></option>`).join('')}</datalist><small>Works even when the player dropdown is unavailable. Use the exact name shown on Limitless.</small><div id="pnManualPlayerStatus" class="pnLiveStatus">${c.manualPlayerName?`Ready to follow ${esc(c.manualPlayerName)}.`:'Type a player name, then press Follow Player.'}</div>`;
 const input=field.querySelector('#pnManualPlayerName');input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();follow()}});
}
function schedule(){clearTimeout(timer);if(state?.page!=='streamer'||mode()!=='tournament'||cfg().autoRefresh===false||!cfg().manualPlayerName)return;timer=setTimeout(async()=>{await follow(true,true);schedule()},Math.max(15,Number(cfg().refreshSeconds||25))*1000)}
function watch(){observer?.disconnect();observer=new MutationObserver(()=>{patch();schedule()});observer.observe(document.documentElement,{childList:true,subtree:true});patch();schedule()}
requestAnimationFrame(()=>requestAnimationFrame(watch));
window.PPCStreamerManualPlayerFollow={version:'8.78.1',follow,patch,schedule,pairingForName,_test:{textValue,tournamentName,tournamentStage}};
})();
