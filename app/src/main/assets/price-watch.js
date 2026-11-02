/* Setup Checklist · launch price watch.
   The saved balance and purchased prices never change from listing updates. */
(() => {
 'use strict';
 const PREF='setup-checklist-price-watch-v1';
 const el=id=>document.getElementById(id);
 const buildVersion=document.querySelector('.top-version');
 if(buildVersion)buildVersion.textContent='v2.0';
 let enabled=true;
 try{enabled=localStorage.getItem(PREF)!=='off';}catch(_){}
 let currentRun=null,serial=0,bootStarted=false,lastStart=0;
 const money=n=>fmt(Number(n)||0);
 const today=()=>new Date().toISOString();
 const validMoney=n=>typeof n==='number'&&Number.isFinite(n)&&n>0&&n<1e11;
 // Coalesce incoming price responses into a single UI repaint rather than
 // rebuilding all cards once per URL (especially costly on older phones).
 let refreshTimer=null;
 const refresh=()=>{
   if(refreshTimer!==null)return;
   refreshTimer=setTimeout(()=>{
     refreshTimer=null;
     if(typeof render==='function')render();
   },130);
 };
 const flushRefresh=()=>{
   if(refreshTimer!==null){clearTimeout(refreshTimer);refreshTimer=null;}
   if(typeof render==='function')render();
 };
 function entryFor(item){
   const entry=priceWatch[item.id];
   if(!item.url)return {status:'no-link'};
   if(!enabled&&!(entry&&entry.status==='variant-selected'))return {status:'off'};
   if(!entry||entry.url!==item.url)return {status:currentRun?'checking':'not-checked'};
   return entry;
 }
 function appendIndicator(target,item){
   const entry=entryFor(item);
   const canAct=kind=>['variant','variant-selected','unavailable'].includes(kind);
   const status=entryFor(item);
   const action=canAct(status.status);
   const tag=document.createElement(action?'button':'span');
   if(action){tag.type='button';tag.classList.add('price-watch-action');tag.onclick=e=>{
       e.stopPropagation();
       if(window.PriceWatchActions)window.PriceWatchActions.open(item.id);
       else if(window.openItemDetails)window.openItemDetails(item.id);
     };
   }
   const allowed=['stable','increased','decreased','unavailable','variant','variant-selected','review','checking','off','no-link','not-checked'];
   const kind=allowed.includes(entry.status)?entry.status:'not-checked';
   tag.className='price-watch-chip watch-'+kind+(action?' price-watch-action':'');
   const labels={
     stable:'✓ Stable',increased:'↑ Increased',decreased:'↓ Decreased',
     unavailable:'? Unavailable',variant:'! Choose variant','variant-selected':'✓ Price selected',review:'! Review price',checking:'◌ Checking',
     off:'Price watch off','no-link':'No link','not-checked':'Not checked'
   };
   tag.textContent=labels[kind];
   if(entry.checkedAt)tag.title='Last checked '+new Date(entry.checkedAt).toLocaleString()+
      (entry.reason?' · '+entry.reason:'');
   if(entry.reason)tag.setAttribute('aria-label',labels[kind]+': '+entry.reason+(action?'. Tap for options.':''));
   if(action&&!entry.reason)tag.setAttribute('aria-label',labels[kind]+'. Tap for options.');
   else if(kind==='no-link')tag.title='Add a public product URL to track its listing price';
   target.append(tag);
   return tag;
 }
 // Price impact is calculated with the same contribution-allocation model as
 // the Tracker and Summary, not as a separate savings balance.
 // Baselines are captured before the first VERIFIED automatic price update.
 function impactStats(actual){
   const tracked=items.filter(item=>!checked[item.id]&&
     categoryGroup(item.cat)!=='future');
   let increases=0,decreases=0,unavailable=0,verified=0;
   const original=items.map(item=>{
     if(checked[item.id]||categoryGroup(item.cat)==='future')return item;
     const entry=priceWatch[item.id];
     const baseline=entry&&entry.url===item.url&&
       Number.isFinite(Number(entry.baseline))&&Number(entry.baseline)>0?
       Number(entry.baseline):Number(item.price);
     const diff=Number(item.price)-baseline;
     if(diff>0.005)increases++;
     if(diff<-.005)decreases++;
     if(item.url){
       if(entry&&entry.url===item.url&&
          ['stable','increased','decreased'].includes(entry.status))
         verified++;
       else unavailable++;
     }
     return {...item,price:baseline};
   });
   const before=BudgetModel.compute(original,checked,categoryGroup,contributed,
       contributionScope,contributionCategory).currentGoal;
   return {before,after:actual.currentGoal,net:actual.currentGoal-before,
     increases,decreases,verified,unavailable,eligible:tracked.length};
 }
 function renderTrackerImpact(actual){
   const panel=el('priceImpactPanel');
   if(!panel)return;
   const stat=impactStats(actual||totals());
   el('priceImpactCurrent').textContent=money(stat.after);
   el('priceImpactBaseline').textContent=money(stat.before);
   const impact=el('priceImpactNet');
   impact.textContent=(stat.net>0.005?'+':stat.net<-.005?'−':'')+
     money(Math.abs(stat.net));
   impact.className=stat.net>0.005?'price-impact-increased':
     stat.net<-.005?'price-impact-decreased':'price-impact-neutral';
   el('priceImpactCounts').textContent=
     stat.increases+' increased · '+stat.decreases+' decreased';
   const watchText=!enabled?'Monitoring off':
     currentRun?'Checking prices…':
     stat.verified?'Latest verified prices':'No verified prices yet';
   el('priceImpactState').textContent=watchText;
   el('priceImpactCoverage').textContent=
     stat.verified+' verified'+(stat.unavailable?
       ' · '+stat.unavailable+' not verified':'');
   panel.dataset.impact=stat.net>0.005?'up':stat.net<-.005?'down':'neutral';
 }
 function unavailableRecord(item,reason){
   const old=priceWatch[item.id],same=old&&old.url===item.url;
   const baseline=same&&Number(old.baseline)>0?
     Number(old.baseline):Number(item.price);
   const selected=same&&validMoney(Number(old.selectedPrice))?
     Number(old.selectedPrice):null;
   return {status:selected!==null?'variant-selected':'unavailable',url:item.url,
     checkedAt:today(),baseline,selectedPrice:selected,
     lowPrice:same?old.lowPrice:null,highPrice:same?old.highPrice:null,
     observed:same&&validMoney(Number(old.observed))?Number(old.observed):null,
     reason:selected!==null?
       'Your chosen price is saved, but this retailer could not verify it. '+
         String(reason||'Price unavailable').slice(0,120):
       String(reason||'Price unavailable').slice(0,180)};
 }
 function cancel(){
   // Responses from other presets / earlier runs are ignored.
   if(currentRun&&currentRun.timer)clearTimeout(currentRun.timer);
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
   subtitle.textContent='Verified unpurchased prices were updated. Your saved balance and purchased prices remain unchanged; unusually large changes need review.';
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
     arrow.textContent=(change.review?'! Review · ':(change.to<change.from?'↓ ':'↑ '))+money(change.to);
     if(change.review)arrow.className='watch-review';
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
   lastStart=Date.now();
   cancel();
   const linked=items.filter(item=>typeof item.url==='string'&&item.url.trim()&&
       (!options.onlyId||item.id===options.onlyId));
   for(const item of linked){
     if(!/^https:\/\/[^ \t\n]+$/i.test(item.url))
       priceWatch[item.id]=unavailableRecord(item,'Only public HTTPS listings can be checked.');
   }
   const jobs=linked.filter(item=>/^https:\/\/[^ \t\n]+$/i.test(item.url));
   if(!jobs.length){persist();refresh();renderTrackerImpact(totals());return;}
   if(!window.AndroidPriceWatch||typeof window.AndroidPriceWatch.checkBatch!=='function'){
     // Browser previews have no Android networking bridge.
     for(const item of jobs){
       priceWatch[item.id]=unavailableRecord(item,'Android price reader not available.');
     }
     persist();refresh();return;
   }
   const token='pw'+Date.now()+'_'+(++serial);
   const run={token,preset:activePresetId,expected:jobs.length,seen:new Set(),
     urls:new Map(jobs.map(item=>[item.id,item.url])),
     originalPrices:new Map(jobs.map(item=>[item.id,item.price])),
     changes:[],failed:0,silent:!!options.silentIfUnchanged};
   currentRun=run;
   for(const item of jobs){
     if(!priceWatch[item.id])priceWatch[item.id]={status:'checking'};
   }
   refresh();
   run.timer=setTimeout(()=>{
     if(currentRun!==run)return;
     for(const item of jobs){
       if(run.seen.has(item.id))continue;
       priceWatch[item.id]=unavailableRecord(item,'Retailer did not respond before timeout.');
       run.failed++;
       window.dispatchEvent(new CustomEvent('price-watch-updated',{detail:{id:item.id}}));
     }
     currentRun=null;persist();refresh();
     if(run.changes.length)showChanges(run.changes,run.failed);
   },Math.min(180000,Math.max(30000,jobs.length*5000+12000)));
   try{
     const payload=jobs.map(item=>({id:item.id,url:item.url}));
     window.AndroidPriceWatch.checkBatch(JSON.stringify(payload),token);
   }catch(_){
     clearTimeout(run.timer);
     currentRun=null;
     for(const item of jobs){
       priceWatch[item.id]=unavailableRecord(item,'Could not start price check.');
       window.dispatchEvent(new CustomEvent('price-watch-updated',{detail:{id:item.id}}));
     }
     persist();refresh();
   }
 }
 function receive(token,id,raw){
   const run=currentRun;
   if(!run||run.token!==token||run.preset!==activePresetId||run.seen.has(id))return;
   const item=items.find(i=>i.id===id);
   if(!item)return;
   run.seen.add(id);
   // A user may edit a URL or manual price before a delayed response arrives.
   // Never apply data for an outdated listing or overwrite that manual edit.
   if(item.url!==run.urls.get(id)||Number(item.price)!==Number(run.originalPrices.get(id))){
     run.failed++;
     if(run.seen.size===run.expected){
       clearTimeout(run.timer);currentRun=null;
       if(run.changes.length)showChanges(run.changes,run.failed);
     }
     return;
   }
   let data=null;
   try{data=typeof raw==='string'?JSON.parse(raw):raw;}catch(_){}
   const observed=Number(data&&data.price);
   const currency=String(data&&data.currency||'').toUpperCase();
   const historical=priceWatch[id];
   const selected=historical&&historical.url===item.url&&validMoney(Number(historical.selectedPrice))?
       Number(historical.selectedPrice):null;
   const originalBaseline=historical&&historical.url===item.url&&
       Number.isFinite(Number(historical.baseline))&&Number(historical.baseline)>0?
       Number(historical.baseline):Number(item.price);
   const previous=historical&&historical.url===item.url&&validMoney(Number(historical.observed))?
     Number(historical.observed):Number(item.price);
   const stamp=today();
   const isVariant=!!data&&(data.priceKind==='range'||data.priceKind==='starting-at');
   const valid=data&&data.ok&&!isVariant&&validMoney(observed)&&currency===currentCurrency;
   if(isVariant){
     run.failed++;
     const low=Number(data.lowPrice),high=Number(data.highPrice);
     const amount=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
     const range=Number.isFinite(low)&&low>0?(currency?currency+' ':'')+amount(low)+
       (data.priceKind==='range'&&Number.isFinite(high)&&high>low?' – '+amount(high):'+'):'multiple variant prices';
     priceWatch[id]={...unavailableRecord(item,'Store lists '+range+'. Choose your price from the listing; a generic range cannot verify the selected configuration.'),
       status:selected!==null?'variant-selected':'variant',baseline:originalBaseline,checkedAt:stamp,
       selectedPrice:selected,
       lowPrice:Number.isFinite(low)&&low>0?low:null,
       highPrice:Number.isFinite(high)&&high>low?high:null};
   }else if(!valid){
     run.failed++;
     const reason=!data||!data.ok?
       String(data&&data.message||'Store page could not be read.'):
       !validMoney(observed)?
         String(data.priceMessage||'No readable product price.'):
         !currency?'Store does not publish a verifiable currency.':
         currency!==currentCurrency?
           'Store price uses '+currency+', but setup uses '+currentCurrency+'.':
           'Price could not be verified.';
     priceWatch[id]={...unavailableRecord(item,reason),baseline:originalBaseline,checkedAt:stamp};
   }else if(selected!==null){
     // A retailer may temporarily switch from a range to a low-price offer.
     // Once a person selects a variant, never overwrite it from generic metadata.
     priceWatch[id]={...historical,status:'variant-selected',checkedAt:stamp,
       reason:'Your chosen variant price is saved. Automatic changes require an exact variant-specific listing URL.'};
   }else{
     let kind='stable';
     if(observed>previous+0.005)kind='increased';
     if(observed<previous-0.005)kind='decreased';
     // Unusually large differences may indicate a wrong variant or scraper error.
     // Flag for review rather than silently damaging the financial plan.
     // Compare anomalies against the actually saved product cost rather
     // than only the previous observation. Repeating a suspicious fetch
     // must never make it appear safe on the following launch.
     const storedPrice=Number(item.price);
     const suspicious=storedPrice>0&&(observed/storedPrice>3||observed/storedPrice<.25);
     if(suspicious)kind='review';
     priceWatch[id]={
       status:kind,url:item.url,checkedAt:stamp,observed,baseline:originalBaseline,
       previous,sourceCurrency:currency
     };
     if(kind==='increased'||kind==='decreased'||kind==='review'){
       run.changes.push({id,name:item.name,category:item.cat,from:previous,to:observed,review:suspicious});
     }
     if(!checked[id]&&!suspicious){
       item.price=safePrice(observed);
     }
   }
   persist();refresh();
   window.dispatchEvent(new CustomEvent('price-watch-updated',{detail:{id}}));
   if(run.seen.size===run.expected){
     clearTimeout(run.timer);
     currentRun=null;
     // A notification is deliberately shown only after welcome is gone.
     flushRefresh();
     if(run.changes.length)showChanges(run.changes,run.failed);
   }
 }
 function applyVariantSelection(id,amount){
   const item=items.find(p=>p.id===id);
   const value=Number(amount);
   if(!item||checked[id]||!validMoney(value))return false;
   const record=priceWatch[id];
   if(!record||record.url!==item.url||!['variant','variant-selected'].includes(record.status))return false;
   // Explicit user decision: do not pass a range back into automatic checks.
   item.price=safePrice(value);
   priceWatch[id]={...record,status:'variant-selected',selectedPrice:safePrice(value),
     baseline:safePrice(value),checkedAt:today(),
     reason:'Manually selected. A generic range cannot confirm future price stability for this exact variant.'};
   cancel();
   persist();flushRefresh();
   window.dispatchEvent(new CustomEvent('price-watch-updated',{detail:{id}}));
   return true;
 }
 window.PriceWatchUI={
   appendIndicator,receive,cancel,checkNow,applyVariantSelection,
   getEnabled:()=>enabled,
   setEnabled:value=>{
     enabled=!!value;
     try{localStorage.setItem(PREF,enabled?'on':'off');}catch(_){}
     if(!enabled)cancel();
     renderTrackerImpact(totals());
     refresh();
   },
   getEntry:id=>priceWatch[id]||null,
   renderTrackerImpact,
   updateDetails:(target,item)=>appendIndicator(target,item)
 };
 // The welcome button fires only once the animation is completed. No modal
 // appears over onboarding or the welcome page.
 window.addEventListener('setup-app-entered',()=>{if(!bootStarted){bootStarted=true;checkNow();}});
 window.addEventListener('setup-app-resumed',()=>{
   const overlay=el('introOverlay');
   if(overlay&&overlay.classList.contains('is-visible'))return;
   if(bootStarted&&Date.now()-lastStart>120000)checkNow();
 });
 const overlay=el('introOverlay');
 if(!overlay||!overlay.classList.contains('is-visible')){
   bootStarted=true;
   // First frame first; network work and initial badges follow after paint.
   setTimeout(checkNow,500);
 }
 renderTrackerImpact(totals());
 // No launch-time full render here: app.js owns initial DOM creation.
})();