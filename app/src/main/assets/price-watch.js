/* Setup Checklist · launch price watch.
   The saved balance and purchased prices never change from listing updates. */
(() => {
 'use strict';
 const PREF='setup-checklist-price-watch-v1';
 const el=id=>document.getElementById(id);
 let enabled=true;
 try{enabled=localStorage.getItem(PREF)!=='off';}catch(_){}
 let currentRun=null,serial=0,bootStarted=false;
 const money=n=>fmt(Number(n)||0);
 const today=()=>new Date().toISOString();
 const validMoney=n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<1e11;
 const refresh=()=>{if(typeof render==='function')render();};
 function entryFor(item){
   const entry=priceWatch[item.id];
   if(!item.url)return {status:'no-link'};
   if(!enabled)return {status:'off'};
   if(!entry)return {status:currentRun?'checking':'not-checked'};
   return entry;
 }
 function appendIndicator(target,item){
   const entry=entryFor(item);
   const tag=document.createElement('span');
   const allowed=['stable','increased','decreased','unavailable','review','checking','off','no-link','not-checked'];
   const kind=allowed.includes(entry.status)?entry.status:'not-checked';
   tag.className='price-watch-chip watch-'+kind;
   const labels={
     stable:'✓ Stable',increased:'↑ Increased',decreased:'↓ Decreased',
     unavailable:'? Unavailable',review:'! Review price',checking:'◌ Checking',
     off:'Price watch off','no-link':'No link','not-checked':'Not checked'
   };
   tag.textContent=labels[kind];
   if(entry.checkedAt)tag.title='Last checked '+new Date(entry.checkedAt).toLocaleString();
   else if(kind==='no-link')tag.title='Add a public product URL to track its listing price';
   target.append(tag);
   return tag;
 }
 function cancel(){
   // Responses from other presets / earlier runs are ignored.
   currentRun=null;serial++;
 }
 function showChanges(changes,failed){
   if(!changes.length)return;
   const backdrop=document.createElement('div');backdrop.className='price-change-shade';
   const panel=document.createElement('section');
   panel.className='price-change-dialog';panel.setAttribute('role','dialog');
   panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','priceChangeHeading');
   const header=document.createElement('div');header.className='price-change-heading';
   const heading=document.createElement('div');
   const eyebrow=document.createElement('span');eyebrow.className='eyebrow';eyebrow.textContent='PRICE WATCH';
   const title=document.createElement('h2');title.id='priceChangeHeading';
   title.textContent=changes.length+' price '+(changes.length===1?'change':'changes')+' detected';
   heading.append(eyebrow,title);
   const x=document.createElement('button');x.type='button';x.className='sheet-close';
   x.setAttribute('aria-label','Close price changes');x.textContent='×';
   header.append(heading,x);
   const subtitle=document.createElement('p');subtitle.className='price-change-subtitle';
   subtitle.textContent='Your remaining setup budget has been updated. Saved cash and purchased prices were not changed.';
   const list=document.createElement('div');list.className='price-change-list';
   for(const change of changes.slice(0,16)){
     const row=document.createElement('div');row.className='price-change-row';
     const label=document.createElement('div');label.className='price-change-product';
     const name=document.createElement('strong');name.textContent=change.name;
     const cat=document.createElement('span');cat.textContent=change.category;
     label.append(name,cat);
     const values=document.createElement('div');values.className='price-change-values';
     const old=document.createElement('small');old.textContent=money(change.from);
     const arrow=document.createElement('strong');
     arrow.className=change.to<change.from?'watch-decreased':'watch-increased';
     arrow.textContent=(change.to<change.from?'↓ ':'↑ ')+money(change.to);
     values.append(old,arrow);row.append(label,values);list.append(row);
   }
   if(changes.length>16){
     const rest=document.createElement('p');rest.className='price-change-more';
     rest.textContent='+'+(changes.length-16)+' additional changes';list.append(rest);
   }
   if(failed){
     const warn=document.createElement('p');warn.className='price-change-warning';
     warn.textContent=failed+' product '+(failed===1?'link could not be checked':'links could not be checked')+'. Their saved prices were kept.';
     panel.append(header,subtitle,list,warn);
   }else panel.append(header,subtitle,list);
   const done=document.createElement('button');done.type='button';
   done.className='price-change-done';done.textContent='Got it';
   panel.append(done);backdrop.append(panel);
   const prior=document.activeElement;
   const close=()=>{
     backdrop.remove();document.removeEventListener('keydown',escape);
     if(prior&&prior.isConnected)prior.focus({preventScroll:true});
   };
   const escape=e=>{if(e.key==='Escape'){e.preventDefault();close();}};
   backdrop.addEventListener('click',e=>{if(e.target===backdrop)close();});
   x.onclick=close;done.onclick=close;
   document.addEventListener('keydown',escape);
   document.body.append(backdrop);done.focus({preventScroll:true});
 }
 function checkNow(options={}){
   if(!enabled&&!options.force)return;
   cancel();
   const jobs=items.filter(item=>!checked[item.id] || options.includePurchased!==false)
     .filter(item=>typeof item.url==='string'&&/^https:\/\/[^ \t\n]+$/i.test(item.url));
   if(!jobs.length)return;
   if(!window.AndroidPriceWatch||typeof window.AndroidPriceWatch.checkBatch!=='function'){
     // Browser previews have no Android networking bridge.
     for(const item of jobs){
       priceWatch[item.id]={status:'unavailable',checkedAt:today()};
     }
     refresh();return;
   }
   const token='pw'+Date.now()+'_'+(++serial);
   const run={token,preset:activePresetId,expected:jobs.length,seen:new Set(),changes:[],failed:0,silent:!!options.silentIfUnchanged};
   currentRun=run;
   for(const item of jobs){
     if(!priceWatch[item.id])priceWatch[item.id]={status:'checking'};
   }
   refresh();
   try{
     const payload=jobs.map(item=>({id:item.id,url:item.url}));
     window.AndroidPriceWatch.checkBatch(JSON.stringify(payload),token);
   }catch(_){
     currentRun=null;
     for(const item of jobs)priceWatch[item.id]={status:'unavailable',checkedAt:today()};
     persist();refresh();
   }
 }
 function receive(token,id,raw){
   const run=currentRun;
   if(!run||run.token!==token||run.preset!==activePresetId||run.seen.has(id))return;
   const item=items.find(i=>i.id===id);
   if(!item)return;
   run.seen.add(id);
   let data=null;
   try{data=typeof raw==='string'?JSON.parse(raw):raw;}catch(_){}
   const observed=Number(data&&data.price);
   const currency=String(data&&data.currency||'').toUpperCase();
   const historical=priceWatch[id];
   const previous=historical&&validMoney(Number(historical.observed))?
     Number(historical.observed):Number(item.price);
   const stamp=today();
   const valid=data&&data.ok&&validMoney(observed)&&currency===currentCurrency;
   if(!valid){
     run.failed++;
     priceWatch[id]={
       status:'unavailable',checkedAt:stamp,
       observed:historical&&validMoney(Number(historical.observed))?Number(historical.observed):null
     };
   }else{
     let kind='stable';
     if(observed>previous+0.005)kind='increased';
     if(observed<previous-0.005)kind='decreased';
     // Unusually large differences may indicate a wrong variant or scraper error.
     // Flag for review rather than silently damaging the financial plan.
     const suspicious=previous>0&&(observed/previous>3||observed/previous<.25);
     if(suspicious)kind='review';
     priceWatch[id]={
       status:kind,checkedAt:stamp,observed,
       previous,sourceCurrency:currency
     };
     if(kind==='increased'||kind==='decreased'){
       run.changes.push({id,name:item.name,category:item.cat,from:previous,to:observed});
     }
     if(!checked[id]&&!suspicious){
       item.price=safePrice(observed);
     }
   }
   persist();refresh();
   if(run.seen.size===run.expected){
     currentRun=null;
     // A notification is deliberately shown only after welcome is gone.
     if(run.changes.length)showChanges(run.changes,run.failed);
     refresh();
   }
 }
 window.PriceWatchUI={
   appendIndicator,receive,cancel,checkNow,
   getEnabled:()=>enabled,
   setEnabled:value=>{
     enabled=!!value;
     try{localStorage.setItem(PREF,enabled?'on':'off');}catch(_){}
     if(!enabled)cancel();
     refresh();
   },
   getEntry:id=>priceWatch[id]||null,
   updateDetails:(target,item)=>appendIndicator(target,item)
 };
 // The welcome button fires only once the animation is completed. No modal
 // appears over onboarding or the welcome page.
 window.addEventListener('setup-app-entered',()=>{if(!bootStarted){bootStarted=true;checkNow();}});
 const overlay=el('introOverlay');
 if(!overlay||!overlay.classList.contains('is-visible')){
   bootStarted=true;setTimeout(checkNow,100);
 }
 refresh();
})();