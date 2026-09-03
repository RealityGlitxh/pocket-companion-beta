/* V8.49 — Competitive Creator Expansion */
(function(){
 const VERSION='8.49';
 function cloud(){return window.getPPCCloudClient?.()||window.cloudClient||null}
 function session(){return window.getPPCCloudSession?.()||window.cloudSession||null}
 function signedIn(){return !!(cloud()&&session()?.user)}
 function currentDeck(){return typeof streamerCurrentDeck==='function'?streamerCurrentDeck():null}
 function safePayload(deck){
  if(!deck)return {};
  return {name:deck.name||'Shared Deck',archetype:deck.archetype||'',energy:deck.energy||'',cards:typeof streamerDeckCards==='function'?streamerDeckCards(deck):[]};
 }
 window.v849CreateDeckShare=async function(){
  const deck=currentDeck();if(!deck)return ppcNotice('Select a saved deck first.');
  if(!signedIn())return ppcNotice('Sign in to create a private deck share link.');
  try{
   const {data,error}=await cloud().rpc('create_my_deck_share',{p_deck_local_id:String(deck.id),p_title:deck.name||'Shared Deck',p_deck_payload:safePayload(deck)});if(error)throw error;
   const row=Array.isArray(data)?data[0]:data;if(!row?.share_token)throw new Error('Share token was not returned.');
   const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('deck',row.share_token);state.streamer=state.streamer||{};state.streamer.deckShareUrl=url.toString();save();publishStreamerOverlayState?.();
   try{await navigator.clipboard.writeText(url.toString());ppcNotice('Private deck share link copied.')}catch(_){ppcNotice('Deck share link created.')}
   streamerPage();
  }catch(e){console.warn('V8.49 deck share',e);ppcNotice('Could not create the deck share link.');}
 };
 window.v849RevokeDeckShare=async function(){
  const deck=currentDeck();if(!deck||!signedIn())return;
  try{const {error}=await cloud().rpc('revoke_my_deck_share',{p_deck_local_id:String(deck.id)});if(error)throw error;state.streamer.deckShareUrl='';save();publishStreamerOverlayState?.();ppcNotice('Deck share link revoked.');streamerPage()}catch(e){console.warn(e);ppcNotice('Could not revoke the share link.')}
 };
 window.v849CopyShare=async function(){const text=state.streamer?.deckShareUrl||'';if(!text)return;try{if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(text);ppcNotice('Link copied.')}catch(_){if(typeof copyFallbackDialog==='function')copyFallbackDialog(text,'Copy deck share link');else window.prompt('Copy deck share link',text)}};
 window.v849TournamentResult=function(result){
  state.streamer=state.streamer||{};state.streamer.tournamentJourney=Array.isArray(state.streamer.tournamentJourney)?state.streamer.tournamentJourney:[];
  const n=state.streamer.tournamentJourney.length+1;state.streamer.tournamentJourney.push({round:state.streamer.tournamentRound||`Round ${n}`,result,opponent:streamerOpponentValue?.()||'',at:Date.now()});
  const w=state.streamer.tournamentJourney.filter(x=>x.result==='win').length,l=state.streamer.tournamentJourney.filter(x=>x.result==='loss').length,t=state.streamer.tournamentJourney.filter(x=>x.result==='tie').length;
  state.streamer.tournamentRecord=`${w}-${l}${t?`-${t}`:''}`;save();publishStreamerOverlayState?.();streamerPage();
  if(signedIn()){const item=state.streamer.tournamentJourney[state.streamer.tournamentJourney.length-1];const localId=`journey-${item.at}`;cloud().rpc('upsert_my_streamer_tournament_session',{p_local_id:'active-tournament',p_payload:{event_name:state.streamer.tournamentName||'Tournament',stage:state.streamer.tournamentStage||'',current_round:item.round,wins:w,losses:l,ties:t,status:'active',overlay_state:{record:state.streamer.tournamentRecord}}}).then(()=>cloud().rpc('upsert_my_streamer_tournament_match',{p_session_local_id:'active-tournament',p_local_id:localId,p_payload:{round_label:item.round,stage:state.streamer.tournamentStage||'',opponent_name:item.opponent||'',result:item.result,played_at:new Date(item.at).toISOString()}})).catch(e=>console.warn('V8.50 tournament journey cloud sync',e));}
 };
 window.v849ResetJourney=function(){if(!window.confirm('Reset the entire Tournament Journey? This clears the local journey record.'))return;state.streamer.tournamentJourney=[];state.streamer.tournamentRecord='0-0';save();publishStreamerOverlayState?.();streamerPage()};
 function journeyHtml(){const a=state.streamer?.tournamentJourney||[];return a.length?a.map((x,i)=>`<div class="v849JourneyStep ${x.result}"><b>${esc(x.round||`Round ${i+1}`)}</b><span>${x.result.toUpperCase()}</span><small>${esc(x.opponent||'Opponent not entered')}</small></div>`).join(''):`<p class="muted">No tournament rounds logged yet.</p>`}
 function injectStreamer(){
  const app=document.getElementById('app');if(!app||state.page!=='streamer'||document.getElementById('v849Creator'))return;
  const panel=document.createElement('div');panel.id='v849Creator';panel.className='panel';
  const share=state.streamer?.deckShareUrl||'';
  panel.innerHTML=`<div class="between"><div><span class="eyebrow">V8.49</span><h2>Competitive Creator Expansion</h2><p class="muted">Private deck sharing + tournament journey controls.</p></div><span class="badge">NEW</span></div>
   <div class="v849Grid"><section><h3>Private Deck Share</h3><p class="muted tiny">Creates an unguessable, revocable link containing only the selected deck data.</p>${share?`<input readonly value="${esc(share)}"><div class="row"><button onclick="v849CopyShare()">Copy Link</button><button class="danger" onclick="v849RevokeDeckShare()">Revoke</button></div>`:`<button onclick="v849CreateDeckShare()">Create Share Link</button>`}</section>
   <section><h3>Tournament Journey</h3><div class="row"><button onclick="v849TournamentResult('win')">+ Win</button><button class="secondary" onclick="v849TournamentResult('loss')">+ Loss</button><button class="secondary" onclick="v849TournamentResult('tie')">+ Tie</button><button class="danger" onclick="v849ResetJourney()">Reset</button></div><div class="v849Journey">${journeyHtml()}</div></section></div>`;
  const target=[...app.querySelectorAll('.panel')].find(x=>x.textContent.includes('Scene Rotation'))||app.querySelector('.bottomnote');
  target?.parentNode?.insertBefore(panel,target);
 }
 const oldStreamer=window.streamerPage;if(typeof oldStreamer==='function')window.streamerPage=function(){oldStreamer.apply(this,arguments);injectStreamer()};
 async function sharedDeckLanding(){
  const token=new URLSearchParams(location.search).get('deck');if(!token)return;
  let client=null;for(let i=0;i<30&&!client;i++){client=window.getPPCCloudClient?.()||window.cloudClient||null;if(!client)await new Promise(r=>setTimeout(r,100));}
  if(!client)return;
  try{const {data,error}=await client.rpc('get_shared_deck',{p_share_token:token});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row)throw new Error('Shared deck not found or revoked.');
   const p=row.deck_payload||{},app=document.getElementById('app');if(app){app.innerHTML=`<div class="v849ShareLanding"><section class="panel v849Shared"><span class="eyebrow">SHARED DECK</span><h1>${esc(row.title||p.name||'Shared Deck')}</h1><p class="muted">${esc(p.archetype||p.energy||'Pokémon TCG Pocket')}</p><div>${(p.cards||[]).map(c=>`<span><b>${Number(c.qty||1)}×</b> ${esc(c.name||c.id||'Card')}</span>`).join('')||'<p>No cards available.</p>'}</div><button class="secondary" onclick="location.href=location.pathname">Open Pocket Companion</button></section></div>`;document.body.classList.add('sharedDeckMode');}
  }catch(e){console.warn('V8.50 shared deck',e);const app=document.getElementById('app');if(app)app.innerHTML=`<section class="panel"><h2>Shared deck unavailable</h2><p class="muted">This link may have been revoked or expired.</p><button onclick="location.href=location.pathname">Open Pocket Companion</button></section>`;}
 }
 window.addEventListener('load',()=>sharedDeckLanding());
})();
