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
 assert.match(java,/0xFF142013/);
 assert.doesNotMatch(java,/getAssets\(\)\.open\("welcome\.jpg"\)/);
});
test('Native cover is dismissed only after the first WebView frames',()=>{
 assert.match(java,/addJavascriptInterface\(new StartupBridge\(\), "AndroidStartup"\)/);
 assert.match(onboarding,/notifyNativeStartupReady\(\)/);
 assert.match(onboarding,/const ready=/);
 assert.match(onboarding,/ready\(\);/);
 assert.match(onboarding,/AndroidStartup\.ready\(\)/);
});
test('Artwork and words use the approved minimal identity',()=>{
 assert.match(java,/Plan\. Save\./);
 assert.match(html,/Plan\. Save\. Build\./);
 assert.match(html,/brand-mark\.svg/);
 assert.match(html,/Made by Aryaan/);
 assert.match(html,/@aryaan_creates/);
});
