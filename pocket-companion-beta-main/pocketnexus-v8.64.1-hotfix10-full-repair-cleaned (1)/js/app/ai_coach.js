/* V8.52.1 — Pocket Coach real AI model connection */
const pocketCoachState={conversationId:null,messages:[],conversations:[],loading:false,error:'',loaded:false,providerChecked:false,providerConfigured:false,provider:'openai',model:'gpt-5.6-terra'};
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
 const {data,error}=await c.from('ai_messages').select('id,role,content,source_labels,created_at,model_provider,model_name').eq('user_id',s.user.id).eq('conversation_id',id).order('created_at',{ascending:true}).limit(100);
 pocketCoachState.messages=data||[];pocketCoachState.error=error?.message||'';pocketCoachState.loading=false;pocketCoachPage(true);
}
function coachNewChat(){pocketCoachState.conversationId=null;pocketCoachState.messages=[];pocketCoachState.error='';pocketCoachPage(true)}
function coachUsePrompt(text){const el=document.getElementById('coachInput');if(el){el.value=text;el.focus()}}
function coachMessageHtml(m){
 const assistant=m.role==='assistant'; const sources=Array.isArray(m.source_labels)?m.source_labels:[];
 return `<article class="coachMessage ${assistant?'assistant':'user'}"><div class="coachAvatar">${assistant?'✦':'YOU'}</div><div class="coachBubble"><div class="coachMessageMeta"><strong>${assistant?'Pocket Coach':'You'}</strong>${assistant&&m.model_name?`<span>${esc(m.model_name)}</span>`:''}</div><p>${esc(m.content||'').replace(/\n/g,'<br>')}</p>${sources.length?`<div class="coachSources">${sources.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}</div></article>`;
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
   pocketCoachState.messages.push({role:'assistant',content:data.answer,source_labels:data.sources||[],model_provider:data.provider,model_name:data.model});
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
