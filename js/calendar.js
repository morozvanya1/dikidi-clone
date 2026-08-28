export function monthCalendar({container,onSelect,selected=new Date()}){
  let cursor=new Date(selected.getFullYear(),selected.getMonth(),1);
  const render=()=>{
    const y=cursor.getFullYear(),m=cursor.getMonth(); const first=(new Date(y,m,1).getDay()+6)%7; const days=new Date(y,m+1,0).getDate();
    const names=['Пн','Вт','Ср','Чт','Пт','Сб','Вс']; let html=`<div class="cal-head"><button data-prev>‹</button><div>${cursor.toLocaleDateString('ru-RU',{month:'long',year:'numeric'})}</div><button data-next>›</button></div><div class="cal-week">${names.map(n=>`<span>${n}</span>`).join('')}</div><div class="cal-days">`;
    for(let i=0;i<first;i++) html+='<span class="empty"></span>';
    for(let d=1;d<=days;d++){ const dt=new Date(y,m,d); const active=selected.toDateString()===dt.toDateString(); const past=dt < new Date(new Date().setHours(0,0,0,0)); html+=`<button class="cal-day ${active?'active':''} ${past?'disabled':''}" ${past?'disabled':''} data-date="${dt.toISOString()}">${d}</button>`; }
    html+='</div>'; container.innerHTML=html;
    container.querySelector('[data-prev]').onclick=()=>{cursor.setMonth(cursor.getMonth()-1);render()};
    container.querySelector('[data-next]').onclick=()=>{cursor.setMonth(cursor.getMonth()+1);render()};
    container.querySelectorAll('.cal-day:not(.disabled)').forEach(b=>b.onclick=()=>{selected=new Date(b.dataset.date);onSelect(selected);render();});
  }; render(); return {getSelected:()=>selected};
}
export const defaultSlots=['10:00','11:30','13:00','14:30','16:00','17:30','19:00'];
