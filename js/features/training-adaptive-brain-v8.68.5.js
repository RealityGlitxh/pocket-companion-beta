/* PocketNexus V8.68.6 — Adaptive Daily Brain Teasers
   Difficulty rises daily and tomorrow's category is weighted toward the player's weakest decision skill.
   Uses only scenario-stated facts; no invented live card effects. */
(function(){
'use strict';
if(window.PPCBrainAdaptive)return;
const STORE='ppc_brain_adaptive_v8685';
const DAY_MS=86400000;
const FOCUS_TYPES=['KO Math','Sequencing','Energy Management','Endgame Training'];
const escA=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function read(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{}}catch{return {}}}
function write(v){try{localStorage.setItem(STORE,JSON.stringify(v))}catch(e){console.warn('Adaptive training state could not be saved',e)}}
function dayKey(d=new Date()){return d.toISOString().slice(0,10)}
function dayDiff(a,b){return Math.max(0,Math.floor((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/DAY_MS))}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}
function tier(score){if(score>=85)return'Master';if(score>=65)return'Expert';if(score>=45)return'Advanced';if(score>=25)return'Intermediate';return'Beginner'}
function recentAccuracy(){
 const answers=brainRead().answers||{};
 const rows=Object.entries(answers).filter(([id])=>String(id).startsWith('adaptive-')).sort((a,b)=>String(a[1]?.at||'').localeCompare(String(b[1]?.at||''))).slice(-12);
 if(!rows.length)return null;const correct=rows.filter(([,a])=>a?.correct).length;return Math.round(correct/rows.length*100);
}
function categoryStats(){
 const stats=Object.fromEntries(FOCUS_TYPES.map(type=>[type,{type,played:0,correct:0,wrong:0,accuracy:null}]));
 const answers=brainRead().answers||{};
 for(const [id,a] of Object.entries(answers)){
   if(String(id).startsWith('adaptive-'))continue;
   const p=(window.BRAIN_PUZZLES||BRAIN_PUZZLES||[]).find?.(x=>x.id===id);
   if(!p||!stats[p.type])continue;
   stats[p.type].played++;if(a?.correct)stats[p.type].correct++;else stats[p.type].wrong++;
 }
 const perf=read().performance||{};
 for(const type of FOCUS_TYPES){const row=perf[type]||{};stats[type].played+=Number(row.played||0);stats[type].correct+=Number(row.correct||0);stats[type].wrong+=Number(row.wrong||0);stats[type].accuracy=stats[type].played?Math.round(stats[type].correct/stats[type].played*100):null}
 return stats;
}
function chooseFocus(date){
 const stats=categoryStats(),trained=Object.values(stats).filter(x=>x.played>=2);
 if(trained.length){
   trained.sort((a,b)=>(a.accuracy-b.accuracy)||(b.played-a.played)||a.type.localeCompare(b.type));
   const weak=trained[0];
   if(weak.accuracy<75)return {type:weak.type,reason:`Targeting your weakest area: ${weak.accuracy}% across ${weak.played} reps`,weakness:weak};
 }
 const sparse=Object.values(stats).sort((a,b)=>a.played-b.played||a.type.localeCompare(b.type));
 const least=sparse[0];
 if(least&&least.played===0)return {type:least.type,reason:`Building a baseline in ${least.type}`,weakness:null};
 const type=FOCUS_TYPES[hash('focus|'+date)%FOCUS_TYPES.length];return {type,reason:'Balanced rotation — no clear weakness yet',weakness:null};
}
function ensureToday(){
 const db=read(),today=dayKey();db.firstSeen=db.firstSeen||today;db.days=db.days||{};
 if(db.days[today]?.score)return {db,day:today,...db.days[today]};
 const day=dayDiff(db.firstSeen,today)+1,acc=recentAccuracy();
 const performance=acc==null?0:acc>=90?10:acc>=80?7:acc>=70?4:acc<50?-4:0;
 const baseline=Math.min(96,18+(day-1)*3);
 const prior=Object.entries(db.days).filter(([d])=>d<today).sort(([a],[b])=>a.localeCompare(b)).at(-1)?.[1];
 const previous=Number(prior?.score||0);
 const score=Math.min(100,Math.max(previous?previous+1:baseline,baseline+performance));
 const focus=chooseFocus(today);
 db.days[today]={day,score,focusType:focus.type,focusReason:focus.reason,accuracyAtAssignment:acc,assignedAt:new Date().toISOString()};write(db);
 return {db,day:today,...db.days[today]};
}
function subsetMin(values,target){let best=Infinity;for(let mask=0;mask<(1<<values.length);mask++){let sum=0,n=0;for(let i=0;i<values.length;i++)if(mask>>i&1){sum+=values[i];n++}if(sum>=target&&n<best)best=n}return Number.isFinite(best)?best:null}
function koPuzzle(date,score,r){
 const count=score>=80?5:score>=55?4:score>=30?3:2,mods=Array.from({length:count},()=>10*(1+Math.floor(r()*3))),base=80+10*Math.floor(r()*5);
 const needed=mods.slice().sort((a,b)=>b-a).slice(0,Math.max(1,Math.min(count,score>=75?3:score>=45?2:1))).reduce((a,b)=>a+b,0),hp=base+needed,min=subsetMin(mods,hp-base)||count,total=base+mods.reduce((a,b)=>a+b,0);
 const choices=[`Use the minimum ${min} modifier${min===1?'':'s'} needed, then attack`,`Use every modifier (${total} total damage), even if some are unnecessary`,`Attack for ${base} before using any modifiers`,...(score>=60?[`Skip the attack and preserve every modifier`]:[])];
 return {type:'KO Math',title:'Spend only what reaches the threshold',difficulty:tier(score),prompt:`The opposing Active has ${hp} HP remaining. Your attack deals ${base} damage. Your legal damage modifiers this turn are ${mods.map(x=>'+'+x).join(', ')} and may be combined. You want the Knock Out while preserving as many modifiers as possible. What is the best line?`,choices,answer:0,why:`You need ${hp-base} extra damage. The smallest legal set that reaches that threshold uses ${min} modifier${min===1?'':'s'}. Spending more does not improve the Knock Out and leaves fewer resources for later.`};
}
function sequencingPuzzle(date,score,r){
 const choices=['Reveal the free information → choose the setup line → commit the flexible resource → take the guaranteed attack','Commit the flexible resource → reveal information → choose the setup line → attack','Take the attack first → reveal information → commit resources afterward',...(score>=55?['Retreat first → commit every resource → reveal information → attack']:[]),...(score>=80?['Skip the free information so the turn contains fewer actions']:[])];
 return {type:'Sequencing',title:'Information before commitment',difficulty:tier(score),prompt:'You have a free information action that does not remove any later option. After seeing it, you must choose between Setup A and Setup B. One flexible resource can support either setup, but becomes locked once committed. Your Active also has a guaranteed legal attack this turn. Which sequence preserves the most information and flexibility without giving up the attack?',choices,answer:0,why:'Use cost-free information before making an irreversible commitment. Then choose the setup, spend the flexible resource only after the choice is informed, and take the guaranteed attack.'};
}
function energyPuzzle(date,score,r){
 const needA=1+(score>=70?1:0),needB=2+(score>=45?1:0),attachments=score>=65?2:1,used=Math.min(attachments,needA);
 const choices=[`Use ${used} attachment${used===1?'':'s'} to turn on the immediate attacker, then place any remaining attachment toward the next attacker`,'Put every attachment onto the already-funded backup attacker','Split resources without first checking whether the current attack becomes available',...(score>=50?['Skip all attachments to preserve flexibility']:[])];
 return {type:'Energy Management',title:'Fund now without abandoning next turn',difficulty:tier(score),prompt:`Your current attacker needs ${needA} more Energy to use the required attack this turn. Your next attacker needs ${needB} Energy over future turns. A third backup is already fully funded. You have ${attachments} attachment${attachments===1?'':'s'} available now. Which allocation best improves the immediate line while preparing the next attacker when possible?`,choices,answer:0,why:'First fund the action that changes what you can do this turn. If an attachment remains after the immediate attacker is online, invest it in the next attacker instead of overfunding a backup that is already ready.'};
}
function endgamePuzzle(date,score,r){
 const choices=['Take the guaranteed 1-point Knock Out now and end the point race','Ignore the Active and prepare for the 2-point Benched target next turn','Retreat first to protect the attacker, then pass the turn',...(score>=50?['Spend extra setup resources before taking the same guaranteed Knock Out']:[]),...(score>=78?['Choose the line with the largest possible future damage instead of the guaranteed final point']:[])];
 return {type:'Endgame Training',title:'Separate winning value from flashy value',difficulty:tier(score),prompt:'The score is 2–2. Your Active can legally Knock Out the opponent’s 1-point Active right now. A 2-point Benched target could become reachable next turn, but cannot be Knocked Out this turn. No stated effect prevents the current attack. Which line has the highest competitive value?',choices,answer:0,why:'The guaranteed 1-point Knock Out reaches the winning score immediately. Future damage, larger targets, and extra setup have no value once the game can already be ended.'};
}
function generate(date,score,focusType=''){
 const r=rng(hash(`PocketNexus|adaptive|${date}|${score}`)),makers={'KO Math':koPuzzle,'Sequencing':sequencingPuzzle,'Energy Management':energyPuzzle,'Endgame Training':endgamePuzzle};
 const savedFocus=read().days?.[date]?.focusType,chosen=makers[focusType]?focusType:makers[savedFocus]?savedFocus:FOCUS_TYPES[(hash(date)+score)%FOCUS_TYPES.length],p=makers[chosen](date,score,r);
 return {...p,id:`adaptive-${date}-s${String(score).padStart(3,'0')}`,adaptive:true,difficultyScore:score,date,focusType:chosen};
}
function fromId(id){const m=String(id||'').match(/^adaptive-(\d{4}-\d{2}-\d{2})-s(\d{3})$/);return m?generate(m[1],Number(m[2])):null}
function todayPuzzle(){const x=ensureToday();return generate(x.day,x.score,x.focusType)}
const baseBrainPuzzle=brainPuzzle;
brainPuzzle=function(id){return fromId(id)||baseBrainPuzzle(id)};
const baseBrainAnswer=brainAnswer;
brainAnswer=function(id,choice){
 const before=brainRead().answers?.[id],p=brainPuzzle(id);baseBrainAnswer(id,choice);if(before||!p?.adaptive)return;
 const after=brainRead().answers?.[id];if(!after)return;
 const db=read();db.performance=db.performance||{};const row=db.performance[p.type]||{played:0,correct:0,wrong:0};row.played++;if(after.correct)row.correct++;else row.wrong++;row.lastAt=after.at||new Date().toISOString();db.performance[p.type]=row;write(db);
};
const baseBrainStats=brainStats;
brainStats=function(){const answers=brainRead().answers||{},rows=Object.entries(answers).filter(([id])=>!String(id).startsWith('adaptive-')),correct=rows.filter(([,a])=>a?.correct).length;return {done:rows.length,correct,accuracy:rows.length?Math.round(correct/rows.length*100):0}}
function adaptiveHistory(){const rows=Object.entries(brainRead().answers||{}).filter(([id])=>String(id).startsWith('adaptive-')),correct=rows.filter(([,a])=>a?.correct).length;return {played:rows.length,correct,accuracy:rows.length?Math.round(correct/rows.length*100):0}}
function adaptiveHtml(){
 const x=ensureToday(),p=todayPuzzle(),a=brainRead().answers?.[p.id],hist=adaptiveHistory(),acc=x.accuracyAtAssignment,stats=categoryStats(),focus=stats[x.focusType];
 return `<section class="brainAdaptiveDaily panel"><div class="brainAdaptiveHead"><div><span class="eyebrow">ADAPTIVE DAILY CHALLENGE</span><h2>Day ${x.day} • ${escA(tier(x.score))}</h2><p>Difficulty rises daily, while the category adapts to the decisions you miss most often.</p></div><div class="brainAdaptiveMeter"><strong>${x.score}</strong><span>Difficulty score</span></div></div><div class="brainAdaptiveMeta"><span>🎯 Focus: ${escA(x.focusType||p.type)}</span><span>${escA(x.focusReason||'Balanced rotation')}</span><span>${focus?.played?`${focus.accuracy}% in this skill • ${focus.played} reps`:'Building this skill baseline'}</span><span>${acc==null?'Building adaptive baseline':`${acc}% recent adaptive accuracy`}</span></div>${brainCard(p)}<div class="brainAdaptiveNote"><strong>${a?(a.correct?'✓ Completed today':'↺ Completed — this weakness remains weighted'):'New targeted challenge available today'}</strong><span>PocketNexus tracks accuracy by decision category. When a category stays below 75% after at least two reps, future daily challenges prioritize it until your results improve. Difficulty still continues rising day by day.</span></div></section>`;
}
const baseBrainSection=brainSection;
brainSection=function(){return adaptiveHtml()+baseBrainSection()}
function injectStyle(){if(document.getElementById('pnAdaptiveBrainStyle'))return;const s=document.createElement('style');s.id='pnAdaptiveBrainStyle';s.textContent=`.brainAdaptiveDaily{margin-bottom:16px;overflow:hidden}.brainAdaptiveHead{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.brainAdaptiveHead h2{margin:.2em 0}.brainAdaptiveHead p{margin:.35em 0;color:var(--muted)}.brainAdaptiveMeter{min-width:112px;text-align:center;padding:12px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.035)}.brainAdaptiveMeter strong{display:block;font-size:2rem}.brainAdaptiveMeter span{font-size:.7rem;color:var(--muted)}.brainAdaptiveMeta{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.brainAdaptiveMeta span{padding:6px 9px;border:1px solid var(--line);border-radius:999px;font-size:.72rem;color:var(--muted)}.brainAdaptiveDaily .brainCard{margin-top:12px}.brainAdaptiveNote{display:grid;gap:4px;margin-top:12px;padding:11px 13px;border-radius:12px;background:rgba(83,157,230,.07);border:1px solid rgba(83,157,230,.18)}.brainAdaptiveNote span{font-size:.75rem;color:var(--muted);line-height:1.45}@media(max-width:700px){.brainAdaptiveHead{display:grid}.brainAdaptiveMeter{width:100%}.brainAdaptiveMeta{display:grid}.brainAdaptiveMeta span{border-radius:10px}}`;document.head.appendChild(s)}
injectStyle();
window.PPCBrainAdaptive={version:'8.68.6',today:todayPuzzle,state:ensureToday,history:adaptiveHistory,tier,generate,categoryStats,chooseFocus};
})();
