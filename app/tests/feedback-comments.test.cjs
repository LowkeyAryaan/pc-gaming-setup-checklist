const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const feedback=require('../src/main/assets/feedback-store.js');

function memoryStorage(){
    const data=new Map();
    return {
        getItem(key){return data.has(key)?data.get(key):null;},
        setItem(key,value){data.set(key,String(value));},
        removeItem(key){data.delete(key);}
    };
}
test('Saved feedback comments persist when the tab is reopened',()=>{
    const localStorage=memoryStorage();
    const one=feedback.add('Could we add price history?',localStorage);
    assert.ok(one.id.startsWith('feedback-'));
    const reopened=feedback.list(localStorage);
    assert.equal(reopened.length,1);
    assert.equal(reopened[0].text,'Could we add price history?');
    assert.ok(Number.isFinite(Date.parse(reopened[0].createdAt)));
});
test('Comments can be edited without losing their original creation date',()=>{
    const localStorage=memoryStorage();
    const item=feedback.add('Typo',localStorage);
    const updated=feedback.update(item.id,'There is a typo in the header.',localStorage);
    assert.equal(updated.createdAt,item.createdAt);
    assert.equal(feedback.list(localStorage)[0].text,'There is a typo in the header.');
    assert.ok(updated.updatedAt);
});
test('Deletion and list integrity work',()=>{
    const localStorage=memoryStorage();
    const first=feedback.add('First comment',localStorage);
    const second=feedback.add('Second comment',localStorage);
    assert.equal(feedback.remove(first.id,localStorage),true);
    assert.equal(feedback.remove(first.id,localStorage),false);
    assert.deepEqual(feedback.list(localStorage).map(x=>x.id),[second.id]);
});
test('Empty, oversized and invalid comments are rejected safely',()=>{
    const localStorage=memoryStorage();
    assert.throws(()=>feedback.add('  ',localStorage),/Write a comment/);
    assert.throws(()=>feedback.add('x'.repeat(4001),localStorage),/4,000 characters/);
    assert.deepEqual(feedback.list(localStorage),[]);
    localStorage.setItem(feedback.STORAGE_KEY,'{"not":"an array"}');
    assert.deepEqual(feedback.list(localStorage),[]);
});
test('Storage failures do not pretend comments were saved',()=>{
    const broken={
        getItem(){return null;},
        setItem(){throw new Error('Storage full');}
    };
    assert.throws(()=>feedback.add('Test comment',broken),/Storage full/);
});
test('Feedback comments never auto-post to a network endpoint',()=>{
    const script=fs.readFileSync(path.join(__dirname,'../src/main/assets/feedback-store.js'),'utf8');
    const shell=fs.readFileSync(path.join(__dirname,'../src/main/assets/shell.js'),'utf8');
    const html=fs.readFileSync(path.join(__dirname,'../src/main/assets/index.html'),'utf8');
    assert.doesNotMatch(script,/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket)\s*\(/);
    assert.match(html,/<script src="feedback-store\.js"><\/script>/);
    assert.match(shell,/function openFeedback\(/);
    assert.match(shell,/Saved comments/);
    assert.match(shell,/store\.add\(/);
    assert.match(shell,/store\.update\(/);
    assert.match(shell,/store\.remove\(/);
    assert.match(shell,/feedback-comment-body/);
    assert.match(shell,/text\.textContent=entry\.text/);
});


test('Feedback email is addressed to Aryaan and never sent without user action',()=>{
    const java=fs.readFileSync(path.join(__dirname,'../src/main/java/com/aryaan/pcsetup/MainActivity.java'),'utf8');
    const shell=fs.readFileSync(path.join(__dirname,'../src/main/assets/shell.js'),'utf8');
    assert.match(java,/aryaanmikaeel@gmail\.com/);
    assert.match(java,/Intent\.ACTION_SENDTO/);
    assert.match(java,/Intent\.createChooser\(email, "Send feedback by email"\)/);
    assert.match(java,/email\.putExtra\(Intent\.EXTRA_SUBJECT, subject\)/);
    assert.match(java,/email\.putExtra\(Intent\.EXTRA_TEXT, message\)/);
    assert.match(shell,/Send Feedback by Email/);
    assert.match(shell,/AndroidFeedback\.composeEmail\(text\)/);
    assert.match(shell,/store\.add\(input\.value\)/);
    assert.match(shell,/Tap Send in your email app/);
    assert.doesNotMatch(java,/SmsManager|JavaMail|SMTP|sendMultipartTextMessage/);
});
