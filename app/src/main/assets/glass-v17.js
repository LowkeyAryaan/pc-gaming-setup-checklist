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
 const fullMonths=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const formatMonth=value=>validMonth(value)?fullMonths[Number(value.slice(5))-1]+' - '+value.slice(0,4):'Select month';
 window.formatSetupMonth=formatMonth;
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
 const rawInputValue=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
 function refreshMonthLabel(input){
   if(!input||!input._monthLabel)return;
   const value=input.value;
   const shown=formatMonth(value);
   input._monthLabel.textContent=shown;
   input.setAttribute('aria-valuetext',shown);
   input._monthLabel.classList.toggle('is-placeholder',!validMonth(value));
 }
 window.refreshMonthLabels=()=>document.querySelectorAll('input[data-month-bound="true"]').forEach(refreshMonthLabel);
 function convertMonthInputs(root=document){
   const inputs=[];
   if(root.matches&&root.matches('input[type="month"],input[data-month-picker]'))inputs.push(root);
   if(root.querySelectorAll)inputs.push(...root.querySelectorAll('input[type="month"],input[data-month-picker]'));
   inputs.forEach(input=>{
     if(input.dataset.monthBound==='true'){refreshMonthLabel(input);return;}
     const initial=input.value;
     input.dataset.monthBound='true';
     input.dataset.monthPicker='true';
     input.type='text';
     input.readOnly=true;
     input.inputMode='none';
     input.value=initial;
     input.setAttribute('aria-haspopup','dialog');
     input.setAttribute('autocomplete','off');
     input.placeholder='';
     const wrapper=document.createElement('span');wrapper.className='month-display-wrap';
     const label=document.createElement('span');label.className='month-field-value';
     label.setAttribute('aria-hidden','true');
     input.parentNode.insertBefore(wrapper,input);
     wrapper.append(input,label);
     input._monthLabel=label;
     Object.defineProperty(input,'value',{
       configurable:true,
       get(){return rawInputValue.get.call(this);},
       set(value){rawInputValue.set.call(this,value);refreshMonthLabel(this);}
     });
     input.addEventListener('change',()=>refreshMonthLabel(input));
     input.addEventListener('input',()=>refreshMonthLabel(input));
     refreshMonthLabel(input);
   });
 }
 convertMonthInputs();
 // The initial app render already formats dates; do not rerender every
 // product just because the glass stylesheet and month controls were added.
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
 const manual=el('manualProductDetails'),toggle=el('toggleManualDetails');
 const addForm=el('addProductForm');
 function showManual(expand,message=''){
   manual.hidden=!expand;
   toggle.setAttribute('aria-expanded',String(expand));
   toggle.classList.toggle('is-expanded',expand);
   if(message)setStatus(message,'warning');
 }
 toggle.onclick=()=>showManual(manual.hidden);
 window.SetupProductUI={
   requireManual:message=>showManual(true,message),
   detectionStarted:()=>showManual(false),
   detectionComplete:complete=>{
     if(!complete)showManual(true);
     else showManual(false);
   }
 };
 const catGroup=el('catGroup'),choices=[...document.querySelectorAll('.category-choice-grid button')];
 function selectGroup(group){
   if(!['pc','setup','future'].includes(group))return;
   catGroup.value=group;
   catGroup.dispatchEvent(new Event('change',{bubbles:true}));
   choices.forEach(button=>{
     const active=button.dataset.group===group;
     button.classList.toggle('is-selected',active);
     button.setAttribute('aria-pressed',String(active));
   });
 }
 choices.forEach(button=>button.onclick=()=>selectGroup(button.dataset.group));
 catGroup.addEventListener('change',()=>selectGroupNoDispatch());
 function selectGroupNoDispatch(){
   choices.forEach(button=>{
     const active=button.dataset.group===catGroup.value;
     button.classList.toggle('is-selected',active);
     button.setAttribute('aria-pressed',String(active));
   });
 }
 window.addEventListener('category-created',()=>{
   selectGroup('setup');
   el('catName').value='';
 });
 selectGroupNoDispatch();
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
   if(autoname&&nameInput.value===autoname)nameInput.value='';
   if(autoprice&&priceInput.value===autoprice)priceInput.value='';
   autoname='';autoprice='';
   window.SetupProductUI.detectionStarted();
   ++requestId;
   clearPreview();
   if(!url){setStatus('');return;}
   if(!/^https:\/\/[^\s]+$/i.test(url)){
     window.SetupProductUI.requireManual('Use an HTTPS product link or enter the product details manually.');return;
   }
   if(!window.AndroidProductLookup||typeof AndroidProductLookup.lookup!=='function'){
     window.SetupProductUI.requireManual('Auto-detection is unavailable here. Enter details manually.');return;
   }
   const currentId=String(requestId);
   setStatus('Checking product page…');
   try{AndroidProductLookup.lookup(url,currentId);}
   catch(_){window.SetupProductUI.requireManual('Could not read this store. Enter details manually.');}
 }
 urlInput.addEventListener('input',()=>{
   clearTimeout(timer);
   if(!urlInput.value.trim()){requestedUrl='';clearPreview();setStatus('');showManual(false);return;}
   timer=setTimeout(detect,650);
 });
 urlInput.addEventListener('change',()=>{if(urlInput.value.trim()!==requestedUrl)detect();});
 window.ProductLinkImport={
   photoFor:url=>url===requestedUrl?photoBlob:null,
   clear:()=>{clearTimeout(timer);requestedUrl='';photoBlob=null;autoname='';autoprice='';clearPreview();setStatus('');showManual(false);},
   receive:(id,payload)=>{
     if(String(id)!==String(requestId)||urlInput.value.trim()!==requestedUrl)return;
     const data=typeof payload==='string'?JSON.parse(payload):payload;
     if(!data||!data.ok){
       window.SetupProductUI.requireManual((data&&data.message)||'Store details unavailable. Enter them manually.');return;
     }
     if(data.name&&(!nameInput.value.trim()||nameInput.value===autoname)){
       nameInput.value=String(data.name).slice(0,180);
       autoname=nameInput.value;
     }
     const currency=String(data.currency||'').toUpperCase();
     const mismatch=currency&&currency!==String(currentCurrency).toUpperCase();
     const rangeOnly=data.priceKind==='range'||data.priceKind==='starting-at';
     const detected=Number(data.price);
     if(!rangeOnly&&currency&&!mismatch&&data.price!==null&&data.price!==undefined&&Number.isFinite(detected)&&detected>=0&&(!priceInput.value.trim()||priceInput.value===autoprice)){
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
     const amount=value=>Number(value).toLocaleString('en-US',{maximumFractionDigits:2});
     const rangeText=rangeOnly&&Number(data.lowPrice)>0?
       (currency?currency+' ':'')+amount(data.lowPrice)+
       (data.priceKind==='range'&&Number(data.highPrice)>Number(data.lowPrice)?
         ' – '+amount(data.highPrice):'+'):null;
     el('linkImportPrice').textContent=rangeText?
       'Variant prices: '+rangeText:
       (data.price!==null&&data.price!==undefined?
         ((currency||'Currency unverified')+' '+data.price):'Price not found');
     const complete=!rangeOnly&&!!nameInput.value.trim()&&priceInput.value.trim()!==''&&!mismatch&&!!currency&&!!photoBlob;
     if(rangeOnly)setStatus((data.priceKind==='range'?'Price range detected: ':'Starting price detected: ')+(rangeText||'multiple variants')+
       '. Select your variant on the store and enter its exact price below. We will not automatically choose the lowest price.','warning');
     else if(mismatch)setStatus('Store currency '+currency+' differs from '+currentCurrency+'. Confirm the correct price.','warning');
     else if(priceInput.value.trim()==='')setStatus('Price not detected. Enter a price below.','warning');
     else if(!nameInput.value.trim())setStatus('Name not detected. Enter a product name below.','warning');
     else if(!currency)setStatus('Store currency not verified. Confirm the correct price below.','warning');
     else if(!photoBlob)setStatus(data.imageMessage||'Product image unavailable. You can upload a photo below.','warning');
     else setStatus('Product details detected. Ready to add.','success');
     window.SetupProductUI.detectionComplete(complete);
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
