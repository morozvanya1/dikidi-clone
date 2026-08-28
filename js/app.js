import { db } from './firebase.js';
import { collection,getDocs,query,where,addDoc,setDoc,serverTimestamp,orderBy,doc,runTransaction } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';
import { currentUser,onUserChange,ensureAuth,openAuthModal,logout } from './auth.js';
import { monthCalendar,defaultSlots } from './calendar.js';

const demoServices=[
 {id:'demo1',name:'Маникюр с покрытием',price:1800,duration:120},
 {id:'demo2',name:'Маникюр без покрытия',price:1200,duration:60},
 {id:'demo3',name:'Педикюр с покрытием',price:2200,duration:150},
 {id:'demo4',name:'Педикюр без покрытия',price:1600,duration:90}
];
const demoMasters=[{id:'master1',name:'Анастасия Манянина',role:'Мастер маникюра и педикюра',photo:'assets/master.svg'}];
const state={services:demoServices,masters:demoMasters,user:null};
const localKey=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const toast=t=>{const el=document.getElementById('toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400)};
const modal=(id,open=true)=>document.getElementById(id)?.classList.toggle('open',open);

for(const b of document.querySelectorAll('[data-close]')) b.addEventListener('click',()=>b.closest('.modal-backdrop').classList.remove('open'));
for(const b of document.querySelectorAll('.book-btn')) b.addEventListener('click',()=>ensureAuth(openBooking));
document.getElementById('openAccount').onclick=()=>state.user?showAccount():openAuthModal('login');
document.getElementById('favoriteBtn').onclick=()=>{const b=document.getElementById('favoriteBtn');b.classList.toggle('liked');b.textContent=b.classList.contains('liked')?'♥':'♡';toast(b.classList.contains('liked')?'Добавлено в избранное':'Удалено из избранного')};
document.getElementById('showPhone').onclick=()=>showSimple('<h2>Телефон</h2><p class="big-phone">+7 (987) 40•••••</p><p class="muted">Полный номер можно показать в этой карточке после подключения вашего номера.</p>');
document.getElementById('mapBtn').onclick=()=>showSimple('<h2>Анастасия Манянина</h2><p>Звенигово, Вершинина, 73</p><a class="primary full map-link" target="_blank" href="https://www.google.com/maps/search/?api=1&query=Звенигово%20Вершинина%2073">Открыть карту</a>');
document.getElementById('chatBtn').onclick=document.getElementById('stickyChat').onclick=()=>showSimple('<h2>Чат</h2><p>Можно подключить Telegram, VK или собственный чат на Firebase.</p>');
document.getElementById('reviewsLink').onclick=()=>document.getElementById('reviewsSection').scrollIntoView({behavior:'smooth'});
document.getElementById('writeReview').onclick=()=>ensureAuth(openReviewForm);
document.getElementById('moreBtn').onclick=()=>showSimple('<h2>Меню</h2><div class="menu-list"><button data-scroll="servicesSection">Услуги</button><button data-scroll="reviewsSection">Отзывы</button><button id="menuAccount">Личный кабинет</button></div>');

document.addEventListener('click',e=>{const b=e.target.closest('[data-scroll]');if(b){document.getElementById(b.dataset.scroll)?.scrollIntoView({behavior:'smooth'});modal('simpleModal',false)}});
function showSimple(html){document.getElementById('simpleModalContent').innerHTML=html;modal('simpleModal');}

function renderServices(){
  document.getElementById('servicesGrid').innerHTML=state.services.map(s=>`<button class="service-tile" data-service="${s.id}"><div><b>${s.name}</b><span>${s.duration} мин.</span></div><strong>${Number(s.price||0).toLocaleString('ru-RU')} ₽</strong></button>`).join('');
  document.querySelectorAll('[data-service]').forEach(b=>b.addEventListener('click',()=>ensureAuth(()=>openBooking(b.dataset.service))));
}
function renderMasters(){
  document.getElementById('mastersList').innerHTML=state.masters.map(m=>`<div class="master-row"><img src="${m.photo||'assets/master.svg'}"><div><b>${m.name}</b><span>${m.role||'Специалист'}</span></div><button class="secondary" data-master-select="${m.id}">Выбрать</button></div>`).join('');
  document.querySelectorAll('[data-master-select]').forEach(b=>b.addEventListener('click',()=>ensureAuth(()=>openBooking(null,b.dataset.masterSelect))));
}
async function loadReviews(){
  let html=`<div class="review"><div><b>Клиент</b><span>★★★★★</span></div><p>Очень аккуратно и красиво. Спасибо мастеру!</p><small>Недавно</small></div><div class="review"><div><b>Клиент</b><span>★★★★★</span></div><p>Все стерильно, приятная атмосфера, обязательно вернусь.</p><small>Недавно</small></div>`;
  if(db){try{const snap=await getDocs(query(collection(db,'reviews'),orderBy('createdAt','desc')));if(!snap.empty)html=snap.docs.map(d=>d.data()).map(r=>`<div class="review"><div><b>${r.authorName||'Клиент'}</b><span>${'★'.repeat(Number(r.rating||5))}</span></div><p>${r.text||''}</p><small>Опубликовано</small></div>`).join('')}catch(e){console.warn(e)}}
  document.getElementById('reviewsList').innerHTML=html;
}
async function loadData(){
  if(!db)return;
  try{const [ss,ms]=await Promise.all([getDocs(query(collection(db,'services'),orderBy('name'))),getDocs(query(collection(db,'masters'),orderBy('name')))]);if(!ss.empty)state.services=ss.docs.map(d=>({id:d.id,...d.data()}));if(!ms.empty)state.masters=ms.docs.map(d=>({id:d.id,...d.data()}));}catch(e){console.warn('Не удалось прочитать каталог:',e)}
}

async function openBooking(preselectedService,preselectedMaster){
  modal('bookingModal');
  let chosenService=state.services.find(s=>s.id===preselectedService)||state.services[0];
  let chosenMaster=state.masters.find(m=>m.id===preselectedMaster)||state.masters[0];
  let chosenDate=new Date();let chosenTime=null;let taken=[];
  const root=document.getElementById('bookingSteps');
  const loadTaken=async()=>{taken=[];if(!db||!chosenMaster)return;try{const snap=await getDocs(query(collection(db,'slotLocks'),where('masterId','==',chosenMaster.id),where('dateKey','==',localKey(chosenDate))));taken=snap.docs.map(d=>d.data().time).filter(Boolean)}catch(e){console.warn(e)}};
  const renderTimes=async()=>{await loadTaken();const grid=document.getElementById('timeGrid');if(!grid)return;grid.innerHTML=defaultSlots.map(t=>{const off=taken.includes(t);return `<button class="time ${chosenTime===t?'selected':''} ${off?'disabled':''}" data-time="${t}" ${off?'disabled':''}>${t}${off?'<small> занято</small>':''}</button>`}).join('');grid.querySelectorAll('.time:not(.disabled)').forEach(b=>b.onclick=()=>{chosenTime=b.dataset.time;renderTimes().then(()=>{const btn=document.getElementById('confirmBooking');if(btn)btn.disabled=false})});};
  const render=async()=>{
    root.innerHTML=`<div class="booking-step"><div class="step-label">1 · УСЛУГА</div><div class="choice-grid">${state.services.map(s=>`<button class="choice ${s.id===chosenService.id?'selected':''}" data-bs="${s.id}"><span>${s.name}</span><b>${Number(s.price).toLocaleString('ru-RU')} ₽</b><small>${s.duration} мин.</small></button>`).join('')}</div></div><div class="booking-step"><div class="step-label">2 · СПЕЦИАЛИСТ</div><div class="choice-grid one">${state.masters.map(m=>`<button class="choice ${m.id===chosenMaster.id?'selected':''}" data-bm="${m.id}"><span>${m.name}</span><small>${m.role||'Специалист'}</small></button>`).join('')}</div></div><div class="booking-step"><div class="step-label">3 · ДАТА</div><div id="bookingCalendar"></div></div><div class="booking-step"><div class="step-label">4 · ВРЕМЯ</div><div id="timeGrid" class="time-grid"></div></div><button id="confirmBooking" class="primary full" disabled>Подтвердить запись</button><div id="bookingError" class="form-error"></div>`;
    root.querySelectorAll('[data-bs]').forEach(b=>b.onclick=()=>{chosenService=state.services.find(s=>s.id===b.dataset.bs);render()});
    root.querySelectorAll('[data-bm]').forEach(b=>b.onclick=()=>{chosenMaster=state.masters.find(s=>s.id===b.dataset.bm);render()});
    monthCalendar({container:document.getElementById('bookingCalendar'),selected:chosenDate,onSelect:d=>{chosenDate=d;chosenTime=null;renderTimes()}});
    await renderTimes();
    document.getElementById('confirmBooking').onclick=confirm;
  };
  const confirm=async()=>{const err=document.getElementById('bookingError');err.textContent='';if(!currentUser||!chosenTime)return;try{if(!db)throw new Error('Firebase не настроен.');const lockId=`${chosenMaster.id}_${localKey(chosenDate)}_${chosenTime.replace(':','-')}`;await runTransaction(db,async tx=>{const lockRef=doc(db,'slotLocks',lockId);const lockSnap=await tx.get(lockRef);if(lockSnap.exists())throw new Error('Это время уже занято. Выберите другое.');const apptRef=doc(collection(db,'appointments'));tx.set(lockRef,{masterId:chosenMaster.id,dateKey:localKey(chosenDate),time:chosenTime,taken:true,createdAt:serverTimestamp()});tx.set(apptRef,{clientId:currentUser.uid,clientName:currentUser.displayName||currentUser.email,clientEmail:currentUser.email,masterId:chosenMaster.id,masterName:chosenMaster.name,serviceId:chosenService.id,serviceName:chosenService.name,price:Number(chosenService.price),duration:Number(chosenService.duration),dateKey:localKey(chosenDate),date:new Date(chosenDate.getFullYear(),chosenDate.getMonth(),chosenDate.getDate()),time:chosenTime,status:'booked',createdAt:serverTimestamp()});});modal('bookingModal',false);toast('Запись создана ✅');}catch(e){err.textContent=e.message||'Не удалось создать запись.'}};
  await render();
}

async function showAccount(){
  let html=`<h2>Личный кабинет</h2><p><b>${state.user?.displayName||'Клиент'}</b><br>${state.user?.email||''}</p><div class="account-actions"><button class="secondary full" id="accountVisits">Мои записи</button><button class="secondary full" id="accountLogout">Выйти</button></div><div id="myVisits"></div>`;
  showSimple(html);
  document.getElementById('accountLogout').onclick=async()=>{await logout();modal('simpleModal',false);toast('Вы вышли из аккаунта')};
  document.getElementById('accountVisits').onclick=loadMyVisits;
}
async function loadMyVisits(){
  const box=document.getElementById('myVisits');box.innerHTML='<p class="muted">Загрузка…</p>';if(!db||!state.user)return;try{const snap=await getDocs(query(collection(db,'appointments'),where('clientId','==',state.user.uid)));const list=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.dateKey).localeCompare(String(b.dateKey))+String(a.time).localeCompare(String(b.time)));box.innerHTML=list.length?list.map(a=>`<div class="review"><b>${a.serviceName}</b><p>${a.dateKey} · ${a.time}<br>${a.masterName}</p><small>Статус: ${a.status}</small></div>`).join(''):'<p class="muted">Записей пока нет.</p>'}catch(e){box.innerHTML=`<p class="form-error">${e.message}</p>`}}
function openReviewForm(){showSimple('<div class="modal-title"><span class="eyebrow">ОТЗЫВ</span><h2>Расскажите о визите</h2></div><form id="reviewForm" class="stack-form"><label>Оценка<select id="reviewRating"><option value="5">5 — отлично</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></label><label>Комментарий<textarea id="reviewText" required rows="4" placeholder="Ваш отзыв"></textarea></label><button class="primary full">Опубликовать</button><div id="reviewError" class="form-error"></div></form>');document.getElementById('reviewForm').onsubmit=async e=>{e.preventDefault();try{if(!db||!currentUser)throw new Error('Войдите в аккаунт.');await addDoc(collection(db,'reviews'),{clientId:currentUser.uid,authorName:currentUser.displayName||'Клиент',rating:Number(document.getElementById('reviewRating').value),text:document.getElementById('reviewText').value.trim(),createdAt:serverTimestamp(),status:'published'});modal('simpleModal',false);await loadReviews();toast('Отзыв опубликован ✅')}catch(ex){document.getElementById('reviewError').textContent=ex.message}}}

onUserChange(u=>{state.user=u});
window.addEventListener('user-ready',()=>{if(currentUser)toast(`Добро пожаловать, ${currentUser.displayName||currentUser.email}`)});
loadData().then(()=>Promise.all([renderServices(),renderMasters(),loadReviews()]));
