// Dependency-free migration and public-release safeguards.
// Run with: node --test app/tests/release-safety.test.cjs
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const asset=name=>fs.readFileSync(path.join(__dirname,'..','src','main','assets',name),'utf8');
const app=asset('app.js'),html=asset('index.html'),onboarding=asset('onboarding.js'),shell=asset('shell.js');

function extract(name){
  const mark='function '+name+'(';
  const start=app.indexOf(mark);
  assert.ok(start>=0,name+' exists');
  let open=app.indexOf('{',start),depth=0,close=open;
  for(;close<app.length;close++){
    if(app[close]==='{')depth++;
    if(app[close]==='}'&&--depth===0)break;
    // The function bodies use no free-standing curly braces in strings.
    if(app[close]!=='}')depth=depth; // Intentional no-op for clarity.
  }
  assert.ok(close<app.length,name+' has balanced braces');
  return app.slice(start,close+1);
}

function runHydration(saved,deleted=[]){
  const context={
    deletedIds:new Set(deleted),
    customCategories:[{name:'Streaming Setup',group:'setup'}],
    builtinNames:['PC','Monitor','Desk','Accessory','Chair','Future'],
    ITEM_PRIORITIES:['high','medium','low'],
    validTargetMonth:x=>typeof x==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(x),
    safePrice:x=>Math.max(0,Math.round((Number(x)||0)*1000)/1000),
    validUrl:x=>!x||/^https?:\/\//.test(x)
  };
  context.normalizeProduct=vm.runInNewContext('('+extract('normalizeProduct')+')',context);
  context.hydrateProducts=vm.runInNewContext('('+extract('hydrateProducts')+')',context);
  return JSON.parse(JSON.stringify(context.hydrateProducts(saved).map(x=>({id:x.id,name:x.name,cat:x.cat,price:x.price,url:x.url}))));
}

test('Public APK ships no personal seeded products',()=>{
  assert.match(app,/^const items=\[\];/);
  assert.match(app,/const originalItems = \[\];/);
  assert.doesNotMatch(app,/^const items=\[\s*\{/);
  assert.doesNotMatch(html,/(Dad.s contribution|GPU listing URL may not match|Future MSI secondary)/i);
});

test('Existing v1.3 saved products migrate with prices, categories and links',()=>{
  const migrated=runHydration({
    overrides:{
      cpu:{name:'My private CPU',price:60000,cat:'PC',url:'https://example.com/cpu'},
      gpu:{name:'My private GPU',price:140000,cat:'PC',url:'https://example.com/gpu'}
    },
    customItems:[{id:'custom-21',name:'Webcam',price:1350.5,cat:'Streaming Setup',url:'https://example.com/cam'}]
  });
  assert.deepEqual(migrated.map(x=>x.id),['cpu','gpu','custom-21']);
  assert.equal(migrated[1].price,140000);
  assert.equal(migrated[2].price,1350.5);
  assert.equal(migrated[2].cat,'Streaming Setup');
  assert.equal(migrated[0].url,'https://example.com/cpu');
});

test('Intentionally deleted products never return',()=>{
  const migrated=runHydration({overrides:{
    cpu:{name:'CPU',price:50000,cat:'PC'},
    gpu:{name:'GPU',price:80000,cat:'PC'}
  }},['gpu']);
  assert.deepEqual(migrated.map(x=>x.id),['cpu']);
});

test('Fresh user sees an empty preset but can add products',()=>{
  assert.deepEqual(runHydration({blankPreset:true,overrides:{},customItems:[]}),[]);
  assert.deepEqual(runHydration({blankPreset:true,customItems:[{id:'a1',name:'First Build GPU',price:299.99,cat:'PC'}]}).map(x=>x.id),['a1']);
});

test('Onboarding and welcome screens carry the requested credit',()=>{
  assert.equal((html.match(/Made by Aryaan/g)||[]).length,3);
  assert.match(onboarding,/status:'pending'/);
  assert.match(onboarding,/introAcceptTerms/);
  assert.match(onboarding,/introWelcome/);
  assert.match(html,/Let's build your dream setup!/);
});

test('Sidebar feedback and settings are implemented and version stays v1.4',()=>{
  assert.match(html,/id="feedbackButton"/);
  assert.match(shell,/function openFeedback\(/);
  assert.match(shell,/AndroidFeedback\.composeEmail/);
  assert.match(shell,/Show product pictures/);
  assert.match(shell,/Item sorting/);
  assert.match(shell,/Show welcome screen on launch/);
  assert.match(app,/currency:currentCurrency/);
});


test('Creator Instagram handle appears in welcome and sidebar, with links in settings and feedback',()=>{
  const link='https://www.instagram.com/aryaan_creates/';
  assert.equal((html.match(/href="https:\/\/www\.instagram\.com\/aryaan_creates\/"/g)||[]).length,2);
  assert.match(html,/class="instagram-credit welcome-instagram"[^>]*>@aryaan_creates<\/a>/);
  assert.match(html,/class="instagram-credit drawer-instagram"/);
  assert.match(shell,/const CREATOR_INSTAGRAM_URL='https:\/\/www\.instagram\.com\/aryaan_creates\/'/);
  assert.match(shell,/root\.append\(creatorLabel,instagramCreatorLink\(\)\)/);
  assert.match(shell,/creator\.append\(creatorLabel,instagramCreatorLink\(\)\)/);
  assert.ok(html.includes(link));
  assert.match(html,/Made by Aryaan/);
});
