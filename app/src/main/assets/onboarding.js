/* v1.4: one-time setup followed by a welcome screen on cold launch. */
(() => {
    'use strict';
    // Load the final brand accents after the base blue stylesheet.
    const finishTheme=document.createElement('link');
    finishTheme.rel='stylesheet';
    finishTheme.href='theme-finishing.css';
    document.head.append(finishTheme);
    const $id=id=>document.getElementById(id);
    const key='pc-gaming-onboarding-v14';
    const overlay=$id('introOverlay');
    const currencyPage=$id('introCurrency');
    const termsPage=$id('introTerms');
    const welcomePage=$id('introWelcome');
    const currencySearch=$id('introCurrencySearch');
    const options=$id('introCurrencyOptions');
    const currencyNext=$id('introCurrencyNext');
    const termsCheck=$id('introAcceptTerms');
    const termsNext=$id('introTermsNext');
    let selected=null;
    function readStatus(){
        try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}
    }
    function stage(name){
        [currencyPage,termsPage,welcomePage].forEach(page=>page.hidden=page.id!==name);
        overlay.classList.add('is-visible');
        window.scrollTo(0,0);
    }
    function chooseCurrency(code){
        if(!isCurrency(code))return;
        selected=code;
        $id('introCurrencySelected').textContent='Selected: '+code+' · '+currencyName(code);
        currencyNext.disabled=false;
        renderCurrencies();
    }
    function renderCurrencies(){
        options.replaceChildren();
        const term=currencySearch.value.trim().toLowerCase();
        ALL_CURRENCIES.filter(code=>!term||(code+' '+currencyName(code)).toLowerCase().includes(term)).forEach(code=>{
            const button=document.createElement('button');
            button.type='button';
            button.className='currency-option'+(code===selected?' currency-selected':'');
            button.setAttribute('role','option');
            button.setAttribute('aria-selected',code===selected?'true':'false');
            button.textContent=code+' — '+currencyName(code)+(code===selected?' ✓':'');
            button.onclick=()=>chooseCurrency(code);
            options.append(button);
        });
        if(!options.children.length){
            const text=document.createElement('p');text.className='section-note';
            text.textContent='No currencies found. Try another name or code.';
            options.append(text);
        }
    }
    currencySearch.oninput=renderCurrencies;
    currencyNext.onclick=()=>{
        if(!selected)return;
        stage('introTerms');
        termsCheck.checked=false;
        termsNext.disabled=true;
    };
    $id('introTermsBack').onclick=()=>stage('introCurrency');
    termsCheck.onchange=()=>{termsNext.disabled=!termsCheck.checked;};
    termsNext.onclick=()=>{
        if(!selected || !termsCheck.checked)return;
        // First installation has no user data; start with an empty personal preset.
        // The original v1.3 presets always keep their existing product data.
        if(readStatus() && readStatus().status==='pending'){
            items.splice(0,items.length);customCategories.splice(0);deletedIds.clear();
            for(const id in checked)delete checked[id];
            for(const id in notes)delete notes[id];
            blankPreset=true;contributed=0;contributionEdited=false;
            $id('saved').value='0';$id('contributed').value='0';
            filter='All';future.checked=false;
        }
        try{
            localStorage.setItem('pc-gaming-install-currency-v1',selected);
            setPresetCurrency(selected);
            localStorage.setItem(key,JSON.stringify({
                status:'complete',termsVersion:'1.4',acceptedAt:new Date().toISOString(),initialCurrency:selected
            }));
            renderFilters();
            render();
            stage('introWelcome');
        }catch(error){
            alert('Could not save your setup. Please check your device storage and try again.');
        }
    };
    let enteringApp=false;
    $id('introEnter').onclick=()=>{
        if(enteringApp)return;
        enteringApp=true;
        const cta=$id('introEnter');
        cta.disabled=true;
        const finish=()=>{
            overlay.classList.remove('is-visible','is-exiting');
            document.body.classList.remove('app-entering');
            window.scrollTo(0,0);
            $id('menuButton').focus({preventScroll:true});
            cta.disabled=false;
            enteringApp=false;
        };
        const reduceMotion=window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if(reduceMotion){
            finish();
            return;
        }
        // The welcome artwork gently zooms and blurs away while the
        // checklist rises into focus beneath it. A short fixed duration
        // avoids the sudden cut without slowing down the app.
        document.body.classList.add('app-entering');
        overlay.classList.add('is-exiting');
        window.setTimeout(finish,300);
    };
    renderCurrencies();
    const state=readStatus();
    if(state && state.status==='complete'){
        if(localStorage.getItem('pc-gaming-show-welcome-v14')!=='false')stage('introWelcome');
    }else if(state && state.status==='pending'){
        stage('introCurrency');
    }else if(window.__v14WasExistingUser){
        // Existing v1.3 customers keep their saved PKR presets and are not mislabelled
        // as having agreed to terms they have never actually accepted.
        localStorage.setItem(key,JSON.stringify({status:'complete',migrated:true,termsVersion:null}));
        if(localStorage.getItem('pc-gaming-show-welcome-v14')!=='false')stage('introWelcome');
    }else{
        localStorage.setItem(key,JSON.stringify({status:'pending'}));
        stage('introCurrency');
    }

    // Android displays the artwork and the welcome copy natively immediately
    // at process start. Only remove that native overlay after the WebView has
    // painted its equivalent HTML screen (or the first-run currency setup).
    function notifyNativeStartupReady() {
        if(!window.AndroidStartup || typeof window.AndroidStartup.ready!=='function')return;
        const ready=()=>window.requestAnimationFrame(()=>
            window.requestAnimationFrame(()=>window.AndroidStartup.ready()));
        ready();
    }
    notifyNativeStartupReady();
})();