/* PocketNexus V8.73.0 — Meta + Tournament clarity layer.
   Adds plain-language onboarding and terminology without changing data, sync,
   caching, tournament ingestion, or existing page actions. */
(function(){
'use strict';
if(window.PPCMetaTournamentClarity)return;

function styleOnce(){
  if(document.getElementById('ppcMetaTournamentClarityStyles'))return;
  const st=document.createElement('style');
  st.id='ppcMetaTournamentClarityStyles';
  st.textContent=`
  .pnClarityGuide{margin:0 0 16px;padding:16px;border:1px solid rgba(93,183,255,.22);border-radius:18px;background:linear-gradient(180deg,rgba(20,39,55,.96),rgba(10,22,34,.98));box-shadow:0 10px 28px rgba(0,0,0,.12)}
  .pnClarityTop{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}.pnClarityTop h2{margin:2px 0 5px;font-size:1.25rem}.pnClarityTop p{margin:0;max-width:760px;color:var(--muted);line-height:1.45}.pnClarityBadge{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border:1px solid rgba(93,183,255,.24);border-radius:999px;background:rgba(93,183,255,.08);font-size:.72rem;font-weight:800;white-space:nowrap}.pnClarityBadge.warn{border-color:rgba(255,196,87,.28);background:rgba(255,196,87,.08)}
  .pnClaritySteps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:13px}.pnClarityStep{display:grid;grid-template-columns:auto 1fr;gap:9px;padding:11px;border:1px solid rgba(255,255,255,.07);border-radius:13px;background:rgba(255,255,255,.025)}.pnClarityStep b{width:26px;height:26px;display:grid;place-items:center;border-radius:8px;background:rgba(93,183,255,.12);font-size:.76rem}.pnClarityStep strong{display:block;font-size:.82rem;margin-bottom:2px}.pnClarityStep span{display:block;color:var(--muted);font-size:.72rem;line-height:1.35}
  .pnClarityFooter{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:12px;padding-top:11px;border-top:1px solid rgba(255,255,255,.07)}.pnClarityFooter small{color:var(--muted);line-height:1.4}.pnClarityFooter details{position:relative}.pnClarityFooter summary{cursor:pointer;font-size:.72rem;font-weight:800;color:#b8d9f2}.pnClarityGlossary{margin-top:9px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.pnClarityGlossary div{padding:8px 9px;border-radius:10px;background:rgba(255,255,255,.025);font-size:.7rem;color:var(--muted)}.pnClarityGlossary strong{color:var(--text)}
  .pnClarityStatus{margin:10px 0 0;padding:9px 11px;border-radius:11px;border:1px solid rgba(255,196,87,.2);background:rgba(255,196,87,.06);font-size:.74rem;line-height:1.4}.pnClarityStatus strong{color:var(--text)}
  @media(max-width:760px){.pnClarityGuide{padding:13px;border-radius:15px}.pnClaritySteps{grid-template-columns:1fr}.pnClarityGlossary{grid-template-columns:1fr}.pnClarityTop{gap:9px}.pnClarityBadge{font-size:.68rem}}
  `;
  document.head.appendChild(st);
}

function pageName(){try{return String(state?.page||'').toLowerCase()}catch{return''}}
function text(el){return String(el?.textContent||'').trim()}
function buttonByText(root,label){return [...root.querySelectorAll('button')].find(b=>text(b).toLowerCase()===label.toLowerCase())||null}
function replaceHeading(root,from,to){for(const h of root.querySelectorAll('h1,h2,h3'))if(text(h)===from){h.textContent=to;return h}}

function metaStatus(){
  try{return window.PPCMetaService?.getStatus?.()||{source:'fallback'}}catch{return{source:'fallback'}}
}
function metaStatusCopy(){
  const s=String(metaStatus()?.source||'fallback').toLowerCase();
  if(s==='live')return{label:'LIVE DATA',warn:false,detail:'You are viewing the latest live competitive snapshot.'};
  if(s==='cached')return{label:'RECENT CACHE',warn:false,detail:'A recent saved snapshot is showing while PocketNexus checks for newer data.'};
  if(s==='stale')return{label:'OLDER SNAPSHOT',warn:true,detail:'This snapshot is older than normal. Use Refresh Data to check for a newer one.'};
  return{label:'BACKUP SNAPSHOT',warn:true,detail:'Live Meta data is unavailable right now, so PocketNexus is showing backup data instead.'};
}

function metaGuide(){
  const s=metaStatusCopy();
  const el=document.createElement('section');
  el.className='pnClarityGuide';el.dataset.pnClarity='meta';
  el.innerHTML=`<div class="pnClarityTop"><div><span class="eyebrow">START HERE</span><h2>Meta = what you are most likely to face</h2><p>This page combines results from many tracked events. Use it to see which decks are popular, how they perform, and what matchups you should prepare for.</p></div><span class="pnClarityBadge ${s.warn?'warn':''}">${s.label}</span></div><div class="pnClaritySteps"><div class="pnClarityStep"><b>1</b><div><strong>Pick a timeframe</strong><span>24H is the newest picture. 7D–30D gives a larger, steadier sample.</span></div></div><div class="pnClarityStep"><b>2</b><div><strong>Check the top decks</strong><span>Usage tells you how often a deck appears. Win rate tells you how it performed in tracked games.</span></div></div><div class="pnClarityStep"><b>3</b><div><strong>Prepare your matchups</strong><span>Use Matchups and deck lists to decide what you need to practice against.</span></div></div></div>${s.warn?`<div class="pnClarityStatus"><strong>${s.label}:</strong> ${s.detail}</div>`:''}<div class="pnClarityFooter"><small><strong>Meta vs Tournaments:</strong> Meta summarizes many events; Tournaments lets you inspect one event at a time.</small><details><summary>What do these numbers mean?</summary><div class="pnClarityGlossary"><div><strong>Usage</strong> — share of tracked decks using that archetype.</div><div><strong>Win rate</strong> — wins divided by decided tracked games.</div><div><strong>Matches</strong> — size of the tracked game sample.</div><div><strong>Confidence</strong> — how much evidence supports the number.</div><div><strong>Coverage</strong> — how much of the available event data PocketNexus could classify/use.</div><div><strong>Fallback / backup</strong> — saved data shown when the live snapshot cannot be reached.</div></div></details></div>`;
  return el;
}

function tournamentGuide(){
  const el=document.createElement('section');
  el.className='pnClarityGuide';el.dataset.pnClarity='tournaments';
  el.innerHTML=`<div class="pnClarityTop"><div><span class="eyebrow">START HERE</span><h2>Tournaments = individual event results</h2><p>Choose one event, then look at who placed, what decks were played, and which archetypes performed well in that specific tournament.</p></div><span class="pnClarityBadge">EVENT VIEW</span></div><div class="pnClaritySteps"><div class="pnClarityStep"><b>1</b><div><strong>Choose an event</strong><span>Use Browse Events or the filters to find the tournament you care about.</span></div></div><div class="pnClarityStep"><b>2</b><div><strong>Read the standings</strong><span>Standings show placement, player, deck, and W-L-T record when available.</span></div></div><div class="pnClarityStep"><b>3</b><div><strong>Study the event decks</strong><span>Event Decks shows which archetypes appeared most and their best finish.</span></div></div></div><div class="pnClarityFooter"><small><strong>Need the overall field?</strong> Use Meta. This page is for drilling into one tournament.</small><details><summary>What do these terms mean?</summary><div class="pnClarityGlossary"><div><strong>Participants</strong> — players entered in the event.</div><div><strong>Tracked standings</strong> — players PocketNexus has result data for.</div><div><strong>W-L-T</strong> — wins, losses, and ties.</div><div><strong>Public deck list</strong> — a deck list that was available with the event data.</div><div><strong>Unknown deck</strong> — result exists, but the deck could not be confidently classified.</div><div><strong>Event Decks</strong> — archetype counts from this tournament only.</div></div></details></div>`;
  return el;
}

function improveMetaLabels(root){
  for(const b of root.querySelectorAll('button')){
    const t=text(b);
    if(['24H','7D','14D','30D'].includes(t))b.title='Choose how much recent tournament data is included in this Meta view.';
    if(/^Refresh Meta$/i.test(t))b.textContent='Refresh Data';
  }
  replaceHeading(root,'Matchup Matrix','Matchups');
  for(const p of root.querySelectorAll('p')){
    if(/Top mapped archetype matchups\. Draws are shown separately\./i.test(text(p)))p.textContent='See how tracked archetypes performed against each other. Larger match samples are more useful.';
  }
}

function improveTournamentLabels(root){
  replaceHeading(root,'Tournament Intelligence','Tournaments');
  const hero=root.querySelector('.tournamentHero');
  if(hero){
    const p=hero.querySelector('p');
    if(p&&/Browse Pokémon TCG Pocket events/i.test(text(p)))p.textContent='Choose an event to see standings, decks, and player results.';
  }
  for(const b of root.querySelectorAll('button')){
    const t=text(b),on=String(b.getAttribute('onclick')||'');
    if(t==='Refresh View')b.textContent='Refresh Data';
    if(t==='Use Event for Pairing Lab')b.textContent='Practice vs Event Decks';
    if(/tournamentSetView\(['\"]leaderboard['\"]\)/.test(on)&&/leaderboard/i.test(t))b.textContent='Standings';
    if(/tournamentSetView\(['\"]decks['\"]\)/.test(on)&&/^decks$/i.test(t))b.textContent='Event Decks';
    if(/tournamentSetView\(['\"]events['\"]\)/.test(on)&&/^events$/i.test(t))b.textContent='Browse Events';
  }
}

function apply(){
  const root=document.getElementById('app');if(!root)return;
  const page=pageName();
  const tournament=page==='tournaments'||!!root.querySelector('.tournamentHero');
  const meta=!tournament&&(page==='meta'||!!root.querySelector('.competitiveMetaPage')||[...root.querySelectorAll('button')].some(b=>text(b)==='24H'));
  if(tournament){
    improveTournamentLabels(root);
    if(!root.querySelector('[data-pn-clarity="tournaments"]'))root.prepend(tournamentGuide());
  }else if(meta){
    improveMetaLabels(root);
    if(!root.querySelector('[data-pn-clarity="meta"]'))root.prepend(metaGuide());
  }
}

function init(){
  styleOnce();
  const root=document.getElementById('app');if(!root)return setTimeout(init,50);
  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply()})};
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  schedule();
}

window.PPCMetaTournamentClarity={version:'8.73.0',apply};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();