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
function totals(items,contributed){
    const context={
        items,contributed,safePrice,
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
