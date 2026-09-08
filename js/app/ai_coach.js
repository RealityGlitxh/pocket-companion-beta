/* V8.52.1 — Pocket Coach real AI model connection */
const pocketCoachState={conversationId:null,messages:[],conversations:[],loading:false,error:'',loaded:false,providerChecked:false,providerConfigured:false,provider:'openai',model:'gpt-5.6-terra',matchupReport:[]};
function coachClient(){return window.getPPCCloudClient?.()||null}
function coachSession(){return window.getPPCCloudSession?.()||null}
const COACH_PROMPTS=[
 'What deck should I practice today?',
 'What are my worst matchups?',
 'Which of my decks fits the current meta best?',
 'What should I improve before my next tournament?',
 'How is my rank progress looking?',
 'Can I build one of the top meta decks with my collection?'
];
async function coachCheckProvider(){
 const c=coachClient(),s=coachSession();
 if(!c||!s?.user){pocketCoachState.providerChecked=true;return}
 try{
   const {data,error}=await c.functions.invoke('pocket-coach',{body:{action:'status'}});
   if(error)throw error;
   pocketCoachState.providerConfigured=!!data?.providerConfigured;
   pocketCoachState.provider=data?.provider||'openai';
   pocketCoachState.model=data?.model||'gpt-5.6-terra';
 }catch(e){pocketCoachState.providerConfigured=false}
 pocketCoachState.providerChecked=true;
 pocketCoachPage(true);
}
async function coachLoadConversations(){
 const c=coachClient(),s=coachSession(); if(!c||!s?.user){pocketCoachState.loaded=true;return}
 const {data}=await c.from('ai_conversations').select('id,title,updated_at').eq('user_id',s.user.id).order('updated_at',{ascending:false}).limit(20);
 pocketCoachState.conversations=data||[]; pocketCoachState.loaded=true;
}
async function coachOpenConversation(id){
 const c=coachClient(),s=coachSession(); if(!c||!s?.user)return;
 pocketCoachState.conversationId=id;pocketCoachState.loading=true;pocketCoachPage(true);
 const {data,error}=await c.from('ai_messages').select('id,role,content,source_labels,created_at,model_provider,model_name,matchup_report').eq('user_id',s.user.id).eq('conversation_id',id).order('created_at',{ascending:true}).limit(100);
 pocketCoachState.messages=(data||[]).map(m=>({...m,matchupReport:Array.isArray(m.matchup_report)?m.matchup_report:[]}));pocketCoachState.matchupReport=[];pocketCoachState.error=error?.message||'';pocketCoachState.loading=false;pocketCoachPage(true);
}
function coachNewChat(){pocketCoachState.conversationId=null;pocketCoachState.messages=[];pocketCoachState.matchupReport=[];pocketCoachState.error='';pocketCoachPage(true)}
function coachUsePrompt(text){const el=document.getElementById('coachInput');if(el){el.value=text;el.focus()}}
function coachEnsureMatchupReportStyles(){if(document.getElementById('coachMatchupReportStyles'))return;const st=document.createElement('style');st.id='coachMatchupReportStyles';st.textContent=`
.coachMatchupReport{margin-top:14px;border:1px solid rgba(148,163,184,.2);border-radius:16px;background:rgba(15,23,42,.58);overflow:hidden}.coachMatchupHeader{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:14px 15px;border-bottom:1px solid rgba(148,163,184,.14)}.coachMatchupHeader h3{margin:2px 0 0;font-size:15px}.coachMatchupHeader small{color:var(--muted,#94a3b8)}.coachMatchupDecks{display:grid;gap:12px;padding:12px}.coachMatchupDeck{border:1px solid rgba(148,163,184,.14);border-radius:13px;padding:12px;background:rgba(2,6,23,.28)}.coachMatchupDeckTop{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:9px}.coachMatchupDeckTop strong{font-size:14px}.coachMatchupDeckTop span{font-size:11px;color:var(--muted,#94a3b8)}.coachThreatGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:8px}.coachThreat{border:1px solid rgba(148,163,184,.14);border-radius:11px;padding:9px;background:rgba(15,23,42,.5)}.coachThreatName{font-weight:700;font-size:12px;margin-bottom:6px}.coachThreatStats{display:grid;grid-template-columns:repeat(2,1fr);gap:5px;font-size:11px;color:var(--muted,#94a3b8)}.coachThreatStats b{display:block;color:var(--text,#e5e7eb);font-size:12px}.coachMatchupBand{display:inline-flex;margin-top:7px;padding:3px 7px;border-radius:999px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;background:rgba(148,163,184,.12)}.coachMatchupBand.unfavorable,.coachMatchupBand.slightly-unfavorable{background:rgba(239,68,68,.14);color:#fca5a5}.coachMatchupBand.favorable,.coachMatchupBand.slightly-favorable{background:rgba(34,197,94,.14);color:#86efac}.coachMatchupBand.roughly-even{background:rgba(234,179,8,.14);color:#fde68a}.coachTechRows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.coachTechBox{border-radius:10px;padding:9px;background:rgba(15,23,42,.45)}.coachTechBox h4{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em}.coachTechBox ul{margin:0;padding-left:16px;font-size:11px;color:var(--muted,#94a3b8)}.coachTechBox li+li{margin-top:4px}.coachTechBox.help h4{color:#86efac}.coachTechBox.review h4{color:#fcd34d}.coachEvidenceLegend{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 9px}.coachEvidenceLegend span{font-size:10px;color:var(--muted,#94a3b8);padding:4px 7px;border:1px solid rgba(148,163,184,.12);border-radius:999px}.coachEvidenceLegend b{color:var(--text,#e5e7eb)}.coachPersonalResult{margin-top:8px;padding-top:8px;border-top:1px solid rgba(148,163,184,.12);display:grid;gap:2px}.coachPersonalResult strong{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#93c5fd}.coachPersonalResult span{font-size:11px;color:var(--text,#e5e7eb)}.coachPersonalResult small{font-size:10px;color:var(--muted,#94a3b8)}.coachPersonalResult.insufficient strong{color:#cbd5e1}.coachPersonalGuardrail{margin:10px 0 0}@media(max-width:640px){.coachTechRows{grid-template-columns:1fr}.coachThreatGrid{grid-template-columns:1fr 1fr}.coachMatchupHeader{align-items:flex-start;flex-direction:column}}@media(max-width:430px){.coachThreatGrid{grid-template-columns:1fr}}
`;document.head.appendChild(st)}
function coachPersonalResultHtml(d,t){
 const rows=Array.isArray(d?.personalMatchup?.matchedThreats)?d.personalMatchup.matchedThreats:[];
 const p=rows.find(x=>String(x?.opponentName||'')===String(t?.opponentName||''));
 if(!p)return '<div class="coachPersonalResult insufficient"><strong>Your Results</strong><span>No matching Battle Tracker sample.</span><small>Insufficient evidence</small></div>';
 const enough=p.evidence!=='insufficient';
 const wr=p.winRate==null?'—':Number(p.winRate).toFixed(1)+'%';
 const relation=String(p.comparison||'insufficient-evidence').replace(/-/g,' ');
 return '<div class="coachPersonalResult '+(enough?'':'insufficient')+'"><strong>Your Results</strong><span>'+wr+' • '+Number(p.decided||0)+' decided • '+esc(p.evidence||'insufficient')+'</span><small>'+esc(enough?relation:'Insufficient evidence — fewer than 5 decided games')+'</small></div>';
}
function coachMatchupReportHtml(report){
 const decks=Array.isArray(report)?report:[];
 if(!decks.length)return'';
 coachEnsureMatchupReportStyles();
 const deckHtml=decks.map(function(d){
  const threats=Array.isArray(d.topThreats)?d.topThreats:[];
  const recs=Array.isArray(d.recommendations)?d.recommendations:[];
  const helps=recs.filter(r=>r.action==='consider-matchup-tech').slice(0,4);
  const reviews=recs.filter(r=>r.action==='review-for-matchup').slice(0,4);
  const threatHtml=threats.map(function(t){
   const wr=t.winRate==null?'—':Number(t.winRate).toFixed(1)+'%';
   return '<div class="coachThreat"><div class="coachThreatName">'+esc(t.opponentName||'Unknown')+'</div><div class="coachThreatStats"><span><b>'+wr+'</b>Global WR</span><span><b>'+Number(t.opponentUsagePct||0).toFixed(1)+'%</b>Meta share</span><span><b>'+Number(t.matches||0)+'</b>Global games</span><span><b>'+esc(t.evidence||'low')+'</b>Global confidence</span></div><span class="coachMatchupBand '+esc(t.band||'insufficient-evidence')+'">'+esc(String(t.band||'insufficient evidence').replace(/-/g,' '))+'</span>'+coachPersonalResultHtml(d,t)+'</div>';
  }).join('')||'<div class="muted">No supported matchup rows available.</div>';
  const helpItems=helps.length?helps.map(function(r){const delta=r.evidence?.deltaWinRate;return '<li><strong>'+esc(r.cardName||'Card')+'</strong> vs '+esc(r.opponentArchetype||'matchup')+(delta!=null?' • '+(Number(delta)>0?'+':'')+Number(delta).toFixed(1)+' pts global association':'')+'</li>';}).join(''):'<li>No supported tech signal.</li>';
  const reviewItems=reviews.length?reviews.map(function(r){return '<li><strong>'+esc(r.cardName||'Card')+'</strong> vs '+esc(r.opponentArchetype||'matchup')+' • review only</li>';}).join(''):'<li>No supported review signal.</li>';
  const techHtml=(helps.length||reviews.length)?'<div class="coachTechRows"><div class="coachTechBox help"><h4>Cards helping / test</h4><ul>'+helpItems+'</ul></div><div class="coachTechBox review"><h4>Cards to review</h4><ul>'+reviewItems+'</ul></div></div>':'';
  return '<div class="coachMatchupDeck"><div class="coachMatchupDeckTop"><strong>'+esc(d.deckName||'Deck')+' → '+esc(d.archetypeName||'Matched archetype')+'</strong><span>Match confidence: '+esc(d.archetypeMatchConfidence||'unknown')+'</span></div><div class="coachEvidenceLegend"><span><b>Global Meta</b> competitive matrix</span><span><b>Your Results</b> Battle Tracker only</span></div><div class="coachThreatGrid">'+threatHtml+'</div>'+techHtml+'<p class="muted tiny coachPersonalGuardrail">Your Results are descriptive Battle Tracker history. They are never blended into the Global Meta percentage and do not prove why a matchup differs.</p></div>';
 }).join('');
 return '<section class="coachMatchupReport"><div class="coachMatchupHeader"><div><span class="eyebrow">MATCHUP REPORT</span><h3>Global Meta + Your Results</h3></div><small>Separate evidence layers • correlation ≠ causation</small></div><div class="coachMatchupDecks">'+deckHtml+'</div></section>';
}
function coachMessageHtml(m){
 const assistant=m.role==='assistant'; const sources=Array.isArray(m.source_labels)?m.source_labels:[];
 return `<article class="coachMessage ${assistant?'assistant':'user'}"><div class="coachAvatar">${assistant?'✦':'YOU'}</div><div class="coachBubble"><div class="coachMessageMeta"><strong>${assistant?'Pocket Coach':'You'}</strong>${assistant&&m.model_name?`<span>${esc(m.model_name)}</span>`:''}</div><p>${esc(m.content||'').replace(/\n/g,'<br>')}</p>${sources.length?`<div class="coachSources">${sources.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}${assistant&&Array.isArray(m.matchupReport)&&m.matchupReport.length?coachMatchupReportHtml(m.matchupReport):''}</div></article>`;
}
async function coachSend(messageOverride=''){
 const input=document.getElementById('coachInput');const message=String(messageOverride||input?.value||'').trim();if(!message||pocketCoachState.loading)return;
 const c=coachClient(),s=coachSession();if(!c||!s?.user){pocketCoachState.error='Sign in to use Pocket Coach so it can securely read your PocketNexus data.';return pocketCoachPage(true)}
 pocketCoachState.loading=true;pocketCoachState.error='';pocketCoachState.messages.push({role:'user',content:message,source_labels:[]});if(input)input.value='';pocketCoachPage(true);
 try{
   const {data,error}=await c.functions.invoke('pocket-coach',{body:{message,conversationId:pocketCoachState.conversationId}});
   if(error)throw error;if(data?.error)throw new Error(data.error);
   pocketCoachState.conversationId=data.conversationId;
   pocketCoachState.providerConfigured=!!data.providerConfigured;
   pocketCoachState.provider=data.provider||pocketCoachState.provider;
   pocketCoachState.model=data.model||pocketCoachState.model;
   pocketCoachState.providerChecked=true;
   pocketCoachState.matchupReport=Array.isArray(data.matchupReport)?data.matchupReport:[];
   pocketCoachState.messages.push({role:'assistant',content:data.answer,source_labels:data.sources||[],model_provider:data.provider,model_name:data.model,matchupReport:pocketCoachState.matchupReport});
   await coachLoadConversations();
 }catch(e){pocketCoachState.error=e?.message||String(e)}
 pocketCoachState.loading=false;pocketCoachPage(true);
}
function coachComposerKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();coachSend()}}
function pocketCoachPage(skipLoad=false){
 const root=document.getElementById('app');if(!root)return;const signed=!!coachSession()?.user;
 if(!skipLoad&&!pocketCoachState.loaded){coachLoadConversations().then(()=>pocketCoachPage(true))}
 if(signed&&!pocketCoachState.providerChecked)coachCheckProvider();
 const history=pocketCoachState.conversations;
 const providerLabel=!signed?'Sign in required':!pocketCoachState.providerChecked?'Checking AI…':pocketCoachState.providerConfigured?`${pocketCoachState.model} connected`:'Secure AI key needed';
 const providerGood=signed&&pocketCoachState.providerConfigured;
 root.innerHTML=`<div class="coachPage">
  <div class="between coachHero"><div><span class="eyebrow">POCKET COACH • REAL AI CONNECTION</span><h1>Your competitive assistant</h1><p class="muted">Ask about your decks, matches, Meta, rank, collection, simulations, and tournament prep. Personalized answers are grounded in data PocketNexus actually has.</p></div><div class="coachStatus"><span class="badge"><span class="statusdot ${signed?'good':'bad'}"></span>${signed?'Cloud context connected':'Sign in required'}</span><span class="badge"><span class="statusdot ${providerGood?'good':signed?'warn':'bad'}"></span>${esc(providerLabel)}</span></div></div>
  <div class="coachLayout">
   <aside class="panel coachSidebar"><div class="between"><div><span class="eyebrow">CHATS</span><h2>History</h2></div><button class="secondary" onclick="coachNewChat()">+ New</button></div>${history.length?`<div class="coachHistoryList">${history.map(x=>`<button class="coachHistoryItem ${x.id===pocketCoachState.conversationId?'active':''}" onclick="coachOpenConversation('${x.id}')"><strong>${esc(x.title||'Coaching chat')}</strong><small>${new Date(x.updated_at).toLocaleString()}</small></button>`).join('')}</div>`:`<div class="coachEmptySide">Your signed-in coaching chats will appear here.</div>`}</aside>
   <section class="panel coachMain"><div class="coachTopBar"><div><span class="eyebrow">GROUNDED AI COACHING</span><h2>${pocketCoachState.conversationId?'Conversation':'Start a new conversation'}</h2></div><span class="pill">No invented game data</span></div>
    <div class="coachQuickPrompts">${COACH_PROMPTS.map(p=>`<button onclick='coachUsePrompt(${JSON.stringify(p)})'>${esc(p)}</button>`).join('')}</div>
    <div class="coachThread" id="coachThread">${pocketCoachState.messages.length?pocketCoachState.messages.map(coachMessageHtml).join(''):`<div class="coachWelcome"><div class="coachOrb">✦</div><h2>What do you want to improve?</h2><p>${providerGood?`Pocket Coach is connected to ${esc(pocketCoachState.model)} through the secure Supabase backend. Ask a competitive question and I’ll combine the model with your synced PocketNexus context.`:`The real AI backend is installed and ready. Until the server-side OpenAI key is added, Pocket Coach automatically falls back to grounded rule-based answers instead of exposing a key in the browser.`}</p></div>`}${pocketCoachState.loading?`<article class="coachMessage assistant"><div class="coachAvatar">✦</div><div class="coachBubble coachThinking"><strong>${providerGood?'Thinking with your PocketNexus context…':'Reading your PocketNexus data…'}</strong><span></span><span></span><span></span></div></article>`:''}</div>
    ${pocketCoachState.error?`<div class="dangerBox coachError">${esc(pocketCoachState.error)}</div>`:''}
    <div class="coachComposer"><textarea id="coachInput" rows="2" maxlength="4000" placeholder="Ask Pocket Coach…" onkeydown="coachComposerKey(event)" ${signed?'':'disabled'}></textarea><button onclick="coachSend()" ${signed&&!pocketCoachState.loading?'':'disabled'}>Send →</button></div>
    <div class="coachGuardrail"><strong>Grounding rule:</strong> If your data is missing, untested, stale, or a sample is too small, Pocket Coach should say so instead of fabricating certainty.</div>
   </section>
  </div>
 </div>`;
 requestAnimationFrame(()=>{const t=document.getElementById('coachThread');if(t)t.scrollTop=t.scrollHeight});
}
window.pocketCoachPage=pocketCoachPage;
