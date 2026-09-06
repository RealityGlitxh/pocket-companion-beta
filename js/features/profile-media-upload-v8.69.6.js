/* PocketNexus V8.69.6 — profile icon/banner upload enhancement */
(function(){
'use strict';
if(window.PPCProfileMedia)return;
const BUCKET='profile-media';
const MAX=5*1024*1024;
const TYPES=new Set(['image/png','image/jpeg','image/webp']);
let selected={avatar:null,banner:null};
let removed={avatar:false,banner:false};
let busy=false;

function client(){return window.getPPCCloudClient?.()||window.cloudClient||null}
function session(){return window.getPPCCloudSession?.()||window.cloudSession||null}
function ext(file){const t=file?.type||'';return t==='image/png'?'png':t==='image/webp'?'webp':'jpg'}
function current(kind){const p=window.cloudProfile||{};return kind==='avatar'?p.avatar_url:p.banner_url}
function esc(v){return typeof window.esc==='function'?window.esc(v):String(v??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function validate(file){if(!file)return 'Choose an image first.';if(!TYPES.has(file.type))return 'Use a PNG, JPG, or WEBP image.';if(file.size>MAX)return 'Image must be 5 MB or smaller.';return ''}
function notify(msg){try{window.ppcNotice?.(msg)}catch{} }

function preview(kind,file){const box=document.querySelector(`[data-profile-media-preview="${kind}"]`);if(!box)return;const url=file?URL.createObjectURL(file):(removed[kind]?'':current(kind));box.classList.toggle('empty',!url);box.style.backgroundImage=url?`url("${String(url).replace(/"/g,'\\"')}")`:'';box.innerHTML=url?'':`<span>${kind==='avatar'?'Add profile icon':'Add profile banner'}</span>`}
function pick(kind,input){const file=input?.files?.[0]||null;const err=validate(file);if(err){notify(err);input.value='';return}selected[kind]=file;removed[kind]=false;preview(kind,file);const name=document.querySelector(`[data-profile-media-name="${kind}"]`);if(name)name.textContent=file.name}
function remove(kind){selected[kind]=null;removed[kind]=true;const hidden=document.getElementById(kind==='avatar'?'pfAvatar':'pfBanner');if(hidden)hidden.value='';const input=document.querySelector(`[data-profile-media-input="${kind}"]`);if(input)input.value='';const name=document.querySelector(`[data-profile-media-name="${kind}"]`);if(name)name.textContent='No image selected';preview(kind,null)}
async function upload(kind,file){
 const c=client(),uid=session()?.user?.id;if(!c||!uid)throw new Error('Sign in to upload profile images.');
 const errorText=validate(file);if(errorText)throw new Error(errorText);
 const path=`${uid}/${kind}-${Date.now()}.${ext(file)}`;
 const {error}=await c.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
 if(error)throw error;
 const {data}=c.storage.from(BUCKET).getPublicUrl(path);
 if(!data?.publicUrl)throw new Error('Could not create the public image URL.');
 return data.publicUrl;
}
function setBusy(on){busy=on;const btn=document.querySelector('#profileEditPanel [data-profile-media-save]');if(btn){btn.disabled=on;btn.textContent=on?'Saving…':'Save changes'}document.querySelectorAll('#profileEditPanel input,#profileEditPanel select,#profileEditPanel textarea,#profileEditPanel button').forEach(el=>{if(el!==btn&&el.dataset.profileMediaClose!=='1')el.disabled=on})}
async function save(){
 if(busy)return;setBusy(true);
 try{
  const avatar=document.getElementById('pfAvatar'),banner=document.getElementById('pfBanner');
  if(selected.avatar&&avatar)avatar.value=await upload('avatar',selected.avatar);
  else if(removed.avatar&&avatar)avatar.value='';
  if(selected.banner&&banner)banner.value=await upload('banner',selected.banner);
  else if(removed.banner&&banner)banner.value='';
  if(typeof window.__ppcOriginalProfileSave==='function')await window.__ppcOriginalProfileSave();
  else if(typeof window.profileSave==='function'&&window.profileSave!==save)await window.profileSave();
  selected={avatar:null,banner:null};removed={avatar:false,banner:false};
  document.getElementById('profileEditPanel')?.close();notify('✓ Profile updated');
 }catch(e){console.error('Profile media save failed',e);notify(e?.message||'Profile image upload failed.');}
 finally{setBusy(false)}
}
function uploadCard(kind,title,help){const url=current(kind);return `<div class="profileMediaField"><div class="profileMediaFieldTop"><div><strong>${title}</strong><small>${help}</small></div>${url?`<button type="button" class="textButton" onclick="PPCProfileMedia.remove('${kind}')">Remove</button>`:''}</div><label class="profileMediaDrop ${kind}"><span data-profile-media-preview="${kind}" class="profileMediaPreview ${url?'':'empty'}" ${url?`style="background-image:url('${esc(url)}')"`:''}>${url?'':`<span>${kind==='avatar'?'Add profile icon':'Add profile banner'}</span>`}</span><span class="profileMediaChoose"><b>Upload image</b><small data-profile-media-name="${kind}">${url?'Replace current image':'PNG, JPG or WEBP · max 5 MB'}</small></span><input data-profile-media-input="${kind}" type="file" accept="image/png,image/jpeg,image/webp" onchange="PPCProfileMedia.pick('${kind}',this)"></label></div>`}
function enhance(){
 const d=document.getElementById('profileEditPanel');if(!d||d.dataset.mediaEnhanced==='1')return;
 d.dataset.mediaEnhanced='1';d.classList.add('profileEditDialogMedia');
 const avatar=document.getElementById('pfAvatar'),banner=document.getElementById('pfBanner');
 if(avatar){avatar.type='hidden';const label=avatar.closest('label');if(label){label.classList.add('profileMediaHost');label.insertAdjacentHTML('afterend',uploadCard('avatar','Profile icon','Shown beside your name across PocketNexus.'));label.style.display='none'}}
 if(banner){banner.type='hidden';const label=banner.closest('label');if(label){label.classList.add('profileMediaHost');label.insertAdjacentHTML('afterend',uploadCard('banner','Profile banner','Wide image shown at the top of your public profile.'));label.style.display='none'}}
 const saveBtn=[...d.querySelectorAll('button')].find(b=>/save profile|save changes/i.test(b.textContent||''));
 if(saveBtn){saveBtn.dataset.profileMediaSave='1';saveBtn.textContent='Save changes';saveBtn.removeAttribute('onclick');saveBtn.type='button';saveBtn.addEventListener('click',save)}
 const close=d.querySelector('.profileDialogClose');if(close)close.dataset.profileMediaClose='1';
 const title=d.querySelector('h2');if(title)title.textContent='Customize your profile';
 const intro=d.querySelector('.eyebrow');if(intro)intro.textContent='EDIT PUBLIC PROFILE';
}
function install(){
 if(typeof window.profileSave==='function'&&!window.__ppcOriginalProfileSave)window.__ppcOriginalProfileSave=window.profileSave;
 const original=window.profilePage;
 if(typeof original==='function'&&!original.__profileMediaWrapped){
   const wrapped=function(){const out=original.apply(this,arguments);queueMicrotask(enhance);setTimeout(enhance,30);return out};wrapped.__profileMediaWrapped=true;window.profilePage=wrapped;
 }
 queueMicrotask(enhance);setTimeout(enhance,50);
}
window.PPCProfileMedia={pick,remove,save,enhance,install};

const style=document.createElement('style');style.id='profile-media-upload-v8696';style.textContent=`
.profileEditDialogMedia{width:min(920px,calc(100vw - 28px))!important;max-height:min(88vh,900px)!important;padding:28px!important;border:1px solid rgba(120,151,190,.25)!important;border-radius:22px!important;background:linear-gradient(180deg,#0a111a,#071019)!important;box-shadow:0 28px 90px rgba(0,0,0,.55)!important}.profileEditDialogMedia::backdrop{background:rgba(0,5,12,.78);backdrop-filter:blur(8px)}.profileEditDialogMedia h2{font-size:clamp(1.65rem,3vw,2.25rem);margin:4px 0 22px}.profileEditDialogMedia .formGrid{gap:18px 16px}.profileMediaField{display:grid;gap:9px}.profileMediaFieldTop{display:flex;justify-content:space-between;gap:12px;align-items:end}.profileMediaFieldTop>div{display:grid;gap:2px}.profileMediaFieldTop strong{font-size:.9rem}.profileMediaFieldTop small{color:var(--muted);font-size:.74rem}.profileMediaDrop{display:flex!important;align-items:center;gap:14px;padding:12px!important;border:1px dashed rgba(129,170,219,.34)!important;border-radius:15px!important;background:rgba(12,24,37,.72)!important;cursor:pointer;transition:.16s ease;min-height:106px}.profileMediaDrop:hover{border-color:rgba(117,194,255,.72)!important;background:rgba(16,31,47,.88)!important}.profileMediaPreview{display:flex;align-items:center;justify-content:center;flex:0 0 auto;background-position:center;background-size:cover;background-color:#101c2a;border:1px solid rgba(255,255,255,.12);overflow:hidden}.profileMediaDrop.avatar .profileMediaPreview{width:82px;height:82px;border-radius:22px}.profileMediaDrop.banner .profileMediaPreview{width:150px;height:82px;border-radius:14px}.profileMediaPreview.empty span{font-size:.68rem;text-align:center;color:var(--muted);padding:8px}.profileMediaChoose{display:grid;gap:5px;min-width:0}.profileMediaChoose b{font-size:.95rem}.profileMediaChoose small{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:250px}.profileMediaDrop input[type=file]{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}.profileEditDialogMedia [data-profile-media-save]{margin-left:auto;min-width:150px}.profileEditDialogMedia .profileDialogClose{position:sticky;top:0;float:right;z-index:2}.profileEditDialogMedia textarea{min-height:116px}.profileEditDialogMedia select[multiple]{min-height:122px}
@media(max-width:680px){.profileEditDialogMedia{padding:20px!important}.profileEditDialogMedia .formGrid{grid-template-columns:1fr!important}.profileMediaDrop{align-items:flex-start}.profileMediaDrop.banner .profileMediaPreview{width:118px;height:76px}.profileMediaChoose small{max-width:180px}}
`;document.head.appendChild(style);
install();
})();