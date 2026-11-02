/* v1.5 lightweight sheets and contextual help. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const sheets=[$('productSheet'),$('categorySheet'),$('itemDetailSheet')];
 let previousFocus=null;
 function closeSheet(){
   for(const sheet of sheets)sheet.hidden=true;
   document.body.classList.remove('premium-sheet-open');
   if(previousFocus&&previousFocus.isConnected)previousFocus.focus({preventScroll:true});
   previousFocus=null;
 }
 function openSheet(sheet){
   if(!sheet)return;
   previousFocus=document.activeElement;
   sheets.forEach(s=>s.hidden=s!==sheet);
   sheet.hidden=false;
   document.body.classList.add('premium-sheet-open');
   const focus=sheet.querySelector('input:not([type=hidden]),.sheet-close');
   if(focus)focus.focus({preventScroll:true});
 }
 window.openProductSheet=()=>openSheet($('productSheet'));
 window.openCategorySheet=()=>openSheet($('categorySheet'));
 window.openDetailSheet=()=>openSheet($('itemDetailSheet'));
 window.closePremiumSheet=closeSheet;
 for(const sheet of sheets){
   sheet.addEventListener('click',event=>{
     if(event.target===sheet||event.target.closest('[data-close-sheet]'))closeSheet();
   });
 }
 window.addEventListener('product-created',()=>{
   closeSheet();$('addMessage').textContent='';
 });
 window.addEventListener('item-saved',()=>closeSheet());
 window.addEventListener('category-created',()=>{
   closeSheet();$('catMessage').textContent='';
 });
 const guides={
   contribution:'This is money you have already set aside and still have available. Choose the categories it can pay for. Current items receive allocations before Future purchases. Marking an item purchased does not automatically withdraw your cash.',
   category:'PC, Setup and Future are protected budget groups. Your own categories can be deleted. Tap a category to filter. Press and hold a custom category to Edit or Delete it. Deleting a category with products lets you move them first.',
   totals:'Purchased products remain in history but are excluded from remaining costs. The current savings goal excludes Future purchases. Contribution and ordinary savings are separate balances.',
   salary:'Monthly salary is income, not savings. Enter fixed expenses, variable expenses and planned savings. The remainder shows how much of your income is not yet allocated.',
   savings:'Actual savings are recorded independently of your monthly plan. They do not automatically increase the Tracker balance, avoiding accidental double counting.'
 };
 const helpShade=document.createElement('div');
 helpShade.className='premium-sheet-shade';helpShade.hidden=true;
 helpShade.innerHTML='<div class="premium-sheet premium-help" role="dialog" aria-modal="true" aria-labelledby="premiumHelpTitle"><div class="sheet-head"><h2 id="premiumHelpTitle">Information</h2><button type="button" class="sheet-close" aria-label="Close information">×</button></div><p id="premiumHelpText"></p></div>';
 document.body.append(helpShade);
 let helpFocus=null;
 document.addEventListener('click',event=>{
   const button=event.target.closest&&event.target.closest('[data-help]');
   if(!button)return;
   const text=guides[button.dataset.help];
   if(!text)return;
   helpFocus=document.activeElement;
   $('premiumHelpText').textContent=text;
   $('premiumHelpTitle').textContent=button.getAttribute('aria-label')||'Information';
   helpShade.hidden=false;
   helpShade.querySelector('button').focus({preventScroll:true});
 });
 function closeHelp(){
   helpShade.hidden=true;
   if(helpFocus&&helpFocus.isConnected)helpFocus.focus({preventScroll:true});
 }
 helpShade.addEventListener('click',event=>{
   if(event.target===helpShade||event.target.closest('.sheet-close'))closeHelp();
 });
 document.addEventListener('keydown',event=>{
   if(event.key!=='Escape')return;
   if(!helpShade.hidden){event.preventDefault();closeHelp();}
   else if(sheets.some(s=>!s.hidden)){event.preventDefault();closeSheet();}
 },true);
 // Avoid Android's system swipe actions while bottom sheets are visible.
 document.addEventListener('touchmove',event=>{
   if(sheets.some(s=>!s.hidden)&&event.target.classList.contains('premium-sheet-shade'))
     event.preventDefault();
 },{passive:false});
})();
