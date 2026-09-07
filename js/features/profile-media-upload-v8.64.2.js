/* PocketNexus V8.64.2 — profile avatar/banner uploads via Supabase Storage */
(function(){
 const BUCKET='profile-media';
 const MAX_BYTES=5*1024*1024;
 const ALLOWED=new Set(['image/jpeg','image/png','image/webp']);
 let avatarFile=null,bannerFile=null;
 let avatarObjectUrl='',bannerObjectUrl='';

 function notice(msg){try{if(typeof ppcNotice==='function')return ppcNotice(msg)}catch{};console.warn(msg)}
 function currentProfile(){return window.cloudProfile||{} }
 function signed(){try{return typeof ptSigned==='function'&&ptSigned()}catch{return !!window.cloudSession?.user}}
 function client(){try{return typeof ptClient==='function'?ptClient():(window.getPPCCloudClient?.()||window.cloudClient)}catch{return window.cloudClient}}
 function session(){try{return typeof ptSession==='function'?ptSession():(window.getPPCCloudSession?.()||window.cloudSession)}catch{return window.cloudSession}}
 function validFile(file){
  if(!file)return 'Choose an image first.';
  if(!ALLOWED.has(file.type))return 'Use a PNG, JPG, or WebP image.';
  if(file.size>MAX_BYTES)return 'Image must be 5 MB or smaller.';
  return '';
 }
 function extFor(file){return file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'}
 function initials(){const p=currentProfile(),n=String(p.display_name||p.username||window.state?.user||'P').trim();return (n[0]||'P').toUpperCase()}
 function clearObject(kind){const key=kind==='avatar'?'avatarObjectUrl':'bannerObjectUrl';const url=kind==='avatar'?avatarObjectUrl:bannerObjectUrl;if(url)URL.revokeObjectURL(url);if(kind==='avatar')avatarObjectUrl='';else bannerObjectUrl=''}
 function previewUrl(kind){
  if(kind==='avatar'&&avatarFile){if(!avatarObjectUrl)avatarObjectUrl=URL.createObjectURL(avatarFile);return avatarObjectUrl}
  if(kind==='banner'&&bannerFile){if(!bannerObjectUrl)bannerObjectUrl=URL.createObjectURL(bannerFile);return bannerObjectUrl}
  const el=document.getElementById(kind==='avatar'?'pfAvatar':'pfBanner');return String(el?.value||'').trim();
 }
 function renderPreview(kind){
  const box=document.querySelector(`[data-profile-media-preview="${kind}"]`);if(!box)return;
  const url=previewUrl(kind);
  if(kind==='avatar'){
   box.innerHTML=url?`<img src="${String(url).replace(/"/g,'&quot;')}" alt="Avatar preview">`:`<span>${initials()}</span>`;
  }else{
   box.innerHTML=url?`<img src="${String(url).replace(/"/g,'&quot;')}" alt="Banner preview">`:`<div class="profileMediaBannerEmpty"><strong>Banner preview</strong><small>Add a wide image for your public profile.</small></div>`;
  }
 }
 function choose(kind){document.getElementById(kind==='avatar'?'pfAvatarUpload':'pfBannerUpload')?.click()}
 function selected(kind,input){
  const file=input?.files?.[0]||null,err=validFile(file);if(err){notice(err);if(input)input.value='';return}
  clearObject(kind);
  if(kind==='avatar')avatarFile=file;else bannerFile=file;
  renderPreview(kind);
  const status=document.querySelector(`[data-profile-media-status="${kind}"]`);if(status)status.textContent=`Ready to upload • ${(file.size/1024/1024).toFixed(1)} MB`;
 }
 function remove(kind){
  clearObject(kind);if(kind==='avatar')avatarFile=null;else bannerFile=null;
  const hidden=document.getElementById(kind==='avatar'?'pfAvatar':'pfBanner');if(hidden)hidden.value='';
  const input=document.getElementById(kind==='avatar'?'pfAvatarUpload':'pfBannerUpload');if(input)input.value='';
  const status=document.querySelector(`[data-profile-media-status="${kind}"]`);if(status)status.textContent='No image selected';
  renderPreview(kind);
 }
 async function upload(kind,file){
  const err=validFile(file);if(err)throw new Error(err);
  if(!signed())throw new Error('Sign in to upload profile images.');
  const c=client(),uid=session()?.user?.id;if(!c||!uid)throw new Error('Cloud session is unavailable.');
  const path=`${uid}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${extFor(file)}`;
  const result=await c.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
  if(result.error)throw result.error;
  const pub=c.storage.from(BUCKET).getPublicUrl(path);
  const url=pub?.data?.publicUrl;if(!url)throw new Error('Upload succeeded but the public image URL was unavailable.');
  return url;
 }
 async function save(){
  const btn=document.querySelector('#profileEditPanel [data-profile-media-save]');if(btn){btn.disabled=true;btn.textContent='Saving…'}
  try{
   if(avatarFile){const s=document.querySelector('[data-profile-media-status="avatar"]');if(s)s.textContent='Uploading avatar…';document.getElementById('pfAvatar').value=await upload('avatar',avatarFile)}
   if(bannerFile){const s=document.querySelector('[data-profile-media-status="banner"]');if(s)s.textContent='Uploading banner…';document.getElementById('pfBanner').value=await upload('banner',bannerFile)}
   if(typeof window.__profileMediaOriginalSave!=='function')throw new Error('Profile save handler is unavailable.');
   await window.__profileMediaOriginalSave();
   avatarFile=null;bannerFile=null;clearObject('avatar');clearObject('banner');
   document.getElementById('profileEditPanel')?.close();
  }catch(e){console.error('Profile media save failed',e);notice(e?.message||'Could not save profile images.');if(btn){btn.disabled=false;btn.textContent='Save Profile'}}
 }
 function mediaCard(kind,label,help){
  const isAvatar=kind==='avatar';
  return `<section class="profileMediaCard ${isAvatar?'profileMediaAvatarCard':'profileMediaBannerCard'}"><div class="profileMediaCardHead"><div><span class="eyebrow">${label.toUpperCase()}</span><p>${help}</p></div><span class="profileMediaLimit">PNG · JPG · WebP · 5 MB</span></div><div class="profileMediaPreview ${isAvatar?'avatar':'banner'}" data-profile-media-preview="${kind}"></div><div class="profileMediaActions"><button type="button" class="secondary" onclick="PPCProfileMedia.choose('${kind}')">${isAvatar?'Choose avatar':'Choose banner'}</button><button type="button" class="textButton" onclick="PPCProfileMedia.remove('${kind}')">Remove</button><span data-profile-media-status="${kind}">No new image selected</span></div><input id="${isAvatar?'pfAvatarUpload':'pfBannerUpload'}" class="profileMediaFileInput" type="file" accept="image/png,image/jpeg,image/webp" onchange="PPCProfileMedia.selected('${kind}',this)"></section>`;
 }
 function enhance(){
  const dialog=document.getElementById('profileEditPanel');if(!dialog||dialog.dataset.mediaEnhanced==='1')return;
  const avatar=document.getElementById('pfAvatar'),banner=document.getElementById('pfBanner');if(!avatar||!banner)return;
  dialog.dataset.mediaEnhanced='1';
  avatar.type='hidden';banner.type='hidden';
  const avatarLabel=avatar.closest('label'),bannerLabel=banner.closest('label');
  if(avatarLabel)avatarLabel.style.display='none';if(bannerLabel)bannerLabel.style.display='none';
  const grid=dialog.querySelector('.formGrid');if(grid){
   const media=document.createElement('div');media.className='profileMediaEditor span2';media.innerHTML=mediaCard('banner','Profile banner','Shown across the top of your public profile.')+mediaCard('avatar','Profile picture','Shown beside your name throughout PocketNexus.');grid.prepend(media);
  }
  const saveButton=[...dialog.querySelectorAll('button')].find(b=>/save profile/i.test(b.textContent||''));
  if(saveButton){saveButton.removeAttribute('onclick');saveButton.type='button';saveButton.dataset.profileMediaSave='1';saveButton.addEventListener('click',save)}
  renderPreview('avatar');renderPreview('banner');
 }
 function install(){
  if(typeof window.profileSave==='function'&&!window.__profileMediaOriginalSave)window.__profileMediaOriginalSave=window.profileSave;
  if(typeof window.profilePage==='function'&&!window.__profileMediaOriginalPage){
   window.__profileMediaOriginalPage=window.profilePage;
   window.profilePage=async function(){const r=await window.__profileMediaOriginalPage.apply(this,arguments);requestAnimationFrame(enhance);return r}
  }
  requestAnimationFrame(enhance);
 }
 window.PPCProfileMedia={choose,selected,remove,save,enhance};
 install();
})();
