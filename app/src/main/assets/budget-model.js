/* v1.5 pure, deterministic contribution allocation model.
   Purchases are excluded from remaining costs; contribution is unspent,
   separately reserved cash and never silently withdrawn on purchase. */
(function(root){
  'use strict';
  const safe=value=>Math.max(0,Math.round((Number(value)||0)*1000)/1000);
  function compute(items,checked,categoryGroup,amount,scope='pc',selectedCategory=''){
    const byCategory=new Map();
    let purchasedTotal=0,purchasedCount=0,remainingCount=0;
    for(const item of items){
      const price=safe(item.price);
      if(checked[item.id]){purchasedTotal+=price;purchasedCount++;continue;}
      remainingCount++;
      const group=categoryGroup(item.cat);
      const previous=byCategory.get(item.cat)||{name:item.cat,group,total:0,allocated:0,remaining:0,count:0};
      previous.total+=price;previous.count++;
      byCategory.set(item.cat,previous);
    }
    const rows=[...byCategory.values()];
    const priority={pc:0,setup:1,future:2};
    const ordered=[...rows].sort((a,b)=>(priority[a.group]??1)-(priority[b.group]??1));
    let unallocated=safe(amount);
    const eligible=row=>scope==='all'||(scope==='pc'&&row.group==='pc')||
       (scope==='nonpc'&&row.group!=='pc')||
       (scope==='category'&&row.name===selectedCategory);
    for(const row of ordered){
      if(eligible(row)){
        row.allocated=Math.min(unallocated,row.total);
        unallocated=Math.max(0,unallocated-row.allocated);
      }
      row.remaining=Math.max(0,row.total-row.allocated);
    }
    const sum=(group,field)=>rows.filter(r=>r.group===group).reduce((a,r)=>a+r[field],0);
    const pc=sum('pc','remaining'),setup=sum('setup','remaining'),futureTotal=sum('future','remaining');
    const currentGoal=pc+setup;
    const rawCurrent=sum('pc','total')+sum('setup','total');
    const currentAllocated=sum('pc','allocated')+sum('setup','allocated');
    return {rows,pc,setup,share:pc,futureTotal,currentGoal,full:rawCurrent+sum('future','total'),
      fullRemaining:pc+setup+futureTotal,contributed:safe(amount),allocated:safe(amount)-unallocated,
      currentAllocated,unallocated,rawCurrent,purchasedTotal,purchasedCount,remainingCount,
      purchasedCurrent:items.filter(i=>!!checked[i.id]&&categoryGroup(i.cat)!=='future').length,
      remainingCurrent:items.filter(i=>!checked[i.id]&&categoryGroup(i.cat)!=='future').length};
  }
  const api={compute,safe};
  root.BudgetModel=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
