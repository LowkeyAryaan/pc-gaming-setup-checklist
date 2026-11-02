const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'../src/main');
const read=rel=>fs.readFileSync(path.join(dir,rel),'utf8');
const app=read('assets/app.js'),watch=read('assets/price-watch.js');
const html=read('assets/index.html'),css=read('assets/price-watch.css');
const activity=read('java/com/aryaan/pcsetup/MainActivity.java');
const reader=read('java/com/aryaan/pcsetup/ProductPageReader.java');
const shell=read('assets/shell.js'),onboarding=read('assets/onboarding.js');
test('Price watch launches after welcome and supports disabled-welcome startup',()=>{
 assert.match(onboarding,/window\.dispatchEvent\(new Event\("setup-app-entered"\)\)/);
 assert.match(watch,/window\.addEventListener\('setup-app-entered'/);
 assert.match(watch,/if\(!overlay\|\|!overlay\.classList\.contains\('is-visible'\)\)/);
 assert.match(watch,/bootStarted=true/);
 assert.match(html,/src="price-watch\.js"/);
 assert.match(html,/href="price-watch\.css"/);
});
test('Native Android checks HTTPS metadata only, using bounded concurrency',()=>{
 assert.match(activity,/new PriceWatchBridge\(\), "AndroidPriceWatch"/);
 assert.match(activity,/newFixedThreadPool\(3\)/);
 assert.match(activity,/ProductPageReader\.readPrice\(requestUrl\)/);
 assert.match(activity,/window\.PriceWatchUI && window\.PriceWatchUI\.receive/);
 assert.match(reader,/static JSONObject readPrice\(String input\)/);
 assert.match(reader,/return read\(input,false\)/);
 assert.match(reader,/if\(includeImage&&image!=null\)/);
 assert.match(reader,/Only secure public links allowed/);
});
test('Only trusted matching-currency price updates affect unchecked product prices',()=>{
 assert.match(watch,/currency===currentCurrency/);
 assert.match(watch,/validMoney\(observed\)/);
 assert.match(watch,/if\(!checked\[id\]&&!suspicious\)/);
 assert.match(watch,/item\.price=safePrice\(observed\)/);
 assert.match(watch,/kind='review'/);
 assert.match(watch,/status:'unavailable'/);
 assert.match(watch,/if\(currentRun&&currentRun\.timer\)clearTimeout/);
 assert.match(watch,/run\.preset!==activePresetId/);
 assert.match(watch,/historical\.url===item\.url/);
});
test('Saved cash and historical purchase status are untouched while derived budgets rerender',()=>{
 assert.match(watch,/const refresh=\(\)=>\{if\(typeof render==='function'\)render\(\);\}/);
 assert.doesNotMatch(watch,/\$\('saved'\)\.value\s*=/);
 assert.doesNotMatch(watch,/checked\[id\]\s*=/);
 assert.match(app,/checked,notes,priceWatch,blankPreset/);
 assert.match(app,/priceWatch,.*categories:customCategories/);
 assert.match(app,/Object\.assign\(priceWatch,state\.priceWatch\)/);
 assert.match(app,/delete priceWatch\[id\]/);
});
test('Price movement indicators and change summaries use glass UI',()=>{
 assert.match(app,/PriceWatchUI\.appendIndicator\(meta,item\)/);
 assert.match(read('assets/design-v16.js'),/PriceWatchUI\.updateDetails\(header,item\)/);
 assert.match(watch,/price-change-dialog/);
 assert.match(watch,/price-change-row/);
 assert.match(watch,/Price change|price change/i);
 assert.match(css,/\.price-watch-chip\.watch-decreased/);
 assert.match(css,/\.price-watch-chip\.watch-increased/);
 assert.match(css,/\.price-watch-chip\.watch-stable/);
 assert.match(css,/\.price-change-dialog/);
});
test('Settings toggle persisted, plus manual price check',()=>{
 assert.match(shell,/toggle\('Check product prices on launch'/);
 assert.match(shell,/action\('Check prices now'/);
 assert.match(watch,/setup-checklist-price-watch-v1/);
 assert.match(watch,/localStorage\.setItem\(PREF,enabled\?'on':'off'\)/);
 assert.match(watch,/if\(!enabled&&!options\.force\)return/);
});
