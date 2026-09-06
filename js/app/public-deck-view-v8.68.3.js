/* PocketNexus V8.68.3 — public tournament deck page. */
(async function(){
'use strict';
const q=new URLSearchParams(location.search),tid=q.get('tournament')||'',pid=q.get('player')||'';
const title=document.getElementById('title'),meta=document.getElementById('meta'),deck=document.getElementById('deck'),status=document.getElementById('status');
const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function entries(raw){if(!raw)return[];if(Array.isArray(raw))return raw.map((x,i)=>typeof x==='string'?{name:x,count:1}:{name:x?.name||x?.cardName||x?.card||`Card ${i+1}`,count:Number(x?.count??x?.quantity??x?.qty??1)||1});if(typeof raw==='object')return Object.entries(raw).map(([name,count])=>({name,count:Number(count)||1}));return[]}
if(!tid||!pid){title.textContent='Deck link is incomplete';status.className='error';status.textContent='Tournament or player information is missing.';return}
try{const data=await PPCLimitlessLiveTable.fetchTournament(tid,{force:true});const p=(data.players||[]).find(x=>String(x.id)===String(pid));const pub=data.deckByPlayer?.[pid]||null;if(!p){title.textContent='Player not found';status.className='error';status.textContent='This player was not found in the public tournament data.';return}title.textContent=p.name||'Tournament Player';meta.textContent=`${data.details?.name||data.details?.title||'Limitless Tournament'} • ${pub?.archetype||p.deck||'Archetype unavailable'}`;if(!pub?.cards){deck.innerHTML='';status.textContent='This tournament does not expose this full decklist publicly.';return}const rows=entries(pub.cards);deck.innerHTML=rows.map(x=>`<div class="row"><b>${esc(x.count)}×</b><span>${esc(x.name)}</span></div>`).join('');status.textContent=`${rows.reduce((n,x)=>n+(Number(x.count)||0),0)} cards • Public tournament decklist`;}
catch(e){title.textContent='Could not load deck';status.className='error';status.textContent=e?.message||'Public tournament data could not be loaded.'}
})();