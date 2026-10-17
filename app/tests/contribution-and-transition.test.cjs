const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../src/main/assets/app.js'),'utf8');
const onboard=fs.readFileSync(path.join(__dirname,'../src/main/assets/onboarding.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../src/main/assets/index.html'),'utf8');
const safePrice=x=>Math.max(0,Math.round((Number(x)||0)*1000)/1000);

function sourceUntil(begin,next){
    const start=app.indexOf(begin),end=app.indexOf(next,start+begin.length);
    assert.ok(start!==-1 && end>start,'App contains '+begin);
    return app.slice(start,end);
}
const initialCode=sourceUntil('function initialContribution(', 'let contributed=');
const totalsCode=sourceUntil('function pcRemaining(', 'function renderStats()');

function initialContribution(state){
    const context={safePrice,state};
    return vm.runInNewContext(initialCode+'\ninitialContribution(state)',context);
}
function totals(items,contributed,checked={}){
    const context={
        items,contributed,checked,safePrice,
        categoryGroup:cat=>cat==='PC'?'pc':cat==='Future'?'future':'setup'
    };
    return JSON.parse(JSON.stringify(vm.runInNewContext(totalsCode+'\ntotals()',context)));
}

test('Fresh installation and blank presets default PC contribution to zero',()=>{
    assert.equal(initialContribution({}),0);
    assert.equal(initialContribution({blankPreset:true}),0);
    assert.equal(initialContribution({overrides:{},customItems:[]}),0);
});
test('Missing contribution defaults to zero even if saved PC items exist',()=>{
    assert.equal(initialContribution({blankPreset:true,overrides:{},customItems:[]}),0);
    assert.equal(initialContribution({blankPreset:false,overrides:{cpu:{name:'CPU',price:120}}}),0);
    assert.equal(initialContribution({blankPreset:false,customItems:[{id:'gpu',name:'GPU',price:350}]}),0);
});
test('Explicit contribution changes are preserved, including 0 and decimals',()=>{
    const products=[{id:'cpu',price:200000,cat:'PC'}];
    assert.equal(initialContribution({contributed:0,overrides:{cpu:products[0]}}),0);
    assert.equal(initialContribution({contributed:75000.5}),75000.5);
    assert.equal(initialContribution({contributed:999999}),999999);
});
test('Existing imported contribution remains authoritative for populated lists',()=>{
    assert.equal(initialContribution({blankPreset:false,contributed:370,overrides:{cpu:{name:'CPU',price:1200}}}),370);
    assert.equal(initialContribution({blankPreset:false,contributed:0,customItems:[{id:'gpu',name:'GPU',price:3500}]}),0);
});
test('Changing contribution recalculates the PC shortfall and tracker target',()=>{
    const parts=[
        {id:'cpu',cat:'PC',price:1000},
        {id:'monitor',cat:'Monitor',price:500},
        {id:'desk',cat:'Desk',price:200},
        {id:'future',cat:'Future',price:999}
    ];
    assert.equal(totals(parts,0).share,1000);
    assert.equal(totals(parts,0).currentGoal,1700);
    assert.equal(totals(parts,300).share,700);
    assert.equal(totals(parts,300).currentGoal,1400);
    assert.equal(totals(parts,1000).share,0);
    assert.equal(totals(parts,1200).share,0);
    assert.equal(totals(parts,1200).currentGoal,700);
    assert.equal(totals(parts,300).futureTotal,999);
});
test('PC contribution input updates instantly and has a helpful zero-state message',()=>{
    assert.match(html,/id="contributed"[^>]*value="0"/);
    assert.match(html,/id="contributionMessage"/);
    assert.match(app,/contributed=safePrice\(input\.value\)/);
    assert.match(app,/contributionEdited=true/);
    assert.match(app,/contributed,contributionEdited/);
    assert.match(app,/\$\('contributed'\)\.addEventListener\('input',syncPCContribution\)/);
    assert.match(app,/\$\('contributed'\)\.addEventListener\('change'/);
    assert.match(app,/note\.textContent=t\.pc===0/);
});
test('Welcome CTA is an animated handoff, with accessible reduced-motion fallback',()=>{
    assert.match(onboard,/enteringApp/);
    assert.match(onboard,/is-exiting/);
    assert.match(onboard,/app-entering/);
    assert.match(onboard,/prefers-reduced-motion: reduce/);
    assert.match(onboard,/window\.setTimeout\(finish,650\)/);
    assert.match(html,/\.intro-shell\.is-visible\.is-exiting/);
    assert.match(html,/@keyframes setup-enter/);
    assert.match(html,/@media \(prefers-reduced-motion:reduce\)/);
});

test('Purchased PC parts no longer count toward PC cost, shortfall or savings target',()=>{
    const parts=[
        {id:'cpu',cat:'PC',price:40000},
        {id:'gpu',cat:'PC',price:60000},
        {id:'monitor',cat:'Monitor',price:25000}
    ];
    const before=totals(parts,10000);
    assert.equal(before.pc,100000);
    assert.equal(before.share,90000);
    assert.equal(before.currentGoal,115000);

    const purchased={cpu:true};
    const after=totals(parts,10000,purchased);
    assert.equal(after.pc,60000);
    assert.equal(after.share,50000);
    assert.equal(after.currentGoal,75000);
    assert.equal(after.purchasedTotal,40000);
    assert.equal(after.purchasedCount,1);
    assert.equal(after.remainingCount,2);
    assert.equal(after.purchasedCurrent,1);
    assert.equal(after.remainingCurrent,2);

    const uncheck=totals(parts,10000,{cpu:false});
    assert.equal(uncheck.currentGoal,before.currentGoal);
    assert.equal(uncheck.purchasedTotal,0);
});
test('Purchased non-PC items also leave savings and remaining summaries',()=>{
    const parts=[
        {id:'cpu',cat:'PC',price:300},
        {id:'display',cat:'Monitor',price:200},
        {id:'desk',cat:'Desk',price:100},
        {id:'chair',cat:'Chair',price:50},
        {id:'future',cat:'Future',price:400}
    ];
    const t=totals(parts,0,{display:true,desk:true,chair:true});
    assert.equal(t.currentGoal,300);
    assert.equal(t.main,0);
    assert.equal(t.desk,0);
    assert.equal(t.chair,0);
    assert.equal(t.full,700); // Only unpurchased PC and future items
    assert.equal(t.purchasedTotal,350);
});
test('Purchased future products never enter current savings and stay in history',()=>{
    const parts=[
        {id:'cpu',cat:'PC',price:1000},
        {id:'future',cat:'Future',price:300}
    ];
    const before=totals(parts,0);
    assert.equal(before.currentGoal,1000);
    assert.equal(before.full,1300);
    const after=totals(parts,0,{future:true});
    assert.equal(after.currentGoal,1000);
    assert.equal(after.full,1000);
    assert.equal(after.futureTotal,0);
    assert.equal(after.purchasedTotal,300);
    assert.equal(after.purchasedCount,1);
});
test('Purchased status uses legacy checked records without a schema migration',()=>{
    const parts=[{id:'cpu',cat:'PC',price:1.25},{id:'monitor',cat:'Monitor',price:2.75}];
    const t=totals(parts,0,{cpu:true,monitor:true});
    assert.equal(t.currentGoal,0);
    assert.equal(t.pc,0);
    assert.equal(t.full,0);
    assert.equal(t.purchasedTotal,4);
    assert.equal(t.purchasedCount,2);
    assert.equal(t.remainingCurrent,0);
});
test('Marked items stay in the app and can be sorted by purchased/to-buy status',()=>{
    assert.match(app,/const unpurchased=items\.filter\(i=>!checked\[i\.id\]\)/);
    assert.match(app,/const purchased=items\.filter\(i=>!!checked\[i\.id\]\)/);
    assert.match(app,/if\(purchaseView==='purchased'&&!purchased\)return/);
    assert.match(app,/if\(purchaseView==='to-buy'&&purchased\)return/);
    assert.match(app,/renderPurchaseViews\(\)/);
    assert.match(app,/purchaseView=PURCHASE_VIEWS\.includes\(state\.purchaseView\)/);
    assert.match(app,/sortOrder,purchaseView,showProductImages/);
    assert.match(app,/purchaseView:'all'/);
    assert.match(html,/id="purchaseStatusFilters"/);
    assert.match(html,/id="purchasedTotal"/);
    assert.match(html,/id="purchasedCount"/);
    assert.match(html,/id="toBuyCount"/);
    assert.match(html,/v1\.4\.2/);
    assert.match(html,/Checkmarks track purchases, not cash transactions/);
});
