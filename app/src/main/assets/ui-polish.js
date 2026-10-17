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
    const reducedMotion=window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const navShade=document.getElementById('drawerShade');
    const modalShade=document.getElementById('modalShade');
    const introOverlay=document.getElementById('introOverlay');
    let gesture=null;
    let settling=false;
    let settleTimer=null;

    const isOverlayOpen=()=>!sheetShade.hidden ||
        !modalShade.hidden || !navShade.hidden ||
        introOverlay.classList.contains('is-visible');

    function currentPageIndex(){
        const active=appMain.querySelector('.page.is-current');
        return active ? pages.indexOf(active.id.replace(/^page-/,'')) : -1;
    }

    function blockedSwipeTarget(target){
        // Only controls that need the finger gesture themselves are excluded.
        // Do not block entire forms/cards: those cover most of the screen.
        return !target || !target.closest || !!target.closest(
            'button,a,input,textarea,select,label,[contenteditable],'+
            '.filters,.purchase-tabs,.currency-list,.itemtools,.app-picker-shade,'+
            '[role="button"],[role="slider"],[data-no-swipe]'
        );
    }

    // A ~30px fast flick should work; deliberate longer drags work even
    // if slow. Vertical scrolling is decided by direction lock, not time.
    function eligibleSwipe(dx,dy,elapsed,width=360){
        const dist=Math.abs(dx);
        const duration=Math.max(1,elapsed);
        const commitDist=Math.min(76,Math.max(58,width*.17));
        return Math.abs(dx)>Math.abs(dy)*1.15 &&
            (dist>=commitDist || (dist>=26 && dist/duration>=.27));
    }

    function validPage(index){return index>=0 && index<pages.length;}

    function clearGestureStyles(g){
        if(!g)return;
        const active=g.active;
        if(active){
            active.style.transform='';
            active.style.transition='';
            active.style.willChange='';
        }
        if(g.neighbor){
            g.neighbor.classList.remove('is-swipe-neighbor');
            g.neighbor.style.top='';
            g.neighbor.style.transition='';
            g.neighbor.style.transform='';
            g.neighbor.style.willChange='';
            g.neighbor.style.pointerEvents='';
            g.neighbor.removeAttribute('aria-hidden');
        }
        appMain.classList.remove('is-swipe-gesture');
    }

    function cancelGesture(){
        if(settleTimer!==null){
            clearTimeout(settleTimer);
            settleTimer=null;
        }
        clearGestureStyles(gesture);
        gesture=null;
        settling=false;
    }

    function neighborFor(g,dx){
        if(!dx)return null;
        const next=g.page+(dx<0?1:-1);
        return validPage(next)?document.getElementById('page-'+pages[next]):null;
    }

    function stageNeighbor(g,next){
        if(g.neighbor===next)return;
        if(g.neighbor){
            g.neighbor.classList.remove('is-swipe-neighbor');
            g.neighbor.style.top='';
            g.neighbor.style.transition='';
            g.neighbor.style.transform='';
            g.neighbor.style.willChange='';
            g.neighbor.style.pointerEvents='';
            g.neighbor.removeAttribute('aria-hidden');
        }
        g.neighbor=next;
        if(!next)return;
        next.classList.add('is-swipe-neighbor');
        // When a tall page is scrolled, preview the NEXT page from its top
        // at the current screen position, rather than a blank off-screen area.
        next.style.top=Math.max(0,-appMain.getBoundingClientRect().top)+'px';
        next.style.transition='none';
        next.style.willChange='transform';
        next.style.pointerEvents='none';
        next.setAttribute('aria-hidden','true');
    }

    function paintGesture(g,dx){
        if(!g || g.page!==currentPageIndex())return;
        if(reducedMotion)return;
        const next=neighborFor(g,dx);
        stageNeighbor(g,next);
        const width=g.width;
        const clamped=Math.max(-width,Math.min(width,dx));
        const travel=next?clamped:Math.max(-34,Math.min(34,clamped*.18));
        appMain.classList.add('is-swipe-gesture');
        g.active.style.willChange='transform';
        g.active.style.transition='none';
        g.active.style.transform='translate3d('+travel+'px,0,0)';
        if(next){
            const start=clamped<0?width:-width;
            next.style.transform='translate3d('+(start+travel)+'px,0,0)';
        }
    }

    function finishGesture(g,commit,dx){
        const nextIndex=g.page+(dx<0?1:-1);
        if(!commit || !validPage(nextIndex)){
            if(g.lock==='horizontal' && !reducedMotion){
                g.active.style.transition='transform 125ms cubic-bezier(.2,.8,.2,1)';
                g.active.style.transform='translate3d(0,0,0)';
                if(g.neighbor){
                    g.neighbor.style.transition='transform 125ms cubic-bezier(.2,.8,.2,1)';
                    g.neighbor.style.transform=
                        'translate3d('+(dx<0?g.width:-g.width)+'px,0,0)';
                }
                settling=true;
                settleTimer=window.setTimeout(cancelGesture,130);
            }else cancelGesture();
            return;
        }
        if(reducedMotion){
            if(typeof window.goToPage==='function')window.goToPage(pages[nextIndex]);
            cancelGesture();
            return;
        }
        // Short 155ms snap instead of a slow auto-scroll/page fade.
        const direction=dx<0?-1:1;
        if(!g.neighbor)stageNeighbor(g,neighborFor(g,dx));
        settling=true;
        appMain.classList.add('is-swipe-gesture');
        g.active.style.transition='transform 155ms cubic-bezier(.17,.83,.24,1)';
        g.active.style.transform='translate3d('+(direction*g.width)+'px,0,0)';
        if(g.neighbor){
            g.neighbor.style.transition='transform 155ms cubic-bezier(.17,.83,.24,1)';
            g.neighbor.style.transform='translate3d(0,0,0)';
        }
        settleTimer=window.setTimeout(()=>{
            // Don't override a bottom-tab or system-back navigation mid-swipe.
            if(currentPageIndex()===g.page && typeof window.goToPage==='function')
                window.goToPage(pages[nextIndex]);
            cancelGesture();
        },160);
    }

    appMain.addEventListener('touchstart',event=>{
        if(settling || event.touches.length!==1 ||
            isOverlayOpen() || blockedSwipeTarget(event.target))return;
        const t=event.touches[0];
        // Android owns gestures beginning at the left/right bezel.
        if(t.clientX<18 || t.clientX>window.innerWidth-18)return;
        const page=currentPageIndex();
        if(!validPage(page))return;
        const active=document.getElementById('page-'+pages[page]);
        gesture={
            id:t.identifier,
            x:t.clientX,
            y:t.clientY,
            lastX:t.clientX,
            lastY:t.clientY,
            time:Date.now(),
            page,active,
            width:Math.max(1,active.getBoundingClientRect().width),
            lock:null,
            neighbor:null
        };
    },{passive:true});

    appMain.addEventListener('touchmove',event=>{
        const g=gesture;
        if(!g || settling || isOverlayOpen())return;
        if(event.touches.length!==1){cancelGesture();return;}
        const t=event.touches[0];
        if(t.identifier!==g.id)return;
        const dx=t.clientX-g.x,dy=t.clientY-g.y;
        g.lastX=t.clientX;
        g.lastY=t.clientY;
        if(g.lock===null && (Math.abs(dx)>8 || Math.abs(dy)>8)){
            if(Math.abs(dy)>Math.abs(dx)*1.1){
                // Give the entire gesture to Android's native vertical scroll.
                cancelGesture();
                return;
            }
            if(Math.abs(dx)>Math.abs(dy)*1.15)g.lock='horizontal';
        }
        if(g.lock!=='horizontal')return;
        // Once horizontally locked, this is a page drag, not a vertical scroll.
        if(event.cancelable)event.preventDefault();
        paintGesture(g,dx);
    },{passive:false});

    appMain.addEventListener('touchend',event=>{
        const g=gesture;
        if(!g || settling || isOverlayOpen())return;
        const t=Array.from(event.changedTouches).find(touch=>touch.identifier===g.id);
        if(!t)return;
        const dx=t.clientX-g.x,dy=t.clientY-g.y;
        // touchend can arrive without a move event for very fast flicks.
        const commit=eligibleSwipe(dx,dy,Date.now()-g.time,g.width);
        finishGesture(g,commit,dx);
    },{passive:true});

    appMain.addEventListener('touchcancel',cancelGesture,{passive:true});
    // A tab click can interrupt a visual swipe; don't reroute afterward.
    document.querySelectorAll('.bottom-tabs button[data-page]').forEach(button=>
        button.addEventListener('click',cancelGesture,true)
    );
    window.addEventListener('popstate',cancelGesture,true);
})();
