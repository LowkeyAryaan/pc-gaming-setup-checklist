// v1.4.2 regression checks for dark pickers, press animation and safe page swiping.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const base=path.join(__dirname,'../src/main/assets');
const ui=fs.readFileSync(path.join(base,'ui-polish.js'),'utf8');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const shell=fs.readFileSync(path.join(base,'shell.js'),'utf8');
const gradle=fs.readFileSync(path.join(__dirname,'../build.gradle'),'utf8');

function pureFunction(name,next){
    const start=ui.indexOf('    function '+name+'(');
    assert.ok(start!==-1,'Missing '+name);
    const stop=ui.indexOf(next,start);
    assert.ok(stop>start,'Missing end of '+name);
    return vm.runInNewContext(ui.slice(start,stop)+'\n'+name,{});
}
const eligibleSwipe=pureFunction('eligibleSwipe','    appMain.addEventListener(');
const blockedSwipeTarget=pureFunction('blockedSwipeTarget','    function eligibleSwipe(');
const selectedText=pureFunction('selectedText','    function syncTrigger(');

test('Horizontal swipes must be deliberate and have limited vertical drift',()=>{
    assert.equal(eligibleSwipe(-118,14,280),true);
    assert.equal(eligibleSwipe(118,-22,320),true);
    assert.equal(eligibleSwipe(80,0,300),true);
    assert.equal(eligibleSwipe(60,0,300),false);
    assert.equal(eligibleSwipe(150,150,250),false);
    assert.equal(eligibleSwipe(100,85,250),false);
    assert.equal(eligibleSwipe(-200,20,850),false);
    assert.equal(eligibleSwipe(-200,20,400),true);
});
test('Swipe exclusion covers all input/edit areas and bottom buttons remain available',()=>{
    assert.equal(blockedSwipeTarget({closest:()=>false}),false);
    assert.equal(blockedSwipeTarget({closest:()=>true}),true);
    assert.equal(blockedSwipeTarget(null),true);
    assert.match(ui,/const pages=\['tracker','items','summary'\]/);
    assert.match(ui,/window\.goToPage\(pages\[next\]\)/);
    assert.match(ui,/!document\.getElementById\('modalShade'\)\.hidden/);
    assert.match(ui,/!document\.getElementById\('drawerShade'\)\.hidden/);
    assert.match(ui,/document\.getElementById\('introOverlay'\)\.classList\.contains\('is-visible'\)/);
    assert.match(ui,/t\.clientX<24/);
    assert.match(ui,/appMain\.addEventListener\('touchcancel'/);
    assert.match(shell,/document\.querySelectorAll\('\.bottom-tabs button\[data-page\]'\)/);
});
test('Native select remains app form source while options use a custom dark picker',()=>{
    assert.match(ui,/document\.querySelectorAll\('select'\)\.forEach\(enhanceSelect\)/);
    assert.match(ui,/select\.classList\.add\('app-select-native'\)/);
    assert.match(ui,/select\.insertAdjacentElement\('afterend',trigger\)/);
    assert.match(ui,/select\.value=value/);
    assert.match(ui,/select\.dispatchEvent\(new Event\('input',\{bubbles:true\}\)\)/);
    assert.match(ui,/select\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
    assert.match(ui,/new MutationObserver/);
    assert.match(ui,/select\.addEventListener\('change',\(\)=>syncTrigger\(select\)\)/);
    assert.match(ui,/trigger\.disabled=select\.disabled/);
    assert.match(ui,/trigger\.hidden=select\.hidden/);
    assert.match(ui,/event\.key==='Escape'/);
    assert.match(ui,/event\.key==='Tab'/);
    assert.match(ui,/event\.key==='ArrowDown'/);
    assert.match(html,/\.app-select-native\{display:none!important\}/);
    assert.match(html,/\.app-picker-sheet/);
    assert.match(html,/\.app-picker-option\.is-selected/);
    assert.match(html,/id="newCategory"/);
    assert.match(html,/id="catGroup"/);
    assert.match(shell,/const sel=document\.createElement\('select'\)/);
    assert.match(shell,/const target=document\.createElement\('select'\)/);
});
test('Current option labels display accurately when selected',()=>{
    assert.equal(selectedText({selectedOptions:[{textContent:'GPU parts'}]}),'GPU parts');
    assert.equal(selectedText({selectedOptions:[]}), 'Choose an option');
    assert.equal(selectedText({selectedOptions:undefined}),'Choose an option');
});
test('Click feedback removes Android blue tap rectangle and respects reduced motion',()=>{
    assert.match(html,/-webkit-tap-highlight-color:transparent/);
    assert.match(ui,/document\.addEventListener\('pointerdown'/);
    assert.match(ui,/document\.addEventListener\('pointerup'/);
    assert.match(ui,/document\.addEventListener\('pointercancel'/);
    assert.match(ui,/app-tap-pop/);
    assert.match(html,/@keyframes app-tap-pop/);
    assert.match(html,/@keyframes app-page-from-right/);
    assert.match(html,/@keyframes app-page-from-left/);
    assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
    assert.match(ui,/window\.goToPage\(pages\[next\]\)/);
});
test('New controls initialize after existing app/shell/onboarding; no signing or production identity changes',()=>{
    const scripts=['app.js','feedback-store.js','shell.js','onboarding.js','ui-polish.js'];
    const positions=scripts.map(name=>html.indexOf('<script src="'+name+'"></script>'));
    assert.ok(positions.every(v=>v>0));
    assert.ok(positions.every((v,i)=>i===0||v>positions[i-1]));
    assert.match(gradle,/versionCode 7/);
    assert.match(gradle,/versionName '1\.4\.2'/);
    assert.match(gradle,/applicationIdSuffix '\.community'/);
    assert.match(gradle,/applicationIdSuffix '\.preview142'/);
});
