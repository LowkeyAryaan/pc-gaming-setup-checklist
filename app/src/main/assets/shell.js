/* App shell v1.3 — works with the existing v1.2 planner. */
(() => {
    'use strict';
    const el=id=>document.getElementById(id);
    const pages=['tracker','items','summary'];
    const CREATOR_INSTAGRAM_URL='https://www.instagram.com/aryaan_creates/';
    function instagramCreatorLink(){
        const link=document.createElement('a');
        link.className='creator-link';
        link.href=CREATOR_INSTAGRAM_URL;
        link.target='_self';
        link.rel='noopener noreferrer';
        link.textContent='@aryaan_creates ↗';
        link.setAttribute('aria-label','Visit Aryaan on Instagram, @aryaan_creates');
        return link;
    }
    const drawer=el('sideDrawer'),shade=el('drawerShade');
    const modalShade=el('modalShade'),modalBody=el('modalBody'),modalActions=el('modalActions');
    function displayName(){
        const p=presetIndex.presets.find(x=>x.id===activePresetId);
        el('currentPresetName').textContent=p?p.name:'Preset #1';
    }
    function goToPage(page,opts={}){
        if(!pages.includes(page))return;
        pages.forEach(p=>el('page-'+p).classList.toggle('is-current',p===page));
        document.querySelectorAll('.bottom-tabs button[data-page]').forEach(b=>{
            const active=b.dataset.page===page;
            b.classList.toggle('is-active',active);
            if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
        });
        if(opts.history!==false)try{history.pushState({page},'', '#'+page);}catch(_){}
        if(opts.scroll!==false)window.scrollTo(0,0);
        if(page==='items')updateItemCount();
    }
    window.goToPage=p=>goToPage(p);
    document.querySelectorAll('.bottom-tabs button[data-page]').forEach(b=>b.onclick=()=>goToPage(b.dataset.page));
    try{history.replaceState({page:'tracker'},'', '#tracker');}catch(_){}
    window.addEventListener('popstate',e=>goToPage(e.state&&pages.includes(e.state.page)?e.state.page:'tracker',{history:false}));
    el('trackerToItems').onclick=()=>goToPage('items');
    el('itemsToTracker').onclick=()=>{goToPage('tracker');el('addProductForm').scrollIntoView({behavior:'smooth',block:'start'});};

    const pencilIcon='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16 4a2 2 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    const trashIcon='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7m4-7v7"/></svg>';
    function renderPresetList(){
        displayName();
        const list=el('presetList');list.replaceChildren();
        presetIndex.presets.forEach(p=>{
            const row=document.createElement('div');
            row.className='preset-row preset-managed'+(p.id===activePresetId?' selected':'');
            const select=document.createElement('button');select.type='button';select.className='preset-select';
            const title=document.createElement('span');title.className='preset-title';title.textContent=p.name;
            select.append(title);
            if(p.id===activePresetId){
                const active=document.createElement('span');active.className='preset-badge';active.textContent='ACTIVE';select.append(active);
            }
            select.onclick=()=>{
                closeDrawer();
                if(p.id===activePresetId)return;
                try{loadPresetIntoApp(p.id);displayName();renderCategoryTokens();goToPage('tracker');}
                catch(err){alert('Could not open preset: '+err.message);}
            };
            const pencil=document.createElement('button');pencil.type='button';
            pencil.className='preset-icon';pencil.innerHTML=pencilIcon;
            pencil.setAttribute('aria-label','Rename '+p.name);pencil.title='Rename preset';
            pencil.onclick=()=>renamePreset(p.id);
            row.append(select,pencil);
            if(p.id!=='preset-1'){
                const trash=document.createElement('button');trash.type='button';
                trash.className='preset-icon delete-icon';trash.innerHTML=trashIcon;
                trash.setAttribute('aria-label','Delete '+p.name);trash.title='Delete preset';
                trash.onclick=()=>deletePreset(p.id);
                row.append(trash);
            }
            list.append(row);
        });
    }
    function renamePreset(id) {
        const record=presetIndex.presets.find(p=>p.id===id);
        if(!record)return;
        const form=document.createElement('form');form.className='setupform';
        const label=document.createElement('label');label.textContent='Preset name';
        const input=document.createElement('input');input.type='text';input.maxLength=52;
        input.value=record.name;input.required=true;
        const submit=document.createElement('button');submit.type='submit';submit.className='active';submit.textContent='Save name';
        label.append(input);form.append(label,submit);
        form.onsubmit=e=>{
            e.preventDefault();const next=input.value.trim();
            if(!next)return;
            if(presetIndex.presets.some(p=>p.id!==id&&p.name.toLowerCase()===next.toLowerCase())){
                alert('Another preset uses that name.');return;
            }
            record.name=next;savePresetIndex();displayName();closeModal();renderPresetList();openDrawer();
        };
        openModal('Rename preset',form);input.focus();
    }
    async function removePresetImages(id) {
        try {
            const db=await openPhotoDB();
            await new Promise((resolve,reject)=>{
                const tx=db.transaction('photos','readwrite'),store=tx.objectStore('photos');
                const cursor=store.openCursor();
                cursor.onsuccess=()=>{
                    const c=cursor.result;if(!c)return;
                    if(String(c.key).startsWith(id+'__'))c.delete();
                    c.continue();
                };
                tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
            });
        }catch(e){console.warn('Could not clear saved preset photos:',e);}
        for(let i=localStorage.length-1;i>=0;i--){
            const k=localStorage.key(i);
            if(k&&k.startsWith('pc-setup-photo-'+id+'__'))localStorage.removeItem(k);
        }
    }
    function deletePreset(id){
        if(id==='preset-1')return;
        const record=presetIndex.presets.find(p=>p.id===id);
        if(!record)return;
        const wrapper=document.createElement('div');
        const p=document.createElement('p');p.textContent='Permanently delete "'+record.name+'", all its products, savings, notes and pictures? This cannot be undone. Export a backup first if you want to keep it.';
        wrapper.append(p);
        openModal('Delete preset?',wrapper,[
            {label:'Cancel',onClick:closeModal},
            {label:'Delete preset',danger:true,onClick:async()=>{
                if(activePresetId===id)loadPresetIntoApp('preset-1');
                await removePresetImages(id);
                presetIndex.presets=presetIndex.presets.filter(p=>p.id!==id);
                localStorage.removeItem(presetStateKey(id));savePresetIndex();
                closeModal();renderPresetList();displayName();goToPage('tracker');
            }}
        ]);
    }
    function openDrawer(){
        renderPresetList();shade.hidden=false;drawer.classList.add('is-open');
        drawer.setAttribute('aria-hidden','false');el('menuButton').setAttribute('aria-expanded','true');
        el('closeDrawer').focus();
    }
    function closeDrawer(){
        drawer.classList.remove('is-open');drawer.setAttribute('aria-hidden','true');
        shade.hidden=true;el('menuButton').setAttribute('aria-expanded','false');
    }
    el('menuButton').onclick=()=>drawer.classList.contains('is-open')?closeDrawer():openDrawer();
    el('closeDrawer').onclick=closeDrawer;shade.onclick=closeDrawer;
    function openModal(title,body,actions=[]){
        closeDrawer();
        el('modalHeading').textContent=title;modalBody.replaceChildren();
        if(typeof body==='string')modalBody.innerHTML=body;else if(body)modalBody.append(body);
        modalActions.replaceChildren();
        actions.forEach(a=>{
            const b=document.createElement('button');
            b.textContent=a.label;b.type='button';if(a.primary)b.classList.add('active');
            if(a.danger)b.classList.add('danger');b.onclick=a.onClick;modalActions.append(b);
        });
        modalShade.hidden=false;el('closeModalButton').focus();
    }
    function closeModal(){modalShade.hidden=true;modalBody.replaceChildren();modalActions.replaceChildren();}
    el('closeModalButton').onclick=closeModal;
    modalShade.onclick=e=>{if(e.target===modalShade)closeModal();};
    document.addEventListener('keydown',e=>{
        if(e.key!=='Escape')return;
        if(!modalShade.hidden){closeModal();e.preventDefault();}
        else if(drawer.classList.contains('is-open')){closeDrawer();e.preventDefault();}
    });

    function nextName(){
        let n=2;const existing=new Set(presetIndex.presets.map(p=>p.name.toLowerCase()));
        while(existing.has(('Preset #'+n).toLowerCase()))n++;
        return 'Preset #'+n;
    }
    function createPresetModal(){
        const form=document.createElement('form');form.className='setupform';
        const nameLabel=document.createElement('label');nameLabel.textContent='Preset name';
        const name=document.createElement('input');name.type='text';name.required=true;name.maxLength=52;name.value=nextName();
        nameLabel.append(name);form.append(nameLabel);
        const note=document.createElement('p');note.className='section-note';
        note.textContent='Each preset saves its own products, categories, savings and pictures.';form.append(note);
        const blank=document.createElement('label');blank.className='option-row';
        blank.innerHTML='<input type="radio" name="mode" value="blank" checked> Start with an empty checklist';
        const duplicate=document.createElement('label');duplicate.className='option-row';
        duplicate.innerHTML='<input type="radio" name="mode" value="copy"> Duplicate current preset';
        form.append(blank,duplicate);
        const create=document.createElement('button');create.type='submit';create.className='active';create.textContent='Create preset';form.append(create);
        const notice=document.createElement('div');notice.className='status';notice.setAttribute('role','status');form.append(notice);
        form.onsubmit=async evt=>{
            evt.preventDefault();
            const title=name.value.trim();
            if(!title)return;
            if(presetIndex.presets.some(p=>p.name.toLowerCase()===title.toLowerCase())){notice.textContent='Choose a different preset name.';return;}
            const mode=form.querySelector('input[name=mode]:checked').value;
            const id='preset-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
            create.disabled=true;notice.textContent='Creating preset...';
            try{
                persist();
                const photos=[];
                if(mode==='copy'){
                    for(const item of items){
                        const p=await getPhoto(item.id);
                        if(p&&p.blob)photos.push({id:item.id,blob:p.blob});
                    }
                    const source=JSON.parse(localStorage.getItem(presetStateKey())||'{}');
                    localStorage.setItem(presetStateKey(id),JSON.stringify(source));
                }else createEmptyPreset(id);
                presetIndex.presets.push({id,name:title});
                loadPresetIntoApp(id);
                let failed=0;
                for(const photo of photos){try{await savePhoto(photo.id,photo.blob);}catch(_){failed++;}}
                if(photos.length)render();
                displayName();renderCategoryTokens();closeModal();goToPage('tracker');
                if(failed)alert(failed+' picture(s) were not copied. Export a backup of the original preset.');
            }catch(err){
                presetIndex.presets=presetIndex.presets.filter(p=>p.id!==id);
                savePresetIndex();notice.textContent='Could not create preset: '+err.message;create.disabled=false;
            }
        };
        openModal('New setup preset',form);name.focus();
    }
    el('addPresetButton').onclick=createPresetModal;

    function renderCategoryTokens(){
        const root=el('categoryManagement');root.replaceChildren();
        ['All'].concat(builtinNames,customCategories.map(c=>c.name)).forEach(name=>{
            const row=document.createElement('div');row.className='category-row';
            const b=document.createElement('button');b.type='button';
            b.className='category-token'+(filter===name?' is-active':'');
            b.textContent=name+' · '+(name==='All'?items.length:items.filter(i=>i.cat===name).length);
            b.onclick=()=>{
                if(categoryGroup(name)==='future')future.checked=true;
                filter=name;renderFilters();render();persist();
            };
            row.append(b);
            if(customCategories.some(c=>c.name===name)){
                const remove=document.createElement('button');
                remove.type='button';remove.className='category-delete';
                remove.setAttribute('aria-label','Delete category '+name);
                remove.title='Delete '+name;remove.innerHTML=trashIcon;
                remove.onclick=()=>deleteCategory(name);
                row.append(remove);
            }
            root.append(row);
        });
    }
    function deleteCategory(name) {
        const category=customCategories.find(c=>c.name===name);
        if(!category)return;
        const affected=items.filter(item=>item.cat===name);
        function finalize(){
            const index=customCategories.findIndex(c=>c.name===name);
            if(index>=0)customCategories.splice(index,1);
            if(filter===name)filter='All';
            renderFilters();render();persist();closeModal();
        }
        if(!affected.length){
            if(confirm('Delete empty custom category "'+name+'"?'))finalize();
            return;
        }
        const container=document.createElement('div');
        const notice=document.createElement('p');
        notice.textContent='"'+name+'" contains '+affected.length+' product(s). What should happen to them?';
        container.append(notice);
        const radio=(value,text,checked)=>{
            const label=document.createElement('label');label.className='option-row';
            const input=document.createElement('input');input.type='radio';input.name='deleteCatAction';input.value=value;input.checked=checked;
            label.append(input,document.createTextNode(' '+text));container.append(label);return input;
        };
        const move=radio('move','Move products to another category',true);
        radio('delete','Delete the category AND all its products',false);
        const target=document.createElement('select');target.className='currency-search';
        builtinNames.concat(customCategories.map(c=>c.name)).filter(c=>c!==name).forEach(c=>{
            const option=document.createElement('option');option.value=c;option.textContent=c;target.append(option);
        });
        target.value='Accessory';container.append(target);
        container.addEventListener('change',()=>{target.hidden=!move.checked;});
        const warning=document.createElement('p');warning.className='section-note';
        warning.textContent='Deleting products also removes their images and notes from this preset. Moving them retains all product details but changes their budget category.';
        container.append(warning);
        openModal('Delete category?',container,[
            {label:'Cancel',onClick:closeModal},
            {label:'Confirm',danger:true,onClick:async()=>{
                if(move.checked){
                    if(!target.value)return alert('Select a destination category.');
                    affected.forEach(i=>i.cat=target.value);
                } else {
                    if(!confirm('Permanently delete all '+affected.length+' products in "'+name+'"?'))return;
                    for(const item of affected)await removeItem(item.id);
                }
                finalize();
            }}
        ]);
    }
    function updateItemCount(){
        const visible=el('items').children.length;
        el('visibleItemsCount').textContent=visible===items.length?items.length+' products in this preset':visible+' shown · '+items.length+' total products';
    }
    const observer=new MutationObserver(()=>{renderCategoryTokens();updateItemCount();});
    observer.observe(el('items'),{childList:true});
    renderCategoryTokens();updateItemCount();

    el('termsButton').onclick=()=>openModal('Terms & Conditions',el('introTermsCopy').innerHTML,[{label:'Close',primary:true,onClick:closeModal}]);
    el('aboutButton').onclick=()=>openModal('About',
        '<p><strong>My PC & Gaming Setup Checklist · v1.4.1</strong></p>'+
        '<p>Create separate setup presets, organize PC products, save photos, track contributions and watch your savings goal update automatically.</p>'+
        '<p>This is a device-local planner. It does not provide an online account or automatic cloud sync.</p><p>Welcome background photo sourced from Unsplash.</p>',
        [{label:'Close',primary:true,onClick:closeModal}]);
    function openCurrencyPicker(){
        const wrapper=document.createElement('div');
        const explanation=document.createElement('p');
        explanation.className='section-note';
        explanation.textContent='Choose a currency for this preset. Amounts are not converted; your existing numbers stay exactly the same.';
        const search=document.createElement('input');
        search.type='search';search.placeholder='Search currency name or code';search.className='currency-search';
        search.setAttribute('aria-label','Search currencies');
        const list=document.createElement('div');list.className='currency-list';
        function filterCurrencies(){
            const term=search.value.trim().toLowerCase();list.replaceChildren();
            ALL_CURRENCIES.filter(code=>!term||(code+' '+currencyName(code)).toLowerCase().includes(term)).forEach(code=>{
                const b=document.createElement('button');b.type='button';b.className='currency-option';
                b.textContent=code+' — '+currencyName(code)+(code===currentCurrency?' ✓':'');
                if(code===currentCurrency)b.classList.add('currency-selected');
                b.onclick=()=>{
                    if(code===currentCurrency){closeModal();return;}
                    if(!confirm('Change this preset from '+currentCurrency+' to '+code+'? Existing prices and savings numbers will NOT be converted. You must edit them manually.'))return;
                    setPresetCurrency(code);closeModal();displayName();
                };
                list.append(b);
            });
            if(!list.children.length){const p=document.createElement('p');p.className='section-note';p.textContent='No matching currencies.';list.append(p);}
        }
        wrapper.append(explanation,search,list);
        openModal('Choose currency',wrapper,[{label:'Cancel',onClick:closeModal}]);
        filterCurrencies();search.oninput=filterCurrencies;search.focus();
    }
    function openSettings(){
        const root=document.createElement('div');
        const current=presetIndex.presets.find(p=>p.id===activePresetId);
        function section(label){
            const h=document.createElement('h3');h.textContent=label;h.className='settings-title';
            root.append(h);
        }
        function selectSetting(label,value,opts,onChange,hint) {
            const wrap=document.createElement('label');wrap.className='setting-field';
            const title=document.createElement('strong');title.textContent=label;
            const sel=document.createElement('select');sel.className='currency-search';
            opts.forEach(([v,name])=>{
                const o=document.createElement('option');o.value=v;o.textContent=name;sel.append(o);
            });
            sel.value=value;
            sel.onchange=()=>onChange(sel.value);
            wrap.append(title,sel);
            if(hint){const p=document.createElement('span');p.className='section-note';p.textContent=hint;wrap.append(p);}
            root.append(wrap);
        }
        function toggle(label,value,onChange,hint){
            const wrap=document.createElement('label');wrap.className='setting-toggle';
            const text=document.createElement('span');text.textContent=label;
            const input=document.createElement('input');input.type='checkbox';input.checked=value;
            input.onchange=()=>onChange(input.checked);
            wrap.append(text,input);root.append(wrap);
            if(hint){const p=document.createElement('p');p.className='section-note';p.textContent=hint;root.append(p);}
        }
        function action(label,click){
            const b=document.createElement('button');b.type='button';b.className='setting-action';
            b.textContent=label;b.onclick=click;root.append(b);
        }
        const desc=document.createElement('p');desc.className='section-note';
        desc.textContent=(current?current.name:'Current preset')+' preferences. Currency, sorting and image display apply to this preset.';
        root.append(desc);
        const creatorLabel=document.createElement('div');
        creatorLabel.className='creator-label';
        creatorLabel.textContent='CREATOR · INSTAGRAM';
        root.append(creatorLabel,instagramCreatorLink());
        section('General');
        action('Currency  ·  '+currentCurrency+'    →',openCurrencyPicker);
        selectSetting('Item sorting',sortOrder,[
            ['default','Custom / added order'],['name','Name · A to Z'],
            ['price-asc','Price · low to high'],['price-desc','Price · high to low']
        ],value=>{sortOrder=value;render();persist();},'Only changes how products appear. Prices and data stay unchanged.');
        toggle('Show product pictures',showProductImages,value=>{showProductImages=value;render();persist();});
        toggle('Include future purchases',future.checked,value=>{future.checked=value;render();persist();});
        toggle('Show welcome screen on launch',localStorage.getItem('pc-gaming-show-welcome-v14')!=='false',
            value=>localStorage.setItem('pc-gaming-show-welcome-v14',value?'true':'false'),
            'Enabled by default. Changing this will affect your next app launch.');
        section('Data & backups');
        action('Export this preset backup',()=>{closeModal();el('export').click();});
        action('Import backup into this preset',()=>{closeModal();el('import').click();});
        action('Reset checkmarks, notes and savings tracker',()=>{closeModal();el('reset').click();});
        const note=document.createElement('p');note.className='section-note';
        note.textContent='Rename or delete presets using their pencil and trash buttons in the sidebar. All information stays on this device unless you choose to share it.';
        root.append(note);
        openModal('Settings',root,[{label:'Done',primary:true,onClick:closeModal}]);
    }
    function openFeedback() {
        const store=window.PCFeedbackStore;
        if(!store){
            alert('Feedback storage is unavailable. Please restart the app.');
            return;
        }
        // Feedback is app-wide, not per preset. Nothing is sent automatically.
        const root=document.createElement('div');
        root.className='feedback-shell';

        const hint=document.createElement('p');
        hint.className='feedback-intro';
        hint.textContent='Save feedback privately on this device, or email it directly to aryaanmikaeel@gmail.com. Email opens a draft in your mail app; nothing sends until you tap Send. Saved comments remain after restarting.';
        root.append(hint);

        const composer=document.createElement('form');
        composer.className='feedback-composer';
        const label=document.createElement('label');
        label.textContent='Your feedback comment';
        label.setAttribute('for','feedbackCommentText');
        const input=document.createElement('textarea');
        input.id='feedbackCommentText';
        input.rows=4;
        input.maxLength=store.MAX_LENGTH;
        input.placeholder='Your idea, bug report, or suggestion...';
        input.required=true;
        composer.append(label,input);

        const buttons=document.createElement('div');
        buttons.className='feedback-action-row';
        const save=document.createElement('button');
        save.type='submit';
        save.textContent='Save locally';
        const emailButton=document.createElement('button');
        emailButton.type='button';
        emailButton.className='active';
        emailButton.textContent='Send Feedback by Email';
        const cancel=document.createElement('button');
        cancel.type='button';
        cancel.textContent='Clear';
        buttons.append(save,emailButton,cancel);
        const status=document.createElement('div');
        status.className='feedback-status';
        status.setAttribute('role','status');
        composer.append(buttons,status);
        root.append(composer);

        const divider=document.createElement('hr');
        divider.className='feedback-divider';
        root.append(divider);
        const historyHeader=document.createElement('div');
        historyHeader.className='feedback-heading';
        const historyTitle=document.createElement('strong');
        historyTitle.textContent='Saved comments';
        const count=document.createElement('span');
        count.className='feedback-count';
        historyHeader.append(historyTitle,count);
        root.append(historyHeader);
        const history=document.createElement('div');
        history.className='feedback-list';
        history.setAttribute('aria-label','Saved feedback comments');
        root.append(history);

        let editingId=null;
        function clearDraft(){
            editingId=null;
            input.value='';
            save.textContent='Save locally';
            cancel.textContent='Clear';
        }
        function message(entry){
            return 'PC Gaming Setup Checklist feedback\n'+new Date(entry.createdAt).toLocaleString()+
                '\n\n'+entry.text;
        }
        function emailAryaan(text){
            // Only open an addressed email draft; sending requires the user's
            // explicit confirmation in their own email app.
            if(window.AndroidFeedback && typeof window.AndroidFeedback.composeEmail==='function'){
                window.AndroidFeedback.composeEmail(text);
            }else{
                const recipient='aryaanmikaeel@gmail.com';
                const subject='PC Gaming Setup Checklist feedback';
                window.location.href='mailto:'+recipient+'?subject='+encodeURIComponent(subject)+
                    '&body='+encodeURIComponent(text);
            }
            status.textContent='Email draft requested. Tap Send in your email app to deliver it to Aryaan.';
        }
        async function copyText(text){
            try {
                if(navigator.clipboard && typeof navigator.clipboard.writeText==='function'){
                    await navigator.clipboard.writeText(text);
                }else{
                    const temp=document.createElement('textarea');
                    temp.value=text;
                    document.body.append(temp);temp.select();
                    const copied=document.execCommand('copy');
                    temp.remove();
                    if(!copied)throw new Error('Copy failed.');
                }
                status.textContent='Comment copied to clipboard.';
            }catch(_){
                status.textContent='Could not copy. Try Share instead.';
            }
        }
        function commentButton(text,onClick,extraClass=''){
            const button=document.createElement('button');
            button.type='button';
            button.textContent=text;
            if(extraClass)button.classList.add(extraClass);
            button.onclick=onClick;
            return button;
        }
        function renderHistory(){
            history.replaceChildren();
            const comments=store.list();
            count.textContent=comments.length+' / '+store.MAX_COMMENTS;
            if(comments.length===0){
                const empty=document.createElement('div');
                empty.className='feedback-empty';
                empty.textContent='No saved comments yet. Write your first one above.';
                history.append(empty);
                return;
            }
            comments.forEach(entry=>{
                const card=document.createElement('article');
                card.className='feedback-comment';
                const head=document.createElement('div');
                head.className='feedback-comment-head';
                const date=document.createElement('span');
                date.textContent=new Date(entry.createdAt).toLocaleString();
                const edited=document.createElement('span');
                edited.textContent=entry.updatedAt?'Edited':'Saved locally';
                head.append(date,edited);
                const text=document.createElement('p');
                text.className='feedback-comment-body';
                text.textContent=entry.text;
                const actions=document.createElement('div');
                actions.className='feedback-comment-actions';
                actions.append(
                    commentButton('Edit',()=>{
                        editingId=entry.id;
                        input.value=entry.text;
                        save.textContent='Save changes';
                        cancel.textContent='Cancel edit';
                        status.textContent='Editing saved comment.';
                        input.focus();
                    }),
                    commentButton('Copy',()=>copyText(message(entry))),
                    commentButton('Email Aryaan',()=>emailAryaan(message(entry))),
                    commentButton('Delete',()=>{
                        if(!confirm('Delete this saved feedback comment from the app?'))return;
                        try {
                            store.remove(entry.id);
                            if(editingId===entry.id)clearDraft();
                            renderHistory();
                            status.textContent='Comment deleted.';
                        }catch(err){status.textContent='Could not delete: '+err.message;}
                    },'feedback-delete')
                );
                card.append(head,text,actions);
                history.append(card);
            });
        }
        function saveDraft(){
            const updated=!!editingId;
            const record=updated ? store.update(editingId,input.value) : store.add(input.value);
            clearDraft();
            renderHistory();
            status.textContent=updated?'Comment updated on this device.':'Comment saved on this device.';
            return record;
        }
        composer.onsubmit=e=>{
            e.preventDefault();
            try{saveDraft();}
            catch(err){status.textContent=err.message || 'Could not save comment. Check device storage.';}
        };
        emailButton.onclick=()=>{
            try{
                // Preserve the feedback even if the email client is missing or
                // the user returns without sending the email.
                const record=saveDraft();
                emailAryaan(message(record));
            }catch(err){
                status.textContent=err.message || 'Could not save feedback. Check device storage.';
            }
        };
        cancel.onclick=()=>{clearDraft();status.textContent='';};

        const creator=document.createElement('div');
        const creatorLabel=document.createElement('div');
        creatorLabel.className='creator-label';
        creatorLabel.textContent='CREATED BY ARYAAN · INSTAGRAM';
        creator.append(creatorLabel,instagramCreatorLink());
        root.append(creator);
        renderHistory();
        openModal('Feedback',root,[{label:'Close',onClick:closeModal}]);
    }
    el('feedbackButton').onclick=openFeedback;
    el('settingsButton').onclick=openSettings;
    displayName();
})();