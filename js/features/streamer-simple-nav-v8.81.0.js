/* PocketNexus V8.81.0 — simple Streamer Center navigation */
(function(){
'use strict';
if(window.PPCStreamerSimpleNav)return;
const safe=(fn,f=null)=>{try{return fn()}catch{return f}};
const VIEWS={setup:{label:'Setup',icon:'⚙',desc:'Choose your deck, tournament, players, and stream workspace.'},live:{label:'Live Control',icon:'●',desc:'The controls you need while the stream is running.'},overlay:{label:'Overlay',icon:'▣',desc:'Preview and configure the OBS browser source.'},activity:{label:'Activity',icon:'↻',desc:'Recent matches, session performance, and stream history.'}};
function classify(panel){
 const t=((panel.dataset.streamerSection||'')+' '+(panel.textContent||'')).toLowerCase();
 if(panel.classList.contains('pnObsStudio'))return'overlay';
 if(/recent matches|session performance|history|activity/.test(t))return'activity';
 if(/live session|quick match|current rank|matchup|score|caster|journey controls/.test(t))return'live';
 if(/mode|setup|creator expansion|tournament setup|player source|deck/.test(t))return'setup';
 return'live';
}
function current(){return safe(()=>sessionStorage.getItem('ppc_streamer_nav'),'live')||'live'}
function setView(view,focus=true){
 if(!VIEWS[view])view='live';safe(()=>sessionStorage.setItem('ppc_streamer_nav',view));
 const app=document.getElementById('app');if(!app)return;app.dataset.pnStreamView=view;
 app.querySelectorAll('.pnStreamerNav button').forEach(b=>{const on=b.dataset.view===view;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on))});
 if(focus){const target=app.querySelector('[data-pn-nav-group="'+view+'"]');target?.scrollIntoView?.({behavior:'smooth',block:'start'})}
}
function nav(){
 const el=document.createElement('nav');el.className='pnStreamerNav';el.setAttribute('aria-label','Streamer Center sections');el.setAttribute('role','tablist');
 Object.entries(VIEWS).forEach(([key,v])=>{const b=document.createElement('button');b.type='button';b.dataset.view=key;b.setAttribute('role','tab');b.innerHTML='<span class="pnNavIcon">'+v.icon+'</span>'+v.label;b.onclick=()=>setView(key);el.appendChild(b)});
 return el;
}
function markGroups(app){
 const panels=[...app.querySelectorAll(':scope > .panel, :scope > .pnObsStudio, :scope > div > .panel, :scope > div > .pnObsStudio')];
 panels.forEach(p=>{if(p.closest('.streamerWorkspaceTabs,.streamerWorkspaceIntro,.pnStreamerNav'))return;if(p.hidden||p.style.display==='none')return;p.dataset.pnNavGroup=classify(p)});
 const studio=app.querySelector('.pnObsStudio');if(studio)studio.dataset.pnNavGroup='overlay';
}
function addHeading(app,view){
 const first=app.querySelector('[data-pn-nav-group="'+view+'"]');if(!first)return;
 const prev=first.previousElementSibling;if(prev?.classList?.contains('pnStreamerSectionHead'))return;
 const v=VIEWS[view],h=document.createElement('div');h.className='pnStreamerSectionHead';h.dataset.pnNavGroup=view;h.innerHTML='<div><h2>'+v.label+'</h2><p>'+v.desc+'</p></div>';first.before(h)
}
function apply(){
 if(safe(()=>state.page,'')!=='streamer')return;const app=document.getElementById('app');if(!app)return;
 app.querySelectorAll('.pnStreamerSectionHead').forEach(x=>x.remove());
 let n=app.querySelector('.pnStreamerNav');if(!n){n=nav();const tabs=app.querySelector('.streamerWorkspaceTabs');const intro=app.querySelector('.streamerWorkspaceIntro');(intro||tabs||app.firstElementChild)?.after(n)}
 markGroups(app);Object.keys(VIEWS).forEach(v=>addHeading(app,v));setView(current(),false)
}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;apply()}))}
function install(){if(typeof window.streamerPage==='function'&&!window.streamerPage.__simpleNav){const base=window.streamerPage;window.streamerPage=function(){const out=base.apply(this,arguments);schedule();return out};window.streamerPage.__simpleNav=true}schedule()}
const mo=new MutationObserver(()=>{if(safe(()=>state.page,'')==='streamer')schedule()});mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
install();window.PPCStreamerSimpleNav={version:'8.81.0',apply,setView,install};
})();