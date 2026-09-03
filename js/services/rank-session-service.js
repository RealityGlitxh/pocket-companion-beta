(function(){
"use strict";

let data=null;
let status={loading:false,error:"",lastUpdated:0};

function getClient(){
  try{return window.getPPCCloudClient?.()||null}catch{return null}
}
function getData(){return data}
function getStatus(){return {...status}}
function clear(){data=null;status={loading:false,error:"",lastUpdated:0}}

async function rpc(name,args={}){
  const client=getClient();
  if(!client)throw new Error("Sign in to sync your Master Ball RP session.");
  const {data:payload,error}=await client.rpc(name,args);
  if(error)throw error;
  return payload;
}

async function fetchMine(){
  status={...status,loading:true,error:""};
  try{
    const payload=await rpc("get_my_master_ball_session");
    data=payload||null;
    status={loading:false,error:"",lastUpdated:Date.now()};
    return data;
  }catch(e){
    status={loading:false,error:e?.message||String(e),lastUpdated:Date.now()};
    throw e;
  }
}

async function start(startingRP){
  status={...status,loading:true,error:""};
  try{
    const payload=await rpc("start_master_ball_session",{p_starting_rp:Math.max(0,Number(startingRP)||0)});
    data=payload||null;
    status={loading:false,error:"",lastUpdated:Date.now()};
    return data;
  }catch(e){
    status={loading:false,error:e?.message||String(e),lastUpdated:Date.now()};
    throw e;
  }
}

async function record(sessionId,result){
  status={...status,loading:true,error:""};
  try{
    const payload=await rpc("record_master_ball_result",{p_session_id:sessionId,p_result:String(result||"").toLowerCase()});
    if(payload?.ok){
      data={
        ok:true,
        status:"session-active",
        session:{
          ...(data?.session||{}),
          id:payload.sessionId,
          current_rp:payload.currentRP,
          current_win_streak:payload.currentStreak,
          best_win_streak:payload.bestStreak,
          wins:payload.wins,
          losses:payload.losses,
          ties:payload.ties,
          streak_bonus_rp:Number(data?.session?.streak_bonus_rp||0)+Number(payload.streakBonus||0),
          updated_at:new Date().toISOString()
        },
        lastResult:payload
      };
    }
    status={loading:false,error:"",lastUpdated:Date.now()};
    return payload;
  }catch(e){
    status={loading:false,error:e?.message||String(e),lastUpdated:Date.now()};
    throw e;
  }
}


async function recordMatch(sessionId,matchId,result){
  status={...status,loading:true,error:""};
  try{
    const payload=await rpc("record_master_ball_match",{p_session_id:sessionId,p_match_id:String(matchId||""),p_result:String(result||"").toLowerCase()});
    if(payload?.ok){
      data={
        ok:true,
        status:"session-active",
        season:data?.season||null,
        session:{
          ...(data?.session||{}),
          id:payload.sessionId,
          current_rp:payload.currentRP,
          current_win_streak:payload.currentStreak,
          best_win_streak:payload.bestStreak,
          wins:payload.wins,
          losses:payload.losses,
          ties:payload.ties,
          streak_bonus_rp:payload.totalStreakBonusRP,
          total_rp_gained:payload.totalRPGained,
          updated_at:new Date().toISOString()
        },
        lastResult:payload
      };
    }
    status={loading:false,error:"",lastUpdated:Date.now()};
    return payload;
  }catch(e){status={loading:false,error:e?.message||String(e),lastUpdated:Date.now()};throw e}
}

async function undoMatch(sessionId,matchId){
  status={...status,loading:true,error:""};
  try{
    const payload=await rpc("undo_master_ball_match",{p_session_id:sessionId,p_match_id:String(matchId||"")});
    if(payload?.ok){
      data={
        ok:true,
        status:"session-active",
        season:data?.season||null,
        session:{
          ...(data?.session||{}),
          id:payload.sessionId,
          current_rp:payload.currentRP,
          current_win_streak:payload.currentStreak,
          best_win_streak:payload.bestStreak,
          wins:payload.wins,
          losses:payload.losses,
          ties:payload.ties,
          streak_bonus_rp:payload.totalStreakBonusRP,
          total_rp_gained:payload.totalRPGained,
          updated_at:new Date().toISOString()
        }
      };
    }
    status={loading:false,error:"",lastUpdated:Date.now()};
    return payload;
  }catch(e){status={loading:false,error:e?.message||String(e),lastUpdated:Date.now()};throw e}
}

window.PPCRankSessionService={fetchMine,start,record,recordMatch,undoMatch,getData,getStatus,clear};
})();
