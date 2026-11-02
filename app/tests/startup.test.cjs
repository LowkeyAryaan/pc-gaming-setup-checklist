const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const java=fs.readFileSync(path.join(__dirname,'../src/main/java/com/aryaan/pcsetup/MainActivity.java'),'utf8');
const onboarding=fs.readFileSync(path.join(__dirname,'../src/main/assets/onboarding.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../src/main/assets/index.html'),'utf8');

test('Native splash appears before WebView loading',()=>{
 assert.match(java,/instantWelcome = buildInstantWelcome\(\);/);
 assert.match(java,/activityRoot\.addView\(instantWelcome/);
 assert.match(java,/setContentView\(activityRoot\);\s*web\.loadUrl\("file:\/\/\/android_asset\/index\.html"\)/);
 assert.match(java,/stage\.setBackgroundColor\(0xFF090C0A\)/);
 assert.doesNotMatch(java,/getAssets\(\)\.open\("welcome\.jpg"\)/);
});
test('Native cover is dismissed only after the first WebView frames',()=>{
 assert.match(java,/addJavascriptInterface\(new StartupBridge\(\), "AndroidStartup"\)/);
 assert.match(onboarding,/notifyNativeStartupReady\(\)/);
 assert.match(onboarding,/const ready=/);
 assert.match(onboarding,/Promise\.race\(/);
 assert.match(onboarding,/\.then\(ready,ready\)/);
 assert.match(onboarding,/AndroidStartup\.ready\(\)/);
});
test('Artwork and words use the approved minimal identity',()=>{
 assert.match(java,/setText\("SETUP CHECKLIST"\)/);
 assert.match(java,/setImageResource\(R\.drawable\.ic_launcher_art\)/);
 assert.match(html,/Plan\. Save\. Build\./);
 assert.match(html,/brand-mark\.svg/);
 assert.match(html,/Made by Aryaan/);
 assert.match(html,/@aryaan_creates/);
});

test('Android launch theme never paints a bright white frame',()=>{
 const values=fs.readFileSync(path.join(__dirname,'../src/main/res/values/styles.xml'),'utf8');
 const v31=fs.readFileSync(path.join(__dirname,'../src/main/res/values-v31/styles.xml'),'utf8');
 assert.match(values,/Theme.Material.NoActionBar/);
 assert.doesNotMatch(values,/Theme.Material.Light/);
 assert.match(values,/windowBackground">#090c0a/);
 assert.match(v31,/windowSplashScreenBackground">#090c0a/);
 assert.match(v31,/windowSplashScreenAnimatedIcon/);
});
test('Startup avoids unnecessary currency list and repeated whole-app repaint',()=>{
 const glass=fs.readFileSync(path.join(__dirname,'../src/main/assets/glass-v17.js'),'utf8');
 const price=fs.readFileSync(path.join(__dirname,'../src/main/assets/price-watch.js'),'utf8');
 assert.match(onboarding,/if\(name==='introCurrency'\)renderCurrencies\(\)/);
 assert.doesNotMatch(onboarding,/^\s{4}renderCurrencies\(\);\s*\n\s*const state=/m);
 assert.match(glass,/do not rerender every/);
 assert.match(price,/No launch-time full render here/);
 assert.match(price,/const flushRefresh=/);
});
