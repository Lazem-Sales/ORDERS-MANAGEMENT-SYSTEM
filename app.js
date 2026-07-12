// ═══════════ FIREBASE CONFIG ═══════════
const firebaseConfig = {
  apiKey: "AIzaSyAyWPs80w3tpvfjFO0-OyxJBJyZyLnlkiE",
  authDomain: "order-management-cef5a.firebaseapp.com",
  projectId: "order-management-cef5a",
  storageBucket: "order-management-cef5a.firebasestorage.app",
  messagingSenderId: "969684877727",
  appId: "1:969684877727:web:ee4be1f8bfdef3b3d93daa"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ═══════════ STATE ═══════════
let currentUser = null;
let orders = [];
let cloudOrders = [];
let pendingOrders = [];
try{pendingOrders=JSON.parse(localStorage.getItem('lazem_pending')||'[]');}catch(e){pendingOrders=[];}
function persistPending(){localStorage.setItem('lazem_pending',JSON.stringify(pendingOrders));}
function mergeOrders(){orders=[...pendingOrders.map(p=>({...p,_pending:true})),...cloudOrders];}
mergeOrders();
let openOrderId = null;
let currentSvc = null;
let authMode = 'login'; // or 'signup'
let unsubscribeOrders = null;

// ═══════════ BACKGROUND IMAGES ═══════════
function injectBgImages(){
  if(typeof IMG1==='undefined') return;
  const bg=document.getElementById('lazem-bg-global');
  if(bg) bg.style.backgroundImage='url('+IMG1+')';
  const lbg=document.getElementById('lazem-login-bg');
  if(lbg) lbg.style.backgroundImage='url('+IMG1+')';
  const hbg=document.querySelector('.dash-hero-bg');
  if(hbg) hbg.style.backgroundImage='url('+IMG1+')';
  // Cinematic hero layers
  const cbg=document.getElementById('cineBg');
  if(cbg) cbg.style.backgroundImage='url('+IMG1+')';
  const bab=document.getElementById('baBg');
  if(bab) bab.style.backgroundImage='url('+IMG1+')';
  const bam=document.getElementById('baMedics');
  if(bam&&typeof IMG_MEDICS!=='undefined') bam.src=IMG_MEDICS;
}
document.addEventListener('DOMContentLoaded',function(){
  injectBgImages();
  if(typeof LOGO_SRC!=='undefined'){
    ['hdrLogo','loginLogo','heroLogo'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.src=LOGO_SRC;
    });
  }
});

// ═══════════ GUEST LOGIN (no account needed) ═══════════
function doLogin(){
  const name=document.getElementById('loginNameInput').value.trim();
  if(!name){
    const inp=document.getElementById('loginNameInput');
    inp.classList.add('shake');
    setTimeout(()=>inp.classList.remove('shake'),500);
    return;
  }
  currentUser={uid:'guest_'+name.toLowerCase().replace(/\s+/g,'_'),name:name};
  localStorage.setItem('lazem_guest_name',name);
  document.getElementById('hdrUser').textContent=currentUser.name+' — خروج';
  mergeOrders();
  subscribeOrders();
  showPage('dashboard');
}
function logout(){
  currentUser=null;
  localStorage.removeItem('lazem_guest_name');
  if(unsubscribeOrders){unsubscribeOrders();unsubscribeOrders=null;}
  orders=[];
  document.getElementById('loginNameInput').value='';
  showPage('login');
}
// Auto-login if name saved
document.addEventListener('DOMContentLoaded',function(){
  const saved=localStorage.getItem('lazem_guest_name');
  if(saved){
    currentUser={uid:'guest_'+saved.toLowerCase().replace(/\s+/g,'_'),name:saved};
    document.getElementById('hdrUser').textContent=currentUser.name+' — خروج';
    subscribeOrders();
    showPage('dashboard');
  }
});

// ═══════════ FIRESTORE ORDERS (realtime) ═══════════
function subscribeOrders(){
  if(unsubscribeOrders) unsubscribeOrders();
  unsubscribeOrders=db.collection('orders').orderBy('createdAt','desc')
    .onSnapshot(snap=>{
      cloudOrders=snap.docs.map(d=>({id:d.id,...d.data()}));
      mergeOrders();
      if(document.getElementById('page-dashboard').classList.contains('active')){
        renderDashboard();
      }
      trySyncPending();
    },err=>{
      console.error('Firestore error:',err);
      showToast('⚠️ خطأ في الاتصال بقاعدة البيانات');
    });
}

// ═══════════ NAVIGATION ═══════════
let boardAnimPlayed=false;
function playBoardAnim(){
  if(boardAnimPlayed)return;
  boardAnimPlayed=true;
  const ba=document.getElementById('boardAnim');
  if(!ba)return;
  ba.classList.add('show');
  setTimeout(()=>{ba.classList.remove('show');ba.style.display='none';},3450);
}
function showPage(page){
  if(page!=='login'&&!currentUser){page='login';}
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  const tab=document.getElementById('tab-'+page);
  if(tab) tab.classList.add('active');
  if(page==='dashboard'){renderDashboard();playBoardAnim();}
  window.scrollTo({top:0,behavior:'smooth'});
}

// ═══════════ SERVICE PICKER ═══════════
function pickSvc(svc,btn){
  currentSvc=svc;
  document.querySelectorAll('.svc-btn').forEach(b=>b.classList.remove('sel'));
  btn.classList.add('sel');
  ['contract','events','projects','training'].forEach(s=>document.getElementById('sec-'+s).classList.remove('show'));
  document.getElementById('sec-client').classList.add('show');
  document.getElementById('sec-'+svc).classList.add('show');
  document.getElementById('submit-wrap').style.display='block';
  updateCodePreview();
  setTimeout(()=>document.getElementById('sec-client').scrollIntoView({behavior:'smooth',block:'start'}),100);
}

function pick1(grp,btn,cls){
  btn.closest('.ch').querySelectorAll('.cb').forEach(b=>b.className='cb');
  btn.className='cb '+cls;
}
function toggleMulti(btn){btn.classList.toggle('sel');updateCodePreview();}
function toggleCity(btn,groupId){
  btn.classList.toggle('sel');
  if(btn.classList.contains('city-other')){
    const otherId=groupId.replace('-cities','')+'-cities-other';
    const inp=document.getElementById(otherId);
    if(inp){inp.style.display=btn.classList.contains('sel')?'block':'none';if(btn.classList.contains('sel'))inp.focus();}
  }
}
function getCities(groupId){
  const el=document.getElementById(groupId);if(!el)return'';
  const selected=[...el.querySelectorAll('.city-cb.sel')].map(b=>b.textContent.trim());
  const otherId=groupId.replace('-cities','')+'-cities-other';
  const inp=document.getElementById(otherId);
  if(inp&&inp.style.display!=='none'&&inp.value.trim()){
    const idx=selected.indexOf('أخرى');if(idx!==-1)selected[idx]=inp.value.trim();else selected.push(inp.value.trim());
  }
  return selected.join('، ');
}



function chkEvAccom(){
  const d=parseInt(document.getElementById('e-days').value)||0;
  const cities=getCities('e-cities');
  const out=cities&&!cities.includes('الرياض');
  document.getElementById('e-accom-wrap').className='cond s2'+(d>14&&out?' show':'');
}
function chkTrainees(){
  const n=parseInt(document.getElementById('tr-count').value)||0;
  const note=document.getElementById('tr-note');
  if(n>20){note.textContent=`⚠️ ${n} متدرب — يتطلب ${Math.ceil(n/20)} جلسات`;note.style.display='block';}
  else note.style.display='none';
}
function getSelected(grpId){
  const el=document.getElementById(grpId);if(!el)return'';
  const a=el.querySelector('.cb.t,.cb.g,.cb.r,.cb.a,.cb.n');return a?a.textContent.trim():'';
}
function v(id){const el=document.getElementById(id);return el?el.value.trim():'';}

// ═══════════ LZM CODE STRUCTURE (per Coding Standard v0.1) ═══════════
// LZM-[Classification]-[Level]-[Client]-[Year]  e.g. LZM-FMC-A-KAP-25
function getProjectSvcTypes(){
  const sec=document.getElementById('sec-projects');if(!sec)return[];
  return[...sec.querySelectorAll('.cb.multi.sel')].map(b=>b.textContent.trim());
}
function getClassCode(){
  if(currentSvc==='contract')return'MT';
  if(currentSvc==='events')return'FMC';
  if(currentSvc==='training')return'TRG';
  if(currentSvc==='projects'){
    const t=getProjectSvcTypes();
    const hasClinic=t.some(x=>x.includes('عيادة'));
    const hasAmb=t.some(x=>x.includes('إسعاف'));
    if(hasClinic&&hasAmb)return'CWA';
    if(hasClinic)return'CLI';
    return'FMC';
  }
  return'•••';
}
const LEVELS={}; // selected equipment level per prefix: ev/pr/ct

function setLvl(prefix,val,btn){
  LEVELS[prefix]=val;
  document.querySelectorAll('[id^="'+prefix+'-lc-"]').forEach(c=>c.className='level-card');
  btn.className='level-card sel-lvl';
  updateCodePreview();
}

function getLevelCode(){
  if(currentSvc==='events')   return LEVELS['ev']||'NA';
  if(currentSvc==='projects') return LEVELS['pr']||'NA';
  if(currentSvc==='contract') return LEVELS['ct']||'NA';
  if(currentSvc==='training'){
    // Per standard: FA1=توعية, FA2=إسعافات+CPR+AED, FA3=بيئة العمل, FS=حرائق
    if(document.getElementById('crs-aware')&&document.getElementById('crs-aware').checked)return'FA1';
    if(document.getElementById('crs-fa')&&document.getElementById('crs-fa').checked)return'FA2';
    if(document.getElementById('crs-ohs')&&document.getElementById('crs-ohs').checked)return'FA3';
    if(document.getElementById('crs-fire')&&document.getElementById('crs-fire').checked)return'FS';
    return'NA';
  }
  return'NA';
}

function getLevelLabel(code){
  const map={'B':'B — أساسي (BLS)','B+':'B+ — أساسي معزز','A':'A — متقدم (ALS)','A+':'A+ — متقدم شامل','FA1':'FA1 — توعية إسعافات أولية','FA2':'FA2 — إسعافات أولية + CPR + AED','FA3':'FA3 — إسعافات بيئة العمل','FS':'FS — السلامة من الحرائق','FW':'FW — مشرف سلامة','NA':'NA'};
  return map[code]||code;
}

function getYearCode(){
  let d=null;
  if(currentSvc==='events'&&v('e-start'))d=new Date(v('e-start'));
  else if(currentSvc==='projects'&&v('p-start'))d=new Date(v('p-start'));
  if(!d||isNaN(d))d=new Date();
  return String(d.getFullYear()).slice(-2);
}

function buildLzmCode(){
  const cls=currentSvc?getClassCode():'•••';
  const lvl=currentSvc?getLevelCode():'••';
  const cli=v('f-client-code')||'•••';
  const yr=getYearCode();
  return `LZM-${cls}-${lvl}-${cli}-${yr}`;
}

// Sequential suffix per standard: if same client+class+level+year exists → -01/-02...
function finalizeLzmCode(base){
  const dupes=orders.filter(o=>(o.lzmCode||'').startsWith(base));
  if(dupes.length===0)return base;
  return base+'-'+String(dupes.length+1).padStart(2,'0');
}

function updateCodePreview(){
  const el=document.getElementById('codePreviewValue');
  if(el) el.textContent=buildLzmCode();
}

// ═══════════ SAVE ORDER (to Firestore) ═══════════
async function saveOrder(){
  const clientName=v('f-client-name');
  if(!clientName){showToast('⚠️ أدخل اسم العميل');document.getElementById('f-client-name').focus();return;}
  if(!currentSvc){showToast('⚠️ اختر نوع الخدمة');return;}
  const clientCode=v('f-client-code');
  if(!clientCode||clientCode.length<2){showToast('⚠️ أدخل رمز العميل (3 أحرف)');document.getElementById('f-client-code').focus();return;}

  const svcLabels={contract:'📋 عقود النقل',events:'🎪 فعاليات',projects:'🏗️ مشاريع',training:'📚 دورات تدريبية'};
  let details={};

  if(currentSvc==='contract'){
    details={'مستوى التجهيز':getLevelLabel(LEVELS['ct']||'NA'),'مدة العقد':getSelected('c-dur'),'المدينة':getSelected('c-city'),'اسم الجهة':v('c-company')};
  } else if(currentSvc==='events'){
    details={'مستوى التجهيز':getLevelLabel(LEVELS['ev']||'NA'),'أطباء':v('e-doctors'),'مسعفون':v('e-paramedics'),'ممرضون':v('e-nurses'),'سائقون':v('e-drivers'),'سيارات الإسعاف':v('e-ambulances'),'عدد الحضور':v('e-attendees'),'عدد الأيام':v('e-days'),'ساعات يومياً':v('e-hours'),'تاريخ البداية':v('e-start'),'المدن':getCities('e-cities'),'الموقع':v('e-loc'),'السكن':getSelected('e-accom')};
  } else if(currentSvc==='projects'){
    details={'مستوى التجهيز':getLevelLabel(LEVELS['pr']||'NA'),'طبيعة المشروع':getSelected('p-type'),'نوع الأيام':getSelected('p-dtype'),'ساعات العمل اليومية':v('p-hours'),'أيام الأسبوع':v('p-dweek'),'المدة الزمنية':v('p-dur'),'تاريخ البداية':v('p-start'),'المدن':getCities('p-cities'),'نوع الخدمة':getProjectSvcTypes().join('، '),'أطباء':v('p-doctors'),'مسعفون':v('p-paramedics'),'ممرضون':v('p-nurses'),'سائقون':v('p-drivers'),'سيارات الإسعاف':v('p-ambulances'),'السكن والإعاشة':getSelected('p-accom')};
  } else if(currentSvc==='training'){
    const courses=[];
    if(document.getElementById('crs-aware').checked)courses.push('توعية بالإسعافات الأولية (4 ساعات)');
    if(document.getElementById('crs-fa').checked)courses.push('الإسعافات الأولية (7 ساعات)');
    if(document.getElementById('crs-fire').checked)courses.push('السلامة من الحرائق (6 ساعات)');
    if(document.getElementById('crs-ohs').checked)courses.push('الصحة والسلامة المهنية (6 ساعات)');
    const n=parseInt(v('tr-count'))||0;
    const trLoc=getSelected('tr-loc');const trCity=trLoc&&trLoc.includes('خارج')?v('tr-city'):'الرياض';
    details={'مكان الدورة':trLoc+(trCity&&trLoc.includes('خارج')?' — '+trCity:''),'مقر التدريب':getSelected('tr-venue'),'نوع الاعتماد':getSelected('tr-cert'),'اللغة':getSelected('tr-lang'),'عدد المتدربين':v('tr-count'),'عدد الجلسات':n>20?Math.ceil(n/20)+' جلسات':'1 جلسة','الدورات المطلوبة':courses.join('، '),'اسم الجهة':v('tr-company')};
  }

  Object.keys(details).forEach(k=>{if(!details[k])delete details[k];});

  const order={
    id:'LOCAL-'+Date.now(),
    code:String(orders.length+1).padStart(4,'0'),
    lzmCode:finalizeLzmCode(buildLzmCode()),
    clientCode:clientCode,
    createdAt:new Date().toISOString(),
    svc:currentSvc,svcLabel:svcLabels[currentSvc],
    clientName,
    notes:v('f-client-notes'),
    details,
    addedBy:currentUser.name,
    addedByUid:currentUser.uid
  };

  // Instant local save — always succeeds
  pendingOrders.unshift(order);
  persistPending();
  mergeOrders();
  showToast('✅ تم حفظ الطلب!');
  resetForm();
  showPage('dashboard');

  // Background cloud sync (non-blocking)
  trySyncPending();
}

// ═══════════ BACKGROUND SYNC ═══════════
let syncing=false;
async function trySyncPending(){
  if(syncing||!pendingOrders.length)return;
  syncing=true;
  const queue=[...pendingOrders];
  for(const item of queue){
    try{
      const data={...item};
      const localId=data.id;
      delete data.id;
      data.createdAtLocal=data.createdAt;
      data.createdAt=firebase.firestore.FieldValue.serverTimestamp();
      const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error('T')),10000));
      await Promise.race([timeout, db.collection('orders').add(data)]);
      pendingOrders=pendingOrders.filter(p=>p.id!==localId);
      persistPending();
    }catch(e){
      break; // stop on first failure, retry later
    }
  }
  mergeOrders();
  if(document.getElementById('page-dashboard').classList.contains('active'))renderDashboard();
  syncing=false;
}
// Retry sync periodically
setInterval(trySyncPending,30000);

function resetForm(){
  currentSvc=null;
  document.querySelectorAll('.svc-btn').forEach(b=>b.classList.remove('sel'));
  ['contract','events','projects','training'].forEach(s=>document.getElementById('sec-'+s).classList.remove('show'));
  document.getElementById('sec-client').classList.remove('show');
  document.getElementById('submit-wrap').style.display='none';
  document.querySelectorAll('.form-section input,.form-section textarea').forEach(el=>el.value='');
  document.querySelectorAll('.cb').forEach(b=>b.className=b.className.includes('multi')?'cb multi':'cb');
  document.querySelectorAll('.city-cb').forEach(b=>b.classList.remove('sel'));
  document.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked=false);
  document.querySelectorAll('.level-card').forEach(c=>c.className='level-card');
  Object.keys(LEVELS).forEach(k=>delete LEVELS[k]);
  const tcw=document.getElementById('tr-city-wrap');if(tcw)tcw.style.display='none';
}

// ═══════════ DASHBOARD ═══════════
function renderDashboard(){
  const all=orders.length;
  document.getElementById('st-all').textContent=all;
  document.getElementById('st-events').textContent=orders.filter(o=>o.svc==='events').length;
  document.getElementById('st-projects').textContent=orders.filter(o=>o.svc==='projects').length;
  document.getElementById('st-training').textContent=orders.filter(o=>o.svc==='training').length;
  document.getElementById('hdrCount').textContent=all+' طلب';
  const hAll=document.getElementById('hero-all');
  const hEv=document.getElementById('hero-events');
  const hPr=document.getElementById('hero-projects');
  if(hAll)hAll.textContent=all;
  if(hEv)hEv.textContent=orders.filter(o=>o.svc==='events').length;
  if(hPr)hPr.textContent=orders.filter(o=>o.svc==='projects').length;
  renderOrders();
}

function fmtDate(ts,opts){
  if(!ts)return'...';
  const d=ts.toDate?ts.toDate():new Date(ts);
  return d.toLocaleDateString('ar-SA',opts||{day:'2-digit',month:'short',year:'numeric'});
}

function renderOrders(){
  const search=(document.getElementById('searchInput').value||'').toLowerCase();
  const svcFilter=document.getElementById('filterSvc').value;
  let filtered=orders.filter(o=>{
    const m=(o.clientName||'').toLowerCase().includes(search)||(o.addedBy||'').toLowerCase().includes(search);
    return m&&(!svcFilter||o.svc===svcFilter);
  });
  const list=document.getElementById('ordersList');
  const svcIcons={
    contract:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    events:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    projects:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    training:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  };
  if(!filtered.length){
    list.innerHTML=`<div class="empty-state"><div class="es-icon">📭</div><p>${orders.length?'لا توجد نتائج مطابقة':'لا يوجد طلبات بعد — اضغط طلب جديد للبدء'}</p></div>`;
    return;
  }
  list.innerHTML=filtered.map(o=>{
    const date=fmtDate(o.createdAt);
    const lv=o.details&&(o.details['مستوى التجهيز']||o.details['مستوى الخدمة']);const level=lv?` · ${lv.split(' — ')[0]}`:'';
    return `<div class="order-card" onclick="openOrder('${o.id}')">
      <div class="order-card-top">
        <div class="order-svc-icon ${o.svc}">${svcIcons[o.svc]||''}</div>
        <span class="status-badge">${o._pending?'⏳ محلي':'جديد'}</span>
      </div>
      <div class="order-name">${o.clientName}</div>
      <div class="order-svc-lbl">${o.svcLabel}${level}</div>
      <div class="order-card-footer">
        <span class="order-who">تم بواسطة: ${o.addedBy||'—'}</span>
        <span class="order-num">${o.lzmCode||'#'+(o.code||'')} · ${date}</span>
      </div>
    </div>`;
  }).join('');
}

// ═══════════ ORDER DETAIL ═══════════
function openOrder(id){
  const o=orders.find(x=>x.id===id);if(!o)return;
  openOrderId=id;
  const svcIcons={contract:'📋',events:'🎪',projects:'🏗️',training:'📚'};
  const svcColors={contract:'rgba(94,203,216,.12)',events:'rgba(251,191,36,.1)',projects:'rgba(42,138,159,.12)',training:'rgba(52,211,153,.1)'};
  const icon=document.getElementById('dIcon');
  icon.textContent=svcIcons[o.svc];icon.style.background=svcColors[o.svc];
  document.getElementById('dName').textContent=o.clientName;
  const date=fmtDate(o.createdAt,{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
  document.getElementById('dMeta').textContent=`${o.lzmCode||'#'+(o.code||'')} · ${date}`;
  const dBy=document.getElementById('dBy');
  if(dBy)dBy.textContent=`تم الطلب بواسطة: ${o.addedBy||'—'}`;
  const rows=[['كود المشروع',o.lzmCode||''],['رقم الطلب',`#${o.code||''}`],['اسم العميل',o.clientName],...Object.entries(o.details||{}),['ملاحظات',o.notes||'']].filter(r=>r[1]&&r[1]!=='—'&&r[1]!=='');
  document.getElementById('dRows').innerHTML=rows.map(([l,vv])=>`<div class="detail-row"><span class="dr-label">${l}</span><span class="dr-val">${vv}</span></div>`).join('');
  document.getElementById('detailOverlay').classList.add('show');
}
function closeDetail(){document.getElementById('detailOverlay').classList.remove('show');openOrderId=null;}

async function deleteOrder(){
  if(!openOrderId)return;
  if(!confirm('هل تريد حذف هذا الطلب نهائياً؟'))return;
  if(openOrderId.startsWith('LOCAL-')){
    pendingOrders=pendingOrders.filter(p=>p.id!==openOrderId);
    persistPending();mergeOrders();
    closeDetail();renderDashboard();
    showToast('🗑️ تم حذف الطلب');
    return;
  }
  try{
    await db.collection('orders').doc(openOrderId).delete();
    closeDetail();
    showToast('🗑️ تم حذف الطلب');
  }catch(err){
    showToast('⚠️ فشل الحذف');
  }
}

function buildOrderText(o){
  const date=fmtDate(o.createdAt,{day:'2-digit',month:'long',year:'numeric'});
  let txt=`🚑 لازم — Lazem Medical Services\n━━━━━━━━━━━━━━━━\n`;
  txt+=`🏷️ كود المشروع: ${o.lzmCode||''}\n📋 رقم الطلب: #${o.code||''}\n📅 التاريخ: ${date}\n👤 العميل: ${o.clientName}\n`;
  txt+=`🔖 الخدمة: ${o.svcLabel}\n👤 تم الطلب بواسطة: ${o.addedBy||'—'}\n━━━━━━━━━━━━━━━━\n`;
  Object.entries(o.details||{}).forEach(([k,vv])=>{if(vv)txt+=`${k}: ${vv}\n`;});
  if(o.notes)txt+=`ملاحظات: ${o.notes}\n`;
  txt+=`━━━━━━━━━━━━━━━━\n`;
  return txt;
}
function copyOrder(){if(!openOrderId)return;const o=orders.find(x=>x.id===openOrderId);if(!o)return;navigator.clipboard.writeText(buildOrderText(o)).then(()=>showToast('📋 تم النسخ!')).catch(()=>showToast('⚠️ تعذّر النسخ'));}
function shareOrder(){if(!openOrderId)return;const o=orders.find(x=>x.id===openOrderId);if(!o)return;const txt=buildOrderText(o);if(navigator.share){navigator.share({title:`طلب #${o.code||''}`,text:txt}).catch(()=>{});}else{window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');}}

function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800);}
document.getElementById('detailOverlay').addEventListener('click',function(e){if(e.target===this)closeDetail();});
['crs-aware','crs-fa','crs-fire','crs-ohs'].forEach(id=>{
  const el=document.getElementById(id);
  if(el)el.addEventListener('change',updateCodePreview);
});
['e-start','p-start'].forEach(id=>{
  const el=document.getElementById(id);
  if(el)el.addEventListener('change',updateCodePreview);
});
