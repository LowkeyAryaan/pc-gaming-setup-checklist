const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const assets=path.join(__dirname,'../src/main/assets');
const read=name=>fs.readFileSync(path.join(assets,name),'utf8');
const native=fs.readFileSync(path.join(__dirname,'../src/main/java/com/aryaan/pcsetup/ProductPageReader.java'),'utf8');
const importUI=read('glass-v17.js'),watch=read('price-watch.js');
const details=read('design-v16.js'),style=read('price-watch.css');
test('Structured AggregateOffer and multi-offer listings are classified as price ranges',()=>{
 assert.match(native,/double\[\] range=publishedPriceRange\(html,product,offers,price\)/);
 assert.match(native,/offer\.opt\("lowPrice"\)/);
 assert.match(native,/offer\.opt\("highPrice"\)/);
 assert.match(native,/offers\.length\(\)>1/);
 assert.match(native,/rangeFromValues\(min,max\)/);
 assert.match(native,/result\.put\("price",JSONObject\.NULL\)/);
 assert.match(native,/result\.put\("priceKind",Double\.isFinite\(range\[1\]\)\?"range":"starting-at"\)/);
 assert.match(native,/result\.put\("lowPrice",range\[0\]\)/);
 assert.match(native,/result\.put\("highPrice",range\[1\]\)/);
});
test('Product price ranges in main WooCommerce price blocks are not mistaken for sale discounts',()=>{
 assert.match(native,/private static double\[\] productPageRange\(String html\)/);
 assert.match(native,/private static double\[\] amountRange\(String source\)/);
 assert.match(native,/Double low=parseMoney\(m\.group\(1\)\),high=parseMoney\(m\.group\(2\)\)/);
 assert.match(native,/replaceAll\("\(\?is\)<del/);
 assert.match(native,/Double\.isFinite\(range\[1\]\)/);
 assert.match(native,/Never silently use lowPrice|never silently use lowPrice/i);
});
test('Add Product displays both variant prices and requests an exact manual choice',()=>{
 assert.match(importUI,/const rangeOnly=data\.priceKind==='range'\|\|data\.priceKind==='starting-at'/);
 assert.match(importUI,/if\(!rangeOnly&&currency&&!mismatch/);
 assert.match(importUI,/Variant prices:/);
 assert.match(importUI,/const complete=!rangeOnly/);
 assert.match(importUI,/We will not automatically choose the lowest price/);
 assert.match(importUI,/window\.SetupProductUI\.detectionComplete\(complete\)/);
});
test('Price Watch never changes an existing budget after receiving a range-only listing',()=>{
 assert.match(watch,/const isVariant=!!data&&\(data\.priceKind==='range'\|\|data\.priceKind==='starting-at'\)/);
 assert.match(watch,/const valid=data&&data\.ok&&!isVariant&&validMoney\(observed\)/);
 assert.match(watch,/if\(isVariant\)/);
 assert.match(watch,/status:'variant',baseline:originalBaseline/);
 assert.match(watch,/if\(!checked\[id\]&&!suspicious\)\{/);
 assert.match(watch,/item\.price=safePrice\(observed\)/);
 assert.match(watch,/variant:'! Choose variant'/);
 assert.match(details,/\['unavailable','variant'\]\.includes\(watchEntry\.status\)/);
 assert.match(style,/\.price-watch-chip\.watch-variant/);
});
