const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'../src/main/assets');
const read=name=>fs.readFileSync(path.join(base,name),'utf8');
const js=read('app.js'), html=read('index.html'), premium=read('design-v16.js'), styles=read('design-v16.css');
function normalize(raw){
 const i=js.indexOf('function normalizeProduct('),j=js.indexOf('\nconst newProducts',i);
 assert.ok(i>0&&j>i);
 const context={
   ITEM_PRIORITIES:['high','medium','low'],
   validTargetMonth:x=>typeof x==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(x),
   builtinNames:['PC','Setup','Future'],customCategories:[],
   safePrice:x=>Math.max(0,Number(x)||0),
   validUrl:val=>!val||/^https?:\/\//.test(val)
 };
 return vm.runInNewContext(js.slice(i,j)+'\nnormalizeProduct('+JSON.stringify(raw)+')',context);
}
test('Old products receive safe defaults without losing core product data',()=>{
 const p=normalize({id:'old',name:'My GPU',price:41000,cat:'PC',url:'https://example.com'});
 assert.equal(p.name,'My GPU');
 assert.equal(p.price,41000);
 assert.equal(p.priority,'medium');
 assert.equal(p.targetMonth,'');
 assert.equal(p.url,'https://example.com');
});
test('Priority and purchase targets survive normalization and reject malformed months',()=>{
 const hi=normalize({id:'gpu',name:'GPU',cat:'PC',price:900,priority:'high',targetMonth:'2027-04'});
 const lo=normalize({id:'cpu',name:'CPU',cat:'PC',priority:'loud',targetMonth:'2027-99'});
 assert.equal(hi.priority,'high');assert.equal(hi.targetMonth,'2027-04');
 assert.equal(lo.priority,'medium');assert.equal(lo.targetMonth,'');
});
test('All product metadata participates in persistence, backups and copy of a preset',()=>{
 assert.match(js,/priority:i\.priority,targetMonth:i\.targetMonth/);
 assert.match(js,/priority:ITEM_PRIORITIES\.includes\(raw\.priority\)/);
 assert.match(js,/targetMonth:validTargetMonth\(raw\.targetMonth\)/);
 assert.match(js,/items\.push\(\{id,name/);
 assert.match(js,/if\(\$\('newPurchased'\)\.checked\)checked\[id\]=true/);
 assert.match(js,/items,checked,notes,categories:customCategories/);
});
test('Search and priority sorting use saved item fields',()=>{
 assert.match(js,/sortOrder==='priority'/);
 assert.match(js,/searchProducts/);
 assert.match(js,/item\.name\+' '\+item\.cat/);
 assert.match(js,/priority-chip priority-/);
 assert.match(js,/target-chip/);
});
test('Next purchase considers only unpurchased current-goal items',()=>{
 assert.match(js,/const candidates=items\.filter\(i=>!checked\[i\.id\]&&categoryGroup\(i\.cat\)!=='future'\)/);
 assert.match(js,/priorityRank=\{high:0,medium:1,low:2\}/);
 assert.match(js,/nextPurchaseName/);
});
test('Design introduces actual actions and prioritization inputs',()=>{
 for(const id of ['searchProducts','newPriority','newTargetMonth','newPurchased','nextPurchase','summaryRing','quickAdd','itemDetailSheet','plannerSalaryTab','plannerSavingsTab','welcomeBackup'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(premium,/window\.openItemDetails=/);
 assert.match(premium,/getPhoto\(item\.id\)/);
 assert.match(premium,/buildEditForm\(item,container,edit\)/);
 assert.match(premium,/checked\[item\.id\]=!checked\[item\.id\]/);
 assert.match(premium,/openProductSheet/);
});
test('Art mark is valid SVG and launcher icon is vector resource',()=>{
 const logo=read('brand-mark.svg');
 const android=fs.readFileSync(path.join(__dirname,'../src/main/res/drawable/ic_launcher_art.xml'),'utf8');
 const manifest=fs.readFileSync(path.join(__dirname,'../src/main/AndroidManifest.xml'),'utf8');
 assert.match(logo,/<svg/);assert.match(logo,/<\/svg>/);
 assert.match(android,/<vector/);assert.match(android,/<\/vector>/);
 assert.match(manifest,/android:icon="@drawable\/ic_launcher_art"/);
 assert.match(styles,/\.intro-stage\.welcome/);
});
