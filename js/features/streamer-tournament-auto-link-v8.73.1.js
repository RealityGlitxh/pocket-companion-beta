/* PocketNexus V8.73.1 — Automatic Tournament Overlay from one Limitless link.
   Reuses the existing public Limitless service, Streamer state, OBS publisher and cloud-synced preferences. */
(function(){
'use strict';
if(window.PPCStreamerTournamentAutoLink)return;
const VERSION='8.73.1';
let data=null,busy=false,observer=null,clock=null;
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const norm=s=>String(s??'').trim().toLocaleLowerCase();
const safe=(fn,f=null)=>{try{return fn()}catch{return f}};
function streamer(){state.streamer=state.streamer||{};return state.streamer}
function cfg(){const s=streamer();s.limitlessLive=s.limitlessLive||{};s.limitlessLive.playerByTournament=s.limitlessLive.playerByTournament||{};return s.limitlessLive}
function conn(){const s=streamer();s.tournamentConnection=s.tournamentConnection||{};return s.tournamentConnection}
function mode(){return safe(()=>state.streamer.overlayMode,'ranked')||'ranked'}
function tid(input){return window.PPCLimitlessLiveTable?.tournamentId?.(input)||''}
function validInput(input){
 const raw=String(input||'').trim();if(!raw)return {ok:false,error:'Paste a Limitless tournament link first.'};
 if(!/^https?:\/\//i.test(raw))return /^[a-zA-Z0-9_-]+$/.test(raw)?{ok:true,id:tid(raw),input:raw}:{ok:false,error:'Enter a Limitless tournament link or tournament ID.'};
 try{const u=new URL(raw);if(u.hostname!=='play.limitlesstcg.com')return {ok:false,error:'Use a play.limitlesstcg.com tournament link.'};if(!/\/tournaments?\//i.test(u.pathname))return {ok:false,error:'This does not look like a Limitless tournament link.'};const id=tid(raw);return id?{ok:true,id,input:raw}:{ok:false,error:'Could not find the tournament ID in this link.'}}catch{return {ok:false,error:'Check the Limitless link and try again.'}}
}
function parseRecord(raw){
 if(raw&&typeof raw==='object'){
  const wins=Number(raw.wins??raw.w??raw.win??NaN),losses=Number(raw.losses??raw.l??raw.loss??NaN),ties=Number(raw.ties??raw.draws??raw.t??raw.d??0);
  if(Number.isFinite(wins)&&Number.isFinite(losses))return {wins,losses,ties:Number.isFinite(ties)?ties:0,text:`${wins}-${losses}${ties>0?`-${ties}`:''}`};
 }
 const text=String(raw??'').trim();const m=text.match(/(?:^|\s)(\d+)\s*[-–]\s*(\d+)(?:\s*[-–]\s*(\d+))?/);if(!m)return {wins:null,losses:null,ties:null,text};
 const wins=Number(m[1]),losses=Number(m[2]),ties=Number(m[3]||0);return {wins,losses,ties,text:`${wins}-${losses}${ties>0?`-${ties}`:''}`};
}
function formatRecord(raw){return parseRecord(raw).text||'—'}
function statusText(details){return String(details?.status??details?.stage??details?.phase??details?.currentStage??details?.currentPhase??'').trim()}
function inferStage(details,round){
 const x=norm(statusText(details));
 if(/complete|finished|ended|concluded/.test(x))return 'Completed';
 if(/registration|register|upcoming|scheduled|not.?started/.test(x))return 'Registration';
 if(/semi|top\s*4/.test(x))return 'Top 4';
 if(/quarter|top\s*8/.test(x))return 'Top 8';
 if(/final/.test(x))return 'Finals';
 if(/top.?cut|playoff|elimination/.test(x))return 'Top Cut';
 if(/swiss|round/.test(x)||String(round??'').trim())return 'Swiss';
 return 'Registration';
}
function formatRound(round,stage=''){
 const r=String(round??'').trim();if(!r)return stage==='Registration'?'Not started':'—';
 if(/final/i.test(r))return /semi/i.test(r)?'Semifinals':/quarter/i.test(r)?'Quarterfinals':'Finals';
 if(/top\s*8/i.test(r))return 'Top 8';if(/top\s*4/i.test(r))return 'Top 4';if(/^round\s+/i.test(r))return r.replace(/^round\s+/i,'Round ');
 return /^\d+$/.test(r)?`Round ${r}`:r;
}
function latestRound(d){const rs=window.PPCLimitlessLiveTable?.rounds?.(d)||[];return rs.at(-1)??''}
function playerById(pid){return (data?.players||[]).find(p=>String(p?.id)===String(pid))||null}
function latestPairing(pid){
 const pairs=(data?.pairings||[]).filter(p=>String(p?.playerAId)===String(pid)||String(p?.playerBId)===String(pid));
 return pairs.sort((a,b)=>{const an=Number(a.round),bn=Number(b.round);return Number.isFinite(an)&&Number.isFinite(bn)?bn-an:String(b.round??'').localeCompare(String(a.round??''),undefined,{numeric:true})})[0]||null;
}
function displayCandidates(){
 const raw=[safe(()=>cloudProfile?.display_name,''),safe(()=>state?.user,'')].map(v=>String(v||'').trim()).filter(v=>v&&!v.includes('@')&&v!=='Guest'&&v!=='Account');return [...new Set(raw.map(norm))];
}
function autoPlayer(){const names=displayCandidates();if(!names.length)return null;return (data?.players||[]).find(p=>names.includes(norm(p?.name)))||null}
function catalogMatch(rows,id,input){
 const wanted=norm(id),url=norm(input);return (rows||[]).find(r=>{
   const ids=[r?.source_id,r?.source_tournament_id,r?.limitless_id,r?.external_id,r?.id].map(norm).filter(Boolean);
   const urls=[r?.source_url,r?.url,r?.tournament_url,r?.limitless_url].map(norm).filter(Boolean);
   return ids.includes(wanted)||urls.some(v=>v===url||v.includes(`/tournament/${wanted}`)||v.includes(`/tournaments/${wanted}`));
 })||null;
}
async function existingTournament(id,input){
 try{if(!window.PPCTournamentService)return null;let rows=window.PPCTournamentService.getCatalog?.()||[];let hit=catalogMatch(rows,id,input);if(hit)return hit;rows=await window.PPCTournamentService.loadCatalog?.({search:id,limit:20},{force:false})||[];return catalogMatch(rows,id,input)}catch{return null}
}
function eventName(d,existing,id){return String(d?.details?.name??d?.details?.title??existing?.name??existing?.title??id??'Limitless Tournament').trim()}
function updateConnection(existing=null){
 const s=streamer(),c=cfg(),k=conn(),id=data?.id||tid(c.tournament||k.url||k.tournamentId),p=playerById(c.followPlayerId)||null,pair=p?latestPairing(p.id):null;
 const rawRound=pair?.round??latestRound(data),stage=inferStage(data?.details,rawRound),record=formatRecord(p?.record??s.tournamentRecord),recordParts=parseRecord(record);
 s.tournamentName=eventName(data,existing,id);s.tournamentRound=formatRound(rawRound,stage);s.tournamentStage=stage;if(p&&record!=='—')s.tournamentRecord=record;
 Object.assign(k,{connected:true,tournamentId:id,url:c.tournament||k.url||'',tournamentName:s.tournamentName,playerId:p?.id||c.followPlayerId||'',playerName:p?.name||c.followPlayerName||'',round:s.tournamentRound,wins:recordParts.wins,losses:recordParts.losses,ties:recordParts.ties??0,record:s.tournamentRecord||'—',stage,status:statusText(data?.details)||stage,lastUpdated:Date.now()});
 if(p?.id){c.followPlayerId=p.id;c.followPlayerName=p.name;c.playerByTournament[id]={playerId:p.id,playerName:p.name}}
 safe(()=>save());safe(()=>window.PPCStreamerOBS2?.publishAll?.());safe(()=>window.publishStreamerOverlayState?.());return k;
}
function setupForm(){
 const root=document.getElementById('app');if(!root||mode()!=='tournament')return null;
 const forms=[...root.querySelectorAll('.form3')];return forms.find(f=>{const labels=[...f.querySelectorAll('label')].map(x=>x.textContent.trim());return labels.includes('Event')&&labels.includes('Round')&&labels.some(x=>x.includes('Record'))})||null;
}
function ageText(at){if(!at)return '';const sec=Math.max(0,Math.floor((Date.now()-Number(at))/1000));if(sec<60)return 'Updated just now';const min=Math.floor(sec/60);if(min<60)return `Updated ${min} min ago`;const hr=Math.floor(min/60);return `Updated ${hr} hr${hr===1?'':'s'} ago`}
function playerOptions(){return (data?.players||[]).slice().sort((a,b)=>String(a?.name||'').localeCompare(String(b?.name||''),undefined,{sensitivity:'base'})).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}${p.record?` • ${esc(formatRecord(p.record))}`:''}</option>`).join('')}
function renderSetup(){
 if(mode()!=='tournament')return;const old=setupForm(),existing=document.querySelector('[data-pn-tournament-auto-setup]');if(!old&&!existing)return;
 const k=conn(),c=cfg(),connected=!!k.connected,s=streamer();
 const renderKey=[connected?'1':'0',k.tournamentId||'',k.playerId||'',s.tournamentName||k.tournamentName||'',s.tournamentRound||k.round||'',s.tournamentRecord||k.record||'',s.tournamentStage||k.stage||'',c.tournament||''].join('|');
 if(!old&&existing?.dataset?.pnKey===renderKey){hideDuplicateControls();return}
 const html=!connected?`<div class="pnTournamentAutoSetup" data-pn-tournament-auto-setup data-pn-key="${esc(renderKey)}"><div class="pnTournamentLinkRow"><div><label>Tournament Link</label><input id="pnTournamentAutoUrl" value="${esc(c.tournament||'')}" placeholder="Paste Limitless tournament link" autocomplete="off" inputmode="url"></div><button type="button" id="pnTournamentAutoLoad" onclick="PPCStreamerTournamentAutoLink.load()">Load Tournament</button></div><div id="pnTournamentAutoStatus" class="pnTournamentAutoStatus">Paste the tournament link once. PocketNexus will keep the overlay updated.</div></div>`:
 `<div class="pnTournamentAutoSetup connected" data-pn-tournament-auto-setup data-pn-key="${esc(renderKey)}"><div class="pnTournamentConnected"><strong>✓ Tournament connected</strong><span id="pnTournamentAge">${esc(ageText(k.lastUpdated))}</span></div><div class="pnTournamentSummary"><div><label>Event</label><div class="pnTournamentValue">${esc(s.tournamentName||k.tournamentName||'—')}</div></div><div><label>Round</label><div class="pnTournamentValue">${esc(s.tournamentRound||k.round||'—')}</div></div><div><label>Record</label><div class="pnTournamentValue">${esc(s.tournamentRecord||k.record||'—')}</div></div><div><label>Stage</label><div class="pnTournamentValue">${esc(s.tournamentStage||k.stage||'—')}</div></div></div>${!k.playerId?`<div class="pnTournamentPlayer"><label>Your Player</label><select id="pnTournamentAutoPlayer" onchange="PPCStreamerTournamentAutoLink.selectPlayer(this.value)"><option value="">Select your tournament name</option>${playerOptions()}</select><small>Tournament found. Select your player to finish setup.</small></div>`:''}<div class="pnTournamentActions"><button type="button" onclick="PPCStreamerTournamentAutoLink.refresh()">Refresh</button><button type="button" class="secondary" onclick="PPCStreamerTournamentAutoLink.changeTournament()">Change Tournament</button></div><div id="pnTournamentAutoStatus" class="pnTournamentAutoStatus">${k.playerId?'Round, record and stage update automatically.':'Select your player once; PocketNexus will remember it for this tournament.'}</div></div>`;
 if(old)old.outerHTML=html;else if(existing)existing.outerHTML=html;hideDuplicateControls();
}
function hideDuplicateControls(){document.querySelectorAll('[data-limitless-live] .pnLiveGrid.playerMode').forEach(el=>el.style.display='none')}
function uiStatus(text,bad=false){const el=document.getElementById('pnTournamentAutoStatus');if(el){el.textContent=text;el.className='pnTournamentAutoStatus '+(bad?'bad':'good')}}
function setBusy(on,label='Connecting tournament…'){busy=on;const b=document.getElementById('pnTournamentAutoLoad');if(b){b.disabled=on;b.textContent=on?'Connecting…':'Load Tournament'}if(on)uiStatus(label)}
async function seedExistingPlayer(pid){
 try{await window.PPCStreamerLimitlessLiveTable?.load?.(false,true);if(pid)window.PPCStreamerLimitlessLiveTable?.playerChanged?.(pid)}catch{}
}
async function load(input=null,{force=false,quiet=false}={}){
 if(busy)return false;const raw=String(input??document.getElementById('pnTournamentAutoUrl')?.value??cfg().tournament??conn().url??'').trim(),v=validInput(raw);if(!v.ok){uiStatus(v.error,true);return false}
 setBusy(true,'Connecting tournament…');
 try{
  uiStatus('Finding event…');const existing=await existingTournament(v.id,raw);
  data=await window.PPCLimitlessLiveTable.fetchTournament(raw,{force});
  if(!data||(!data.details&&!(data.players||[]).length&&!(data.pairings||[]).length))throw new Error("Couldn't find this tournament. Check the Limitless link and try again.");
  const c=cfg();c.tournament=raw;const k=conn();Object.assign(k,{connected:true,tournamentId:v.id,url:raw,tournamentName:eventName(data,existing,v.id),lastUpdated:Date.now()});
  uiStatus('Finding player…');const remembered=c.playerByTournament?.[v.id];let p=remembered?.playerId?playerById(remembered.playerId):null;if(!p)p=autoPlayer();
  if(p){c.followPlayerId=p.id;c.followPlayerName=p.name;c.playerByTournament[v.id]={playerId:p.id,playerName:p.name}}else{c.followPlayerId='';c.followPlayerName=''}
  uiStatus('Loading current round…');updateConnection(existing);safe(()=>save());renderSetup();await seedExistingPlayer(p?.id||'');updateConnection(existing);renderSetup();
  if(!quiet)uiStatus(p?`Following ${p.name}. Tournament setup is automatic.`:'Tournament found. Select your player to finish setup.');return true;
 }catch(e){conn().connected=false;renderSetup();uiStatus(e?.name==='AbortError'?'Limitless took too long to respond. Try again.':(e?.message||'Could not load this tournament.'),true);return false}finally{setBusy(false)}
}
async function selectPlayer(pid){
 if(!pid)return;const p=playerById(pid);if(!p){uiStatus('That player is no longer in the current tournament data. Refresh and try again.',true);return}
 const c=cfg(),id=data?.id||conn().tournamentId;c.followPlayerId=p.id;c.followPlayerName=p.name;c.playerByTournament[id]={playerId:p.id,playerName:p.name};updateConnection();renderSetup();await seedExistingPlayer(p.id);updateConnection();renderSetup();uiStatus(`Following ${p.name}. Round, record and stage will update automatically.`)
}
async function refresh(){if(busy)return;uiStatus('Refreshing tournament…');const ok=await load(cfg().tournament||conn().url,{force:true,quiet:true});if(ok)uiStatus('Tournament updated.')}
function changeTournament(){
 const s=streamer(),c=cfg();s.tournamentConnection={};c.tournament='';c.followPlayerId='';c.followPlayerName='';c.round='';c.table='';s.tournamentName='';s.tournamentRound='';s.tournamentRecord='';s.tournamentStage='';safe(()=>save());renderSetup();safe(()=>window.publishStreamerOverlayState?.())
}
function style(){if(document.getElementById('pnTournamentAutoStyle'))return;const x=document.createElement('style');x.id='pnTournamentAutoStyle';x.textContent=`
.pnTournamentAutoSetup{margin-top:14px;padding:14px;border:1px solid rgba(130,170,255,.22);border-radius:14px;background:rgba(8,15,25,.38)}.pnTournamentLinkRow{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end}.pnTournamentLinkRow>div{display:grid;gap:6px}.pnTournamentAutoSetup label{display:block;font-size:12px;color:var(--muted,#9aa4b5);font-weight:700}.pnTournamentAutoStatus{margin-top:9px;font-size:12px;color:var(--muted,#9aa4b5)}.pnTournamentAutoStatus.good{color:#79d79b}.pnTournamentAutoStatus.bad{color:#ff9292}.pnTournamentConnected{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:12px}.pnTournamentConnected strong{color:#79d79b}.pnTournamentConnected span{font-size:12px;color:var(--muted,#9aa4b5)}.pnTournamentSummary{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px}.pnTournamentValue{min-height:42px;display:flex;align-items:center;margin-top:6px;padding:9px 11px;border:1px solid rgba(130,170,255,.22);border-radius:10px;background:rgba(4,10,18,.44);overflow-wrap:anywhere}.pnTournamentPlayer{display:grid;gap:6px;margin-top:12px;max-width:460px}.pnTournamentPlayer small{color:var(--muted,#9aa4b5)}.pnTournamentActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}@media(max-width:760px){.pnTournamentSummary{grid-template-columns:1fr 1fr}.pnTournamentLinkRow{grid-template-columns:1fr}.pnTournamentLinkRow button{width:100%}}@media(max-width:480px){.pnTournamentSummary{grid-template-columns:1fr}.pnTournamentConnected{align-items:flex-start;flex-direction:column}}
`;document.head.appendChild(x)}
function patchOverlayState(){
 if(typeof window.buildStreamerOverlayState!=='function'||window.buildStreamerOverlayState.__tournamentAuto)return;const base=window.buildStreamerOverlayState;
 window.buildStreamerOverlayState=function(){const out=base.apply(this,arguments),k=conn(),r=parseRecord(streamer().tournamentRecord||k.record);out.tournament={...(out.tournament||{}),id:k.tournamentId||'',tournamentId:k.tournamentId||'',name:streamer().tournamentName||k.tournamentName||out.tournament?.name||'Tournament',tournamentName:streamer().tournamentName||k.tournamentName||'',playerId:k.playerId||cfg().followPlayerId||'',playerName:k.playerName||cfg().followPlayerName||'',round:streamer().tournamentRound||k.round||'',wins:r.wins,losses:r.losses,ties:r.ties??0,record:streamer().tournamentRecord||k.record||'',stage:streamer().tournamentStage||k.stage||'',status:k.status||streamer().tournamentStage||'',lastUpdated:k.lastUpdated||Date.now()};return out};window.buildStreamerOverlayState.__tournamentAuto=true
}
function hookLive(){
 const api=window.PPCStreamerLimitlessLiveTable;if(!api||api.__tournamentAuto)return;api.__tournamentAuto=true;
 const baseLoad=api.load?.bind(api);if(baseLoad)api.load=async function(){const out=await baseLoad(...arguments);if(mode()==='tournament'&&conn().connected){try{data=await window.PPCLimitlessLiveTable.fetchTournament(cfg().tournament||conn().url,{force:false});updateConnection();renderSetup()}catch{}}return out};
}
function patch(){if(safe(()=>state.page,'')!=='streamer'||mode()!=='tournament')return;style();patchOverlayState();hookLive();renderSetup();hideDuplicateControls();if(conn().connected&&!data&&!busy)load(cfg().tournament||conn().url,{force:false,quiet:true})}
function watch(){observer?.disconnect();observer=new MutationObserver(()=>patch());observer.observe(document.documentElement,{childList:true,subtree:true});patch();clearInterval(clock);clock=setInterval(()=>{const el=document.getElementById('pnTournamentAge');if(el)el.textContent=ageText(conn().lastUpdated)},15000)}
requestAnimationFrame(()=>requestAnimationFrame(watch));
window.PPCStreamerTournamentAutoLink={version:VERSION,load,refresh,selectPlayer,changeTournament,patch,_test:{validInput,parseRecord,formatRecord,inferStage,formatRound}};
})();