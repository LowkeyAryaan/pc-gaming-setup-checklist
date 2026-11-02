const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const assets=path.join(__dirname,'../src/main/assets');
const read=name=>fs.readFileSync(path.join(assets,name),'utf8');
const glass=read('glass-v17.js');
const css=read('glass-v17.css');
const app=read('app.js');
const planner=read('planner.js');
const details=read('design-v16.js');
const haptics=read('haptics.js');
const shell=read('shell.js');
const html=read('index.html');
const java=fs.readFileSync(path.join(__dirname,'../src/main/java/com/aryaan/pcsetup/MainActivity.java'),'utf8');

test('Month presentation is everywhere human-readable without changing ISO storage keys',()=>{
 assert.match(glass,/const formatMonth=value=>validMonth\(value\)\?fullMonths\[/);
 assert.match(glass,/window\.formatSetupMonth=formatMonth/);
 assert.match(glass,/year.*slice\(0,4\)/);
 assert.match(glass,/Object\.defineProperty\(input,'value'/);
 assert.match(glass,/rawInputValue\.set\.call\(this,value\)/);
 assert.match(glass,/className='month-field-value'/);
 assert.match(planner,/name\.textContent=window\.formatSetupMonth\?window\.formatSetupMonth\(key\):key/);
 assert.match(app,/window\.formatSetupMonth\(item\.targetMonth\)/);
 assert.match(details,/window\.formatSetupMonth\(item\.targetMonth\)/);
 assert.match(planner,/validMonth\(monthInput\.value\)/);
 assert.match(app,/targetMonth:validTargetMonth/);
 assert.match(css,/\.month-display-wrap \.month-field-value/);
 assert.match(css,/justify-content:center/);
 const fullMonths=['January','February','March','April','May','June','July','August','September','October','November','December'];
 const format=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(value)?
   fullMonths[Number(value.slice(5))-1]+' - '+value.slice(0,4):'Select month';
 assert.equal(format('2026-11'),'November - 2026');
 assert.equal(format('2027-02'),'February - 2027');
 assert.equal(format(''), 'Select month');
});

test('Purchased checkbox and price label remain compact and single-line',()=>{
 assert.match(html,/class="price-currency-label">Price/);
 assert.match(html,/id="newPurchased" type="checkbox"/);
 assert.match(css,/\.smart-manual-fields \.price-currency-label/);
 assert.match(css,/white-space:nowrap!important/);
 assert.match(css,/#manualProductDetails \.product-purchased-checkbox input\[type=checkbox\]/);
 assert.match(css,/flex:0 0 18px!important/);
 assert.match(css,/min-height:18px!important/);
});
test('Category selection cards align and do not stretch vertically',()=>{
 assert.match(css,/\.category-creation-form \.category-choice-grid>button/);
 assert.match(css,/height:88px!important;min-height:88px!important;max-height:88px!important/);
 assert.match(css,/justify-content:center!important/);
 assert.match(html,/data-group="future"/);
 assert.match(glass,/selectGroup\(group\)/);
});
test('Haptics use Android system view feedback, not direct vibration or forced global setting',()=>{
 assert.match(java,/import android\.view\.HapticFeedbackConstants;/);
 assert.match(java,/addJavascriptInterface\(new HapticBridge\(\), "AndroidHaptics"\)/);
 assert.match(java,/performHapticFeedback\(feedback\)/);
 assert.match(java,/HapticFeedbackConstants\.CLOCK_TICK/);
 assert.match(java,/HapticFeedbackConstants\.LONG_PRESS/);
 assert.doesNotMatch(java,/FLAG_IGNORE_GLOBAL_SETTING/);
 assert.doesNotMatch(java,/VibratorManager|android\.os\.Vibrator/);
 assert.match(haptics,/setup-checklist-haptics-v1/);
 assert.match(haptics,/localStorage\.setItem\(PREF,enabled\?'on':'off'\)/);
 assert.match(haptics,/pulse\(kind\)/);
 assert.match(haptics,/getEnabled:\(\)=>enabled/);
 assert.match(haptics,/if\(!enabled\|\|!available\(\)\)return/);
 assert.match(shell,/window\.SetupHaptics\.pulse\('navigate'\)/);
 assert.match(shell,/window\.SetupHaptics\.pulse\('long'\)/);
 assert.match(shell,/toggle\('Haptic feedback'/);
 assert.match(shell,/checkbox\.id='settingHapticFeedback'/);
 assert.match(html,/src="haptics\.js"/);
 assert.match(css,/\.setting-haptics input\[type=checkbox\]/);
});
test('No extra haptics on bottom tab click on top of navigation tick',()=>{
 assert.match(haptics,/control\.closest\('\.bottom-tabs'\)/);
 assert.match(haptics,/control\.id==='settingHapticFeedback'/);
 assert.match(haptics,/window\.AndroidHaptics\.pulse\(kind\)/);
});
