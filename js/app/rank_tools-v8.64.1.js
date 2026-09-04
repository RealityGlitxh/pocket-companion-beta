/* PocketNexus V8.64.1 — Rank Intelligence route bundle
   Performance Pass 2D: loaded only when the Rank page is opened.
   Shared rank-tier helpers remain in the lightweight eager runtime for now. */

state.rankBorder=state.rankBorder&&typeof state.rankBorder==="object"?state.rankBorder:{season:"auto",targetRank:1000,lastLoad:0};
state.rankBorder.season="auto";
let rankBorderRenderToken=0;
function rankBorderService(){return window.PPCRankBorderService||null}
function rankBorderFmt(n){return Number.isFinite(Number(n))?Number(n).toLocaleString():"—"}
function rankSeasonLifecycle(season){
 const now=Date.now(),start=season?.startsAt?new Date(season.startsAt).getTime():NaN,end=season?.endsAt?new Date(season.endsAt).getTime():NaN;
 if(Number.isFinite(end)&&now>=end)return {state:"ended",label:"Season ended",live:false};
 if(Number.isFinite(start)&&now<start)return {state:"upcoming",label:`Starts ${new Date(start).toLocaleString()}`,live:false};
 const hrs=Number(season?.hoursRemaining);
 if(Number.isFinite(hrs)&&hrs>0)return {state:"active",label:`${rankBorderFmt(hrs)} hours remaining`,live:true};
 return {state:"active",label:"Active season",live:true};
}

function rankBorderLabel(rank){return rank===100?"Top 100":rank===1000?"Top 1K":rank===5000?"Top 5K":rank===10000?"Top 10K":`Top ${rank}`}
function rankBorderConfidence(c){c=String(c||"").toLowerCase();return c?c.charAt(0).toUpperCase()+c.slice(1):"—"}
function rankBorderSourceBadge(){const svc=rankBorderService(),st=svc?.getStatus?.()||{source:"idle"};const hasData=!!svc?.getData?.();const source=st.source==="idle"&&hasData?"cached":st.source;const label=source==="live"?"LIVE":source==="cached"?"CACHED":source==="error"?"ERROR":st.loading?"LOADING":"READY";return `<span class="rankBorderStatus ${esc(source||"idle")}">${label}</span>`}
function rankBorderEnsure(force=false){
 const svc=rankBorderService();if(!svc)return;
 const cached=svc.getData();if(!force&&cached)return;
 const token=++rankBorderRenderToken;svc.fetchActive({force}).then(()=>{if(token===rankBorderRenderToken&&state.page==="rank")rankBorderPage()}).catch(()=>{if(token===rankBorderRenderToken&&state.page==="rank")rankBorderPage()});
}
function rankBorderRefresh(){const svc=rankBorderService();if(!svc)return ppcNotice("Rank Border service is unavailable.");svc.fetchActive({force:true}).then(()=>rankBorderPage()).catch(e=>{console.warn(e);rankBorderPage()})}
function rankBorderSelectTarget(rank){state.rankBorder.targetRank=Number(rank);save();rankBorderPage()}
function rankBorderPersonalCard(border){
 const rp=Number(state.rank?.points||0);if(!border?.available)return `<div class="panel"><h2>Your Position</h2><p class="muted">Choose an available rank target to compare it with your tracked RP.</p></div>`;
 const safe=Number(border.recommendedSafeRP||border.predictedFinalRP||0),pred=Number(border.predictedFinalRP||0),current=Number(border.currentRP||0);
 const safeDelta=rp-safe,predDelta=rp-pred,currentDelta=rp-current;
 const status=safeDelta>=0?`<div class="successBox">✓ Your tracked RP is ${rankBorderFmt(safeDelta)} above the recommended safe target.</div>`:predDelta>=0?`<div class="warningBox">⚠ You are above the predicted finish, but ${rankBorderFmt(Math.abs(safeDelta))} RP below the recommended safety target.</div>`:`<div class="warningBox">You need about ${rankBorderFmt(Math.abs(predDelta))} RP to reach the predicted final border, or ${rankBorderFmt(Math.abs(safeDelta))} RP for the recommended safety target.</div>`;
 return `<div class="panel"><div class="between"><div><h2>Your Position</h2><p class="muted">Based on the RP you track in PocketNexus.</p></div><span class="pill">${esc(rankBorderLabel(border.targetRank))}</span></div><div class="rankPersonalGrid"><div><span>Your RP</span><strong>${rankBorderFmt(rp)}</strong></div><div><span>Current border gap</span><strong class="${currentDelta>=0?"good":"bad"}">${currentDelta>=0?"+":""}${rankBorderFmt(currentDelta)}</strong></div><div><span>Predicted gap</span><strong class="${predDelta>=0?"good":"bad"}">${predDelta>=0?"+":""}${rankBorderFmt(predDelta)}</strong></div><div><span>Safe-target gap</span><strong class="${safeDelta>=0?"good":"bad"}">${safeDelta>=0?"+":""}${rankBorderFmt(safeDelta)}</strong></div></div>${status}<div class="row" style="margin-top:10px"><button onclick="goPage('matches')">Record Ranked Match</button></div></div>`
}
function rankBorderChart(data){
 const obs=Array.isArray(data?.observations)?data.observations:[],borders=Array.isArray(data?.borders)?data.borders.filter(b=>b.available):[];if(!obs.length||!borders.length)return `<div class="panel"><h2>Border History</h2><p class="muted">Not enough observation history to draw the forecast chart yet.</p></div>`;
 const series=[{rank:100,key:"top_100_rp"},{rank:1000,key:"top_1000_rp"},{rank:5000,key:"top_5000_rp"},{rank:10000,key:"top_10000_rp"}].filter(x=>obs.some(o=>o[x.key]!=null));
 const values=[];series.forEach(s=>obs.forEach(o=>{if(o[s.key]!=null)values.push(Number(o[s.key]))}));borders.forEach(b=>values.push(Number(b.predictedFinalRP)));if(!values.length)return "";
 let min=Math.floor((Math.min(...values)-60)/100)*100,max=Math.ceil((Math.max(...values)+60)/100)*100;if(max<=min)max=min+100;const W=900,H=360,L=60,R=24,T=26,B=55,pw=W-L-R,ph=H-T-B;
 const dates=obs.map(o=>new Date(o.observed_at));const first=dates[0].getTime(),lastObs=dates[dates.length-1].getTime(),end=new Date(data.season?.endsAt||dates[dates.length-1]).getTime();const endX=Math.max(end,lastObs+1);const x=t=>L+((t-first)/(endX-first))*pw,y=v=>T+(1-(v-min)/(max-min))*ph;
 const colors={100:"#ff5c7a",1000:"#f8b819",5000:"#aeb5c3",10000:"#d6692b"};let svg=[];
 for(let v=min;v<=max;v+=100){const yy=y(v);svg.push(`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" class="rankGridLine"/><text x="${L-10}" y="${yy+4}" text-anchor="end" class="rankAxisText">${v}</text>`)}
 series.forEach(s=>{const pts=obs.filter(o=>o[s.key]!=null).map(o=>[x(new Date(o.observed_at).getTime()),y(Number(o[s.key]))]);if(!pts.length)return;svg.push(`<polyline class="rankObserved" style="stroke:${colors[s.rank]}" points="${pts.map(p=>p.join(',')).join(' ')}"/>`);const b=borders.find(z=>z.targetRank===s.rank);if(b){const a=pts[pts.length-1],p=[x(endX),y(Number(b.predictedFinalRP))];svg.push(`<line class="rankPredicted" style="stroke:${colors[s.rank]}" x1="${a[0]}" y1="${a[1]}" x2="${p[0]}" y2="${p[1]}"/>`);svg.push(`<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="${colors[s.rank]}"/>`)}});
 dates.forEach((d,i)=>{if(i===0||i===dates.length-1||dates.length<=5)svg.push(`<text x="${x(d.getTime())}" y="${H-20}" text-anchor="middle" class="rankAxisText">${d.toLocaleDateString([], {month:"short",day:"numeric"})}</text>`)});svg.push(`<text x="${W-R}" y="${H-20}" text-anchor="end" class="rankAxisText">Finish</text>`);
 const legend=series.map(s=>`<span><i style="background:${colors[s.rank]}"></i>${rankBorderLabel(s.rank)}</span>`).join("");
 return `<div class="panel"><div class="between"><div><h2>Border History & Forecast</h2><p class="muted">Solid = estimated observations • dotted = model projection</p></div></div><div class="rankChartLegend">${legend}</div><div class="rankChartWrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Rank border history and prediction chart">${svg.join("")}</svg></div></div>`
}
let rankSessionLoading=false;
let rankSessionNotice="";
function rankSessionService(){return window.PPCRankSessionService||null}
function rankSessionApply(payload){
 const sess=payload?.session;if(!sess)return;
 state.rank=state.rank||{};
 state.rank.tier="Master Ball";
 state.rank.points=Number(sess.current_rp||0);
 state.rank.streak=Number(sess.current_win_streak||0);
 save();
}
function rankSessionEnsure(force=false){
 const svc=rankSessionService();
 if(!svc||!cloudSession?.user||rankSessionLoading)return;
 if(!force&&svc.getData?.())return;
 rankSessionLoading=true;
 svc.fetchMine().then(payload=>{rankSessionLoading=false;rankSessionApply(payload);if(state.page==="rank")rankBorderPage()}).catch(()=>{rankSessionLoading=false;if(state.page==="rank")rankBorderPage()});
}
async function rankSessionRefresh(){
 const svc=rankSessionService();if(!svc)return;
 rankSessionNotice="";rankSessionLoading=true;rankBorderPage();
 try{const payload=await svc.fetchMine();rankSessionApply(payload)}catch(e){rankSessionNotice=e?.message||String(e)}
 rankSessionLoading=false;rankBorderPage();
}
async function rankSessionStart(){
 const input=document.getElementById("rankSessionStartingRP"),rp=Math.max(0,Number(input?.value||state.rank?.points||0));
 const svc=rankSessionService();if(!svc)return;
 rankSessionNotice="";rankSessionLoading=true;rankBorderPage();
 try{const payload=await svc.start(rp);if(!payload?.ok)rankSessionNotice=rankSessionStatusMessage(payload?.status);rankSessionApply(payload)}catch(e){rankSessionNotice=e?.message||String(e)}
 rankSessionLoading=false;rankBorderPage();
}
async function rankSessionRecord(result){
 const svc=rankSessionService(),payload=svc?.getData?.(),id=payload?.session?.id;if(!svc||!id)return;
 rankSessionNotice="";rankSessionLoading=true;rankBorderPage();
 try{
   const out=await svc.record(id,result);
   if(!out?.ok)rankSessionNotice=rankSessionStatusMessage(out?.status||out?.error);
   else{
     rankSessionApply(svc.getData?.());
     const sign=Number(out.rpChange)>=0?"+":"";
     rankSessionNotice=`${String(result).toUpperCase()} recorded • ${sign}${out.rpChange} RP`;
   }
 }catch(e){rankSessionNotice=e?.message||String(e)}
 rankSessionLoading=false;rankBorderPage();
}
function rankSessionStatusMessage(status){
 const x=String(status||"");
 if(x==="no-active-season")return "No ranked season is active yet. Your next session can start when the new season begins.";
 if(x==="authentication-required")return "Sign in to sync your Master Ball streak and RP.";
 if(x==="no-session")return "Start your Master Ball session to enable streak-aware RP tracking.";
 if(x==="session-not-found")return "This rank session could not be found for your account.";
 if(x==="invalid-starting-rp")return "Enter a valid starting RP.";
 return x||"Rank session is not available.";
}
function rankSessionPanel(){
 const ranked=completedMatches().filter(m=>m.gameMode==="ranked"),rec=wl(ranked),st=streakInfo(ranked),rp=Number(state.rank?.points||0);
 return `<div class="panel rankSessionPanel"><div class="between"><div><span class="eyebrow">RANK TRACKING</span><h2>${rankBorderFmt(rp)} RP</h2><p class="muted">Confirmed RP + your recorded ranked results.</p></div><span class="pill">AUTO RP</span></div><div class="metricgrid"><div class="metric"><div class="l">Current RP</div><div class="n">${rankBorderFmt(rp)}</div><small>Updates from ranked Battle Log results</small></div><div class="metric"><div class="l">Current Streak</div><div class="n">${st.type==="win"?'W'+rankBorderFmt(st.count):'W0'}</div><small>Result streak only</small></div><div class="metric"><div class="l">Best Win Streak</div><div class="n">W${rankBorderFmt(st.bestWin||0)}</div></div><div class="metric"><div class="l">Ranked Record</div><div class="n">${rec.w}-${rec.l}</div><small>${rec.n?rec.wr.toFixed(1)+'% WR':'No ranked games yet'}</small></div></div><div class="rankSessionActions"><button onclick="goPage('matches')">Record Ranked Match</button><button class="secondary" onclick="state.page='more';render()">Edit Current RP</button></div><div class="notice" style="margin-top:12px"><strong>Ranked Battle Log results update RP automatically.</strong> Wins add 10 RP plus streak bonus; losses use the current rank deduction. You can still enter the official post-match RP in Detailed mode to correct any difference.</div></div>`;
}

function rankBorderQuickSummary(border,seasonLife){
 if(!border)return `<section class="panel rankQuickSummary"><span class="eyebrow">YOUR CLIMB</span><h2>Rank forecast unavailable</h2><p class="muted">Your confirmed RP is still tracked locally.</p></section>`;
 const rp=Number(state.rank?.points||0),target=Number(border.predictedFinalRP||0),safe=Number(border.recommendedSafeRP||target||0);
 const delta=safe-rp,above=delta<=0;
 return `<section class="panel rankQuickSummary"><div class="between"><div><span class="eyebrow">YOUR CLIMB</span><h2>${esc(rankBorderLabel(border.targetRank))}</h2><p class="muted">The shortest answer first. Forecasts below are independent estimates, not official Pokémon leaderboard values.</p></div><span class="confidence ${esc(String(border.confidence||"low").toLowerCase())}">${esc(rankBorderConfidence(border.confidence))} confidence</span></div><div class="rankQuickGrid"><div><span>Confirmed RP</span><strong>${rankBorderFmt(rp)}</strong><small>Updates from ranked Battle Log results</small></div><div><span>${seasonLife.live?"Estimated finish":"Final estimate"}</span><strong>${rankBorderFmt(target)}</strong><small>${esc(rankBorderLabel(border.targetRank))}</small></div><div><span>Estimated safe target</span><strong>${rankBorderFmt(safe)}</strong><small>${above?"You are above it":`${rankBorderFmt(delta)} RP to go`}</small></div></div><div class="${above?'successBox':'notice'}"><strong>${above?'✓ You are above the estimated safety target.':`About ${rankBorderFmt(delta)} RP to the estimated safety target.`}</strong> Check Pokémon TCG Pocket for your official rank and RP.</div></section>`;
}

function rankBorderPage(){
 const root=document.getElementById("app");if(!root)return;const svc=rankBorderService();const season="Active season",data=svc?.getData?.(),st=svc?.getStatus?.()||{source:"idle",loading:false,error:""};
 if(!data&&!st.loading)rankBorderEnsure(false);
 if(!data){root.innerHTML=`<div class="between"><div><span class="badge">RANK ESTIMATES</span><h1>Rank Intelligence</h1><p class="muted">Independent ranked-border estimates and finish projections. Not official Pokémon rankings.</p></div>${rankBorderSourceBadge()}</div><div class="rankBorderSkeleton"><div class="panel skeletonBlock"></div><div class="panel skeletonBlock"></div></div>${st.error?`<div class="dangerBox">${esc(st.error)}</div>`:""}`;return}
 const borders=Array.isArray(data.borders)?data.borders:[],available=borders.filter(b=>b.available),selected=available.find(b=>b.targetRank===Number(state.rankBorder.targetRank))||available[0];if(selected)state.rankBorder.targetRank=selected.targetRank;
 const seasonInfo=data.season||{},seasonLife=rankSeasonLifecycle(seasonInfo),countdown=seasonLife.label;
 const historicalModel=data.historicalModel||{};
 const historicalCount=Number(historicalModel.comparableSeasons||0);
 const cards=`<div class="rankBorderCards ppcRankForecastGrid">${borders.map(b=>b.available?`<button class="ppcRankForecastCard ${selected?.targetRank===b.targetRank?"selected":""}" onclick="rankBorderSelectTarget(${b.targetRank})"><div class="between"><span class="rankTarget">${esc(rankBorderLabel(b.targetRank))}</span><span class="confidence ${esc(String(b.confidence||"low").toLowerCase())}">${esc(rankBorderConfidence(b.confidence))}</span></div><div class="rankBorderPrimary"><span>${seasonLife.live?"Estimated finish":"Final estimate"}</span><strong>${rankBorderFmt(b.predictedFinalRP)} RP</strong></div><div class="rankBorderStats"><div><span>Current</span><b>${rankBorderFmt(b.currentRP)}</b></div><div><span>${seasonLife.live?"Estimated safe target":"Last estimated target"}</span><b>${rankBorderFmt(b.recommendedSafeRP)}</b></div><div><span>Recent trend</span><b>${Number(b.recentVelocity)>=0?"+":""}${rankBorderFmt(b.recentVelocity)}/day</b></div></div><small>${rankBorderFmt(b.observationsUsed)} current observations • Historical model: ${rankBorderFmt(b.historicalSeasonsUsed||b.historicalSeasonsAvailable||historicalCount)} comparable seasons</small></button>`:`<div class="ppcRankForecastCard unavailable"><div class="between"><span class="rankTarget">${esc(rankBorderLabel(b.targetRank))}</span><span class="confidence">Waiting</span></div><div class="rankBorderPrimary"><span>Prediction</span><strong>Awaiting data</strong></div><p class="muted tiny">No reliable current-season observation history is available yet. Historical library: ${rankBorderFmt(b.historicalSeasonsAvailable||historicalCount)} seasons.</p></div>`).join("")}</div>`;
 const historicalPanel=`<div class="panel rankHistoricalPanel"><div class="between"><div><span class="eyebrow">HISTORICAL MODEL</span><h2>${rankBorderFmt(historicalCount)} comparable seasons</h2><p class="muted">${rankBorderFmt(historicalModel.observations||0)} archived border snapshots from ${esc(historicalModel.sourceName||"community history")} are available to the forecast model.</p></div><span class="pill">${esc(historicalModel.modelVersion||"v3 historical")}</span></div><div class="rankHistoricalStats"><div><span>Top 1K history</span><strong>${rankBorderFmt(historicalModel.targets?.top1000||0)} seasons</strong></div><div><span>Top 5K history</span><strong>${rankBorderFmt(historicalModel.targets?.top5000||0)} seasons</strong></div><div><span>Top 10K history</span><strong>${rankBorderFmt(historicalModel.targets?.top10000||0)} seasons</strong></div><div><span>Current blend</span><strong>${selected?.historicalSeasonsUsed?`${rankBorderFmt(selected.historicalSeasonsUsed)} seasons • ${Math.round(Number(selected.historicalWeight||0)*100)}% weight`:seasonLife.live?"Learning current season":"Historical archive"}</strong></div></div><p class="muted tiny">Historical forecasts are used as a secondary signal. Current-season observations and recent RP movement remain the primary signal as fresh data accumulates.</p></div>`;
 const method=`<details class="panel rankMethodDetails"><summary><strong>How these estimates work</strong> <span class="muted">Method, freshness & limitations</span></summary><div class="rankMethodGrid"><div><span>Current observations</span><strong>${rankBorderFmt(data.observations?.length||0)} points</strong></div><div><span>Historical model</span><strong>${rankBorderFmt(historicalCount)} seasons</strong></div><div><span>Confidence</span><strong>${esc(rankBorderConfidence(selected?.confidence))}</strong></div><div><span>Recent velocity</span><strong>${selected?`${Number(selected.recentVelocity)>=0?"+":""}${rankBorderFmt(selected.recentVelocity)} RP/day`:"—"}</strong></div><div><span>Live projection</span><strong>${selected?.liveProjectionRP!=null?`${rankBorderFmt(selected.liveProjectionRP)} RP`:"—"}</strong></div><div><span>Historical projection</span><strong>${selected?.historicalProjectionRP!=null?`${rankBorderFmt(selected.historicalProjectionRP)} RP`:"—"}</strong></div><div><span>Last refresh</span><strong>${data.generatedAt?new Date(data.generatedAt).toLocaleString():"—"}</strong></div></div><p class="muted">V8.51.5 blends current-season velocity with comparable historical season curves when enough history exists. Historical data is a secondary input, not an official Pokémon leaderboard feed. Forecasts can still change quickly near season end.</p></details>`;
 const observations=`<div class="panel"><h2>Daily Observations</h2><div class="rankObservationTable"><div class="rankObsHead"><span>Date</span><span>Top 1K</span><span>Top 5K</span><span>Top 10K</span></div>${(data.observations||[]).slice().reverse().map(o=>`<div class="rankObsRow"><span>${new Date(o.observed_at).toLocaleDateString()}</span><span>${rankBorderFmt(o.top_1000_rp)}</span><span>${rankBorderFmt(o.top_5000_rp)}</span><span>${rankBorderFmt(o.top_10000_rp)}</span></div>`).join("")}</div><p class="muted tiny">Source values can include manually estimated chart readings. Estimated observations are labeled as estimates in the backend.</p></div>`;
 const seasonNotice=data.status==="offseason"?`<div class="notice rankSeasonNotice"><strong>Between ranked seasons.</strong> ${esc(data.message||"Showing the most recent completed season while the next season is not active.")}${data.nextSeason?.startsAt?` <span class="muted">Next: ${esc(data.nextSeason.name||data.nextSeason.code||"season")} • ${new Date(data.nextSeason.startsAt).toLocaleString()}</span>`:""}</div>`:data.status==="upcoming"?`<div class="notice rankSeasonNotice"><strong>Next season is scheduled.</strong> ${esc(data.message||"")}</div>`:"";
 root.innerHTML=`<div class="between rankBorderHeader"><div><span class="eyebrow">RANKED PLAY</span><h1>Rank Details</h1><p class="muted">${esc(seasonInfo.name||season)} • ${esc(countdown)}</p></div><div class="row">${rankBorderSourceBadge()}<button class="secondary" onclick="rankBorderRefresh()">Refresh Borders</button></div></div>${st.error?`<div class="warningBox">Live refresh failed. Showing cached border data. ${esc(st.error)}</div>`:""}${seasonNotice}${rankBorderQuickSummary(selected,seasonLife)}${rankSessionPanel()}<details class="rankAdvancedDetails"><summary class="panel rankAdvancedSummary"><div><span class="eyebrow">ADVANCED RANK INTELLIGENCE</span><strong>Forecasts, chart, methodology & observations</strong><small>Open only when you want the full model details.</small></div><span>View details ↓</span></summary><div class="rankAdvancedBody">${cards}${historicalPanel}${rankBorderPersonalCard(selected)}${rankBorderChart(data)}${method}${observations}</div></details>`;
}
