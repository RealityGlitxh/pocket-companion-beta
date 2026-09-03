(function(){
  function esc(v){return String(v??'').replace(/[&<>\"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'})[c]})}
  function modal(){return document.getElementById('cardModal')}
  function body(){return document.getElementById('cardModalBody')}
  function close(){const m=modal();if(m)m.style.display='none'}
  function open({eyebrow='',title='',message='',html='',actions=[]}={}){
    const m=modal(),b=body();if(!m||!b)return false;
    b.innerHTML=`<div class="ppcDialog"><div class="between"><div>${eyebrow?`<span class="eyebrow">${eyebrow}</span>`:''}<h2>${title||'PocketNexus'}</h2></div><button class="secondary" type="button" onclick="PPCUI.close()">Close</button></div>${message?`<p class="muted">${message}</p>`:''}${html||''}<div class="row ppcDialogActions">${actions.map(a=>`<button type="button" class="${a.className||''}" onclick="${a.onclick||'PPCUI.close()'}">${a.label||'OK'}</button>`).join('')}</div></div>`;
    m.style.display='flex';return true;
  }
  function notice(message,{title='Done',tone='success'}={}){
    const cls=tone==='danger'?'dangerBox':tone==='warning'?'warningBox':'successBox';
    return open({title,html:`<div class="${cls}" style="white-space:pre-wrap">${esc(message)}</div>`,actions:[{label:'OK',onclick:'PPCUI.close()'}]});
  }
  window.PPCUI={open,close,notice};
  window.alert=function(message){notice(message,{title:'PocketNexus'});};
})();
