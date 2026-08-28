import { auth, db, isFirebaseConfigured } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

export let currentUser = null;
export function onUserChange(cb){ if (!auth) return cb(null); return onAuthStateChanged(auth, u => { currentUser = u; cb(u); }); }
export async function register(email,password,name){
  if (!auth) throw new Error('Firebase не настроен. Заполните js/firebase-config.js');
  const cred = await createUserWithEmailAndPassword(auth,email,password);
  await updateProfile(cred.user,{displayName:name});
  if (db) await setDoc(doc(db,'users',cred.user.uid),{uid:cred.user.uid,name,email,role:'client',createdAt:serverTimestamp()},{merge:true});
  return cred.user;
}
export async function login(email,password){ if(!auth) throw new Error('Firebase не настроен.'); return (await signInWithEmailAndPassword(auth,email,password)).user; }
export async function logout(){ if(auth) await signOut(auth); }
export function openAuthModal(mode='login'){
  const modal=document.getElementById('authModal'); if(!modal) return;
  document.getElementById('authContent').innerHTML = `<div class="modal-title"><span class="eyebrow">ЛИЧНЫЙ КАБИНЕТ</span><h2>${mode==='login'?'Вход':'Регистрация'}</h2><p>${mode==='login'?'Войдите, чтобы видеть свои записи.':'Создайте аккаунт — номер телефона и имя больше не придется вводить каждый раз.'}</p></div>
  <form id="authForm" class="stack-form">${mode==='register'?'<label>Имя<input id="authName" required minlength="2" placeholder="Ваше имя"></label>':''}<label>Email<input id="authEmail" type="email" required placeholder="name@example.com"></label><label>Пароль<input id="authPassword" type="password" required minlength="6" placeholder="Не менее 6 символов"></label><button class="primary full" type="submit">${mode==='login'?'Войти':'Создать аккаунт'}</button></form><div class="auth-switch">${mode==='login'?'<button data-authmode="register">Создать аккаунт</button>':'<button data-authmode="login">Уже есть аккаунт</button>'}</div><div id="authError" class="form-error"></div>`;
  modal.classList.add('open');
  document.getElementById('authForm').addEventListener('submit',async e=>{
    e.preventDefault(); const err=document.getElementById('authError'); err.textContent='';
    try { if(mode==='login') await login(authEmail.value,authPassword.value); else await register(authEmail.value,authPassword.value,authName.value); modal.classList.remove('open'); window.dispatchEvent(new Event('user-ready')); }
    catch(ex){ err.textContent=translateAuthError(ex.code||ex.message); }
  });
  modal.querySelectorAll('[data-authmode]').forEach(b=>b.addEventListener('click',()=>openAuthModal(b.dataset.authmode)));
}
function translateAuthError(code){ const map={'auth/invalid-credential':'Неверный email или пароль.','auth/email-already-in-use':'Этот email уже зарегистрирован.','auth/weak-password':'Пароль слишком слабый.','auth/invalid-email':'Проверьте email.','auth/network-request-failed':'Проблема с сетью.'}; return map[code]||code||'Не удалось выполнить действие.'; }

export function ensureAuth(action){ if(currentUser) return action(); openAuthModal('login'); }
