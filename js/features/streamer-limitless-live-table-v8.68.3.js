/* PocketNexus V8.72.0 — Limitless Tournament Player + Caster Match Source
   Public data only. Tournament mode follows a player by name across rounds.
   Caster mode keeps explicit round/table selection. */
(function(){
'use strict';
if(window.PPCStreamerLimitlessLiveTable)return;
const safe=(fn,f=null)=>{try{return fn()}catch{return f}};
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
let data=null,timer=null,busy=false;

function s(){
  state.streamer=state.streamer||{};
  state.streamer.limitlessLive=state.streamer.limitlessLive||{};
  const x=state.streamer.limitlessLive;
  if(x.autoRefresh===undefined)x.autoRefresh=true;
  if(!x.refreshSeconds)x.refreshSeconds=25;
  return x;
}

function style(){
  if(document.getElementById('pnLimitlessLiveStyle'))return;
  const x=document.createElement('style');
  x.id='pnLimitlessLiveStyle';
  x.textContent=`
.pnLiveTable{margin:0 0 18px;padding:16px;border:1px solid rgba(130,170,255,.22);border-radius:16px;background:rgba(12,18,30,.72)}
.pnLiveTableHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.pnLiveTableHead h3{margin:3px 0}.pnLiveTableHead p{margin:0;color:var(--muted,#9aa4b5)}
.pnLiveEyebrow{font-size:11px;letter-spacing:.12em;font-weight:800;color:#8fb5ff}.pnLiveGrid{display:grid;grid-template-columns:minmax(240px,2fr) 1fr 1fr auto;gap:10px;align-items:end}.pnLiveGrid.playerMode{grid-template-columns:minmax(260px,2fr) minmax(220px,1fr) auto}.pnLiveField{display:grid;gap:6px}.pnLiveField label{font-size:12px;color:var(--muted,#9aa4b5);font-weight:700}.pnLiveField input,.pnLiveField select{width:100%}
.pnLiveMatch{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:stretch;margin-top:14px}.pnLivePlayer{padding:13px;border:1px solid rgba(255,255,255,.10);border-radius:13px;background:rgba(255,255,255,.035)}.pnLivePlayer small{display:block;color:var(--muted,#9aa4b5);margin-bottom:4px}.pnLivePlayer b{display:block;font-size:16px}.pnLivePlayer span{display:block;margin-top:5px;color:#b8c8e8;font-size:13px}.pnLiveDeckState{font-size:11px!important;opacity:.76}.pnLiveVs{display:grid;place-items:center;font-weight:900;color:var(--muted,#9aa4b5)}
.pnLiveActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.pnLiveStatus{font-size:12px;color:var(--muted,#9aa4b5);margin-top:9px}.pnLiveStatus.good{color:#79d79b}.pnLiveStatus.bad{color:#ff9292}.pnLiveAuto{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted,#9aa4b5);white-space:nowrap}.pnLiveAuto input{accent-color:#7ea7ff}.pnLiveMeta{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:11px;color:var(--muted,#9aa4b5)}
@media(max-width:820px){.pnLiveGrid,.pnLiveGrid.playerMode{grid-template-columns:1fr 1fr}.pnLiveGrid .wide{grid-column:1/-1}.pnLiveMatch{grid-template-columns:1fr}.pnLiveVs{min-height:24px}}
@media(max-width:520px){.pnLiveGrid,.pnLiveGrid.playerMode{grid-template-columns:1fr}.pnLiveGrid .wide{grid-column:auto}.pnLiveTableHead{display:block}.pnLiveTableHead>div:last-child{margin-top:10px}.pnLiveTableHead button{width:100%}}
`;
  document.head.appendChild(x);
}

function currentMode(){return safe(()=>state.streamer.overlayMode,'ranked')||'ranked'}
function deckLabel(p){return p?.decklist?.archetype||p?.deck||'Archetype unavailable'}
function hasDeck(p){return !!p?.decklist?.cards}
function recordLabel(p){return p?.record?String(p.record):''}
function placingLabel(p){return p?.placing!==null&&p?.placing!==undefined&&p?.placing!==''?`Place ${p.placing}`:''}

function playerCard(p,label){
  const extras=[recordLabel(p),placingLabel(p)].filter(Boolean).join(' • ');
  return `<div class="pnLivePlayer"><small>${label}</small><b>${esc(p?.name||'Unknown Player')}</b><span>${esc(deckLabel(p))}</span>${extras?`<span>${esc(extras)}</span>`:''}<span class="pnLiveDeckState">${hasDeck(p)?'Public decklist available • QR enabled':'Full decklist not public'}</span></div>`;
}

function orientedMatch(match,followId){
  if(!match)return null;
  if(!followId)return match;
  if(String(match.playerB?.id)===String(followId))return {...match,playerA:match.playerB,playerB:match.playerA};
  return match;
}

function matchHtml(match,mode,followId){
  if(!match){
    return `<div class="pnLiveStatus">${mode==='tournament'?'Load a tournament, then choose the player to follow.':'Load a tournament, then choose a round and table.'}</div>`;
  }
  const x=mode==='tournament'?orientedMatch(match,followId):match;
  const left=mode==='tournament'?'FOLLOWING PLAYER':'PLAYER A';
  const right=mode==='tournament'?'CURRENT OPPONENT':'PLAYER B';
  return `<div class="pnLiveMatch">${playerCard(x.playerA,left)}<div class="pnLiveVs">VS</div>${playerCard(x.playerB,right)}</div>`;
}

function sortedPlayers(){
  return (data?.players||[]).slice().sort((a,b)=>String(a?.name||'').localeCompare(String(b?.name||''),undefined,{sensitivity:'base'}));
}

function playerById(pid){
  return (data?.players||[]).find(p=>String(p.id)===String(pid))||null;
}

function latestRound(d=data){
  const rs=d?PPCLimitlessLiveTable.rounds(d):[];
  return rs.at(-1)??'';
}

function findPlayerPairing(d,round,pid){
  return (d?.pairings||[]).find(p=>String(p.round)===String(round)&&(String(p.playerAId)===String(pid)||String(p.playerBId)===String(pid)))||null;
}

function findLatestPlayerPairing(d,pid){
  if(!d||!pid)return null;
  const pairs=(d.pairings||[]).filter(p=>String(p.playerAId)===String(pid)||String(p.playerBId)===String(pid));
  if(!pairs.length)return null;
  return pairs.slice().sort((a,b)=>{
    const an=Number(a.round),bn=Number(b.round);
    if(Number.isFinite(an)&&Number.isFinite(bn))return bn-an;
    return String(b.round).localeCompare(String(a.round),undefined,{numeric:true});
  })[0]||null;
}

function matchForFollowedPlayer(){
  const cfg=s();
  if(!data||!cfg.followPlayerId)return null;
  const p=findLatestPlayerPairing(data,cfg.followPlayerId);
  if(!p)return null;
  cfg.round=p.round;
  cfg.table=p.table;
  return PPCLimitlessLiveTable.resolveTable(data,p.round,p.table);
}

function panel(){
  const m=currentMode(),cfg=s(),rounds=data?PPCLimitlessLiveTable.rounds(data):[];
  const round=cfg.round??rounds.at(-1)??'';
  const tables=data&&round!==''?PPCLimitlessLiveTable.tables(data,round):[];
  const table=cfg.table??tables[0]??'';
  const match=m==='tournament'?matchForFollowedPlayer():(data&&round!==''&&table!==''?PPCLimitlessLiveTable.resolveTable(data,round,table):null);
  const followed=playerById(cfg.followPlayerId);
  const playerOptions=sortedPlayers().map(p=>`<option value="${esc(p.id)}" ${String(p.id)===String(cfg.followPlayerId)?'selected':''}>${esc(p.name)}${p.record?` • ${esc(p.record)}`:''}</option>`).join('');
  const sourceControls=m==='tournament'
    ? `<div class="pnLiveGrid playerMode"><div class="pnLiveField wide"><label>Limitless Tournament URL or ID</label><input id="pnLiveTournament" value="${esc(cfg.tournament||'')}" placeholder="https://play.limitlesstcg.com/tournament/..."></div><div class="pnLiveField"><label>Player to Follow</label><select id="pnLivePlayerSelect" onchange="PPCStreamerLimitlessLiveTable.playerChanged(this.value)"><option value="">${data?'Choose player by name':'Load tournament first'}</option>${playerOptions}</select></div><button onclick="PPCStreamerLimitlessLiveTable.load()">Load Tournament</button></div>`
    : `<div class="pnLiveGrid"><div class="pnLiveField wide"><label>Limitless Tournament URL or ID</label><input id="pnLiveTournament" value="${esc(cfg.tournament||'')}" placeholder="https://play.limitlesstcg.com/tournament/..."></div><div class="pnLiveField"><label>Round</label><select id="pnLiveRound" onchange="PPCStreamerLimitlessLiveTable.roundChanged(this.value)"><option value="">—</option>${rounds.map(r=>`<option value="${esc(r)}" ${String(r)===String(round)?'selected':''}>Round ${esc(r)}</option>`).join('')}</select></div><div class="pnLiveField"><label>Table</label><select id="pnLiveTableSelect" onchange="PPCStreamerLimitlessLiveTable.tableChanged(this.value)"><option value="">—</option>${tables.map(t=>`<option value="${esc(t)}" ${String(t)===String(table)?'selected':''}>Table ${esc(t)}</option>`).join('')}</select></div><button onclick="PPCStreamerLimitlessLiveTable.load()">Load Tournament</button></div>`;
  const actions=match&&m==='caster'?`<div class="pnLiveActions"><button onclick="PPCStreamerLimitlessLiveTable.sendCaster()">Send + Auto-Follow This Table</button></div>`:'';
  const followMeta=m==='tournament'
    ? (followed?`Following ${esc(followed.name)}${cfg.round!==''?` • Round ${esc(cfg.round)}`:''}`:'Choose a player to begin auto-following')
    : `Following table ${esc(table||'—')}`;
  return `<section class="pnLiveTable" data-limitless-live><div class="pnLiveTableHead"><div><span class="pnLiveEyebrow">${m==='tournament'?'PUBLIC LIMITLESS PLAYER FOLLOW':'PUBLIC LIMITLESS LIVE TABLE'}</span><h3>${m==='caster'?'Caster Match Source':'Tournament Player Source'}</h3><p>${m==='tournament'?'Choose a player by name. PocketNexus finds their current pairing, opponent, record, archetype and public decklist automatically.':'Player names, archetypes, public decklists and QR panels feed the OBS overlay automatically.'}</p></div><div><label class="pnLiveAuto"><input type="checkbox" ${cfg.autoRefresh!==false?'checked':''} onchange="PPCStreamerLimitlessLiveTable.toggleAuto(this.checked)"> Auto-follow every ${Number(cfg.refreshSeconds||25)}s</label><button class="secondary" onclick="PPCStreamerLimitlessLiveTable.refresh()">Refresh Now</button></div></div>${sourceControls}${matchHtml(match,m,cfg.followPlayerId)}${actions}<div class="pnLiveMeta"><span>${followMeta}</span><span>${data?.fetchedAt?`Last update ${new Date(data.fetchedAt).toLocaleTimeString()}`:''}</span></div><div id="pnLiveStatus" class="pnLiveStatus">${data?`Loaded ${esc(data.details?.name||data.details?.title||data.id)} • public data only`:''}</div></section>`;
}

function mount(){
  if(safe(()=>state.page,'')!=='streamer')return;
  const m=currentMode();
  if(m==='ranked')return;
  style();
  const studio=document.querySelector(`.pnObsStudio[data-mode="${m}"]`);
  if(!studio)return;
  if(studio.querySelector('[data-limitless-live]'))return;
  studio.insertAdjacentHTML('afterbegin',panel());
  schedule();
}

function status(txt,bad=false){
  const el=document.getElementById('pnLiveStatus');
  if(el){el.textContent=txt;el.className='pnLiveStatus '+(bad?'bad':'good')}
}

function followSelection(){
  const cfg=s(),m=currentMode(),r=latestRound();
  if(r==='')return;
  if(m==='tournament'&&cfg.followPlayerId){
    const p=findLatestPlayerPairing(data,cfg.followPlayerId);
    if(p){cfg.round=p.round;cfg.table=p.table}
    return;
  }
  if(cfg.followTable!==undefined&&cfg.followTable!==null&&cfg.followTable!==''){
    const ts=PPCLimitlessLiveTable.tables(data,r);
    if(ts.some(t=>String(t)===String(cfg.followTable))){cfg.round=r;cfg.table=cfg.followTable;return}
  }
  if(cfg.autoRefresh!==false){
    cfg.round=r;
    const ts=PPCLimitlessLiveTable.tables(data,r);
    if(!ts.some(t=>String(t)===String(cfg.table)))cfg.table=ts[0]??'';
  }
}

async function load(force=false,quiet=false){
  const input=(document.getElementById('pnLiveTournament')?.value||s().tournament||'').trim();
  if(!input){if(!quiet)status('Enter a Limitless tournament URL or ID.',true);return}
  if(busy)return;
  busy=true;
  if(!quiet)status('Loading public tournament data…');
  try{
    data=await PPCLimitlessLiveTable.fetchTournament(input,{force});
    const cfg=s(),m=currentMode();
    cfg.tournament=input;
    const rs=PPCLimitlessLiveTable.rounds(data);
    if(!rs.some(x=>String(x)===String(cfg.round)))cfg.round=rs.at(-1)??'';
    if(cfg.followPlayerId&&!playerById(cfg.followPlayerId)){cfg.followPlayerId='';cfg.followPlayerName=''}
    followSelection();
    if(m==='caster'){
      const ts=PPCLimitlessLiveTable.tables(data,cfg.round);
      if(!ts.some(x=>String(x)===String(cfg.table)))cfg.table=ts[0]??'';
    }
    safe(()=>save());
    if(quiet)autoPublish();
    remount();
  }catch(e){
    if(!quiet)status(e?.message||'Could not load tournament.',true);
  }finally{busy=false}
}

function remount(){
  document.querySelector('[data-limitless-live]')?.remove();
  mount();
}

function roundChanged(v){
  const cfg=s();
  cfg.round=v;
  cfg.followPlayerId='';
  cfg.followPlayerName='';
  cfg.table=data?PPCLimitlessLiveTable.tables(data,v)[0]??'':'';
  cfg.followTable=cfg.table;
  safe(()=>save());
  remount();
}

function tableChanged(v){
  const cfg=s();
  cfg.table=v;
  cfg.followTable=v;
  cfg.followPlayerId='';
  cfg.followPlayerName='';
  safe(()=>save());
  remount();
}

function playerChanged(pid){
  const cfg=s(),p=playerById(pid);
  cfg.followPlayerId=p?.id||'';
  cfg.followPlayerName=p?.name||'';
  cfg.followTable='';
  if(!p){
    safe(()=>save());
    remount();
    return;
  }
  const pairing=findLatestPlayerPairing(data,p.id);
  if(pairing){cfg.round=pairing.round;cfg.table=pairing.table}
  safe(()=>save());
  remount();
  const x=selected();
  if(x){
    const side=String(x.playerB?.id)===String(p.id)?'B':'A';
    sendTournament(side,false);
  }else status(`No public pairing is available for ${p.name} yet.`,true);
}

function selected(){
  const cfg=s();
  if(!data)return null;
  if(currentMode()==='tournament'&&cfg.followPlayerId){
    const p=findLatestPlayerPairing(data,cfg.followPlayerId);
    return p?PPCLimitlessLiveTable.resolveTable(data,p.round,p.table):null;
  }
  return PPCLimitlessLiveTable.resolveTable(data,cfg.round,cfg.table);
}

function applyShared(match){
  if(!match)return false;
  const st=state.streamer;
  st.tournamentName=match.tournamentName||'Limitless Tournament';
  st.tournamentRound=`Round ${match.round}`;
  st.tournamentStage=st.tournamentStage||'Tournament';
  st.liveTable={...match,publicOnly:true,source:'Limitless public API',syncedAt:Date.now()};
  return true;
}

function sendCaster(quiet=false){
  const x=selected();
  if(!applyShared(x))return;
  const cfg=s();
  cfg.followPlayerId='';
  cfg.followPlayerName='';
  cfg.followTable=x.table;
  state.streamer.casterA=x.playerA?.name||'Player A';
  state.streamer.casterB=x.playerB?.name||'Player B';
  safe(()=>save());
  safe(()=>PPCStreamerOBS2.publishAll());
  if(!quiet)safe(()=>PPCStreamerOBS2.refreshPreview('caster'));
  if(!quiet)status(`Caster OBS updated: ${state.streamer.casterA} vs ${state.streamer.casterB}`);
}

function sendTournament(side,quiet=false){
  const x=selected();
  if(!applyShared(x))return;
  const me=side==='B'?x.playerB:x.playerA,opp=side==='B'?x.playerA:x.playerB,cfg=s();
  cfg.followPlayerId=me?.id||'';
  cfg.followPlayerName=me?.name||'';
  cfg.followTable='';
  cfg.round=x.round;
  cfg.table=x.table;
  state.streamer.tournamentPlayerName=me?.name||'';
  if(me?.record)state.streamer.tournamentRecord=String(me.record);
  state.streamer.controlOpponent=opp?.decklist?.archetype||opp?.deck||opp?.name||'';
  state.streamer.tournamentOpponentName=opp?.name||'';
  state.streamer.tournamentPublicDeck=me?.decklist||null;
  state.streamer.tournamentFollowSide=side;
  safe(()=>save());
  safe(()=>PPCStreamerOBS2.publishAll());
  if(!quiet)safe(()=>PPCStreamerOBS2.refreshPreview('tournament'));
  if(!quiet)status(`Tournament OBS now follows ${me?.name||'player'} across rounds.`);
}

function autoPublish(){
  const m=currentMode();
  if(m==='caster')sendCaster(true);
  else if(m==='tournament'&&s().followPlayerId){
    const x=selected();
    if(x){
      const side=String(x.playerB?.id)===String(s().followPlayerId)?'B':'A';
      sendTournament(side,true);
    }
  }
}

async function refresh(){return load(true,false)}
function toggleAuto(v){s().autoRefresh=!!v;safe(()=>save());schedule();status(v?'Auto-follow enabled.':'Auto-follow paused.')}
function schedule(){
  clearTimeout(timer);
  if(s().autoRefresh===false||safe(()=>state.page,'')!=='streamer'||currentMode()==='ranked'||!s().tournament)return;
  timer=setTimeout(async()=>{await load(true,true);schedule()},Math.max(15,Number(s().refreshSeconds||25))*1000);
}
function hook(){
  if(typeof window.streamerPage==='function'&&!window.streamerPage.__limitlessLive){
    const base=window.streamerPage;
    window.streamerPage=function(){
      const out=base.apply(this,arguments);
      requestAnimationFrame(()=>requestAnimationFrame(mount));
      return out;
    };
    window.streamerPage.__limitlessLive=true;
  }
  requestAnimationFrame(()=>requestAnimationFrame(mount));
}
let tries=0,t=setInterval(()=>{if(window.PPCLimitlessLiveTable&&window.PPCStreamerOBS2){hook();if(++tries>100)clearInterval(t)}},60);
window.PPCStreamerLimitlessLiveTable={version:'8.72.0',mount,load,refresh,roundChanged,tableChanged,playerChanged,sendCaster,sendTournament,selected,toggleAuto,schedule};
})();