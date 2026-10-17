/* v1.4.2 in-app controls: accessible themed pickers, press feedback, and page swipes. */
(() => {
    'use strict';

    const sheetShade=document.createElement('div');
    sheetShade.className='app-picker-shade';
    sheetShade.hidden=true;
    sheetShade.setAttribute('aria-hidden','true');
    sheetShade.innerHTML=
        '<div class="app-picker-sheet" role="dialog" aria-modal="true" aria-labelledby="appPickerHeading">'+
        '<div class="app-picker-head"><div><span class="app-picker-kicker">CHOOSE AN OPTION</span>'+
        '<h2 id="appPickerHeading">Select option</h2></div>'+
        '<button type="button" class="app-picker-close" aria-label="Close options">×</button></div>'+
        '<div class="app-picker-options" role="group" aria-label="Available options"></div></div>';
    document.body.append(sheetShade);
    const pickerOptions=sheetShade.querySelector('.app-picker-options');
    const pickerHeading=sheetShade.querySelector('#appPickerHeading');
    const pickerClose=sheetShade.querySelector('.app-picker-close');
    const enhanced=new WeakMap();
    let current=null;

    function selectLabel(select) {
        const label=select.closest('label') ||
            (select.id ? document.querySelector('label[for="'+select.id+'"]') : null);
        if(label){
            const title=label.querySelector('strong');
            if(title && title.textContent.trim())return title.textContent.trim();
            const first=label.firstChild;
            if(first && first.textContent.trim())return first.textContent.trim().slice(0,100);
        }
        return select.getAttribute('aria-label') || select.name || 'Select option';
    }

    function selectedText(select){
        const option=select.selectedOptions && select.selectedOptions[0];
        return option ? option.textContent.trim() : 'Choose an option';
    }

    function syncTrigger(select){
        const trigger=enhanced.get(select);
        if(!trigger)return;
        const label=selectedText(select);
        const value=trigger.querySelector('.app-select-value');
        if(value && value.textContent!==label)value.textContent=label;
        trigger.disabled=select.disabled;
        trigger.hidden=select.hidden;
        trigger.setAttribute('aria-label',selectLabel(select)+': '+label+'. Open choices');
    }

    function closePicker(restoreFocus=true){
        if(!current)return;
        const old=current;
        current=null;
        sheetShade.hidden=true;
        sheetShade.setAttribute('aria-hidden','true');
        document.body.classList.remove('app-picker-open');
        old.trigger.setAttribute('aria-expanded','false');
        pickerOptions.replaceChildren();
        if(restoreFocus && old.trigger.isConnected)old.trigger.focus({preventScroll:true});
    }

    function chooseOption(option){
        if(!current)return;
        const select=current.select;
        const value=option.value;
        if(select.value!==value){
            select.value=value;
            // Preserve native form submit, onchange handlers and autosave behavior.
            select.dispatchEvent(new Event('input',{bubbles:true}));
            select.dispatchEvent(new Event('change',{bubbles:true}));
        }
        syncTrigger(select);
        closePicker();
    }

    function openPicker(select){
        const trigger=enhanced.get(select);
        if(!trigger || !select.isConnected || select.disabled || select.hidden)return;
        if(current)closePicker(false);
        current={select,trigger};
        pickerHeading.textContent=selectLabel(select);
        pickerOptions.replaceChildren();
        let selectedButton=null;
        Array.from(select.options).forEach(option=>{
            if(option.hidden)return;
            const button=document.createElement('button');
            button.type='button';
            button.className='app-picker-option'+(option.selected?' is-selected':'');
            button.disabled=option.disabled;
            button.setAttribute('aria-pressed',option.selected?'true':'false');
            const name=document.createElement('span');
            name.textContent=option.textContent;
            const mark=document.createElement('span');
            mark.className='app-picker-check';
            mark.setAttribute('aria-hidden','true');
            mark.textContent=option.selected?'✓':'';
            button.append(name,mark);
            button.onclick=()=>chooseOption(option);
            pickerOptions.append(button);
            if(option.selected && !option.disabled)selectedButton=button;
        });
        trigger.setAttribute('aria-expanded','true');
        sheetShade.hidden=false;
        sheetShade.setAttribute('aria-hidden','false');
        document.body.classList.add('app-picker-open');
        (selectedButton || pickerOptions.querySelector('button:not(:disabled)') || pickerClose).focus({preventScroll:true});
        if(selectedButton)selectedButton.scrollIntoView({block:'nearest'});
    }

    function enhanceSelect(select){
        if(enhanced.has(select)){
            syncTrigger(select);
            return;
        }
        if(!select.isConnected || select.closest('.app-picker-shade'))return;
        const trigger=document.createElement('button');
        trigger.type='button';
        trigger.className='app-select-trigger';
        trigger.setAttribute('aria-haspopup','dialog');
        trigger.setAttribute('aria-expanded','false');
        const value=document.createElement('span');
        value.className='app-select-value';
        const arrow=document.createElement('span');
        arrow.className='app-select-chevron';
        arrow.setAttribute('aria-hidden','true');
        arrow.textContent='⌄';
        trigger.append(value,arrow);
        // Retain the real select for programmatic form reading, validation,
        // settings and JSON import/export while hiding only its native picker.
        select.classList.add('app-select-native');
        select.tabIndex=-1;
        select.setAttribute('aria-hidden','true');
        select.insertAdjacentElement('afterend',trigger);
        enhanced.set(select,trigger);
        trigger.onclick=()=>openPicker(select);
        select.addEventListener('change',()=>syncTrigger(select));
        syncTrigger(select);
    }

    function refreshSelects(){
        document.querySelectorAll('select').forEach(enhanceSelect);
        if(current && !current.select.isConnected)closePicker(false);
    }
    refreshSelects();
    // Forms and settings create new selects dynamically. Also refresh after
    // category options are rebuilt, without polling or forcing app re-renders.
    let refreshPending=false;
    const observer=new MutationObserver(()=>{
        if(refreshPending)return;
        refreshPending=true;
        Promise.resolve().then(()=>{
            refreshPending=false;
            refreshSelects();
        });
    });
    observer.observe(document.body,{subtree:true,childList:true});
    pickerClose.onclick=()=>closePicker();
    sheetShade.addEventListener('click',event=>{
        if(event.target===sheetShade)closePicker();
    });
    document.addEventListener('keydown',event=>{
        if(!current)return;
        if(event.key==='Escape' || event.key==='Backspace' && event.target===document.body){
            event.preventDefault();
            event.stopImmediatePropagation();
            closePicker();
            return;
        }
        const buttons=[pickerClose,...pickerOptions.querySelectorAll('button:not(:disabled)')];
        if(event.key==='Tab'){
            const index=buttons.indexOf(document.activeElement);
            if(event.shiftKey && index<=0){event.preventDefault();buttons[buttons.length-1].focus();}
            else if(!event.shiftKey && index===buttons.length-1){event.preventDefault();buttons[0].focus();}
        }
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){
            const options=buttons.slice(1);
            if(!options.length)return;
            event.preventDefault();
            const i=options.indexOf(document.activeElement);
            const dir=event.key==='ArrowDown'?1:-1;
            options[(i+dir+options.length)%options.length].focus();
        }
    },true);

    // Disable Android WebView's bright-blue tap rectangle and give buttons
    // consistent tactile feedback even when their click navigates instantly.
    let pressed=null;
    document.addEventListener('pointerdown',event=>{
        const target=event.target.closest && event.target.closest('button');
        if(!target || target.disabled)return;
        if(pressed && pressed!==target)pressed.classList.remove('app-pressing');
        pressed=target;
        target.classList.add('app-pressing');
    },{passive:true,capture:true});
    function clearPress(){
        if(pressed)pressed.classList.remove('app-pressing');
        pressed=null;
    }
    document.addEventListener('pointerup',clearPress,{passive:true,capture:true});
    document.addEventListener('pointercancel',clearPress,{passive:true,capture:true});
    document.addEventListener('click',event=>{
        const button=event.target.closest && event.target.closest('button');
        if(!button || button.disabled)return;
        button.classList.remove('app-tap-pop');
        // Replaying the animation makes repeated taps feel consistently tactile.
        void button.offsetWidth;
        button.classList.add('app-tap-pop');
        window.setTimeout(()=>button.classList.remove('app-tap-pop'),240);
    },true);

    const pages=['tracker','items','summary'];
    const appMain=document.querySelector('main.app-content');
    let start=null;
    const isOverlayOpen=()=>
        !sheetShade.hidden ||
        !document.getElementById('modalShade').hidden ||
        !document.getElementById('drawerShade').hidden ||
        document.getElementById('introOverlay').classList.contains('is-visible');

    function currentPageIndex(){
        const active=appMain.querySelector('.page.is-current');
        return active ? pages.indexOf(active.id.replace(/^page-/,'')) : -1;
    }
    function blockedSwipeTarget(target){
        return !target || !target.closest || !!target.closest(
            'button,a,input,textarea,select,label,form,[contenteditable],'+
            '.filters,.purchase-tabs,.currency-list,.itemtools,.app-picker-shade,'+
            '[role="button"],[role="slider"]'
        );
    }
    function eligibleSwipe(dx,dy,elapsed){
        return elapsed<850 && Math.abs(dx)>=75 &&
            Math.abs(dx)>Math.abs(dy)*1.5 && Math.abs(dy)<100;
    }
    appMain.addEventListener('touchstart',event=>{
        start=null;
        if(event.touches.length!==1 || isOverlayOpen() || blockedSwipeTarget(event.target))return;
        const t=event.touches[0];
        // Leave OS back gestures at the physical screen edges untouched.
        if(t.clientX<24 || t.clientX>window.innerWidth-24)return;
        start={id:t.identifier,x:t.clientX,y:t.clientY,time:Date.now(),page:currentPageIndex()};
    },{passive:true});
    appMain.addEventListener('touchend',event=>{
        if(!start || event.changedTouches.length!==1 || isOverlayOpen()){start=null;return;}
        const candidate=start;
        start=null;
        const t=event.changedTouches[0];
        if(t.identifier!==candidate.id || currentPageIndex()!==candidate.page)return;
        const dx=t.clientX-candidate.x,dy=t.clientY-candidate.y;
        if(!eligibleSwipe(dx,dy,Date.now()-candidate.time))return;
        const next=candidate.page+(dx<0?1:-1);
        if(next<0 || next>=pages.length || typeof window.goToPage!=='function')return;
        appMain.setAttribute('data-swipe-direction',dx<0?'left':'right');
        window.goToPage(pages[next]);
        window.setTimeout(()=>appMain.removeAttribute('data-swipe-direction'),260);
    },{passive:true});
    appMain.addEventListener('touchcancel',()=>{start=null;},{passive:true});
})();
