import {api,config,notify} from '../live/shared.js';const $=s=>document.querySelector(s);let auth='',w;const show=(m,b)=>notify(m,b);$('#settings-link').onclick=()=>{location.href='../../settings.html'};async function load(){const r=await api('wheelRooms',{},auth,true);$('#notice').hidden=true;const e=$('#rooms');e.replaceChildren();r.rooms.forEach(x=>{const d=document.createElement('div');d.className='room';d.innerHTML=`<div><strong>${x.code}</strong><div class="sub">${x.title}</div></div><div><button>จัดการ</button> <button class="secondary" data-delete>ลบ</button></div>`;d.querySelector('button').onclick=()=>open(x.code);d.querySelector('[data-delete]').onclick=async()=>{if(!confirm(`ลบห้อง ${x.code} และผลการหมุนทั้งหมดหรือไม่?`))return;try{await api('wheelDelete',{room:x.code},auth);if(w?.code===x.code){w=null;$('#editor').hidden=true}await load()}catch(e){show(e.message,true)}};e.append(d)})}async function open(code){const r=await api('wheelAdmin',{room:code},auth,true);$('#notice').hidden=true;w=r.wheel;$('#editor').hidden=false;$('#room-title').textContent=`${w.title} · ${code}`;$('#title').value=w.title;$('#options').value=w.options.join('\n');$('#duration').value=w.duration;$('#locked').checked=w.locked;const sel=$('#locked-result');sel.replaceChildren(...w.options.map(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;return o}));sel.value=w.lockedResult||w.options[0];$('#play-link').dataset.url=`play.html?room=${code}`;$('#play-link').onclick=()=>window.open($('#play-link').dataset.url,'_blank','noopener');syncLockedOptions();$('#save-status').hidden=true}$('#login-form').onsubmit=async e=>{e.preventDefault();try{auth=(await api('login',{password:$('#password').value})).token;$('#login').hidden=true;$('#app').hidden=false;await load()}catch(e){show(e.message,true)}};$('#create').onclick=async()=>{const r=await api('wheelCreate',{},auth);await load();open(r.wheel.code)};function optionValues(){return $('#options').value.split('\n').map(x=>x.trim()).filter(Boolean)}
function syncLockedOptions(){
  const select=$('#locked-result'),previous=select.value,options=optionValues();
  select.replaceChildren(...options.map(label=>{const option=document.createElement('option');option.value=label;option.textContent=label;return option}));
  select.value=options.includes(previous)?previous:(options[0]||'');
  select.disabled=!$('#locked').checked;
}
$('#options').addEventListener('input',syncLockedOptions);
$('#locked').addEventListener('change',syncLockedOptions);
$('#save').onclick=async()=>{
  const button=$('#save'),status=$('#save-status');
  if(button.disabled||!w)return;
  syncLockedOptions();
  const data={room:w.code,title:$('#title').value,options:optionValues(),duration:Number($('#duration').value),locked:$('#locked').checked,lockedResult:$('#locked-result').value};
  status.hidden=false;
  if(!data.options.length){status.textContent='กรุณากรอกตัวเลือกอย่างน้อย 1 รายการ';return}
  if(!Number.isFinite(data.duration)||data.duration<1||data.duration>60){status.textContent='กรุณากำหนดเวลาหมุน 1–60 วินาที';return}
  button.disabled=true;button.textContent='กำลังบันทึก…';status.textContent='กำลังบันทึก…';
  try{
    await api('wheelSave',data,auth);
    // Do not reload the form and overwrite edits made while saving.
    status.textContent='บันทึกแล้ว · หน้าวงล้อจะอัปเดตอัตโนมัติ';
    $('#room-title').textContent=`${data.title||w.title} · ${data.room}`;
    await load().catch(()=>{status.textContent='บันทึกแล้ว แต่โหลดรายการห้องใหม่ไม่สำเร็จ กรุณารีเฟรชหน้าจัดการ'});
  }catch(e){status.textContent=`บันทึกไม่สำเร็จ: ${e.message}`}
  finally{button.disabled=false;button.textContent='บันทึก'}
};
$('#reset').onclick=async()=>{await api('wheelReset',{room:w.code},auth);await open(w.code)};config().catch(e=>show(e.message,true));
