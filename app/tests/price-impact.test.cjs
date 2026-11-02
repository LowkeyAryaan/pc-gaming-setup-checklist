const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../src/main/assets');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const html=read('index.html'),watch=read('price-watch.js'),styles=read('price-watch.css'),app=read('app.js');
const budget=require(path.join(root,'budget-model.js'));
test('Price impact panel is aligned and displays revised total, baseline and movement',()=>{
  for(const id of ['priceImpactPanel','priceImpactHeading','priceImpactCurrent',
    'priceImpactBaseline','priceImpactNet','priceImpactCounts','priceImpactCoverage',
    'priceImpactState'])assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(styles,/#page-tracker \.price-impact-panel/);
  assert.match(styles,/\.price-impact-comparison\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(styles,/\.price-impact-increased/);
  assert.match(styles,/\.price-impact-decreased/);
  assert.match(watch,/function impactStats\(actual\)/);
  assert.match(watch,/BudgetModel\.compute\(original,checked,categoryGroup,contributed,/);
  assert.match(watch,/net:actual\.currentGoal-before/);
  assert.match(app,/window\.PriceWatchUI\.renderTrackerImpact\(t\)/);
});
test('Baselines only follow verified automatic price changes, not failed checks',()=>{
  assert.match(watch,/baseline:originalBaseline/);
  assert.match(watch,/function unavailableRecord\(item,reason\)/);
  assert.match(watch,/old&&old\.url===item\.url/);
  assert.match(watch,/observed:same&&validMoney\(Number\(old\.observed\)\)/);
  assert.match(watch,/if\(item\.url!==run\.urls\.get\(id\)/);
  assert.match(app,/item\.url!==nextUrl\|\|safePrice\(item\.price\)!==safePrice\(price\.value\)/);
  assert.match(watch,/categoryGroup\(item\.cat\)!=='future'/);
  assert.match(watch,/checked\[item\.id\]/);
});
test('Updated goal uses the existing contribution model for positive and negative net movement',()=>{
  const categoryGroup=name=>name==='CPU'?'pc':name==='Screen'?'setup':'future';
  const items=[
    {id:'cpu',cat:'CPU',price:1100},
    {id:'screen',cat:'Screen',price:400},
    {id:'later',cat:'Future',price:700},
    {id:'paid',cat:'Screen',price:300}
  ];
  const checked={paid:true};
  const actual=budget.compute(items,checked,categoryGroup,300,'pc');
  assert.equal(actual.currentGoal,1200);
  const before=budget.compute(items.map(x=>
    x.id==='cpu'?{...x,price:1000}:x.id==='screen'?{...x,price:500}:x
  ),checked,categoryGroup,300,'pc');
  assert.equal(before.currentGoal,1200);
  assert.equal(actual.currentGoal-before.currentGoal,0);
  const up=budget.compute(items.map(x=>x.id==='cpu'?{...x,price:1250}:x),
    checked,categoryGroup,300,'pc');
  assert.equal(up.currentGoal-actual.currentGoal,150);
  const down=budget.compute(items.map(x=>x.id==='screen'?{...x,price:250}:x),
    checked,categoryGroup,300,'pc');
  assert.equal(down.currentGoal-actual.currentGoal,-150);
  // Purchased and Future category prices must not change current remaining goal.
  const noImpact=budget.compute(items.map(x=>
    x.id==='paid'||x.id==='later'?{...x,price:5000}:x),
    checked,categoryGroup,300,'pc');
  assert.equal(noImpact.currentGoal,actual.currentGoal);
});
test('Unavailable does not imply stable and explains limitations',()=>{
 assert.match(watch,/unavailable:'\? Unavailable'/);
 assert.match(watch,/String\(reason\|\|'Price unavailable'\)\.slice/);
 assert.match(watch,/status:selected!==null\?'variant-selected':'unavailable'/);
 assert.match(watch,/title='Last checked '/);
 assert.match(watch,/Store does not publish a verifiable currency/);
 const source=fs.readFileSync(path.join(__dirname,'../src/main/java/com/aryaan/pcsetup/ProductPageReader.java'),'utf8');
 assert.match(source,/publishedCurrency\(html\)/);
 assert.match(source,/productPagePrice\(html\)/);
 assert.match(source,/WooCommerce single-product price paragraph/);
});
