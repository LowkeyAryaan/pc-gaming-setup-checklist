const items=[];

const CURRENCY_CODES='AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HRK HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XOF XPF YER ZAR ZMW'.split(' ');
const ALL_CURRENCIES = (typeof Intl.supportedValuesOf==='function'?Intl.supportedValuesOf('currency').filter(x=>x!=='XXX'):CURRENCY_CODES).sort();
const isCurrency=code=>typeof code==='string' && ALL_CURRENCIES.includes(code);
function currencyName(code){
    try{if(Intl.DisplayNames)return new Intl.DisplayNames(['en'],{type:'currency'}).of(code)||code;}catch(_){}
    return ({PKR:'Pakistani Rupee',USD:'US Dollar',EUR:'Euro',GBP:'British Pound',AED:'UAE Dirham',SAR:'Saudi Riyal',INR:'Indian Rupee',JPY:'Japanese Yen',CAD:'Canadian Dollar',AUD:'Australian Dollar',CNY:'Chinese Yuan'})[code]||code;
}
const fmt = n => {
    const value=Math.max(0,Number(n)||0);
    if(currentCurrency==='PKR') return 'Rs. '+value.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:2});
    try{return new Intl.NumberFormat('en-US',{style:'currency',currency:currentCurrency,currencyDisplay:'narrowSymbol',minimumFractionDigits:0}).format(value);}
    catch(_){return currentCurrency+' '+value.toLocaleString('en-US',{maximumFractionDigits:2});}
};
// Release builds start empty. Historical v1.3 presets are migrated from
// previously persisted per-item overrides, not from bundled personal data.
const originalItems = [];
const SORT_ORDERS=['default','priority','name','price-asc','price-desc'];
const ITEM_PRIORITIES=['high','medium','low'];
const validTargetMonth=value=>typeof value==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const PURCHASE_VIEWS=['all','to-buy','purchased'];
const STORAGE_KEY = 'pc-gaming-setup-app-v2';
const PRESET_INDEX_KEY = 'pc-gaming-presets-v3';
function getPresetIndex() {
    let stored;
    try { stored=JSON.parse(localStorage.getItem(PRESET_INDEX_KEY)||'{}'); }catch(_){stored={};}
    const presets=[{id:'preset-1',name:'Preset #1'}];
    if(Array.isArray(stored.presets))stored.presets.forEach(p=>{
        if (!p || typeof p.id !== 'string' || !/^preset-[a-zA-Z0-9-]+$/.test(p.id) || p.id==='preset-1')return;
        if (presets.some(x=>x.id===p.id))return;
        presets.push({id:p.id,name:String(p.name||'New preset').trim().slice(0,52)||'New preset'});
    });
    const original=Array.isArray(stored.presets)&&stored.presets.find(p=>p&&p.id==='preset-1');
    if(original&&original.name)presets[0].name=String(original.name).trim().slice(0,52)||'Preset #1';
    return {presets,active:presets.some(x=>x.id===stored.active)?stored.active:'preset-1'};
}
const presetIndex=getPresetIndex();
let activePresetId=presetIndex.active;
function savePresetIndex(){localStorage.setItem(PRESET_INDEX_KEY,JSON.stringify({presets:presetIndex.presets,active:activePresetId}));}
function presetStateKey(id=activePresetId){return id==='preset-1'?STORAGE_KEY:'pc-gaming-setup-v3-'+id;}
function photoStorageKey(id) {return activePresetId==='preset-1'?id:activePresetId+'__'+id;}
function photoFallbackKey(id) {return 'pc-setup-photo-'+photoStorageKey(id);}

const $ = id => document.getElementById(id);
const BUILTIN = {PC:'pc',Setup:'setup',Future:'future'};
const builtinNames = Object.keys(BUILTIN);
function safePrice(value) {return Math.max(0,Math.round((Number(value)||0)*1000)/1000);}
function validUrl(value) {
    if (!value) return true;
    try {
        const u = new URL(value);
        return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname;
    } catch (_) { return false; }
}
function loadSaved() {
    try { return JSON.parse(localStorage.getItem(presetStateKey()) || (activePresetId==='preset-1'?localStorage.getItem('pc-gaming-setup-checklist-v1'):null) || '{}') || {}; }
    catch (_) { return {}; }
}
const savedState = loadSaved();
let currentCurrency = isCurrency(savedState.currency)?savedState.currency:(isCurrency(localStorage.getItem('pc-gaming-install-currency-v1'))?localStorage.getItem('pc-gaming-install-currency-v1'):'PKR');
function setPresetCurrency(code) {
    if(!isCurrency(code))throw new Error('Unsupported currency');
    currentCurrency=code;persist();render();
}
let blankPreset = !!savedState.blankPreset;
let sortOrder=SORT_ORDERS.includes(savedState.sortOrder)?savedState.sortOrder:'default';
let purchaseView=PURCHASE_VIEWS.includes(savedState.purchaseView)?savedState.purchaseView:'all';
let showProductImages=savedState.showProductImages!==false;
const checked = (savedState.checked && typeof savedState.checked==='object') ? savedState.checked : {};
const notes = (savedState.notes && typeof savedState.notes==='object') ? savedState.notes : {};
const customCategories = [];
if (Array.isArray(savedState.categories)) {
    savedState.categories.forEach(c => {
        if (!c || typeof c.name !== 'string') return;
        const name = c.name.trim().slice(0,48), group = c.group;
        if (!name || !['pc','setup','future'].includes(group)) return;
        if (builtinNames.concat(customCategories.map(x=>x.name)).some(x=>x.toLowerCase()===name.toLowerCase())) return;
        customCategories.push({name,group});
    });
}
// Upgrade historical named built-ins into user-editable categories. New installs
// get only PC, Setup and Future; saved categories and products are preserved.
function migrateLegacyCategories(state){
    const raw=[...Object.values(state.overrides||{}),...(Array.isArray(state.customItems)?state.customItems:[])];
    for(const item of raw){
        const cat=String(item&&item.cat||'');
        if(['Monitor','Desk','Accessory','Chair'].includes(cat)&&
           !customCategories.some(x=>x.name===cat))
            customCategories.push({name:cat,group:'setup'});
    }
}
migrateLegacyCategories(savedState);
const originalIds = new Set(originalItems.map(x => x.id));
const deletedIds = new Set(Array.isArray(savedState.deletedIds)?savedState.deletedIds.map(String):[]);
if(blankPreset)items.splice(0,items.length);
else items.splice(0,items.length,...items.filter(i=>!deletedIds.has(i.id)));
function categoryGroup(name) {
    if (Object.prototype.hasOwnProperty.call(BUILTIN,name)) return BUILTIN[name];
    const found = customCategories.find(c=>c.name===name);
    return found ? found.group : 'setup';
}
function normalizeProduct(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id=String(raw.id||'').slice(0,90), name=String(raw.name||'').trim().slice(0,180);
    if (!id || !name) return null;
    let cat=String(raw.cat||'Setup');
    if (!builtinNames.includes(cat) && !customCategories.some(c=>c.name===cat)) cat='Setup';
    return {id,name,price:safePrice(raw.price),cat,q:String(raw.q||name),
        priority:ITEM_PRIORITIES.includes(raw.priority)?raw.priority:'medium',
        targetMonth:validTargetMonth(raw.targetMonth)?raw.targetMonth:'',
        url:validUrl(String(raw.url||'')) ? String(raw.url||'') : ''};
}
const newProducts = Array.isArray(savedState.customItems) ? savedState.customItems : [];
const overrides = (savedState.overrides&&typeof savedState.overrides==='object')?savedState.overrides:{};
// A v1.3 installation kept its original parts ONLY inside the saved overrides.
// Rebuild that private checklist locally, without shipping Aryaan's prices/links
// to every person who downloads the open-source application.
function hydrateProducts(state) {
    const found=new Map();
    if(!state.blankPreset && state.overrides && typeof state.overrides==='object') {
        for(const [id,raw] of Object.entries(state.overrides)) {
            if(deletedIds.has(id))continue;
            const item=normalizeProduct({...raw,id});
            if(item)found.set(id,item);
        }
    }
    if(Array.isArray(state.customItems))for(const raw of state.customItems){
        const item=normalizeProduct(raw);
        if(item&&!deletedIds.has(item.id))found.set(item.id,item);
    }
    return [...found.values()];
}
items.splice(0,items.length,...hydrateProducts(savedState));
items.forEach(item=>{
    const v=overrides[item.id];
    if (!v || typeof v !== 'object') return;
    if (typeof v.name==='string' && v.name.trim()) item.name=v.name.trim().slice(0,180);
    if (v.price!==undefined) item.price=safePrice(v.price);
    if (typeof v.url==='string' && validUrl(v.url)) item.url=v.url;
    if (typeof v.cat==='string' && (builtinNames.includes(v.cat)||customCategories.some(c=>c.name===v.cat))) item.cat=v.cat;
    if (typeof v.q==='string') item.q=v.q;
    if (ITEM_PRIORITIES.includes(v.priority)) item.priority=v.priority;
    if (validTargetMonth(v.targetMonth)) item.targetMonth=v.targetMonth;
});
function initialContribution(state) {
    // Community users start with no PC contribution. A saved or imported
    // contribution is used exactly as entered, including explicit zero.
    if (state && state.contributed !== undefined && state.contributed !== null)
        return safePrice(state.contributed);
    return 0;
}
let contributed=initialContribution(savedState);
let contributionEdited=savedState.contributionEdited===true;
let contributionScope=['pc','nonpc','all','category'].includes(savedState.contributionScope)?savedState.contributionScope:'pc';
let contributionCategory=String(savedState.contributionCategory||'Setup');
let filter = 'All';
const future=$('future'), filtersEl=$('filters'), itemsEl=$('items');
const photoCache=new Map();
let photoDBPromise;
function openPhotoDB() {
    if (!('indexedDB' in window)) return Promise.reject(new Error('Image database unavailable'));
    if (!photoDBPromise) photoDBPromise=new Promise((resolve,reject)=>{
        const req=indexedDB.open('pc-gaming-setup-photos',1);
        req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('photos'))req.result.createObjectStore('photos');};
        req.onsuccess=()=>resolve(req.result);
        req.onerror=()=>reject(req.error||new Error('Cannot open image database'));
    });
    return photoDBPromise;
}
async function fromDB(id) {
    const db=await openPhotoDB();
    return new Promise((resolve,reject)=>{
        const req=db.transaction('photos','readonly').objectStore('photos').get(photoStorageKey(id));
        req.onsuccess=()=>resolve(req.result || null);
        req.onerror=()=>reject(req.error);
    });
}
async function toDB(id,blob) {
    const db=await openPhotoDB();
    return new Promise((resolve,reject)=>{
        const tx=db.transaction('photos','readwrite');
        tx.objectStore('photos').put(blob,photoStorageKey(id));
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
        tx.onabort=()=>reject(tx.error);
    });
}
async function deleteDB(id) {
    const db=await openPhotoDB();
    return new Promise((resolve,reject)=>{
        const tx=db.transaction('photos','readwrite');
        tx.objectStore('photos').delete(photoStorageKey(id));
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(tx.error);
    });
}
function blobToData(blob) {
    return new Promise((resolve,reject)=>{
        const rd=new FileReader();
        rd.onload=()=>resolve(rd.result);
        rd.onerror=()=>reject(new Error('Could not read image'));
        rd.readAsDataURL(blob);
    });
}
function dataToBlob(data) {
    const parts=String(data).split(',');
    const mime=/data:([^;]+);base64/.exec(parts[0]);
    if (!mime || parts.length!==2) throw new Error('Unsupported image format');
    const bytes=atob(parts[1]);
    const arr=new Uint8Array(bytes.length);
    for(let i=0;i<bytes.length;i++)arr[i]=bytes.charCodeAt(i);
    return new Blob([arr],{type:mime[1]});
}
function cachePhoto(id,blob) {
    const previous=photoCache.get(id);
    if (previous && previous.url) URL.revokeObjectURL(previous.url);
    photoCache.set(id,blob ? {url:URL.createObjectURL(blob),blob} : null);
}
async function getPhoto(id) {
    const scopedId=photoStorageKey(id);
    if(photoCache.has(id))return photoCache.get(id);
    let blob=null;
    try { blob=await fromDB(id); } catch (_) {}
    if (!blob) {
        const fallback=localStorage.getItem(photoFallbackKey(id));
        if(fallback){try{blob=dataToBlob(fallback);}catch(_){}}
    }
    if (photoStorageKey(id)!==scopedId) return null;
    cachePhoto(id,blob);
    return photoCache.get(id);
}
async function savePhoto(id,blob) {
    // IndexedDB avoids the tiny quota normally imposed on localStorage.
    try {
        await toDB(id,blob);
        localStorage.removeItem(photoFallbackKey(id));
    } catch (_) {
        // Fallback for older Android WebViews where IndexedDB is unavailable.
        const encoded=await blobToData(blob);
        localStorage.setItem(photoFallbackKey(id),encoded);
    }
    cachePhoto(id,blob);
}
async function removePhoto(id) {
    try { await deleteDB(id); } catch (_) {}
    localStorage.removeItem(photoFallbackKey(id));
    cachePhoto(id,null);
}
function shrinkImage(file) {
    return new Promise((resolve,reject)=>{
        if (!file.type.startsWith('image/')) return reject(new Error('Choose a picture file.'));
        if (file.size>15*1024*1024) return reject(new Error('Choose an image smaller than 15 MB.'));
        const url=URL.createObjectURL(file), image=new Image();
        image.onload=()=>{
            try {
                const ratio=Math.min(1,720/Math.max(image.naturalWidth,image.naturalHeight));
                const canvas=document.createElement('canvas');
                canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));
                canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
                const ctx=canvas.getContext('2d');
                ctx.fillStyle='#0b1220';
                ctx.fillRect(0,0,canvas.width,canvas.height);
                ctx.drawImage(image,0,0,canvas.width,canvas.height);
                canvas.toBlob(blob=>{
                    URL.revokeObjectURL(url);
                    blob ? resolve(blob) : reject(new Error('Could not process this photo.'));
                },'image/jpeg',0.76);
            } catch(err) {URL.revokeObjectURL(url);reject(err);}
        };
        image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not open the selected image. Try JPG or PNG.'));};
        image.src=url;
    });
}
function persist() {
    const state={
        checked,notes,blankPreset,currency:currentCurrency,deletedIds:[...deletedIds],
        sortOrder,purchaseView,showProductImages,
        overrides:Object.fromEntries(items.map(i=>[i.id,{name:i.name,price:i.price,cat:i.cat,q:i.q,url:i.url,priority:i.priority,targetMonth:i.targetMonth}])),
        customItems:items.filter(i=>!originalIds.has(i.id)),
        categories:customCategories,
        contributed,contributionEdited,contributionScope,contributionCategory,
        saved:$('saved').value,
        future:future.checked,
        filter
    };
    try { localStorage.setItem(presetStateKey(),JSON.stringify(state)); }
    catch (e) { alert('Device storage is full. Export a backup and free some space.'); }
}
function categoryOptions(select,selected) {
    select.innerHTML='';
    builtinNames.concat(customCategories.map(c=>c.name)).forEach(name=>{
        const option=document.createElement('option');
        option.value=name;
        option.textContent=name;
        select.append(option);
    });
    if (selected && [...select.options].some(o=>o.value===selected))select.value=selected;
}
function renderFilters() {
    const options=['All'].concat(builtinNames,customCategories.map(c=>c.name));
    if (!options.includes(filter))filter='All';
    filtersEl.innerHTML='';
    options.forEach(f=>{
        const b=document.createElement('button');
        b.type='button';b.textContent=f;b.classList.toggle('active',filter===f);
        b.onclick=()=>{filter=f;renderFilters();render();persist();if(typeof window.goToPage==='function')window.goToPage('items');};
        filtersEl.append(b);
    });
    categoryOptions($('newCategory'),$('newCategory').value || 'PC');
}
function refreshContributionCategories(){
    const select=$('contributionCategory'),wrap=$('contributionCategoryWrap');
    if(!select||!wrap)return;
    select.replaceChildren();
    for(const name of builtinNames.concat(customCategories.map(c=>c.name))){
        const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option);
    }
    if(![...select.options].some(o=>o.value===contributionCategory))contributionCategory='Setup';
    select.value=contributionCategory;
    wrap.hidden=contributionScope!=='category';
}
function restoreControls() {
    $('saved').value=savedState.saved===undefined?'0':String(safePrice(savedState.saved));
    $('contributed').value=String(contributed);
    $('contributionScope').value=contributionScope;
    refreshContributionCategories();
    future.checked=!!savedState.future;
    const available=['All'].concat(builtinNames,customCategories.map(c=>c.name));
    filter=available.includes(savedState.filter)?savedState.filter:'All';
}
function productIllustration(item) {
    const art={cpu:['CPU','▰'],mb:['MOTHERBOARD','▦'],gpu:['GRAPHICS CARD','▰'],ram:['DDR5 RAM','▥'],ssd:['NVMe SSD','▰'],aio:['360mm AIO','◉'],psu:['POWER SUPPLY','▰'],case:['PC CASE','▯'],main:['QHD 180Hz MONITOR','▱'],second:['IPS 200Hz MONITOR','▱'],desk:['GAMING DESK','▱'],mat:['DESK MAT','▱'],keyboard:['RGB KEYBOARD','▤'],mouse:['RGB MOUSE','◖'],headset:['GAMING HEADSET','♫'],arm:['MONITOR ARM','⌁'],chair:['GAMING CHAIR','♜']}[item.id] || ['YOUR PRODUCT','▰'];
    const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1c2b44"/><stop offset="1" stop-color="#0b1220"/></linearGradient></defs><rect width="640" height="360" rx="24" fill="url(#g)"/><circle cx="320" cy="145" r="92" fill="#15243a" stroke="#3b82f6" stroke-width="3"/><text x="320" y="178" text-anchor="middle" font-size="100" fill="#7dd3fc" font-family="Arial,sans-serif">'+esc(art[1])+'</text><text x="320" y="285" text-anchor="middle" font-size="25" font-weight="700" fill="#f3f4f6" font-family="Arial,sans-serif">'+esc(art[0])+'</text><text x="320" y="320" text-anchor="middle" font-size="16" fill="#aab4c5" font-family="Arial,sans-serif">'+esc(item.name.slice(0,52))+'</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function displayPhoto(img,id) {
    getPhoto(id).then(photo=>{
        if(photo && img.isConnected && img.dataset.productId===id)img.src=photo.url;
    }).catch(()=>{});
}
function buildEditForm(item,card,button) {
    const existing=card.querySelector('.editform');
    if (existing){existing.remove();button.textContent='Edit item';return;}
    const form=document.createElement('form');
    form.className='editform';
    form.innerHTML='<label>Product name<input name="name" maxlength="180" required></label>'+
        '<label>Price ('+currentCurrency+')<input name="price" type="number" min="0" step="any" required></label>'+
        '<label>Listing URL<input name="url" type="url" placeholder="https://..."></label>'+
        '<label>Category<select name="cat"></select></label>'+
        '<label>Priority<select name="priority"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>'+
        '<label>Target purchase month (optional)<input name="targetMonth" type="month"></label>'+
        '<label>Change product picture<input name="photo" type="file" accept="image/*"></label>'+
        '<div class="itemtools"><button type="button" class="removePhoto">Remove picture</button>'+
        '<button type="submit" class="active">Save changes</button><button type="button" class="cancelEdit">Cancel</button><button type="button" class="deleteItem">Delete item</button></div><div class="status" role="status"></div>';
    const name=form.querySelector('[name=name]'),price=form.querySelector('[name=price]'),
        url=form.querySelector('[name=url]'),cat=form.querySelector('[name=cat]'),
        photo=form.querySelector('[name=photo]'),status=form.querySelector('.status'),priority=form.querySelector('[name=priority]'),targetMonth=form.querySelector('[name=targetMonth]');
    name.value=item.name;price.value=item.price;url.value=item.url||'';categoryOptions(cat,item.cat);priority.value=item.priority||'medium';targetMonth.value=item.targetMonth||'';
    let removeRequested=false;
    form.querySelector('.removePhoto').onclick=()=>{
        removeRequested=true;photo.value='';status.textContent='Picture will be removed when you save.';
    };
    form.querySelector('.cancelEdit').onclick=()=>{form.remove();button.textContent='Edit item';};
    form.querySelector('.deleteItem').onclick=async()=>{
        if(!await window.glassConfirm('Permanently delete "'+item.name+'" from this preset? Its picture, checkmark and notes will also be removed.'))return;
        try{await removeItem(item.id);persist();render();window.dispatchEvent(new Event('item-saved'));}
        catch(err){status.textContent='Could not delete product: '+err.message;}
    };
    form.onsubmit=async e=>{
        e.preventDefault();
        const nextName=name.value.trim(), nextUrl=url.value.trim();
        if (!nextName) return alert('Enter a product name.');
        if (!validUrl(nextUrl))return alert('Use an https:// or http:// product link.');
        const submit=form.querySelector('[type=submit]');
        submit.disabled=true;status.textContent='Saving changes...';
        try {
            if (photo.files.length) await savePhoto(item.id,await shrinkImage(photo.files[0]));
            else if (removeRequested) await removePhoto(item.id);
            item.name=nextName;item.price=safePrice(price.value);item.url=nextUrl;item.cat=cat.value;item.priority=priority.value;item.targetMonth=validTargetMonth(targetMonth.value)?targetMonth.value:'';
            persist();render();
            window.dispatchEvent(new Event('item-saved'));
        } catch(err) {
            status.textContent=err.message||'Could not save picture.';
            submit.disabled=false;
        }
    };
    card.append(form);
    button.textContent='Close editor';
}
async function removeItem(id) {
    const found=items.findIndex(i=>i.id===id);
    if(found<0)return;
    await removePhoto(id);
    items.splice(found,1);
    deletedIds.add(id);
    delete checked[id];delete notes[id];
}
function renderPurchaseViews(){
    const root=$('purchaseStatusFilters');
    if(!root)return;
    root.replaceChildren();
    const choices=[
        ['all','All items'],
        ['to-buy','To buy'],
        ['purchased','Purchased']
    ];
    choices.forEach(([value,label])=>{
        const button=document.createElement('button');
        button.type='button';
        button.textContent=label;
        button.className='purchase-filter'+(purchaseView===value?' active':'');
        button.setAttribute('aria-pressed',purchaseView===value?'true':'false');
        button.onclick=()=>{
            if(purchaseView===value)return;
            purchaseView=value;
            render();
            persist();
        };
        root.append(button);
    });
}
function render() {
    itemsEl.innerHTML='';
    const search=($('searchProducts')?$('searchProducts').value:'').trim().toLocaleLowerCase();
    renderPurchaseViews();
    const visibleItems=[...items];
    if(sortOrder==='priority')visibleItems.sort((a,b)=>{
        const rank={high:0,medium:1,low:2};
        return (rank[a.priority]??1)-(rank[b.priority]??1) ||
            (a.targetMonth||'9999-12').localeCompare(b.targetMonth||'9999-12');
    });
    if(sortOrder==='name')visibleItems.sort((a,b)=>a.name.localeCompare(b.name));
    else if(sortOrder==='price-asc')visibleItems.sort((a,b)=>a.price-b.price);
    else if(sortOrder==='price-desc')visibleItems.sort((a,b)=>b.price-a.price);
    visibleItems.forEach(item=>{
        const purchased=!!checked[item.id];
        if(filter!=='All' && item.cat!==filter)return;
        if(search && !(item.name+' '+item.cat+' '+(notes[item.id]||'')).toLocaleLowerCase().includes(search))return;
        // Purchased future items remain visible in purchase history even when
        // the optional future-purchases list is hidden for regular browsing.
        if(categoryGroup(item.cat)==='future' && !future.checked && purchaseView!=='purchased')return;
        if(purchaseView==='purchased'&&!purchased)return;
        if(purchaseView==='to-buy'&&purchased)return;
        const card=document.createElement('section');
        card.className='item'+(purchased?' is-purchased':'')+(!showProductImages?' no-image':'');
        const head=document.createElement('div');head.className='itemhead';
        const checkbox=document.createElement('input');
        checkbox.type='checkbox';checkbox.checked=purchased;
        checkbox.setAttribute('aria-label','Mark '+item.name+' as purchased');
        const content=document.createElement('div');content.style.flex='1';
        const title=document.createElement('div');
        title.className='itemname'+(checkbox.checked?' strike':'');title.textContent=item.name;
        const tag=document.createElement('div');tag.className='tag';
        tag.textContent=categoryGroup(item.cat)==='future'?'Future purchase · '+item.cat:item.cat;
        const price=document.createElement('div');price.className='price';price.textContent=fmt(item.price);
        const meta=document.createElement('div');meta.className='product-meta';
        const priority=document.createElement('span');priority.className='priority-chip priority-'+(item.priority||'medium');
        priority.textContent=(item.priority||'medium').toUpperCase();
        meta.append(priority);
        if(item.targetMonth){
            const date=document.createElement('span');date.className='target-chip';
            const today=new Date(),key=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0');
            date.textContent=item.targetMonth===key?'This month':item.targetMonth;meta.append(date);
        }
        const state=document.createElement('span');
        state.className='purchase-status'+(purchased?' purchased':' to-buy');
        state.textContent=purchased?'Purchased':'To buy';
        content.append(tag,title,price,meta,state);head.append(checkbox,content);card.append(head);
        checkbox.onchange=()=>{
            checked[item.id]=checkbox.checked;
            // Recompute all budget totals and move the product between the
            // To buy / Purchased views without deleting its price or history.
            render();
            persist();
        };
        const actions=document.createElement('div');actions.className='itemtools';
        const edit=document.createElement('button');edit.type='button';
        edit.textContent='Details';edit.className='editbtn';
        edit.onclick=()=>{if(window.openItemDetails)window.openItemDetails(item.id);else buildEditForm(item,card,edit);};actions.append(edit);
        card.append(actions);
        const image=document.createElement('img');image.loading='lazy';
        image.dataset.productId=item.id;
        image.alt=item.name+' picture';image.src=productIllustration(item);
        if(showProductImages){card.insertBefore(image,head);displayPhoto(image,item.id);}
        if (item.url && validUrl(item.url)) {
            const link=document.createElement('a');
            link.href=item.url;link.target='_self';link.rel='noopener noreferrer';
            link.textContent='Open product listing';
            link.style.display='inline-block';link.style.margin='4px 0 10px';
            card.append(link);
        }
        const note=document.createElement('textarea');
        note.placeholder='Add notes, seller, warranty, link, or deal details...';
        note.value=notes[item.id]||'';
        note.setAttribute('aria-label','Notes for '+item.name);
        note.oninput=()=>{notes[item.id]=note.value;persist();};
        const noteDisclosure=document.createElement('details');noteDisclosure.className='item-note-disclosure';
        const summary=document.createElement('summary');summary.textContent='Notes';noteDisclosure.append(summary,note);
        card.append(noteDisclosure);itemsEl.append(card);
    });
    renderStats();
}
function pcRemaining(pcTotal,contribution) {
    return Math.max(0,safePrice(pcTotal)-safePrice(contribution));
}
function totals(){
    const t=BudgetModel.compute(items,checked,categoryGroup,contributed,contributionScope,contributionCategory);
    // Compatibility with historical summary hooks, now replaced with dynamic rows.
    const total=name=>t.rows.filter(x=>x.name===name).reduce((v,r)=>v+r.remaining,0);
    return {...t,main:total('Monitor'),desk:total('Desk')+total('Accessory'),
       chair:total('Chair'),other:t.setup-total('Monitor')-total('Desk')-total('Accessory')-total('Chair')};
}
function renderStats() {
    if($('newPriceCurrency'))$('newPriceCurrency').textContent=currentCurrency;
    if($('contributedCurrency'))$('contributedCurrency').textContent=currentCurrency;
    const t=totals();
    $('pcTotal').textContent=fmt(t.rows.filter(r=>r.group==='pc').reduce((x,r)=>x+r.total,0));$('dadContribution').textContent=fmt(t.contributed);
    const list=$('dynamicCategoryTotals');
    if(list){
        list.replaceChildren();
        for(const r of t.rows){
            const row=document.createElement('div');
            row.className='row summaryline';
            const label=document.createElement('span'),value=document.createElement('strong');
            label.textContent=r.name+(r.group==='future'?' · Future':'');
            value.textContent=fmt(r.remaining);
            row.append(label,value);list.append(row);
        }
        if(!t.rows.length){
            const empty=document.createElement('p');empty.className='muted small';
            empty.textContent='Add products to see your breakdown.';list.append(empty);
        }
    }
    const unallocated=$('contributionUnused');
    if(unallocated)unallocated.textContent=t.unallocated>0?'Unallocated contribution: '+fmt(t.unallocated):'';
    const categorySelect=$('contributionCategory');
    if(categorySelect&&categorySelect.options.length!==builtinNames.length+customCategories.length)
        refreshContributionCategories();
    $('purchasedTotal').textContent=fmt(t.purchasedTotal);
    $('purchasedCount').textContent=t.purchasedCount+' item'+(t.purchasedCount===1?'':'s');
    $('toBuyCount').textContent=t.remainingCount+' item'+(t.remainingCount===1?'':'s');
    if($('dashboardPurchased'))$('dashboardPurchased').textContent=fmt(t.purchasedTotal);
    if($('dashboardRemainingItems'))$('dashboardRemainingItems').textContent=String(t.remainingCurrent);
    if($('dashboardSaved'))$('dashboardSaved').textContent=fmt(safePrice($('saved').value));
    const candidates=items.filter(i=>!checked[i.id]&&categoryGroup(i.cat)!=='future');
    const priorityRank={high:0,medium:1,low:2};
    candidates.sort((a,b)=>(priorityRank[a.priority]??1)-(priorityRank[b.priority]??1) ||
        (a.targetMonth||'9999-12').localeCompare(b.targetMonth||'9999-12'));
    const pick=candidates[0],next=$('nextPurchase');
    if(next){
        next.hidden=!pick;
        if(pick){
            $('nextPurchaseName').textContent=pick.name;
            $('nextPurchasePrice').textContent=fmt(pick.price);
            $('nextPurchaseCategory').textContent=pick.cat+' · '+(pick.priority||'medium')+' priority';
            next.onclick=()=>{if(window.openItemDetails)window.openItemDetails(pick.id);else if(window.goToPage)window.goToPage('items');};
        }
    }
    const note=$('contributionMessage');
    if(note){
        note.textContent=t.pc===0
            ? 'No PC parts left to buy. Contribution remains unchanged; adjust it if any funds were spent.'
            : t.contributed>t.pc
                ? 'Available contribution exceeds your remaining PC cost. The extra is not counted toward other setup products.'
                : 'Only unchecked PC parts count toward your remaining PC cost. Keep this amount equal to your unspent PC funds.';
    }
    $('pcShare').textContent=fmt(t.share);$('pcLeft').textContent=fmt(t.share);
    $('mainTotal').textContent=fmt(t.main);$('deskTotal').textContent=fmt(t.desk);
    $('chairTotal').textContent=fmt(t.chair);$('currentGoal').textContent=fmt(t.currentGoal);
    $('fullTotal').textContent=fmt(t.full);$('goalLabel').textContent=fmt(t.currentGoal);
    $('otherTotal').textContent=fmt(t.other);$('otherRow').hidden=t.other===0;
    const amount=safePrice($('saved').value),remaining=Math.max(0,t.currentGoal-amount);
    const pctGoal=t.currentGoal?Math.min(100,amount/t.currentGoal*100):0;
    const ring=$('summaryRing');
    if(ring){
        ring.style.setProperty('--pct',pctGoal+'%');
        $('summaryRingPercent').textContent=Math.round(pctGoal)+'%';
        $('summaryRingGoal').textContent=fmt(remaining);
    }
    const groups=$('dashboardGroups');
    if(groups){
        groups.replaceChildren();
        for(const group of ['pc','setup','future']){
            const active=items.filter(i=>categoryGroup(i.cat)===group);
            const bought=active.filter(i=>checked[i.id]).length;
            const tile=document.createElement('button');tile.type='button';tile.className='group-tile';
            const tileHeader=document.createElement('span');tileHeader.className='group-tile-header';
            const glyph=document.createElement('span');glyph.className='panel-icon';
            const glyphSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
            glyphSvg.setAttribute('viewBox','0 0 24 24');
            glyphSvg.setAttribute('aria-hidden','true');
            const use=document.createElementNS('http://www.w3.org/2000/svg','use');
            use.setAttribute('href','#ui-'+({pc:'cpu',setup:'monitor',future:'rocket'}[group]));
            glyphSvg.append(use);glyph.append(glyphSvg);
            const title=document.createElement('strong');title.textContent=group.toUpperCase();
            tileHeader.append(glyph,title);
            const count=document.createElement('small');count.textContent=bought+'/'+active.length+' purchased';
            const line=document.createElement('span');line.className='group-line';
            line.style.width=(active.length?Math.max(8,Math.round(bought/active.length*100)):8)+'%';
            tile.append(tileHeader,count,line);
            tile.onclick=()=>{
                filter=group==='pc'?'PC':group==='setup'?'Setup':'Future';
                if(group==='future')future.checked=true;
                renderFilters();render();persist();
                if(window.goToPage)window.goToPage('items');
            };
            groups.append(tile);
        }
    }
    const pct=t.currentGoal?Math.min(100,amount/t.currentGoal*100):0;
    $('savedLabel').textContent=fmt(amount);
    $('progress').max=Math.max(1,t.currentGoal);
    $('progress').value=Math.min(amount,t.currentGoal);
    $('percent').textContent=pct.toFixed(1)+'% saved';
    $('remaining').textContent=fmt(remaining)+' left';
    $('count').textContent=t.purchasedCurrent+' purchased · '+t.remainingCurrent+' left to buy (current setup)';
}
restoreControls();
renderFilters();
$('categoryForm').onsubmit=e=>{
    e.preventDefault();
    const name=$('catName').value.trim().slice(0,48),group=$('catGroup').value;
    if(!name)return;
    if(builtinNames.concat(customCategories.map(c=>c.name)).some(x=>x.toLowerCase()===name.toLowerCase()))
        return alert('That category already exists.');
    customCategories.push({name,group});
    $('catName').value='';
    renderFilters();
    categoryOptions($('newCategory'),name);
    render();persist();
    $('catMessage').textContent='Category added: '+name;
    refreshContributionCategories();
    window.dispatchEvent(new CustomEvent('category-created',{detail:{name}}));
};
$('addProductForm').onsubmit=async e=>{
    e.preventDefault();
    const form=$('addProductForm'),name=$('newName').value.trim(),price=$('newPrice').value;
    const url=$('newUrl').value.trim(),cat=$('newCategory').value;
    if (!name) return alert('Enter a product name.');
    if (!validUrl(url))return alert('Use an https:// or http:// product link.');
    const id='custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
    const submit=form.querySelector('[type=submit]');submit.disabled=true;
    $('addMessage').textContent='Adding product...';
    try {
        if($('newPhoto').files.length) await savePhoto(id,await shrinkImage($('newPhoto').files[0]));
        else if(window.ProductLinkImport&&window.ProductLinkImport.photoFor(url))
            await savePhoto(id,window.ProductLinkImport.photoFor(url));
        items.push({id,name:name.slice(0,180),price:safePrice(price),url,cat,q:name.slice(0,180),
            priority:ITEM_PRIORITIES.includes($('newPriority').value)?$('newPriority').value:'medium',
            targetMonth:validTargetMonth($('newTargetMonth').value)?$('newTargetMonth').value:''});
        if($('newPurchased').checked)checked[id]=true;
        const selected=cat;
        form.reset();
        $('newPriority').dispatchEvent(new Event('change',{bubbles:true}));
        renderFilters();
        categoryOptions($('newCategory'),selected);
        filter='All';renderFilters();persist();render();
        $('addMessage').textContent='Product added.';
        window.dispatchEvent(new Event('product-created'));
    } catch(err) {
        $('addMessage').textContent=err.message||'Could not add the product.';
    } finally { submit.disabled=false; }
};
future.onchange=()=>{render();persist();};
if($('searchProducts'))$('searchProducts').addEventListener('input',render);
$('contributionScope').addEventListener('change',event=>{
    contributionScope=event.target.value;
    refreshContributionCategories();renderStats();persist();
});
$('contributionCategory').addEventListener('change',event=>{
    contributionCategory=event.target.value;renderStats();persist();
});
$('saved').oninput=()=>{renderStats();persist();};
function syncPCContribution() {
    const input=$('contributed');
    contributionEdited=true;
    // Let people clear the field mid-edit while treating the empty value as 0.
    // Clamp invalid or negative values before they are stored.
    contributed=safePrice(input.value);
    renderStats();
    persist();
}
$('contributed').addEventListener('input',syncPCContribution);
$('contributed').addEventListener('change',()=>{
    const input=$('contributed');
    const normalized=String(contributed);
    if(input.value!==normalized)input.value=normalized;
    syncPCContribution();
});
function copyText() {
    return 'MY PC & GAMING SETUP CHECKLIST\nAvailable contribution ('+contributionScope+'): '+fmt(contributed)+
        '\nPC left to save: '+fmt(totals().share)+'\nRemaining savings target: '+fmt(totals().currentGoal)+
        '\nAlready purchased: '+fmt(totals().purchasedTotal)+'\nStill to buy: '+fmt(totals().full)+'\n\n'+
        items.map(i=>(checked[i.id]?'[x] ':'[ ] ')+i.name+' — '+fmt(i.price)+
            (i.url?'\nListing: '+i.url:'')+(notes[i.id]?'\nNotes: '+notes[i.id]:'')).join('\n')+
        '\n\nSaved toward remaining goal: '+fmt(safePrice($('saved').value));
}
$('copy').onclick=async()=>{
    const btn=$('copy');
    try {
        if(window.AndroidClipboard&&typeof AndroidClipboard.copy==='function'){
            if(!AndroidClipboard.copy(copyText()))throw new Error('Native clipboard unavailable');
        }else if(navigator.clipboard&&navigator.clipboard.writeText){
            await navigator.clipboard.writeText(copyText());
        }else{
            const field=document.createElement('textarea');
            field.value=copyText();field.style.position='fixed';field.style.opacity='0';
            document.body.append(field);field.focus();field.select();
            const ok=document.execCommand('copy');field.remove();
            if(!ok)throw new Error('Clipboard unavailable');
        }
        btn.textContent='Copied';
    }catch(error){
        btn.textContent='Copy unavailable';
        alert('Could not copy to clipboard on this device.');
    }
    setTimeout(()=>btn.textContent='Copy checklist + notes',1600);
};
$('reset').onclick=async()=>{
    if(!await window.glassConfirm('Clear your checkmarks, notes and savings tracker? Products, prices, pictures, categories and contributions will be kept.'))return;
    Object.keys(checked).forEach(id=>delete checked[id]);
    Object.keys(notes).forEach(id=>delete notes[id]);
    $('saved').value='0';
    purchaseView='all';
    render();persist();
};
$('export').onclick=async()=>{
    const btn=$('export');btn.disabled=true;btn.textContent='Preparing backup...';
    try {
        const photos={};
        for(const item of items) {
            const photo=await getPhoto(item.id);
            if (photo && photo.blob) photos[item.id]=await blobToData(photo.blob);
        }
        const data={version:5,items,checked,notes,categories:customCategories,currency:currentCurrency,sortOrder,purchaseView,showProductImages,
            deletedIds:[...deletedIds],blankPreset,contributed,contributionScope,contributionCategory,planner:window.PersonalPlanner?window.PersonalPlanner.exportState():null,saved:$('saved').value,future:future.checked,filter,photos};
        const backupText=JSON.stringify(data,null,2);
        if(window.AndroidBackup && typeof window.AndroidBackup.saveJson==='function') {
            window.AndroidBackup.saveJson(backupText);
        } else {
            const blob=new Blob([backupText],{type:'application/json'});
            const url=URL.createObjectURL(blob),a=document.createElement('a');
            a.href=url;a.download='pc-gaming-setup-backup.json';a.click();
            setTimeout(()=>URL.revokeObjectURL(url),60000);
        }
    } catch(err){alert('Could not prepare backup: '+err.message);}
    finally{btn.disabled=false;btn.textContent='Export backup';}
};
$('import').onclick=()=>$('importFile').click();
$('importFile').onchange=async e=>{
    const file=e.target.files && e.target.files[0];
    if(!file)return;
    try {
        const data=JSON.parse(await file.text());
        if(!Array.isArray(data.items))throw Error('Invalid backup file.');
        if(!await window.glassConfirm('Import this backup? It will replace your current list, edits and savings.'))return;
        customCategories.splice(0);
        if(Array.isArray(data.categories)){
            data.categories.forEach(cat=>{
                if(!cat||typeof cat.name!=='string')return;
                const name=cat.name.trim().slice(0,48);
                if(!name||!['pc','setup','future'].includes(cat.group)||
                   builtinNames.concat(customCategories.map(x=>x.name)).some(x=>x.toLowerCase()===name.toLowerCase()))return;
                customCategories.push({name,group:cat.group});
            });
        }
        migrateLegacyCategories({customItems:data.items});
        const byId=new Map();
        data.items.forEach(raw=>{
            const item=normalizeProduct(raw);
            if(item)byId.set(item.id,item);
        });
        deletedIds.clear();
        if(Array.isArray(data.deletedIds))data.deletedIds.forEach(id=>deletedIds.add(String(id)));
        else originalIds.forEach(id=>{if(!byId.has(id))deletedIds.add(id);});
        blankPreset=typeof data.blankPreset==='boolean'?data.blankPreset:(byId.size===0);
        const restored=(blankPreset?[]:originalItems).filter(item=>!deletedIds.has(item.id)).map(item=>byId.get(item.id)||JSON.parse(JSON.stringify(item)));
        byId.forEach((item,id)=>{if(!deletedIds.has(id)&&!restored.some(x=>x.id===id))restored.push(item);});
        items.splice(0,items.length,...restored);
        Object.keys(checked).forEach(id=>delete checked[id]);
        Object.keys(notes).forEach(id=>delete notes[id]);
        Object.assign(checked,data.checked||{});
        Object.assign(notes,data.notes||{});
        currentCurrency=isCurrency(data.currency)?data.currency:'PKR';
        sortOrder=SORT_ORDERS.includes(data.sortOrder)?data.sortOrder:'default';
        purchaseView=PURCHASE_VIEWS.includes(data.purchaseView)?data.purchaseView:'all';
        showProductImages=data.showProductImages!==false;
        contributionEdited=data.contributed!==undefined;
        contributed=initialContribution({contributed:data.contributed,contributionEdited,blankPreset,customItems:restored});
        contributionScope=['pc','nonpc','all','category'].includes(data.contributionScope)?data.contributionScope:'pc';
        contributionCategory=String(data.contributionCategory||'Setup');
        $('contributionScope').value=contributionScope;
        refreshContributionCategories();
        if(data.planner&&window.PersonalPlanner&&await window.glassConfirm('Restore the global salary planner from this backup? This replaces the planner currently stored on this device.'))window.PersonalPlanner.importState(data.planner);
        $('contributed').value=contributed;
        $('saved').value=safePrice(data.saved);
        future.checked=!!data.future;
        filter=String(data.filter||'All');
        if(data.photos&&typeof data.photos==='object'){
            for(const [id,value] of Object.entries(data.photos)){
                if (items.some(i=>i.id===id)&&typeof value==='string'&&value.startsWith('data:image/'))
                    await savePhoto(id,dataToBlob(value));
            }
        }
        renderFilters();persist();render();
        window.dispatchEvent(new Event('backup-restored'));
        alert('Backup imported successfully into this preset.');
    } catch(err){alert('Could not import backup: '+(err.message||'Invalid data'));}
    e.target.value='';
};

function clearPhotoCache() {
    for(const entry of photoCache.values())if(entry&&entry.url)URL.revokeObjectURL(entry.url);
    photoCache.clear();
}
function loadPresetIntoApp(id) {
    if(!presetIndex.presets.some(x=>x.id===id))throw new Error('Preset not found');
    persist();
    clearPhotoCache();
    activePresetId=id;
    presetIndex.active=id;savePresetIndex();
    const state=loadSaved();
    blankPreset=!!state.blankPreset;
    currentCurrency=isCurrency(state.currency)?state.currency:(isCurrency(localStorage.getItem('pc-gaming-install-currency-v1'))?localStorage.getItem('pc-gaming-install-currency-v1'):'PKR');
    deletedIds.clear();
    if(Array.isArray(state.deletedIds))state.deletedIds.forEach(id=>deletedIds.add(String(id)));
    sortOrder=SORT_ORDERS.includes(state.sortOrder)?state.sortOrder:'default';
    purchaseView=PURCHASE_VIEWS.includes(state.purchaseView)?state.purchaseView:'all';
    showProductImages=state.showProductImages!==false;
    items.splice(0,items.length);
    customCategories.splice(0);
    if(Array.isArray(state.categories)) state.categories.forEach(c=>{
        if(!c||typeof c.name!=='string'||!['pc','setup','future'].includes(c.group))return;
        const name=c.name.trim().slice(0,48);
        if(name&& !builtinNames.concat(customCategories.map(x=>x.name)).some(x=>x.toLowerCase()===name.toLowerCase()))
            customCategories.push({name,group:c.group});
    });
    migrateLegacyCategories(state);
    items.splice(0,items.length,...hydrateProducts(state));
    for(const key of Object.keys(checked))delete checked[key];
    for(const key of Object.keys(notes))delete notes[key];
    if(state.checked && typeof state.checked==='object')Object.assign(checked,state.checked);
    if(state.notes && typeof state.notes==='object')Object.assign(notes,state.notes);
    contributionEdited=state.contributionEdited===true;
    contributed=initialContribution({...state,blankPreset});
    contributionScope=['pc','nonpc','all','category'].includes(state.contributionScope)?state.contributionScope:'pc';
    contributionCategory=String(state.contributionCategory||'Setup');
    $('contributionScope').value=contributionScope;refreshContributionCategories();
    $('contributed').value=String(contributed);
    $('saved').value=String(safePrice(state.saved));
    future.checked=!!state.future;
    filter=String(state.filter||'All');
    renderFilters();
    render();
    persist();
}
function createEmptyPreset(id) {
    localStorage.setItem(presetStateKey(id),JSON.stringify({
        blankPreset:true,checked:{},notes:{},overrides:{},customItems:[],categories:[],deletedIds:[],currency:currentCurrency,
        sortOrder:'default',purchaseView:'all',showProductImages:true,
        contributed:0,contributionEdited:false,saved:'0',future:false,filter:'All'
    }));
}

render();
persist();
