export function buildDeckComparisonProposal({deck=null,remove=null,add=null}={}){
  const norm=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[’‘`´]/g,"'").replace(/[^a-z0-9' -]/g,' ').replace(/\s+/g,' ').trim();
  const cards=Array.isArray(deck?.cards)?deck.cards.map(c=>({...c,qty:Math.max(1,Number(c?.qty??c?.quantity??1)||1)}):[];
  if(!deck||!cards.length)return {ok:false,error:'A structured deck snapshot is required.'};
  if(!remove?.cardName||!add?.cardName)return {ok:false,error:'A structured remove and add recommendation is required.'};
  if(!String(add?.set||'').trim()||!String(add?.number??'').trim())return {ok:false,error:'The recommended add card is missing verified set/card identity.'};
  const removeIndex=cards.findIndex(c=>norm(c?.name)===norm(remove.cardName));
  if(removeIndex<0)return {ok:false,error:'The review card is not present in the saved deck snapshot.'};
  const current={...deck,cards:cards.map(c=>({...c}))};
  const proposedCards=cards.map(c=>({...c}));
  if(proposedCards[removeIndex].qty>1)proposedCards[removeIndex].qty-=1;else proposedCards.splice(removeIndex,1);
  const addIndex=proposedCards.findIndex(c=>norm(c?.name)===norm(add.cardName)&&String(c?.setCode||c?.set||'').toUpperCase()===String(add.set).toUpperCase()&&String(c?.number??'')===String(add.number??''));
  if(addIndex>=0)proposedCards[addIndex].qty+=1;else proposedCards.push({id:add?.id||`${add.set}-${add.number}`,name:String(add.cardName),setCode:String(add.set),number:String(add.number),qty:1});
  const proposed={...deck,id:`${deck?.id||'deck'}-coach-preview`,name:`${deck?.name||'Deck'} — Coach Preview`,cards:proposedCards};
  const total=d=>d.cards.reduce((n,c)=>n+Number(c.qty||1),0);
  return {ok:true,current,proposed,changes:{removed:{cardName:String(remove.cardName),qty:1},added:{cardName:String(add.cardName),set:String(add.set),number:String(add.number),qty:1}},currentTotal:total(current),proposedTotal:total(proposed)};
}
