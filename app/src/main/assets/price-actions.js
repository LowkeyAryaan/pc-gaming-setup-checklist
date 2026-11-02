/* Setup Checklist · actionable variant price selection and retailer retries. */
(() => {
 'use strict';
 const el=id=>document.getElementById(id);
 const shade=document.createElement('div');
 shade.className='price-action-shade';shade.hidden=true;
 shade.innerHTML=[
  '<section class="price-action-panel" role="dialog" aria-modal="true" aria-labelledby="priceActionHeading" aria-describedby="priceActionExplanation">',
  '<div class="price-action-head"><div><span class="eyebrow">PRODUCT PRICE WATCH</span><h2 id="priceActionHeading">Price details</h2></div><button type="button" class="price-action-close" aria-label="Close price options">×</button></div>',
  '<p class="price-action-product" id="priceActionProduct"></p>',
  '<p class="price-action-explanation" id="priceActionExplanation"></p>',
  '<div id="priceActionChoices" class="price-action-choices">',
  '<div class="price-action-prices" id="priceActionPrices"></div>',
  '<label for="priceActionAmount">Confirmed variant price</label>',
  '<div class="price-action-input-row"><span id="priceActionCurrency">PKR</span><input type="number" id="priceActionAmount" inputmode="decimal" step="0.01" min="0.01" placeholder="Enter exact price"></div>',
  '<p class="price-action-hint">The lower and higher prices may represent different sizes, finishes or configurations. Confirm which one you want on the store before saving.</p>',
  '<button type="button" class="price-action-save">Save chosen price</button>',
  '</div>',
  '<div class="price-action-tools"><button type="button" class="price-action-retry">Retry this listing</button><button type="button" class="price-action-manual">Edit price or URL</button><button type="button" class="price-action-store">Open store listing</button></div>',
  '<p id="priceActionMessage" class="price-action-message" role="status" aria-live="polite"></p>',
  '</section>'
 ].join('');
 document.body.append(shade);
 let activeId=null,previousFocus=null;
 const item=()=>items.find(p=>p.id===activeId);
 const entry=()=>window.PriceWatchUI&&window.PriceWatchUI.getEntry(activeId);
 const valid=value=>Number.isFinite(Number(value))&&Number(value)>0&&Number(value)<1e11;
 function close(){
   shade.hidden=true;activeId=null;document.body.classList.remove('price-action-open');
   if(previousFocus&&previousFocus.isConnected)previousFocus.focus({preventScroll:true});
   previousFocus=null;
 }
 function editor(){
   const product=item();if(!product)return;
   close();
   const body=el('editProductBody');body.replaceChildren();
   el('editSheetTitle').textContent='Edit product';
   const dummy=document.createElement('button');
   buildEditForm(product,body,dummy);
   window.openEditSheet();
 }
 function listing(){
   const product=item();if(!product||!product.url||!validUrl(product.url))return;
   const link=document.createElement('a');link.href=product.url;
   link.target='_self';link.rel='noopener noreferrer';
   document.body.append(link);link.click();link.remove();
 }
 function choice(label,price){
   const b=document.createElement('button');b.type='button';b.className='price-action-choice';
   const title=document.createElement('small');title.textContent=label;
   const value=document.createElement('strong');value.textContent=fmt(price);
   b.append(title,value);
   b.onclick=()=>{
     el('priceActionAmount').value=String(price);
     shade.querySelectorAll('.price-action-choice').forEach(button=>
       button.classList.toggle('is-selected',button===b));
   };
   return b;
 }
 function refresh(){
   const product=item(),record=entry();
   if(!product){close();return;}
   const status=record&&record.url===product.url?record.status:'not-checked';
   const variant=status==='variant'||status==='variant-selected';
   el('priceActionProduct').textContent=product.name;
   el('priceActionCurrency').textContent=currentCurrency;
   el('priceActionChoices').hidden=!variant;
   el('priceActionPrices').replaceChildren();
   el('priceActionMessage').textContent='';
   if(variant){
     const low=Number(record.lowPrice),high=Number(record.highPrice);
     if(valid(low))el('priceActionPrices').append(choice('Use lower listed price',low));
     if(valid(high)&&high>low)el('priceActionPrices').append(choice('Use higher listed price',high));
     el('priceActionHeading').textContent=status==='variant-selected'?'Your chosen price':'Choose a variant price';
     el('priceActionExplanation').textContent=
       (record.reason||'This store lists more than one product price.')+
       ' Verify your actual configuration before choosing an amount.';
     el('priceActionAmount').value=String(status==='variant-selected'&&valid(record.selectedPrice)?record.selectedPrice:product.price);
     const purchased=!!checked[product.id];
     shade.querySelector('.price-action-save').disabled=purchased;
     if(purchased)el('priceActionMessage').textContent='This product is purchased. Edit its historical price through Edit price or URL.';
   }else{
     el('priceActionHeading').textContent='Price check unavailable';
     el('priceActionExplanation').textContent=(record&&record.reason)||
       'The store did not provide a verifiable price. Your saved amount was preserved.';
     el('priceActionMessage').textContent='If retry fails, edit the saved price manually. Some shops block automated checks.';
   }
   shade.querySelector('.price-action-retry').disabled=
     !(product.url&&/^https:\/\//i.test(product.url));
   shade.querySelector('.price-action-store').hidden=!product.url;
 }
 function open(id){
   const product=items.find(p=>p.id===id);if(!product)return;
   activeId=id;previousFocus=document.activeElement;
   refresh();shade.hidden=false;document.body.classList.add('price-action-open');
   shade.querySelector('.price-action-close').focus({preventScroll:true});
 }
 shade.querySelector('.price-action-close').onclick=close;
 shade.addEventListener('click',event=>{if(event.target===shade)close();});
 document.addEventListener('keydown',event=>{
   if(!shade.hidden&&event.key==='Escape'){event.preventDefault();close();}
 });
 shade.querySelector('.price-action-manual').onclick=editor;
 shade.querySelector('.price-action-store').onclick=listing;
 shade.querySelector('.price-action-retry').onclick=()=>{
   const product=item();if(!product)return;
   window.PriceWatchUI.checkNow({force:true,onlyId:product.id});
   el('priceActionMessage').textContent='Checking this product listing…';
 };
 shade.querySelector('.price-action-save').onclick=()=>{
   const product=item();if(!product)return;
   const input=el('priceActionAmount');
   if(!valid(input.value)){
     el('priceActionMessage').textContent='Enter a valid positive price for your selected configuration.';
     input.focus();return;
   }
   if(!window.PriceWatchUI.applyVariantSelection(product.id,input.value)){
     el('priceActionMessage').textContent='Could not save. Reopen this product and try again.';return;
   }
   const detail=el('itemDetailSheet'),showDetail=detail&&!detail.hidden&&
     el('itemDetailTitle').textContent===product.name;
   close();
   if(showDetail&&window.openItemDetails)window.openItemDetails(product.id);
 };
 window.addEventListener('price-watch-updated',event=>{
   if(!shade.hidden&&event.detail&&event.detail.id===activeId)refresh();
 });
 window.PriceWatchActions={open,close};
})();