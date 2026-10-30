const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.join(__dirname,'../src/main/assets');
const file=name=>fs.readFileSync(path.join(base,name),'utf8');
const model=require('../src/main/assets/budget-model.js');
const app=file('app.js'),html=file('index.html'),ui=file('ui-polish.js');
const onboarding=file('onboarding.js'),planner=file('planner.js');
const java=fs.readFileSync(path.join(__dirname,'../src/main/java/com/aryaan/pcsetup/MainActivity.java'),'utf8');
const group=name=>name==='PC'||name==='CPU'?'pc':name==='Future'||name==='Upgrade'?'future':'setup';
const product=(id,cat,price)=>({id,cat,price});

test('Built-in categories are PC, Setup and Future only, with legacy migration',()=>{
 assert.match(app,/const BUILTIN = \{PC:'pc',Setup:'setup',Future:'future'\}/);
 assert.match(app,/function migrateLegacyCategories\(state\)/);
 assert.match(app,/migrateLegacyCategories\(savedState\)/);
 assert.match(app,/migrateLegacyCategories\(state\)/);
 assert.match(html,/id="categorySheet"/);
 assert.match(html,/id="categoryManagement"/);
});
test('PC-only contribution stays scoped and cannot overallocate',()=>{
 const items=[product('cpu','CPU',1000),product('monitor','Setup',700),product('up','Future',600)];
 const t=model.compute(items,{},group,1400,'pc');
 assert.equal(t.currentGoal,700);
 assert.equal(t.pc,0);
 assert.equal(t.unallocated,400);
 assert.equal(t.futureTotal,600);
});
test('Everything except PC is allocated to setup first, then Future',()=>{
 const items=[product('cpu','PC',1000),product('setup','Setup',700),product('future','Upgrade',500)];
 const t=model.compute(items,{},group,900,'nonpc');
 assert.equal(t.pc,1000);
 assert.equal(t.setup,0);
 assert.equal(t.futureTotal,300);
 assert.equal(t.currentGoal,1000);
});
test('Everything prioritizes current products and does not count future toward current goal',()=>{
 const items=[product('cpu','PC',1000),product('setup','Setup',700),product('future','Upgrade',300)];
 const t=model.compute(items,{},group,1900,'all');
 assert.equal(t.currentGoal,0);
 assert.equal(t.futureTotal,100);
 assert.equal(t.unallocated,0);
});
test('A specific Future category allocation never reduces current savings target',()=>{
 const items=[product('cpu','PC',1000),product('setup','Setup',700),product('future','Upgrade',300)];
 const t=model.compute(items,{},group,250,'category','Upgrade');
 assert.equal(t.currentGoal,1700);
 assert.equal(t.futureTotal,50);
 assert.equal(t.allocated,250);
});
test('Purchased items leave remaining targets and preserve purchase history',()=>{
 const items=[product('cpu','PC',1000),product('monitor','Setup',700),product('future','Future',300)];
 const before=model.compute(items,{},group,100,'pc');
 const after=model.compute(items,{cpu:true},group,100,'pc');
 assert.equal(before.currentGoal,1600);
 assert.equal(after.currentGoal,700);
 assert.equal(after.purchasedTotal,1000);
 assert.equal(after.purchasedCount,1);
 assert.equal(after.unallocated,100);
});
test('Contributions are accounted for once and never turn target negative',()=>{
 const t=model.compute([product('cpu','PC',15)],{},group,10000,'all');
 assert.equal(t.currentGoal,0);
 assert.equal(t.unallocated,9985);
 assert.equal(t.allocated,15);
});
test('Premium UI moves product/category forms into dedicated sheets',()=>{
 for(const id of ['productSheet','categorySheet','addProductForm','categoryForm','page-planner','contributionScope','contributionCategory','plannerSalary','plannerActual','plannerHistory','dynamicCategoryTotals','purchaseStatusFilters'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.equal((html.match(/id="addProductForm"/g)||[]).length,1);
 assert.equal((html.match(/id="categoryForm"/g)||[]).length,1);
 assert.match(html,/data-page="planner"/);
 assert.doesNotMatch(html,/<h2>Filter items<\/h2>/);
 assert.match(ui,/const pages=\['tracker','items','summary','planner'\]/);
});
test('Global finance planner separates actual savings from planned income allocations',()=>{
 assert.match(planner,/pc-gaming-global-planner-v1/);
 assert.match(planner,/plannerActual/);
 assert.match(planner,/plannerTarget/);
 assert.match(planner,/exportState/);
 assert.match(planner,/importState/);
 assert.doesNotMatch(planner,/\$\('saved'\)\.value\s*=/);
});
test('Native clipboard bridge handles copying without falsely reporting success',()=>{
 assert.match(java,/class ClipboardBridge/);
 assert.match(java,/ClipboardManager/);
 assert.match(java,/setPrimaryClip/);
 assert.match(app,/AndroidClipboard\.copy\(copyText\(\)\)/);
 assert.match(app,/Copy unavailable/);
});
test('Welcome animation uses a short handoff and honors reduced motion',()=>{
 assert.match(onboarding,/window\.setTimeout\(finish,300\)/);
 assert.match(onboarding,/prefers-reduced-motion: reduce/);
 assert.match(file('premium-v15.css'),/GPU-friendly welcome handoff/);
 assert.match(file('premium-v15.css'),/@media\(prefers-reduced-motion:reduce\)/);
});
test('Financial data remains local and is included in intentional backup exports',()=>{
 assert.match(app,/planner:window\.PersonalPlanner/);
 assert.match(app,/contributionScope,contributionCategory/);
 assert.match(planner,/localStorage\.setItem/);
 assert.doesNotMatch(planner,/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket)\s*\(/);
});
