import fs from 'node:fs';
import vm from 'node:vm';

const featurePath='js/features/streamer-tournament-auto-link-v8.73.1.js';
const renderHotfixPath='js/features/streamer-tournament-auto-link-render-hotfix-v8.73.2.js';
const servicePath='js/services/limitless-live-table-service-v8.68.1.js';
const loaderPath='js/features/route-feature-loader-v8.64.1.js';
const indexPath='index.html';
const proxyPath='supabase/functions/limitless-refresh/index.ts';
const src=fs.readFileSync(featurePath,'utf8');
const renderHotfix=fs.readFileSync(renderHotfixPath,'utf8');
const service=fs.readFileSync(servicePath,'utf8');
const loader=fs.readFileSync(loaderPath,'utf8');
const index=fs.readFileSync(indexPath,'utf8');
const proxy=fs.readFileSync(proxyPath,'utf8');

function assert(ok,msg){if(!ok)throw new Error(msg)}

assert(loader.includes('limitless-live-table-service-v8.68.1.js?v=873400'),'Streamer route did not bust the live Limitless service cache');
assert(loader.includes('streamer-tournament-auto-link-v8.73.1.js?v=873200'),'Streamer route does not load tournament auto-link feature');
assert(loader.includes('streamer-tournament-auto-link-render-hotfix-v8.73.2.js?v=873200'),'Streamer route does not load tournament render hotfix');
assert(loader.includes('PPCStreamerTournamentAutoLinkRenderHotfix'),'Streamer ready gate does not require tournament render hotfix');
assert(index.includes('route-feature-loader-v8.64.1.js?v=873400'),'index.html did not bust the route-loader cache for the live tournament proxy fix');
assert(service.includes("version:'8.73.4'"),'Limitless live service version was not advanced for the proxy fix');
assert(service.includes("functions/v1/limitless-refresh"),'Limitless service is not using the PocketNexus Supabase proxy');
assert(service.includes("scope:'lookup'"),'Limitless service is not requesting lookup mode from the proxy');
assert(proxy.includes('body.scope==="lookup"'),'Limitless refresh Edge Function does not support live lookup mode');
assert(proxy.includes('/details`)')||proxy.includes('/details`,'),'Limitless proxy is not using the official tournament details endpoint');
assert(proxy.includes('/standings`)')||proxy.includes('/standings`,'),'Limitless proxy is not loading standings');
assert(proxy.includes('/pairings`)')||proxy.includes('/pairings`,'),'Limitless proxy is not loading pairings');
assert(renderHotfix.includes('wrappedStreamerPage'),'Tournament render hotfix does not wrap streamerPage');
assert(renderHotfix.includes('PPCStreamerTournamentAutoLink.patch'),'Tournament render hotfix does not force the auto-link patch');
assert(src.includes('playerByTournament'),'Per-tournament player association is missing');
assert(src.includes('PPCTournamentService'),'Existing PocketNexus tournament service is not reused');
assert(src.includes('PPCLimitlessLiveTable.fetchTournament'),'Existing Limitless fetch service is not reused');
assert(src.includes('publishStreamerOverlayState'),'OBS/local overlay publication bridge is not updated');
assert(src.includes('Change Tournament')&&src.includes('Refresh'),'Connected tournament controls are missing');
assert(src.includes('Tournament Link')&&src.includes('Load Tournament'),'Initial one-link setup controls are missing');
assert(src.includes('Tournament found. Select your player to finish setup.'),'Player-selection fallback messaging is missing');

const document={
  documentElement:{},
  getElementById(){return null},
  querySelector(){return null},
  querySelectorAll(){return []},
  createElement(){return {id:'',textContent:''}},
  head:{appendChild(){}},
};
class MutationObserver{observe(){} disconnect(){}}
const limitlessStub={
  tournamentId(input){
    const raw=String(input??'').trim();
    const m=raw.match(/(?:tournament\/|tournaments\/)([a-zA-Z0-9_-]+)/i);
    return m?m[1]:raw.replace(/^\/+|\/+$/g,'').split('/')[0];
  },
  rounds(){return []},
  async fetchTournament(){return {id:'stub',details:{name:'Live Tournament',status:'ongoing'},players:[],pairings:[]}},
};
const context={
  console,
  URL,
  window:{},
  document,
  state:{page:'dashboard',streamer:{}},
  MutationObserver,
  requestAnimationFrame(fn){fn()},
  setInterval(){return 1},
  clearInterval(){},
  setTimeout,
  clearTimeout,
  PPCLimitlessLiveTable:limitlessStub,
};
context.window=context;
vm.createContext(context);
vm.runInContext(src,context,{filename:featurePath});
const test=context.PPCStreamerTournamentAutoLink?._test;
assert(test,'Feature did not expose test helpers');

const valid=test.validInput('https://play.limitlesstcg.com/tournament/abc_123/standings');
assert(valid.ok&&valid.id==='abc_123','Standard Limitless standings URL was not accepted');
assert(test.validInput('https://play.limitlesstcg.com/tournament/abc_123/pairings').ok,'Pairings URL was not accepted');
assert(test.validInput('https://play.limitlesstcg.com/tournament/abc_123/decklists').ok,'Decklists URL was not accepted');
assert(!test.validInput('https://example.com/tournament/abc_123').ok,'Non-Limitless URL should be rejected');

assert(test.formatRecord('4-0')==='4-0','4-0 record formatting failed');
assert(test.formatRecord('3-1-0')==='3-1','Zero ties should be omitted');
assert(test.formatRecord('3-1-1')==='3-1-1','Nonzero ties should be preserved');
assert(test.formatRecord({wins:5,losses:2,ties:0})==='5-2','Object record formatting failed');

assert(test.inferStage({status:'completed'},4)==='Completed','Completed stage mapping failed');
assert(test.inferStage({phase:'Swiss'},4)==='Swiss','Swiss stage mapping failed');
assert(test.inferStage({stage:'Top 8'},'Top 8')==='Top 8','Top 8 stage mapping failed');
assert(test.inferStage({phase:'Semifinals'},'Semifinals')==='Top 4','Semifinal stage mapping failed');
assert(test.inferStage({status:'registration'},'')==='Registration','Registration stage mapping failed');
assert(test.formatRound(4,'Swiss')==='Round 4','Numeric round formatting failed');
assert(test.formatRound('Semifinals','Top 4')==='Semifinals','Semifinal round formatting failed');

console.log('TOURNAMENT_AUTO_LINK_QA_GREEN');
