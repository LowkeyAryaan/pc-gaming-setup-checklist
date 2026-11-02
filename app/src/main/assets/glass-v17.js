/* Setup Checklist v1.7, offline-first interaction layer. */
(() => {
 'use strict';
 const el=id=>document.getElementById(id);
 // The older v1.6 stylesheet is appended dynamically by design-v16.js.
 // Move the glass stylesheet after it to guarantee new tokens win the cascade.
 const glassStylesheet=document.querySelector('link[href="glass-v17.css"]');
 if(glassStylesheet)document.head.append(glassStylesheet);
 const validMonth=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
 const now=()=>{
   const date=new Date();
   return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0');
 };
 const names=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const shade=document.createElement('div');
 shade.className='month-glass-sheet';shade.hidden=true;
 shade.setAttribute('aria-hidden','true');
 shade.innerHTML='<div class="month-glass-panel" role="dialog" aria-modal="true" aria-labelledby="monthGlassTitle">'+
   '<div class="month-glass-header"><h2 id="monthGlassTitle">Choose month</h2><button id="monthGlassClose" type="button" aria-label="Close month picker">×</button></div>'+
   '<div class="month-glass-nav"><button id="monthGlassPrev" type="button" aria-label="Previous year">‹</button><strong id="monthGlassYear"></strong><button id="monthGlassNext" type="button" aria-label="Next year">›</button></div>'+
   '<div class="month-glass-grid" id="monthGlassGrid" role="group" aria-label="Months"></div>'+
   '<div class="month-glass-actions"><button id="monthGlassClear" type="button">Clear</button><button id="monthGlassToday" type="button">This month</button><button class="primary" id="monthGlassSet" type="button">Set month</button></div></div>';
 document.body.append(shade);
 let selectedInput=null,previousFocus=null,year=new Date().getFullYear(),month=new Date().getMonth()+1;
 const grid=el('monthGlassGrid');
 const renderGrid=()=>{
   el('monthGlassYear').textContent=String(year);
   grid.replaceChildren();
   names.forEach((label,index)=>{
     const button=document.createElement('button');
     const number=index+1;button.type='button';button.textContent=label;
     button.classList.toggle('selected',number===month);
     button.setAttribute('aria-pressed',String(number===month));
     button.onclick=()=>{month=number;renderGrid();};
     grid.append(button);
   });
   el('monthGlassPrev').disabled=year<=2000;
   el('monthGlassNext').disabled=year>=2100;
 };
 const close=()=>{
   shade.hidden=true;shade.setAttribute('aria-hidden','true');
   document.body.classList.remove('month-picker-open');
   if(previousFocus&&previousFocus.isConnected)previousFocus.focus({preventScroll:true});
   selectedInput=null;
 };
 const open=input=>{
   if(!input||input.disabled)return;
   previousFocus=input;
   selectedInput=input;
   const key=validMonth(input.value)?input.value:now();
   year=Number(key.slice(0,4));month=Number(key.slice(5,7));
   shade.hidden=false;shade.setAttribute('aria-hidden','false');
   document.body.classList.add('month-picker-open');
   renderGrid();
   el('monthGlassClear').disabled=input.id==='plannerMonth';
   el('monthGlassClose').focus({preventScroll:true});
 };
 const commit=value=>{
   if(!selectedInput)return;
   selectedInput.value=value;
   selectedInput.dispatchEvent(new Event('input',{bubbles:true}));
   selectedInput.dispatchEvent(new Event('change',{bubbles:true}));
   close();
 };
 el('monthGlassClose').onclick=close;
 el('monthGlassSet').onclick=()=>commit(year+'-'+String(month).padStart(2,'0'));
 el('monthGlassClear').onclick=()=>commit('');
 el('monthGlassToday').onclick=()=>commit(now());
 el('monthGlassPrev').onclick=()=>{year=Math.max(2000,year-1);renderGrid();};
 el('monthGlassNext').onclick=()=>{year=Math.min(2100,year+1);renderGrid();};
 shade.addEventListener('click',e=>{if(e.target===shade)close();});
 document.addEventListener('keydown',e=>{
   if(e.key==='Escape'&&!shade.hidden){e.preventDefault();e.stopImmediatePropagation();close();}
 },true);
 function convertMonthInputs(root=document){
   const inputs=root.querySelectorAll('input[type="month"],input[data-month-picker]');
   inputs.forEach(input=>{
     if(input.dataset.monthBound==='true')return;
     input.dataset.monthBound='true';
     input.dataset.monthPicker='true';
     input.type='text';
     input.readOnly=true;
     input.inputMode='none';
     input.placeholder='Select month';
     input.setAttribute('aria-haspopup','dialog');
     input.setAttribute('autocomplete','off');
   });
 }
 convertMonthInputs();
 const observer=new MutationObserver(changes=>{
   for(const change of changes){
     for(const added of change.addedNodes){
       if(added.nodeType!==1)continue;
       if(added.matches&&added.matches('input[type=month]'))convertMonthInputs(added.parentElement||document);
       else if(added.querySelector)convertMonthInputs(added);
     }
   }
 });
 observer.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('click',e=>{
   const input=e.target.closest&&e.target.closest('input[data-month-picker]');
   if(!input)return;
   e.preventDefault();e.stopPropagation();open(input);
 },true);
 document.addEventListener('keydown',e=>{
   const input=e.target.closest&&e.target.closest('input[data-month-picker]');
   if(!input)return;
   if(e.key==='Enter'||e.key===' '){e.preventDefault();open(input);}
 },true);
 // Use a native, bounded metadata reader; CORS makes file:// WebView fetch
 // unreliable on ecommerce pages. No third-party SaaS or paid API required.
 const urlInput=el('newUrl'),nameInput=el('newName'),priceInput=el('newPrice');
 const status=el('linkImportStatus'),preview=el('linkImportPreview');
 let timer=null,requestId=0,requestedUrl='',photoBlob=null,autoname='',autoprice='';
 const setStatus=(message,state='')=>{
   status.textContent=message;status.dataset.state=state;
 };
 function clearPreview(){
   photoBlob=null;preview.hidden=true;
   el('linkImportImage').removeAttribute('src');
   el('linkImportTitle').textContent='';
   el('linkImportPrice').textContent='';
 }
 function detect(){
   clearTimeout(timer);
   const url=urlInput.value.trim();requestedUrl=url;
   ++requestId;
   clearPreview();
   if(!url){setStatus('');return;}
   if(!/^https:\/\/[^\s]+$/i.test(url)){
     setStatus('Use an HTTPS product link. You can still fill the product manually.','warning');return;
   }
   if(!window.AndroidProductLookup||typeof AndroidProductLookup.lookup!=='function'){
     setStatus('Auto-detection is available in the Android app. Enter details manually here.','warning');return;
   }
   const currentId=String(requestId);
   setStatus('Checking product page…');
   try{AndroidProductLookup.lookup(url,currentId);}
   catch(_){setStatus('Could not read this store. Enter details manually.','warning');}
 }
 urlInput.addEventListener('input',()=>{
   clearTimeout(timer);
   if(!urlInput.value.trim()){requestedUrl='';clearPreview();setStatus('');return;}
   timer=setTimeout(detect,650);
 });
 urlInput.addEventListener('change',()=>{if(urlInput.value.trim()!==requestedUrl)detect();});
 window.ProductLinkImport={
   photoFor:url=>url===requestedUrl?photoBlob:null,
   clear:()=>{clearTimeout(timer);requestedUrl='';photoBlob=null;autoname='';autoprice='';clearPreview();setStatus('');},
   receive:(id,payload)=>{
     if(String(id)!==String(requestId)||urlInput.value.trim()!==requestedUrl)return;
     const data=typeof payload==='string'?JSON.parse(payload):payload;
     if(!data||!data.ok){
       setStatus((data&&data.message)||'Store details unavailable. Enter them manually.','warning');return;
     }
     if(data.name&&(!nameInput.value.trim()||nameInput.value===autoname)){
       nameInput.value=String(data.name).slice(0,180);
       autoname=nameInput.value;
     }
     const currency=String(data.currency||'').toUpperCase();
     const mismatch=currency&&currency!==String(currentCurrency).toUpperCase();
     const detected=Number(data.price);
     if(!mismatch&&data.price!==null&&data.price!==undefined&&Number.isFinite(detected)&&detected>=0&&(!priceInput.value.trim()||priceInput.value===autoprice)){
       priceInput.value=String(detected);autoprice=priceInput.value;
     }
     if(data.imageData&&/^data:image\/(jpeg|png|webp);base64,/i.test(data.imageData)){
       try{
         photoBlob=dataToBlob(data.imageData);
         el('linkImportImage').src=data.imageData;
       }catch(_){photoBlob=null;}
     }
     preview.hidden=false;
     el('linkImportImage').hidden=!photoBlob;
     el('linkImportTitle').textContent=data.name||'Product link detected';
     el('linkImportPrice').textContent=(data.price!==null&&data.price!==undefined?
       ((currency||currentCurrency)+' '+data.price):'Price not found');
     if(mismatch)setStatus('Store price is in '+currency+'; your preset uses '+currentCurrency+'. Enter the correct price manually.','warning');
     else if(data.price===null||data.price===undefined)setStatus('Product detected. Price unavailable; enter it manually.','warning');
     else setStatus('Product details detected. Review or edit before saving.','success');
   }
 };
 window.addEventListener('product-created',()=>window.ProductLinkImport.clear());
 // Glass dialogs replace WebView's light native JavaScript alerts and confirms.
 // Confirmations are asynchronous to keep the UI thread responsive.
 let dialogBusy=false;
 function glassDialog(message,ask){
   return new Promise(resolve=>{
     const overlay=document.createElement('div');
     overlay.className='glass-dialog-shade';
     const card=document.createElement('div');
     card.className='glass-dialog-card';
     card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
     const heading=document.createElement('h2');heading.textContent=ask?'Confirm action':'Notice';
     const body=document.createElement('p');body.textContent=String(message);
     const actions=document.createElement('div');actions.className='glass-dialog-actions';
     const prior=document.activeElement;
     const finish=decision=>{
       overlay.remove();dialogBusy=false;
       if(prior&&prior.isConnected)prior.focus({preventScroll:true});
       resolve(decision);
     };
     if(ask){
       const cancel=document.createElement('button');cancel.type='button';
       cancel.textContent='Cancel';cancel.onclick=()=>finish(false);actions.append(cancel);
     }
     const yes=document.createElement('button');yes.type='button';yes.className='primary';
     yes.textContent=ask?'Confirm':'OK';yes.onclick=()=>finish(true);actions.append(yes);
     const key=e=>{
       if(e.key==='Escape'){e.preventDefault();e.stopPropagation();overlay.removeEventListener('keydown',key);finish(false);}
     };
     overlay.addEventListener('keydown',key,true);
     overlay.append(card);card.append(heading,body,actions);
     document.body.append(overlay);yes.focus({preventScroll:true});
   });
 }
 window.glassConfirm=message=>glassDialog(message,true);
 window.glassAlert=message=>glassDialog(message,false);
 window.alert=message=>{window.glassAlert(message);};
})();
