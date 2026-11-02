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
 for(const id of ['searchProducts','newPriority','newTargetMonth','newPurchased','nextPurchase','summaryRing','itemDetailSheet','plannerSalaryTab','plannerSavingsTab','welcomeBackup'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(premium,/window\.openItemDetails=/);
 assert.match(premium,/getPhoto\(item\.id\)/);
 assert.match(premium,/buildEditForm\(item,container,edit\)/);
 assert.match(premium,/checked\[item\.id\]=!checked\[item\.id\]/);
 assert.match(read('premium-v15.js'),/openProductSheet/);
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

test('Functional icons use semantic SVG symbols without repeated brand logo stamps',()=>{
 const symbols=[...html.matchAll(/<symbol id="ui-([a-z]+)"/g)].map(match=>match[1]);
 assert.ok(symbols.includes('wallet'));
 assert.ok(symbols.includes('coins'));
 assert.ok(symbols.includes('box'));
 assert.ok(symbols.includes('target'));
 assert.ok(symbols.includes('cart'));
 const iconUses=[...html.matchAll(/<use href="#ui-([a-z]+)"/g)].map(match=>match[1]);
 assert.ok(iconUses.length>=12,'panel icons should be present in key screens and sheets');
 for(const icon of iconUses)assert.ok(symbols.includes(icon),'undefined icon: '+icon);
 assert.match(html,/class="panel-icon[^"]*" aria-hidden="true"/);
 assert.match(html,/id="contributionPanel"/);
 assert.match(html,/id="plannerSalary"/);
 assert.match(html,/id="goalLabel"/);
 assert.doesNotMatch(html,/<img src="brand-mark\.svg" class="goal-mark"/);
 assert.equal((html.match(/src="brand-mark\.svg"/g)||[]).length,2,
   'Brand logo should only appear on welcome and in app identity');
 assert.doesNotMatch(html,/class="welcome-dots"/);
 assert.match(styles,/\.panel-icon svg/);
});

test('Setup Checklist rebrand and restrained glass design are connected',()=>{
 const brand=read('brand-mark.svg');
 const glass=read('glass-v17.css');
 const controls=read('glass-v17.js');
 const gradle=fs.readFileSync(path.join(__dirname,'../build.gradle'),'utf8');
 assert.match(brand,/PC monogram/);
 assert.match(html,/<title>Setup Checklist<\/title>/);
 assert.doesNotMatch(html,/id="quickAdd"/);
 assert.match(html,/href="glass-v17\.css"/);
 assert.match(html,/src="glass-v17\.js"/);
 assert.match(glass,/--r-dock:30px/);
 assert.match(glass,/\.bottom-tabs/);
 assert.match(glass,/\.intro-stage:not\(\.welcome\)/);
 assert.match(controls,/month-glass-sheet/);
 assert.match(controls,/window\.ProductLinkImport/);
 assert.match(gradle,/versionName '1\.7\.0'/);
});
test('Product metadata lookup is bounded and keeps manual product control',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/main/java/com/aryaan/pcsetup/ProductPageReader.java'),'utf8');
 const activity=fs.readFileSync(path.join(__dirname,'../src/main/java/com/aryaan/pcsetup/MainActivity.java'),'utf8');
 const manifest=fs.readFileSync(path.join(__dirname,'../src/main/AndroidManifest.xml'),'utf8');
 assert.match(source,/HTML_LIMIT = 750_000/);
 assert.match(source,/Only secure public links allowed/);
 assert.match(source,/findStructuredProduct/);
 assert.match(source,/og:image/);
 assert.match(source,/product:price:amount/);
 assert.match(activity,/new ProductLookupBridge/);
 assert.match(manifest,/android\.permission\.INTERNET/);
 assert.match(html,/id="linkImportStatus"/);
 assert.match(html,/id="linkImportPreview"/);
 assert.match(js,/ProductLinkImport\.photoFor/);
});
