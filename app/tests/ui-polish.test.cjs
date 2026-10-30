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
const theme=fs.readFileSync(path.join(base,'theme-finishing.css'),'utf8');
const onboarding=fs.readFileSync(path.join(base,'onboarding.js'),'utf8');

function pureFunction(name,extra={}){
    const start=ui.indexOf('    function '+name+'(');
    assert.ok(start!==-1,'Missing '+name);
    const brace=ui.indexOf('{',start);
    let depth=0,end=brace;
    for(;end<ui.length;end++){
        if(ui[end]==='{')depth++;
        if(ui[end]==='}' && --depth===0)break;
    }
    assert.ok(end<ui.length,'Function '+name+' closes');
    return vm.runInNewContext('('+ui.slice(start,end+1)+')',extra);
}
const eligibleSwipe=pureFunction('eligibleSwipe');
const blockedSwipeTarget=pureFunction('blockedSwipeTarget');
const selectedText=pureFunction('selectedText');
const atEdge=pureFunction('atEdge',{pages:['tracker','items','summary','planner']});
const resistedOffset=pureFunction('resistedOffset',{viewportWidth:360,atEdge});

test('Instagram-like swipes register with a short fast flick or a reasonable drag',()=>{
    assert.equal(eligibleSwipe(-118,14,280),true);
    assert.equal(eligibleSwipe(118,-22,320),true);
    assert.equal(eligibleSwipe(80,0,300),true);
    assert.equal(eligibleSwipe(60,0,300),true);
    assert.equal(eligibleSwipe(42,0,300),false);
    assert.equal(eligibleSwipe(-30,0,80),true); // fast flick
    assert.equal(eligibleSwipe(28,0,240),false); // slow, tiny gesture
    assert.equal(eligibleSwipe(150,150,250),false);
    assert.equal(eligibleSwipe(100,85,250),false);
    assert.equal(eligibleSwipe(-200,20,850),true); // slow but deliberate
    assert.equal(eligibleSwipe(-200,20,400),true);
});
test('First and last tab resist overscroll without moving the entire app',()=>{
    assert.equal(atEdge(0,30),true);
    assert.equal(atEdge(3,-30),true);
    assert.equal(atEdge(1,30),false);
    assert.equal(resistedOffset(0,200),22);
    assert.equal(resistedOffset(3,-200),-22);
    assert.equal(resistedOffset(1,-85),-85);
    assert.equal(resistedOffset(1,85),85);
    assert.equal(resistedOffset(1,500),360);
});
test('Page navigation uses independent scroll panels and one synchronized tab source',()=>{
    assert.equal(blockedSwipeTarget({closest:()=>false}),false);
    assert.equal(blockedSwipeTarget({closest:()=>true}),true);
    assert.equal(blockedSwipeTarget(null),true);
    assert.match(ui,/const pages=\['tracker','items','summary','planner'\]/);
    assert.match(ui,/window\.goToPage\(pages\[target\]\)/);
    assert.match(ui,/window\.syncSwipePages=page=>/);
    assert.match(ui,/updatePageAccessibility\(index\)/);
    assert.match(ui,/page\.inert=!visible/);
    assert.match(ui,/page\.setAttribute\('aria-hidden','true'\)/);
    assert.match(ui,/page\.removeAttribute\('aria-hidden'\)/);
    assert.match(shell,/if\(typeof window\.syncSwipePages==='function'\)window\.syncSwipePages\(page\)/);
    assert.match(ui,/appMain\.addEventListener\('touchmove'/);
    assert.match(ui,/appMain\.addEventListener\('touchcancel'/);
    assert.match(ui,/event\.cancelable\)event\.preventDefault\(\)/);
    assert.match(ui,/touch\.clientX<16/);
    assert.match(ui,/introOverlay\.classList\.contains\('is-visible'\)/);
    assert.match(ui,/new ResizeObserver/);
    assert.match(ui,/window\.requestAnimationFrame\(renderDrag\)/);
    assert.match(ui,/const SNAP_MS=175/);
    assert.match(html,/body\.app-carousel-mode\{height:100vh;height:100dvh;overflow:hidden/);
    assert.match(html,/body\.app-carousel-mode \.app-content>\.page\{/);
    assert.match(html,/overflow-x:hidden;overflow-y:auto;overscroll-behavior-y:contain/);
    assert.match(html,/width:100%;height:100%;padding:18px 16px/);
    assert.doesNotMatch(html,/\.page\.is-swipe-neighbor/);
    assert.doesNotMatch(ui,/stageNeighbor\(/);
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
    assert.match(html,/body\.app-carousel-mode/);
    assert.match(ui,/setPositions\(index,0,true\)/);
    assert.match(html,/@media\(prefers-reduced-motion:reduce\)/);
    assert.match(ui,/window\.goToPage\(pages\[target\]\)/);
});
test('New controls initialize after existing app/shell/onboarding; no signing or production identity changes',()=>{
    const scripts=['app.js','feedback-store.js','shell.js','onboarding.js','ui-polish.js'];
    const positions=scripts.map(name=>html.indexOf('<script src="'+name+'"></script>'));
    assert.ok(positions.every(v=>v>0));
    assert.ok(positions.every((v,i)=>i===0||v>positions[i-1]));
    assert.match(gradle,/versionCode 8/);
    assert.match(gradle,/versionName '1\.5\.0'/);
    assert.match(gradle,/applicationIdSuffix '\.community'/);
    assert.match(gradle,/applicationIdSuffix '\.preview15planner'/);
});

test('Blue is the primary accent for picker, buttons, selection, progress and onboarding',()=>{
    assert.match(html,/\.app-select-trigger\[aria-expanded="true"\]\{border-color:#60a5fa/);
    assert.match(html,/\.app-picker-check\{color:#93c5fd/);
    assert.match(html,/\.intro-cta\{[^}]*background:#60a5fa/);
    assert.match(html,/progress\{[^}]*accent-color:#3b82f6/);
    assert.match(html,/\.item input\[type=checkbox\]\{[^}]*accent-color:#3b82f6/);
    assert.doesNotMatch(html,/#79f4aa|#6ee7b7|#34d399|#7ff1b3/);
});

test('Money remains green and welcome action stands out against the blue theme',()=>{
    assert.match(theme,/#6ee7b7/);
    assert.match(theme,/#savedLabel/);
    assert.match(theme,/#purchasedTotal/);
    assert.match(theme,/#fullTotal/);
    assert.match(theme,/\.intro-stage\.welcome \.intro-cta/);
    assert.match(theme,/linear-gradient\(115deg/);
    assert.match(theme,/box-shadow/);
    assert.match(onboarding,/finishTheme\.href='theme-finishing\.css'/);
    assert.match(html,/\.app-picker-check\{color:#93c5fd/);
});
