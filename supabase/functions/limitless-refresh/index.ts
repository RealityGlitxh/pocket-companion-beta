import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const API="https://play.limitlesstcg.com/api/tournaments";
const PAGE_SIZE=50,COOLDOWN_MS=2*60*1000;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function serverClient(){const url=Deno.env.get("SUPABASE_URL"),raw=Deno.env.get("SUPABASE_SECRET_KEYS");if(!url||!raw)throw new Error("Supabase server credentials unavailable");const keys=JSON.parse(raw),key=keys.default??Object.values(keys)[0];if(!key)throw new Error("No Supabase server key found");return createClient(url,String(key),{auth:{persistSession:false,autoRefreshToken:false}})}
async function fetchJson(url:string,retries=2){let last:any;for(let i=0;i<=retries;i++){const c=new AbortController(),timer=setTimeout(()=>c.abort(),15000);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:"application/json","User-Agent":"PocketNexus/8.73"}});if(!r.ok)throw new Error(`Limitless ${r.status} ${r.statusText}`);return await r.json()}catch(e){last=e;if(i<retries)await sleep(500*Math.pow(2,i))}finally{clearTimeout(timer)}}throw last}
function err(e:any){return e instanceof Error?e.message:String(e)}
async function lookupTournament(id:string){
  const clean=String(id||"").trim();
  if(!/^[A-Za-z0-9_-]{1,96}$/.test(clean))throw new Error("Invalid tournament ID");
  const e=encodeURIComponent(clean);
  const settled=await Promise.allSettled([
    fetchJson(`${API}/${e}/details`),
    fetchJson(`${API}/${e}/standings`),
    fetchJson(`${API}/${e}/pairings`)
  ]);
  const details=settled[0].status==="fulfilled"?settled[0].value:null;
  const standings=settled[1].status==="fulfilled"&&Array.isArray(settled[1].value)?settled[1].value:[];
  const pairings=settled[2].status==="fulfilled"&&Array.isArray(settled[2].value)?settled[2].value:[];
  if(!details&&!standings.length&&!pairings.length){const reasons=settled.filter(x=>x.status==="rejected").map((x:any)=>err(x.reason));throw new Error(reasons[0]||"Tournament not found")}
  return {ok:true,status:"lookup",tournamentId:clean,details,standings,pairings,fetchedAt:new Date().toISOString()};
}
Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});const db=serverClient();try{let body:any={};try{body=await req.json()}catch{}
if(body.scope==="lookup"){
  const result=await lookupTournament(body.tournamentId);
  return Response.json(result,{headers:{...CORS,"Cache-Control":"no-store"}});
}
const scope=body.scope==="backfill"?"backfill":"recent",force=body.force===true,maxPages=Math.min(10,Math.max(1,Number(body.maxPages??(scope==="backfill"?4:3))||3));const {data:state}=await db.from("meta_collector_state").select("*").eq("collector","limitless-discovery").maybeSingle();const last=state?.last_started_at?new Date(state.last_started_at).getTime():0;if(!force&&last&&Date.now()-last<COOLDOWN_MS)return Response.json({ok:true,status:"cooldown",retryAfterSeconds:Math.ceil((COOLDOWN_MS-(Date.now()-last))/1000)},{headers:CORS});await db.from("meta_collector_state").update({last_started_at:new Date().toISOString(),updated_at:new Date().toISOString(),last_error:null}).eq("collector","limitless-discovery");const {data:source,error:sourceErr}=await db.from("meta_sources").select("id").eq("name","Limitless TCG").single();if(sourceErr||!source)throw sourceErr??new Error("Limitless source row missing");let page=scope==="backfill"?Math.max(1,Number(state?.next_backfill_page||1)):1;const startPage=page;let pagesFetched=0,totalRows=0,upserted=0,reachedEnd=false;const seen:string[]=[];for(let n=0;n<maxPages;n++,page++){const rows=await fetchJson(`${API}?game=POCKET&limit=${PAGE_SIZE}&page=${page}`);if(!Array.isArray(rows))throw new Error("Limitless tournament list was not an array");pagesFetched++;totalRows+=rows.length;seen.push(...rows.map((x:any)=>String(x?.id||"")).filter(Boolean));const {data:count,error:ingestErr}=await db.rpc("ingest_limitless_tournament_listings",{p_source_id:source.id,p_rows:rows,p_page:page});if(ingestErr)throw ingestErr;upserted+=Number(count||0);if(rows.length<PAGE_SIZE){reachedEnd=true;break}await sleep(250)}const nextBackfill=scope==="backfill"?(reachedEnd?1:page):Number(state?.next_backfill_page||1),now=new Date().toISOString();await db.from("meta_collector_state").update({last_success_at:now,last_error:null,next_backfill_page:nextBackfill,total_discovered:Number(state?.total_discovered||0)+upserted,metadata:{scope,startPage,pagesFetched,totalRows,reachedEnd,lastIds:seen.slice(0,10)},updated_at:now}).eq("collector","limitless-discovery");await db.from("meta_sources").update({last_success_at:now,last_error:null,updated_at:now}).eq("name","Limitless TCG");return Response.json({ok:true,status:"success",scope,startPage,pagesFetched,totalRows,upserted,reachedEnd,nextBackfillPage:nextBackfill},{headers:CORS})}catch(e){const message=err(e),now=new Date().toISOString();try{await db.from("meta_collector_state").update({last_error:message,updated_at:now}).eq("collector","limitless-discovery")}catch{}try{await db.from("meta_sources").update({last_error:message,updated_at:now}).eq("name","Limitless TCG")}catch{}return Response.json({ok:false,error:message},{status:500,headers:CORS})}});