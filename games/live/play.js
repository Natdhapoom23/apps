import {$,node,api,config,token,notify,subscribe,secondsLeft,roomCode} from './shared.js';
const code=roomCode(),storage=`workshop-player-${code}`;
let joinKey=localStorage.getItem(`${storage}-join-key`);
if(!joinKey){joinKey=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem(`${storage}-join-key`,joinKey);}
let c,state,player,answer=null,answerRound=null,busy=false,lastRound=null,syncing=false;
$('#room-code').textContent=code;
function render(){
  if(!state)return;
  $('#join-title').textContent=state.title;
  if(!player){const current=$('#player-group').value;$('#player-group').replaceChildren(node('option','','เลือกกลุ่ม'));$('#player-group').firstChild.value='';state.groups.forEach(g=>{const o=node('option','',g);o.value=g;$('#player-group').append(o);});$('#player-group').value=current;$('#join-button').disabled=!state.accepting||state.phase==='finished'||busy;return;}
  $('#join-panel').hidden=true;$('#player-panel').hidden=false;$('#your-name').textContent=player.name;$('#your-group').textContent=player.group;
  $('#your-score').textContent=(state.leaderboard.find(p=>p.id===player.id)?.score||0).toLocaleString();
  const r=state.round;
  if(r?.id!==lastRound){lastRound=r?.id||null;if(answerRound!==lastRound)answer=null;$('#options').replaceChildren();if(r)r.options.forEach((text,i)=>{const b=node('button',`answer-button color-${i%4}`);b.append(node('span','answer-letter',String.fromCharCode(65+i)),node('span','',text),node('span','selected-mark','✓'));b.dataset.choice=String(i);b.onclick=()=>sendAnswer(i);$('#options').append(b);});if(token(storage)&&!syncing)syncMe();}
  const open=r&&state.phase==='open'&&secondsLeft(state)>0;
  $('#waiting').hidden=!!r&&state.phase!=='finished';$('#answer-panel').hidden=!r||state.phase==='finished';$('#result-panel').hidden=!r?.revealed||state.phase==='finished';
  $('#waiting-title').textContent=state.phase==='finished'?'ขอบคุณที่ร่วมเล่น!':'เข้าห้องแล้ว!';$('#waiting-text').textContent=state.phase==='finished'?'ดูผลรวมและร่วมพูดคุยกับผู้สอนบนจอหลัก':'ดูคำถามบนจอหลัก แล้วรอผู้สอนเริ่มกิจกรรม';
  if(r){$('#round-number').textContent=`คำถามที่ ${r.number}`;$('#player-timer').textContent=state.phase==='open'?secondsLeft(state):'—';document.querySelectorAll('[data-choice]').forEach(b=>{b.disabled=!open||busy||syncing;b.classList.toggle('selected',answer?.choice===Number(b.dataset.choice));b.setAttribute('aria-pressed',String(answer?.choice===Number(b.dataset.choice)));});
    $('#answer-status').textContent=busy?'กำลังส่งคำตอบ…':syncing?'กำลังตรวจคำตอบล่าสุด…':answer?`${open?'รับคำตอบแล้ว':'คำตอบที่บันทึกไว้'}: ${r.options[answer.choice]} · เปลี่ยน ${answer.changes} ครั้ง`:open?'ยังไม่ได้เลือกคำตอบ':'ปิดรับคำตอบแล้ว · คุณไม่ได้ตอบข้อนี้';
    if(r.revealed){$('#result-title').textContent=r.correct==null?'ข้อนี้ไม่มีถูกผิด':answer?.choice===r.correct?'ตอบถูก!':answer?'ข้อนี้ยังไม่ถูก':'ไม่ได้ตอบข้อนี้';$('#result-detail').textContent='ดูเฉลยและคำอธิบายบนจอหลัก';}
  }
}
async function syncMe(){if(syncing||!token(storage))return;syncing=true;try{const r=await api('me',{room:code},token(storage),true);player=r.player;answer=r.answer;answerRound=r.roundId;}catch(e){if(e.status===401||e.status===403){localStorage.removeItem(storage);player=null;$('#join-panel').hidden=false;$('#player-panel').hidden=true;}notify(e.message,true);}finally{syncing=false;render();}}
async function sendAnswer(choice){if(busy||syncing||!state?.round)return;busy=true;const rid=state.round.id;render();try{const r=await api('answer',{room:code,roundId:rid,choice},token(storage));if(state.round?.id===rid){answer=r.answer;answerRound=rid;}$('#notice').hidden=true;}catch(e){notify(`${e.message} — ตรวจสถานะคำตอบด้านล่างก่อนส่งใหม่`,true);await syncMe();}finally{busy=false;render();}}
$('#join-form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;render();try{const r=await api('join',{room:code,joinKey,name:$('#player-name').value,group:$('#player-group').value});localStorage.setItem(storage,r.token);player=r.player;state=r.state;$('#notice').hidden=true;}catch(e){notify(e.message,true);}finally{busy=false;render();}};
setInterval(()=>{if(player&&state?.phase==='open')render();},200);
window.addEventListener('online',()=>syncMe());document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncMe();});
try{c=await config();if(!/^[A-Z0-9]{6}$/.test(code))throw new Error('กรุณาสแกน QR หรือกลับไปกรอกรหัสห้อง');if(c.configured){if(token(storage))await syncMe();subscribe(code,c,s=>{state=s;render();});}}catch(e){notify(e.message,true);$('#join-button').disabled=true;}
