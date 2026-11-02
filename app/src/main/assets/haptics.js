/* Setup Checklist · device-level tactile feedback (respects Android settings). */
(() => {
 'use strict';
 const PREF='setup-checklist-haptics-v1';
 let enabled=true;
 try{enabled=localStorage.getItem(PREF)!=='off';}catch(_){}
 const available=()=>typeof window.AndroidHaptics!=='undefined'&&
     typeof window.AndroidHaptics.pulse==='function';
 const pulse=kind=>{
   if(!enabled||!available())return;
   if(!['tap','select','navigate','long'].includes(kind))return;
   try{window.AndroidHaptics.pulse(kind);}catch(_){}
 };
 window.SetupHaptics={
   getEnabled:()=>enabled,
   setEnabled:value=>{
     enabled=!!value;
     try{localStorage.setItem(PREF,enabled?'on':'off');}catch(_){}
   },
   pulse
 };
 // Delegate so buttons inside dynamically generated menus and dialogs are included.
 // Navigation gets its own tick from goToPage, so no duplicate bottom-tab tick.
 document.addEventListener('click',event=>{
   const control=event.target.closest&&event.target.closest(
     'button,select,input[type="checkbox"],input[type="radio"],[role="button"],a'
   );
   if(!control||control.disabled||control.getAttribute('aria-disabled')==='true')return;
   if(control.id==='settingHapticFeedback')return;
   if(control.closest('.bottom-tabs')||control.id==='trackerToItems')return;
   if(control.matches('a')&&control.closest('.item'))return;
   const kind=(control.matches('input[type="checkbox"],input[type="radio"],select')||
     control.closest('.category-choice-grid,.purchase-tabs,.planner-switch,.app-picker-sheet'))?
     'select':'tap';
   pulse(kind);
 },true);
})();
