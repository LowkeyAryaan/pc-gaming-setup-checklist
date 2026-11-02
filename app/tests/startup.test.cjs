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
 assert.match(java,/setImageResource\(R\.drawable\.brand_icon\)/);
 assert.match(html,/Plan\. Save\. Build\./);
 assert.match(html,/brand-icon\.webp/);
 assert.match(html,/brand-wordmark\.webp/);
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

test('The approved uploaded logo is installed as actual Android and WebView artwork',()=>{
 const base=path.join(__dirname,'../src/main');
 const manifest=fs.readFileSync(path.join(base,'AndroidManifest.xml'),'utf8');
 const splash=fs.readFileSync(path.join(base,'res/values-v31/styles.xml'),'utf8');
 const icon=fs.readFileSync(path.join(base,'res/drawable-nodpi/brand_icon.webp'));
 const iconWeb=fs.readFileSync(path.join(base,'assets/brand-icon.webp'));
 const wordmark=fs.readFileSync(path.join(base,'assets/brand-wordmark.webp'));
 const brandingCss=fs.readFileSync(path.join(base,'assets/brand-final.css'),'utf8');
 assert.match(manifest,/android:icon="@drawable\/brand_icon"/);
 assert.match(splash,/@drawable\/brand_icon/);
 assert.equal(icon.subarray(0,4).toString('ascii'),'RIFF');
 assert.equal(icon.subarray(8,12).toString('ascii'),'WEBP');
 assert.deepEqual(icon,iconWeb);
 assert.equal(wordmark.subarray(8,12).toString('ascii'),'WEBP');
 assert.match(html,/header-brand-wordmark/);
 assert.match(html,/welcome-brand-wordmark/);
 assert.match(html,/href="brand-final\.css"/);
 assert.match(brandingCss,/header-brand-wordmark/);
 assert.match(brandingCss,/welcome-brand-wordmark/);
});
