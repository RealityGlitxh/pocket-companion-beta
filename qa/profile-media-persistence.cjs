const { chromium } = require('playwright');
const qaSession=JSON.parse(Buffer.from(process.env.POCKETNEXUS_QA_SESSION_B64,'base64').toString('utf8'));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const fatal=[];
const uploaded=[];
let browser,page,backup=null;
function fail(msg){throw new Error(msg)}
async function profileSnapshot(){return page.evaluate(()=>({
  page:typeof state!=='undefined'?state?.page:null,
  sessionMode:typeof state!=='undefined'?state?.sessionMode:null,
  uid:window.getPPCCloudSession?.()?.user?.id||'',
  profilePageType:typeof profilePage,
  mediaType:typeof window.PPCProfileMedia?.save,
  panel:!!document.getElementById('profileEditPanel'),
  publicProfile:typeof teamWarsState!=='undefined'?!!teamWarsState?.publicProfile:null,
  teamLoading:typeof teamWarsState!=='undefined'?!!teamWarsState?.loading:null,
  teamError:typeof teamWarsState!=='undefined'?teamWarsState?.error||'':null,
  appText:(document.getElementById('app')?.innerText||'').slice(0,1200)
}))}
(async()=>{
  browser=await chromium.launch({headless:true});
  page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>fatal.push(`pageerror: ${e.message}`));
  page.on('console',m=>{if(m.type()==='error'&&!/favicon|Failed to load resource/i.test(m.text()))fatal.push(`console: ${m.text()}`)});
  await page.goto('https://beta.pocketnexus.app/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.PPCAccountCloudCore?.hydrate,{timeout:30000});
  await page.evaluate(session=>localStorage.setItem('sb-cdmzrsvwztndqfwzsumo-auth-token',JSON.stringify(session)),qaSession);
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.getPPCCloudSession?.()?.user?.id&&state?.sessionMode==='cloud',{timeout:30000});
  await page.evaluate(()=>headerNavigate('profile'));
  try{await page.waitForFunction(()=>document.getElementById('profileEditPanel')&&typeof window.PPCProfileMedia?.save==='function',{timeout:30000})}
  catch(e){console.error('PROFILE_ROUTE_DIAGNOSTIC',JSON.stringify(await profileSnapshot()));console.error('PROFILE_ROUTE_FATAL',fatal.join(' | '));throw e}
  await page.evaluate(()=>document.getElementById('profileEditPanel').showModal());
  await page.waitForSelector('#pfAvatarUpload');
  backup=await page.evaluate(()=>({uid:window.getPPCCloudSession().user.id,avatar:document.getElementById('pfAvatar')?.value||'',banner:document.getElementById('pfBanner')?.value||'',isPublic:!!document.getElementById('pfPublic')?.checked,display:document.getElementById('pfDisplay')?.value||'',username:document.getElementById('pfUser')?.value||'',bio:document.getElementById('pfBio')?.value||'',favorite:document.getElementById('pfFav')?.value||''}));
  await page.locator('#pfAvatarUpload').setInputFiles({name:'gate3-avatar.png',mimeType:'image/png',buffer:png});
  await page.locator('#pfBannerUpload').setInputFiles({name:'gate3-banner.png',mimeType:'image/png',buffer:png});
  const previews=await page.evaluate(()=>({avatar:!!document.querySelector('[data-profile-media-preview="avatar"] img'),banner:!!document.querySelector('[data-profile-media-preview="banner"] img')}));
  if(!previews.avatar||!previews.banner)fail('selected media did not render both previews');
  await page.evaluate(()=>{const p=document.getElementById('pfPublic');if(p)p.checked=true});
  const before=fatal.length;
  await page.evaluate(()=>window.PPCProfileMedia.save());
  await page.waitForFunction(()=>!document.getElementById('profileEditPanel')?.open,{timeout:30000});
  await page.waitForTimeout(1500);
  if(fatal.length>before)fail(`save emitted runtime errors: ${fatal.slice(before).join(' | ')}`);
  let stored=await page.evaluate(async()=>{const c=window.getPPCCloudClient(),uid=window.getPPCCloudSession().user.id;const {data,error}=await c.from('profiles').select('avatar_url,banner_url,display_name,username,bio,favorite_deck_name,privacy,public_profile_id').eq('id',uid).single();if(error)throw new Error(error.message||String(error));return data});
  if(!stored.avatar_url||!stored.banner_url)fail('profile row did not persist both media URLs');
  if(!stored.avatar_url.includes(`/storage/v1/object/public/profile-media/${backup.uid}/avatar-`))fail('avatar URL is not a public profile-media object owned by the QA user');
  if(!stored.banner_url.includes(`/storage/v1/object/public/profile-media/${backup.uid}/banner-`))fail('banner URL is not a public profile-media object owned by the QA user');
  uploaded.push(stored.avatar_url,stored.banner_url);
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.getPPCCloudSession?.()?.user?.id&&state?.sessionMode==='cloud',{timeout:30000});
  await page.evaluate(()=>headerNavigate('profile'));
  await page.waitForFunction(()=>document.getElementById('profileEditPanel'),{timeout:30000});
  await page.evaluate(()=>document.getElementById('profileEditPanel').showModal());
  const persisted=await page.evaluate(()=>({avatar:document.getElementById('pfAvatar')?.value||'',banner:document.getElementById('pfBanner')?.value||''}));
  if(persisted.avatar!==stored.avatar_url||persisted.banner!==stored.banner_url)fail('avatar/banner URLs did not survive full reload');
  await page.evaluate(()=>document.getElementById('profileEditPanel')?.close());
  await page.evaluate(()=>headerNavigate('dashboard'));await page.waitForTimeout(500);await page.evaluate(()=>headerNavigate('profile'));await page.waitForTimeout(1200);
  const reroute=await page.evaluate(({a,b})=>document.body.innerHTML.includes(a)&&document.body.innerHTML.includes(b),{a:stored.avatar_url,b:stored.banner_url});
  if(!reroute)fail('profile media did not render after navigating away and back');
  if(!stored.public_profile_id)fail('QA profile has no public_profile_id for public-profile verification');
  await page.evaluate(id=>openPublicProfileByPublicId(id),stored.public_profile_id);await page.waitForTimeout(1500);
  const publicState=await page.evaluate(()=>({avatar:teamWarsState?.publicProfile?.avatar_url||'',banner:teamWarsState?.publicProfile?.banner_url||''}));
  if(publicState.avatar!==stored.avatar_url||publicState.banner!==stored.banner_url)fail('public profile did not expose the saved avatar and banner');
  console.log('PROFILE_MEDIA_PERSISTENCE_QA_OK');
})().catch(e=>{console.error('PROFILE_MEDIA_PERSISTENCE_QA_FAILURE',e);process.exitCode=1}).finally(async()=>{
  try{if(page&&backup){await page.evaluate(()=>headerNavigate('profile')).catch(()=>{});await page.waitForTimeout(800).catch(()=>{});await page.evaluate(b=>{const d=document.getElementById('profileEditPanel');if(d&&!d.open)d.showModal();const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||''};set('pfAvatar',b.avatar);set('pfBanner',b.banner);set('pfDisplay',b.display);set('pfUser',b.username);set('pfBio',b.bio);set('pfFav',b.favorite);const pub=document.getElementById('pfPublic');if(pub)pub.checked=b.isPublic},backup).catch(()=>{});await page.evaluate(()=>window.__profileMediaOriginalSave?.()).catch(()=>{});if(uploaded.length){await page.evaluate(async urls=>{const c=window.getPPCCloudClient();const paths=urls.map(u=>decodeURIComponent(u.split('/storage/v1/object/public/profile-media/')[1]||'')).filter(Boolean);if(paths.length)await c.storage.from('profile-media').remove(paths)},uploaded).catch(()=>{})}}}finally{if(browser)await browser.close().catch(()=>{})}
});
