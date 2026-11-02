/* Design v1.6: UI interactions are enhancements to existing offline-first data.
   The actual product model, persistence and purchase accounting stay in app.js. */
(() => {
 'use strict';
 const byId=id=>document.getElementById(id);
 const theme=document.createElement('link');
 theme.rel='stylesheet';theme.href='design-v16.css';document.head.append(theme);


 const welcomeBackup=byId('welcomeBackup');
 if(welcomeBackup)welcomeBackup.addEventListener('click',()=>byId('importFile').click());
 window.addEventListener('backup-restored',()=>{
   const overlay=byId('introOverlay');
   if(overlay&&overlay.classList.contains('is-visible'))byId('introEnter').click();
 });

 const salaryTab=byId('plannerSalaryTab'),savingsTab=byId('plannerSavingsTab');
 function selectPlanner(mode){
   const salary=mode==='salary';
   byId('salaryPanel').hidden=!salary;
   byId('savingsPanel').hidden=salary;
   salaryTab.classList.toggle('is-selected',salary);
   savingsTab.classList.toggle('is-selected',!salary);
   salaryTab.setAttribute('aria-pressed',String(salary));
   savingsTab.setAttribute('aria-pressed',String(!salary));
   if(window.PersonalPlanner)window.PersonalPlanner.render();
 }
 salaryTab.onclick=()=>selectPlanner('salary');
 savingsTab.onclick=()=>selectPlanner('savings');
 selectPlanner('salary');

 function create(tag,className,textContent){
   const node=document.createElement(tag);
   if(className)node.className=className;
   if(textContent!==undefined)node.textContent=textContent;
   return node;
 }
 function panelPictogram(name){
   const span=create('span','panel-icon detail-attribute-icon');
   span.setAttribute('aria-hidden','true');
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 24 24');
   const use=document.createElementNS('http://www.w3.org/2000/svg','use');
   use.setAttribute('href','#ui-'+name);
   svg.append(use);span.append(svg);
   return span;
 }
  // One focused product detail surface; all values come from actual saved data.
 window.openItemDetails=id=>{
   const item=items.find(p=>p.id===id);
   if(!item)return;
   const container=byId('itemDetailBody');container.replaceChildren();
   byId('itemDetailTitle').textContent=item.name;
   const image=create('img','detail-product-image');
   image.alt=item.name+' picture';image.src=productIllustration(item);
   getPhoto(item.id).then(photo=>{
     if(photo&&image.isConnected&&container.contains(image))image.src=photo.url;
   }).catch(()=>{});
   const header=create('div','detail-product-header');
   const category=create('span','target-chip',item.cat);
   const status=create('span','purchase-status '+(checked[item.id]?'purchased':'to-buy'),checked[item.id]?'Purchased':'To buy');
   header.append(category,status);
   const price=create('strong','detail-price',fmt(item.price));
   const specs=create('div','detail-attributes');
   const priority=create('div','detail-attribute');
   priority.append(panelPictogram('bars'),create('span','eyebrow','PRIORITY'),create('strong','',String(item.priority||'medium').toUpperCase()));
   const date=create('div','detail-attribute');
   const target=item.targetMonth||( 'Not set' );
   date.append(panelPictogram('calendar'),create('span','eyebrow','TARGET MONTH'),create('strong','',target));
   const cat=create('div','detail-attribute');
   cat.append(panelPictogram('box'),create('span','eyebrow','CATEGORY'),create('strong','',item.cat));
   specs.append(priority,date,cat);
   const toggle=create('button','detail-purchase-toggle',checked[item.id]?'✓  Mark as not purchased':'✓  Mark as purchased');
   toggle.type='button';
   toggle.onclick=()=>{
     checked[item.id]=!checked[item.id];
     persist();render();window.openItemDetails(id);
   };
   const edit=create('button','detail-edit-button','Edit product');
   edit.type='button';
   edit.onclick=()=>{
     const target=byId('editProductBody');target.replaceChildren();
     byId('editSheetTitle').textContent='Edit product';
     buildEditForm(item,target,edit);
     window.openEditSheet();
   };
   const label=create('label','detail-notes-label','Notes');
   const note=create('textarea','detail-notes');
   note.placeholder='Seller, warranty or anything worth remembering';
   note.value=notes[id]||'';
   note.addEventListener('input',()=>{notes[id]=note.value;persist();});
   label.append(note);
   container.append(image,header,price,specs,toggle,edit,label);
   if(item.url&&validUrl(item.url)){
     const listing=create('button','detail-listing-button','↗  Open product listing');
     listing.type='button';
     listing.setAttribute('aria-label','Open product listing for '+item.name);
     listing.onclick=()=>{
       // Android WebView intercepts external navigation and opens the browser.
       const link=document.createElement('a');
       link.href=item.url;link.target='_self';link.rel='noopener noreferrer';
       link.click();
     };
     container.insertBefore(listing,label);
   }
   window.openDetailSheet();
 };
})();
