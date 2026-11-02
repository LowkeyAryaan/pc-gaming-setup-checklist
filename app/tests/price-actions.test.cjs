const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const assets=path.join(__dirname,'../src/main/assets');
const read=name=>fs.readFileSync(path.join(assets,name),'utf8');
const price=read('price-watch.js'),actions=read('price-actions.js'),
  styles=read('price-watch.css'),page=read('index.html');

test('Unavailable and variant status chips are actionable buttons',()=>{
 assert.match(price,/const tag=document\.createElement\(action\?'button':'span'\)/);
 assert.match(price,/if\(window\.PriceWatchActions\)window\.PriceWatchActions\.open\(item\.id\)/);
 assert.match(price,/variant:'! Choose variant'/);
 assert.match(price,/'variant-selected':'✓ Price selected'/);
 assert.match(styles,/button\.price-watch-chip\.price-watch-action/);
 assert.match(page,/src="price-actions\.js"/);
});

test('Picker offers manual exact price and lower or upper listed amount',()=>{
 assert.match(actions,/function choice\(label,price\)/);
 assert.match(actions,/Use lower listed price/);
 assert.match(actions,/Use higher listed price/);
 assert.match(actions,/Confirmed variant price/);
 assert.match(actions,/Confirm which one you want on the store before saving/);
 assert.match(actions,/\.applyVariantSelection\(product\.id,input\.value\)/);
 assert.match(actions,/\.disabled=purchased/);
});

test('Manually chosen price persists and generic ranges cannot overwrite it',()=>{
 assert.match(price,/function applyVariantSelection\(id,amount\)/);
 assert.match(price,/item\.price=safePrice\(value\)/);
 assert.match(price,/selectedPrice:safePrice\(value\)/);
 assert.match(price,/status:selected!==null\?'variant-selected':'variant'/);
 assert.match(price,/}else if\(selected!==null\)/);
 assert.match(price,/Once a person selects a variant, never overwrite it from generic metadata/);
 assert.match(price,/const selected=same&&validMoney\(Number\(old\.selectedPrice\)\)/);
 assert.match(price,/status:selected!==null\?'variant-selected':'unavailable'/);
 assert.match(price,/cancel\(\);\s*persist\(\);flushRefresh\(\)/);
});

test('Unavailable panel exposes reason, retry and manual edit fallback',()=>{
 assert.match(actions,/Retry this listing/);
 assert.match(actions,/Edit price or URL/);
 assert.match(actions,/Open store listing/);
 assert.match(actions,/window\.PriceWatchUI\.checkNow\(\{force:true,onlyId:product\.id\}\)/);
 assert.match(price,/!options\.onlyId\|\|item\.id===options\.onlyId/);
 assert.match(price,/new CustomEvent\('price-watch-updated'/);
 assert.match(actions,/window\.addEventListener\('price-watch-updated'/);
 assert.match(actions,/Some shops block automated checks/);
});

test('Saved money and purchased transaction status remain untouched',()=>{
 assert.doesNotMatch(actions,/saved\s*=/);
 assert.doesNotMatch(actions,/checked\[[^\]]+\]\s*=/);
 assert.match(price,/if\(!item\|\|checked\[id\]\|\|!validMoney\(value\)\)return false/);
 assert.match(actions,/if\(purchased\)/);
});
