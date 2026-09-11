const {chromium}=require('playwright');
const assert=require('assert');

const widths=[1440,768,390];
const names=['QA Basic A','QA Basic B','QA Basic C','QA Basic D','QA Basic E','QA Trainer A','QA Trainer B','QA Trainer C','QA Review','QA Tech'];
const cards=names.map((name,i)=>({id:`qa-${i+1}`,name,category:i<5?'Pokémon':'Trainer',stage:i<5?'Basic':'Item',setCode:'QA',setName:'QA',number:String(i+1),image:'',rarity:''}));
const snapshot={id:'qa-deck',name:'QA Deck',archetype:'QA Archetype',energy:'Lightning',cards:names.slice(0,9).map((name,i)=>({id:`qa-${i+1}`,name,setCode:'QA',number:String(i+1),qty:i===0?4:2}))};
const proposed=JSON.parse(JSON.stringify(snapshot));
proposed.name='QA Deck — Coach Preview';proposed.id='qa-deck-coach-preview';
proposed.cards=proposed.cards.map(x=>({...x}));
const review=proposed.cards.find(x=>x.name==='QA Review');review.qty-=1;
proposed.cards.push({id:'qa-10',name:'QA Tech',setCode:'QA',number:'10',qty:1});
const report=[{deckId:'qa-deck',deckName:'QA Deck',archetypeName:'QA Archetype',archetypeMatchConfidence:'high',snapshotGeneratedAt:'2026-09-08T04:00:00Z',deckSnapshot:snapshot,metaRecommendations:[{action:'consider-add',cardName:'QA Tech',set:'QA',number:'10',confidence:'medium-meta'}],metaBenchmark:{recentClassifiedDecks:24,reliable:true,unusualReview:[]},topThreats:[{opponentName:'QA Threat',winRate:47,opponentUsagePct:12.5,matches:40,evidence:'high',band:'slightly-unfavorable'}],recommendations:[{action:'consider-matchup-tech',cardName:'QA Tech',set:'QA',number:'10',opponentArchetype:'QA Threat',confidence:'medium-directional',evidence:{deltaWinRate:9.2,cardGames:16,matchupGames:40}},{action:'review-for-matchup',cardName:'QA Review',set:'QA',number:'9',opponentArchetype:'QA Threat',confidence:'review-only',evidence:{deltaWinRate:-8.5,cardGames:14,matchupGames:40}}]}];

(async()=>{
  const browser=await chromium.launch({headless:true});
  for(const width of widths){
    const page=await browser.newPage({viewport:{width,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof window.coachMatchupReportHtml==='function'&&typeof window.coachPreviewDeckChange==='function');
    await page.waitForTimeout(1200);

    await page.evaluate(({cards,report,proposed})=>{
      CARDS.push(...cards);state.decks=[];state.selected=null;window.__qaSaveCalled=false;window.__qaOpened=null;window.__qaReport=report;
      window.save=()=>{window.__qaSaveCalled=true};window.openDeck=id=>{window.__qaOpened=id};
      window.getPPCCloudClient=()=>({functions:{invoke:async()=>({data:{comparison:true,changes:{removed:{cardName:'QA Review',qty:1},added:{cardName:'QA Tech',set:'QA',number:'10',qty:1}},current:report[0].deckSnapshot,proposed,currentAudit:{deckId:'qa-deck',deckName:'QA Deck',totalCards:20,counts:{basics:5,pokemon:10,trainers:10},legality:{status:'passes-known-rules',hardFailures:[]},evolutionIssues:[],consistencySignals:[]},proposedAudit:{deckId:'qa-deck-coach-preview',deckName:'QA Deck — Coach Preview',totalCards:20,counts:{basics:5,pokemon:10,trainers:10},legality:{status:'passes-known-rules',hardFailures:[]},evolutionIssues:[],consistencySignals:[]},currentTotal:20,proposedTotal:20},error:null})}});
      window.__qaRenderReport=()=>{
        let root=document.getElementById('qaCoachFixture');
        if(!root){root=document.createElement('div');root.id='qaCoachFixture';root.style.cssText='position:relative;z-index:3';document.body.appendChild(root)}
        root.innerHTML='<div id="qaReport">'+window.coachMatchupReportHtml(window.__qaReport)+'</div><textarea id="coachInput"></textarea>';
      };
      window.__qaRenderReport();
    },{cards,report,proposed});

    assert.equal(await page.locator('#qaCoachFixture .coachPreviewChange').count(),1,'supported recommendation should expose Preview Change');
    const unsupported=JSON.parse(JSON.stringify(report));delete unsupported[0].recommendations[0].set;delete unsupported[0].recommendations[0].number;
    const unsupportedCount=await page.evaluate(r=>{const x=document.createElement('div');x.innerHTML=window.coachMatchupReportHtml(r);return x.querySelectorAll('.coachPreviewChange').length},unsupported);
    assert.equal(unsupportedCount,0,'incomplete recommendation must not create a fake swap');

    const openComparison=async()=>{
      // Keep the deterministic Coach fixture outside #app so unrelated startup/cloud route
      // paints cannot detach the control while Playwright is clicking it.
      await page.evaluate(()=>{if(!document.querySelector('#qaCoachFixture .coachPreviewChange'))window.__qaRenderReport?.()});
      const trigger=page.locator('#qaCoachFixture .coachPreviewChange').first();
      await trigger.waitFor({state:'visible',timeout:5000});
      await trigger.click();
      await page.locator('#coachCompareBackdrop').waitFor({state:'visible',timeout:5000});
    };

    await openComparison();
    const text=(await page.locator('.coachComparePanel').innerText()).toLowerCase();
    for(const phrase of ['current deck','proposed deck','hard rule','structural','current meta','matchup evidence','strategy-dependent','keep current','try this version','ask coach why','−1 qa review','+1 qa tech'])assert(text.includes(phrase),`missing ${phrase}`);
    assert(!text.includes('proposed matchup wr'),'must not fabricate a proposed matchup win rate');
    const overflow=await page.locator('.coachComparePanel').evaluate(el=>el.scrollWidth-el.clientWidth);assert(overflow<=12,`comparison overflow ${overflow}px at ${width}`);

    const before=await page.evaluate(()=>JSON.stringify(state.decks));
    await page.getByRole('button',{name:'Keep Current'}).click();
    assert.equal(await page.evaluate(()=>JSON.stringify(state.decks)),before,'Keep Current mutated deck state');

    await openComparison();
    await page.getByRole('button',{name:'Ask Coach Why'}).click();
    assert((await page.locator('#coachInput').inputValue()).includes('QA Review')&&(await page.locator('#coachInput').inputValue()).includes('QA Tech'),'Ask Coach Why did not prepare swap prompt');

    await openComparison();
    const original=await page.evaluate(()=>JSON.stringify(state.decks));
    await page.getByRole('button',{name:'Try This Version'}).click();
    const saved=await page.evaluate(()=>({decks:state.decks.map(d=>({name:d.name,source:d.source,coachTest:d.coachTest,sourceDeckId:d.sourceDeckId,cards:d.cards})),saved:window.__qaSaveCalled}));
    assert.equal(saved.decks.length,1,'test deck not created separately');assert.equal(saved.decks[0].source,'coach-test');assert.equal(saved.decks[0].coachTest,true);assert.equal(saved.decks[0].sourceDeckId,'qa-deck');assert.equal(saved.saved,true);assert.equal(original,'[]','original deck test setup mutated before save');
    assert(!errors.some(x=>/Runtime Recovery/i.test(x)),`runtime recovery error: ${errors.join('\n')}`);
    await page.close();
  }
  await browser.close();console.log('POCKET_COACH_BEFORE_AFTER_BROWSER_QA_OK');
})().catch(e=>{console.error(e);process.exit(1)});