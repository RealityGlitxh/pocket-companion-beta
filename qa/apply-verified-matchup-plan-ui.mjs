import fs from 'node:fs';
const path='js/features/pocket-coach-matchup-drilldown-v8.65.0.js';
let s=fs.readFileSync(path,'utf8');
const oldActions=`<div class="coachMatchupActions"><button type="button" onclick="coachAskAboutMatchup('${key}')">Ask Pocket Coach about this matchup</button><button class="secondary" type="button" onclick="coachOpenMetaFromMatchup()">Open Meta Center</button></div>`;
const newActions=`<div class="coachMatchupActions"><button type="button" onclick="coachBuildMatchupPlan('${key}')">Build Matchup Plan</button><button class="secondary" type="button" onclick="coachAskAboutMatchup('${key}')">Ask Pocket Coach</button><button class="secondary" type="button" onclick="coachOpenMetaFromMatchup()">Open Meta Center</button></div>`;
if(!s.includes(newActions)){if(!s.includes(oldActions))throw new Error('Missing matchup action anchor');s=s.replace(oldActions,newActions)}
const anchor=" window.coachOpenMetaFromMatchup=function(){window.coachCloseMatchupDetail();if(typeof window.headerNavigate==='function')window.headerNavigate('meta')};";
const fn=" window.coachBuildMatchupPlan=function(key){const x=registry.get(String(key));if(!x)return;const deck=x.deck?.deckName||x.deck?.archetypeName||'my deck',opp=x.threat?.opponentName||'this matchup';window.coachCloseMatchupDetail();const prompt=`Build a verified matchup plan for ${deck} into ${opp}. Use only PocketNexus verified matchup-plan and verified card-gameplay evidence. Separate OPENING SETUP, PRESERVE / PIVOT TOOLS, PRESSURE OPTIONS, GLOBAL META, and YOUR RESULTS. Do not invent an optimal turn order or opponent target priority when verified opponent card facts are missing. Explain what is board-state dependent.`;if(typeof window.coachUsePrompt==='function')window.coachUsePrompt(prompt);else{const input=document.getElementById('coachInput');if(input){input.value=prompt;input.focus()}}};\n"+anchor;
if(!s.includes('window.coachBuildMatchupPlan=function')){if(!s.includes(anchor))throw new Error('Missing matchup plan function anchor');s=s.replace(anchor,fn)}
fs.writeFileSync(path,s);
console.log('VERIFIED_MATCHUP_PLAN_UI_APPLIED');
