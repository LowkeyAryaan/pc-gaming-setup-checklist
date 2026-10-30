/* v1.5 local-first monthly financial planner. Global across presets.
   Salary, planned savings and actual savings are distinct, and never
   automatically alter checklist cash balances or convert currencies. */
(() => {
 'use strict';
 const KEY='pc-gaming-global-planner-v1';
 const ids=['Salary','Fixed','Variable','Target','Actual'];
 const el=id=>document.getElementById(id);
 const safe=BudgetModel.safe;
 const localMonth=()=>{
   const d=new Date();
   return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
 };
 const validMonth=key=>/^\d{4}-(0[1-9]|1[0-2])$/.test(key);
 let data={version:1,currency:currentCurrency,months:{}};
 try{
   const raw=JSON.parse(localStorage.getItem(KEY)||'null');
   if(raw&&raw.version===1&&raw.months&&typeof raw.months==='object'){
     data.currency=isCurrency(raw.currency)?raw.currency:currentCurrency;
     for(const [month,row] of Object.entries(raw.months)){
       if(!validMonth(month)||!row||typeof row!=='object')continue;
       data.months[month]={};
       for(const key of ids)data.months[month][key]=safe(row[key]);
     }
   }
 }catch(_){}
 const monthInput=el('plannerMonth');
 monthInput.value=localMonth();
 const money=n=>{
   const v=safe(n);
   if(data.currency==='PKR')return 'Rs. '+v.toLocaleString('en-US',{maximumFractionDigits:2});
   try{return new Intl.NumberFormat('en-US',{style:'currency',currency:data.currency,maximumFractionDigits:2}).format(v);}
   catch(_){return data.currency+' '+v.toLocaleString('en-US');}
 };
 function save(){
   try{localStorage.setItem(KEY,JSON.stringify(data));}
   catch(_){alert('Planner storage unavailable. Export your backup before clearing app data.');}
 }
 function rowFor(month){return data.months[month]||Object.fromEntries(ids.map(key=>[key,0]));}
 function render(){
   const month=validMonth(monthInput.value)?monthInput.value:localMonth();
   if(monthInput.value!==month)monthInput.value=month;
   const row=rowFor(month);
   for(const key of ids){const input=el('planner'+key);if(document.activeElement!==input)input.value=String(safe(row[key]));}
   el('plannerCurrency').textContent=data.currency;
   const available=safe(row.Salary)-safe(row.Fixed)-safe(row.Variable)-safe(row.Target);
   const balance=el('plannerAvailable');balance.textContent=money(Math.abs(available));
   balance.classList.toggle('planner-negative',available<0);
   el('plannerOverspend').textContent=available<0?'Overallocated by '+money(-available)+'. Adjust expenses or planned savings.':'';
   const target=safe(row.Target),actual=safe(row.Actual);
   const pct=target?Math.round(actual/target*100):0;
   const progress=el('plannerProgress');progress.max=Math.max(1,target);progress.value=Math.min(actual,target);
   el('plannerPercent').textContent=target?pct+'% of monthly plan':(actual?'No target set':'Set your savings target');
   el('plannerGap').textContent=target>actual?money(target-actual)+' to goal':(target?'Goal reached':'');
   const entries=Object.entries(data.months).sort((a,b)=>b[0].localeCompare(a[0]));
   const total=entries.reduce((a,[,v])=>a+safe(v.Actual),0);
   el('plannerTotalSaved').textContent=money(total);
   el('plannerAverage').textContent=money(entries.length?total/entries.length:0);
   const list=el('plannerHistory');list.replaceChildren();
   if(!entries.length){
     const label=document.createElement('p');label.className='muted small';
     label.textContent='No months recorded yet.';list.append(label);return;
   }
   for(const [key,entry] of entries){
     const button=document.createElement('button');
     button.type='button';button.className='planner-history-row';
     if(key===month)button.classList.add('selected');
     const name=document.createElement('span');name.textContent=key;
     const val=document.createElement('strong');val.textContent=money(entry.Actual);
     button.append(name,val);
     button.onclick=()=>{monthInput.value=key;render();};
     list.append(button);
   }
 }
 for(const key of ids){
   const input=el('planner'+key);
   input.addEventListener('input',()=>{
     const month=validMonth(monthInput.value)?monthInput.value:localMonth();
     const next=data.months[month]||{};
     next[key]=safe(input.value);
     data.months[month]=next;save();render();
   });
 }
 monthInput.addEventListener('change',render);
 el('plannerCurrentMonth').onclick=()=>{monthInput.value=localMonth();render();};
 window.PersonalPlanner={
   render,
   exportState:()=>JSON.parse(JSON.stringify(data)),
   importState:state=>{
     if(!state||state.version!==1||!state.months||typeof state.months!=='object')
       throw new Error('Invalid finance planner backup');
     const restored={version:1,currency:isCurrency(state.currency)?state.currency:currentCurrency,months:{}};
     for(const [month,row] of Object.entries(state.months)){
       if(!validMonth(month)||!row||typeof row!=='object')continue;
       restored.months[month]={};
       for(const key of ids)restored.months[month][key]=safe(row[key]);
     }
     data=restored;save();render();
   }
 };
 render();
})();
