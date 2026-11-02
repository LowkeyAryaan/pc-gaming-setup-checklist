/* App shell v1.3 — works with the existing v1.2 planner. */
(() => {
    'use strict';
    const el=id=>document.getElementById(id);
    const pages=['tracker','items','summary','planner'];
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
        if(el('dashboardPresetName'))el('dashboardPresetName').textContent=p?p.name:'Preset #1';
    }
    function goToPage(page,opts={}){
        if(!pages.includes(page))return;
        pages.forEach(p=>el('page-'+p).classList.toggle('is-current',p===page));
        if(typeof window.syncSwipePages==='function')window.syncSwipePages(page);
        document.querySelectorAll('.bottom-tabs button[data-page]').forEach(b=>{
            const active=b.dataset.page===page;
            b.classList.toggle('is-active',active);
            if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
        });
        if(opts.history!==false)try{history.pushState({page},'', '#'+page);}catch(_){}
        if(opts.scroll!==false)window.scrollTo(0,0);
        if(page==='items')updateItemCount();
        if(page==='planner'&&window.PersonalPlanner)window.PersonalPlanner.render();
    }
    window.goToPage=p=>goToPage(p);
    document.querySelectorAll('.bottom-tabs button[data-page]').forEach(b=>b.onclick=()=>goToPage(b.dataset.page));
    try{history.replaceState({page:'tracker'},'', '#tracker');}catch(_){}
    window.addEventListener('popstate',e=>goToPage(e.state&&pages.includes(e.state.page)?e.state.page:'tracker',{history:false}));
    el('trackerToItems').onclick=()=>goToPage('items');
    el('itemsToTracker').onclick=()=>{if(window.openProductSheet)window.openProductSheet();};

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

    const CATEGORY_HOLD_MS=550;
    function categoryActionMenu(name) {
        const category=customCategories.find(c=>c.name===name);
        if(!category)return;
        const content=document.createElement('div');
        content.className='category-manage-menu';
        const description=document.createElement('p');
        description.textContent='Manage "'+name+'" without affecting other categories.';
        content.append(description);
        openModal('Manage category',content,[
            {label:'Cancel',onClick:closeModal},
            {label:'Edit',primary:true,onClick:()=>editCategory(name)},
            {label:'Delete',danger:true,onClick:()=>deleteCategory(name)}
        ]);
    }
    function editCategory(name){
        const category=customCategories.find(c=>c.name===name);
        if(!category)return;
        const form=document.createElement('form');form.className='setupform category-edit-form';
        const nameLabel=document.createElement('label');
        nameLabel.textContent='Category name';
        const input=document.createElement('input');input.type='text';input.maxLength=48;
        input.value=name;input.required=true;nameLabel.append(input);
        const groupLabel=document.createElement('label');
        groupLabel.textContent='Budget group';
        const groupSelect=document.createElement('select');
        for(const [value,label] of [['pc','PC'],['setup','Setup'],['future','Future']]){
            const option=document.createElement('option');option.value=value;option.textContent=label;
            groupSelect.append(option);
        }
        groupSelect.value=category.group;
        groupLabel.append(groupSelect);
        const explanation=document.createElement('p');explanation.className='section-note';
        explanation.textContent='Renaming keeps your products, images and purchase history. Changing the budget group changes which goal they count toward.';
        form.append(nameLabel,groupLabel,explanation);
        const notice=document.createElement('p');notice.className='status';
        notice.setAttribute('role','status');form.append(notice);
        function save(){
            const updated=input.value.trim();
            if(!updated){notice.textContent='Enter a category name.';return;}
            const duplicate=builtinNames.concat(customCategories.filter(c=>c!==category).map(c=>c.name))
                .some(candidate=>candidate.toLowerCase()===updated.toLowerCase());
            if(duplicate){notice.textContent='This category name already exists.';return;}
            const oldName=category.name;
            category.name=updated;category.group=groupSelect.value;
            for(const item of items){if(item.cat===oldName)item.cat=updated;}
            if(filter===oldName)filter=updated;
            if(contributionCategory===oldName)contributionCategory=updated;
            refreshContributionCategories();
            categoryOptions(el('newCategory'),updated);
            renderFilters();render();persist();renderCategoryTokens();closeModal();
        }
        form.onsubmit=e=>{e.preventDefault();save();};
        openModal('Edit category',form,[
            {label:'Cancel',onClick:closeModal},
            {label:'Save changes',primary:true,onClick:save}
        ]);
        input.focus();
    }
    function attachCategoryLongPress(button,name){
        let timer=null,startX=0,startY=0,pressed=false,suppressUntil=0;
        const cancel=()=>{if(timer!==null)clearTimeout(timer);timer=null;};
        button.addEventListener('pointerdown',e=>{
            if(e.pointerType==='mouse'&&e.button!==0)return;
            cancel();pressed=true;startX=e.clientX;startY=e.clientY;
            timer=setTimeout(()=>{
                timer=null;
                if(!pressed)return;
                suppressUntil=Date.now()+1000;
                categoryActionMenu(name);
            },CATEGORY_HOLD_MS);
        });
        button.addEventListener('pointermove',e=>{
            if(Math.abs(e.clientX-startX)>12||Math.abs(e.clientY-startY)>12)cancel();
        });
        button.addEventListener('pointerup',()=>{pressed=false;cancel();});
        button.addEventListener('pointercancel',()=>{pressed=false;cancel();});
        button.addEventListener('lostpointercapture',()=>{pressed=false;cancel();});
        button.addEventListener('contextmenu',e=>{
            e.preventDefault();pressed=false;cancel();
            if(Date.now()>suppressUntil){
                suppressUntil=Date.now()+1000;
                categoryActionMenu(name);
            }
        });
        button.addEventListener('keydown',e=>{
            if((e.shiftKey&&e.key==='F10')||e.key==='ContextMenu'){
                e.preventDefault();e.stopPropagation();suppressUntil=Date.now()+1000;
                categoryActionMenu(name);
            }
        });
        return ()=>Date.now()<suppressUntil;
    }
    function renderCategoryTokens(){
        const root=el('categoryManagement');root.replaceChildren();
        ['All'].concat(builtinNames,customCategories.map(c=>c.name)).forEach(name=>{
            const row=document.createElement('div');row.className='category-row';
            const button=document.createElement('button');button.type='button';
            button.className='category-token'+(filter===name?' is-active':'');
            button.textContent=name+' · '+(name==='All'?items.length:items.filter(i=>i.cat===name).length);
            const editable=customCategories.some(c=>c.name===name);
            const shouldSuppress=editable?attachCategoryLongPress(button,name):()=>false;
            if(editable){
                button.classList.add('category-hold-action');
                button.setAttribute('aria-label',name+' category. Tap to filter, long press to edit or delete.');
                button.title='Hold to edit or delete';
            }
            button.onclick=()=>{
                if(shouldSuppress())return;
                if(categoryGroup(name)==='future')future.checked=true;
                filter=name;renderFilters();render();persist();
            };
            row.append(button);
            root.append(row);
        });
        const add=document.createElement('button');
        add.type='button';add.className='category-add';add.textContent='+';
        add.setAttribute('aria-label','Add category');
        add.onclick=()=>{if(window.openCategorySheet)window.openCategorySheet();};
        root.append(add);
    }
    function deleteCategory(name) {
        const category=customCategories.find(c=>c.name===name);
        if(!category)return;
        const affected=items.filter(item=>item.cat===name);
        function finalize(){
            const index=customCategories.findIndex(c=>c.name===name);
            if(index>=0)customCategories.splice(index,1);
            if(filter===name)filter='All';
            if(contributionScope==='category'&&contributionCategory===name)contributionCategory='Setup';
            refreshContributionCategories();
            renderFilters();render();persist();closeModal();
        }
        if(!affected.length){
            window.glassConfirm('Delete empty custom category "'+name+'"?').then(ok=>{if(ok)finalize();});
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
        target.value='Setup';container.append(target);
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
                    if(!await window.glassConfirm('Permanently delete all '+affected.length+' products in "'+name+'"?'))return;
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
        '<p><strong>Setup Checklist · v1.7.2</strong></p>'+
        '<p>Create separate setup presets, organize PC products, save photos, track unpurchased items, and watch your remaining savings goal decrease when items are marked purchased.</p>'+
        '<p>This is a device-local planner. It does not provide an online account or automatic cloud sync.</p>',
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
                b.onclick=async()=>{
                    if(code===currentCurrency){closeModal();return;}
                    if(!await window.glassConfirm('Change this preset from '+currentCurrency+' to '+code+'? Existing prices and savings numbers will NOT be converted. You must edit them manually.'))return;
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
            ['default','Custom / added order'],['priority','Priority · highest first'],['name','Name · A to Z'],
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
                if(window.AndroidClipboard && typeof window.AndroidClipboard.copy==='function'){
                    if(!window.AndroidClipboard.copy(text))throw new Error('Android clipboard unavailable');
                } else if(navigator.clipboard && typeof navigator.clipboard.writeText==='function'){
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
                    commentButton('Delete',async()=>{
                        if(!await window.glassConfirm('Delete this saved feedback comment from the app?'))return;
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