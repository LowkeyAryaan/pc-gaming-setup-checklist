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


    // Fixed viewport + three independently scrollable pages. Only the page
    // panels slide; the header, bottom tabs and app shell remain perfectly still.
    const pages=['tracker','items','summary'];
    const appMain=document.querySelector('main.app-content');
    const pageNodes=pages.map(page=>document.getElementById('page-'+page));
    const header=document.querySelector('.app-topbar');
    const bottomTabs=document.querySelector('.bottom-tabs');
    const reducedMotion=!!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const navShade=document.getElementById('drawerShade');
    const modalShade=document.getElementById('modalShade');
    const introOverlay=document.getElementById('introOverlay');
    const SNAP_MS=175;
    let gesture=null;
    let frame=0;
    let settleUntil=0;
    let viewportWidth=0;

    const isOverlayOpen=()=>!sheetShade.hidden ||
        !modalShade.hidden || !navShade.hidden ||
        introOverlay.classList.contains('is-visible');

    function currentPageIndex(){
        const active=appMain.querySelector('.page.is-current');
        return active ? pages.indexOf(active.id.slice(5)) : -1;
    }
    function blockedSwipeTarget(target){
        return !target || !target.closest || !!target.closest(
            'button,a,input,textarea,select,label,[contenteditable],'+
            '.filters,.purchase-tabs,.currency-list,.itemtools,.app-picker-shade,'+
            '[role="button"],[role="slider"],[data-no-swipe]'
        );
    }
    function eligibleSwipe(dx,dy,elapsed,width=360){
        const distance=Math.abs(dx);
        const travel=Math.min(72,Math.max(44,width*.13));
        // A quick, short flick or a deliberate drag both count. Movement
        // dominated by vertical scrolling never changes pages.
        return Math.abs(dx)>Math.abs(dy)*1.12 &&
            (distance>=travel || (distance>=24 && distance/Math.max(1,elapsed)>.30));
    }
    function atEdge(index,dx){
        return (index===0 && dx>0) ||
            (index===pages.length-1 && dx<0);
    }
    function resistedOffset(index,dx){
        const bounded=Math.max(-viewportWidth,Math.min(viewportWidth,dx));
        if(!atEdge(index,bounded))return bounded;
        return Math.sign(bounded)*Math.min(22,Math.abs(bounded)*.13);
    }
    function setPositions(index,offset=0,animate=false){
        if(index<0 || index>=pages.length)return;
        const duration=animate && !reducedMotion ? SNAP_MS : 0;
        for(let i=0;i<pageNodes.length;i++){
            const page=pageNodes[i];
            page.style.transition=duration?
                'transform '+duration+'ms cubic-bezier(.2,.78,.22,1)':'none';
            const x=(i-index)*viewportWidth+offset;
            page.style.transform='translate3d('+x+'px,0,0)';
        }
    }
    function cancelGesture(){
        if(frame){
            window.cancelAnimationFrame(frame);
            frame=0;
        }
        gesture=null;
    }
    function updateViewport(){
        const h=Math.ceil(header.getBoundingClientRect().height);
        const n=Math.ceil(bottomTabs.getBoundingClientRect().height);
        document.documentElement.style.setProperty('--app-header-h',h+'px');
        document.documentElement.style.setProperty('--app-tabs-h',n+'px');
        viewportWidth=Math.max(1,Math.round(appMain.getBoundingClientRect().width));
        if(!gesture)setPositions(currentPageIndex(),0,false);
    }
    function renderDrag(){
        frame=0;
        if(!gesture)return;
        const g=gesture;
        setPositions(g.page,resistedOffset(g.page,g.dx),false);
    }
    function queueDrag(){
        if(!frame)frame=window.requestAnimationFrame(renderDrag);
    }

    // The preexisting tab navigation remains the single source of truth for
    // selected tabs, browser history, URL hashes and accessibility.
    window.syncSwipePages=page=>{
        cancelGesture();
        const index=pages.indexOf(page);
        if(index<0)return;
        setPositions(index,0,true);
    };
    document.body.classList.add('app-carousel-mode');
    updateViewport();
    window.addEventListener('resize',updateViewport,{passive:true});
    if(window.visualViewport)
        window.visualViewport.addEventListener('resize',updateViewport,{passive:true});
    if(window.ResizeObserver){
        const observer=new ResizeObserver(()=>updateViewport());
        observer.observe(header);
        observer.observe(bottomTabs);
    }

    appMain.addEventListener('touchstart',event=>{
        cancelGesture();
        if(Date.now()<settleUntil || event.touches.length!==1 ||
            isOverlayOpen() || blockedSwipeTarget(event.target))return;
        const touch=event.touches[0];
        // Don't intercept Android's system Back gesture at the screen edges.
        if(touch.clientX<16 || touch.clientX>window.innerWidth-16)return;
        const page=currentPageIndex();
        if(page<0)return;
        gesture={
            id:touch.identifier,
            page,
            x:touch.clientX,
            y:touch.clientY,
            time:Date.now(),
            dx:0,
            lock:null
        };
    },{passive:true});

    appMain.addEventListener('touchmove',event=>{
        const g=gesture;
        if(!g || isOverlayOpen())return;
        if(event.touches.length!==1){cancelGesture();return;}
        const touch=event.touches[0];
        if(touch.identifier!==g.id)return;
        const dx=touch.clientX-g.x;
        const dy=touch.clientY-g.y;
        if(g.lock===null && (Math.abs(dx)>7 || Math.abs(dy)>7)){
            if(Math.abs(dy)>=Math.abs(dx)*1.08){
                cancelGesture();
                return;
            }
            if(Math.abs(dx)>=Math.abs(dy)*1.12)g.lock='horizontal';
        }
        if(g.lock!=='horizontal')return;
        // The carousel owns horizontal movement; the browser still owns
        // vertical scrolling thanks to touch-action:pan-y.
        if(event.cancelable)event.preventDefault();
        g.dx=dx;
        queueDrag();
    },{passive:false});

    appMain.addEventListener('touchend',event=>{
        const g=gesture;
        if(!g)return;
        const touch=Array.from(event.changedTouches).find(t=>t.identifier===g.id);
        if(!touch)return;
        const dx=touch.clientX-g.x,dy=touch.clientY-g.y;
        const elapsed=Date.now()-g.time;
        const shouldMove=eligibleSwipe(dx,dy,elapsed,viewportWidth);
        const target=g.page+(dx<0?1:-1);
        const valid=target>=0 && target<pages.length;
        // Stop queued painting before starting the snap. Setting the last
        // drag position first avoids flicks visually jumping between pages.
        cancelGesture();
        if(shouldMove && valid){
            const drag=resistedOffset(g.page,dx);
            setPositions(g.page,drag,false);
            settleUntil=Date.now()+SNAP_MS;
            window.requestAnimationFrame(()=>{
                if(currentPageIndex()===g.page && typeof window.goToPage==='function')
                    window.goToPage(pages[target]);
            });
        }else{
            setPositions(g.page,0,true);
            settleUntil=Date.now()+(reducedMotion?0:SNAP_MS);
        }
    },{passive:true});
    appMain.addEventListener('touchcancel',()=>{
        cancelGesture();
        setPositions(currentPageIndex(),0,true);
    },{passive:true});
    // Tapping a tab or using Android's back button interrupts the drag.
    document.querySelectorAll('.bottom-tabs button[data-page]').forEach(button=>
        button.addEventListener('click',cancelGesture,true)
    );
    window.addEventListener('popstate',cancelGesture,true);

})();
