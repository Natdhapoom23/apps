import {api,roomCode,node,now} from '../live/shared.js';
const $=s=>document.querySelector(s),code=roomCode();
const colors=['#f45b69','#368af5','#a567ed','#21b99b','#f6b63c','#ec69b4'],tossDuration=2800,stepDuration=300;
const defaultRules='ผลัดกันทอยลูกเต๋า เดินตามแต้มที่ได้\nตอบคำถามบนหน้าจอให้ถูกต้องและรวดเร็วที่สุด\nคะแนนขึ้นอยู่กับความถูกต้องและความเร็ว\nทีมที่ตอบถูกเร็วที่สุด ได้เดินหน้า 1 ช่อง\nทีมไหนไปถึงช่อง 30 ก่อน ชนะ ได้เงินรางวัล 5,000 บาท';
let state=null,pending=false,failure='',cells=[],tokens=new Map(),boardKey='',lastFrame='',lastRules='';
const die=node('span','die-display cube');die.id='dice';die.setAttribute('aria-hidden','true');
const facePips=[[5],[1,9],[1,5,9],[1,3,7,9],[1,3,5,7,9],[1,3,4,6,7,9]];
facePips.forEach((pips,index)=>{const face=node('span',`die-face face-${index+1}`);pips.forEach(position=>face.append(node('i',`pip p${position}`)));die.append(face);});
const rollLabel=node('span','roll-label','ทอยลูกเต๋า');$('#roll').replaceChildren(die,rollLabel);
const turnFocus=node('div','turn-focus');$('.board-center').prepend(turnFocus);
const choices=node('div','projector-options');$('#question-card').append(choices);
const spaceEvent=node('div','space-event');spaceEvent.hidden=true;$('.board-center').prepend(spaceEvent);
const rulesCard=node('section','rules-card');const rulesTitle=node('strong','','กติกาการเล่น');const rulesList=node('ol','rules-list');rulesCard.append(rulesTitle,rulesList);$('.board-center').insertBefore(rulesCard,$('#roll'));
const leaderboard=node('aside','leaderboard');$('#players').after(leaderboard);
const qr=$('#join-qr');qr.hidden=true;qr.onload=()=>{qr.hidden=false;};qr.onerror=()=>{qr.hidden=true;};qr.src=`/api/game?action=monopolyQr&room=${code}`;
const qrTrigger=$('.join-display');
qrTrigger.tabIndex=0;qrTrigger.setAttribute('role','button');
qrTrigger.setAttribute('aria-label','ขยาย QR Code');qrTrigger.setAttribute('aria-expanded','false');
const qrDialog=node('dialog','qr-dialog');qrDialog.setAttribute('aria-label','QR Code สำหรับเข้าร่วมเกม');
const qrClose=node('button','qr-large');qrClose.type='button';qrClose.setAttribute('aria-label','ย่อ QR Code กลับ');
const qrLarge=node('img');qrLarge.src=qr.src;qrLarge.alt='QR สำหรับเข้าร่วมตอบคำถาม';
qrClose.append(node('strong','','สแกนเพื่อเข้าร่วมเกม'),qrLarge,node('span','',`ห้อง ${code} · คลิกอีกครั้งเพื่อย่อกลับ`));
qrDialog.append(qrClose);document.body.append(qrDialog);
qrTrigger.onclick=()=>{qrDialog.showModal();qrTrigger.setAttribute('aria-expanded','true');};
qrTrigger.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();qrTrigger.click();}};
qrDialog.onclick=()=>qrDialog.close();
qrDialog.addEventListener('close',()=>{qrTrigger.setAttribute('aria-expanded','false');qrTrigger.focus();});
const fullscreen=node('button','fullscreen-button','ขยายเต็มหน้าจอ ↗');fullscreen.type='button';
$('.game-header').lastElementChild.prepend(fullscreen);
fullscreen.onclick=async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{failure='เบราว์เซอร์นี้ไม่สามารถเปิดโหมดเต็มหน้าจอได้';render();}
};
document.addEventListener('fullscreenchange',()=>{fullscreen.textContent=document.fullscreenElement?'ออกจากเต็มหน้าจอ ↙':'ขยายเต็มหน้าจอ ↗';});

function buildBoard(){
  const n=state.boardLength||30,ps=state.players||[],spaces=state.spaces||[];
  const bounds=$('#board').getBoundingClientRect();
  const sum=Math.floor(n/2)+2;
  const columns=Math.max(3,Math.min(sum-3,Math.round(sum*bounds.width/(bounds.width+bounds.height))));
  const rows=sum-columns;
  const key=JSON.stringify([n,columns,ps.map(p=>[p.id,p.name])]);if(key===boardKey)return;
  boardKey=key;tokens=new Map();cells=[];
  const path=[];
  for(let x=0;x<columns-1;x++)path.push([x,0,1,1]);
  for(let y=0;y<rows-1;y++)path.push([columns-1,y,1,1]);
  for(let x=columns-1;x>0;x--)path.push([x,rows-1,1,1]);
  for(let y=rows-1;y>0;y--)path.push([0,y,1,1]);
  // An odd length needs one split tile; even lengths have identical cells.
  if(n%2){const [x,y]=path.pop();path.push([x,y+.5,1,.5],[x,y,1,.5]);}
  $('.board-shell').style.setProperty('--edge-x',100/columns+'%');
  $('.board-shell').style.setProperty('--edge-y',100/rows+'%');
  $('#board').replaceChildren(...path.map(([x,y,w,h],i)=>{
    const e=node('div','space'+(!i?' start-space':'')+(i===n-1?' finish-space':''));
    Object.assign(e.style,{left:x*100/columns+'%',top:y*100/rows+'%',width:w*100/columns+'%',height:h*100/rows+'%'});
    e.style.setProperty('--stripe',colors[i%colors.length]);e.style.setProperty('--tile-color',['#ffb647','#45b9ee','#af83ee','#37c7aa','#f47c8e'][i%5]);
    const space=spaces[i]||{};
    const defaultTitle=i?'ช่อง '+(i+1):'Start/Finish';
    const label=i===0?'เริ่มต้น':i===n-1?'🏁 '+n:(space.title&&space.title!==defaultTitle?space.title:String(i+1));
    e.append(node('span','space-number',label));
    if(space.title&&space.title!==defaultTitle)e.append(node('span','space-label',String(i+1)));
    const holder=node('div','tokens');e.append(holder);cells.push(holder);return e;
  }));
  ps.forEach((p,i)=>{const t=node('span','token',i+1);t.title=p.name;t.style.background=colors[i%colors.length];tokens.set(p.id,t);});
}
function paint(){
  if(!state)return;
  const r=state.lastRoll,t=now(),elapsed=r?t-r.at:0,moving=r?.phase==='landing',tossing=moving&&elapsed<tossDuration;
  $('#roll').classList.toggle('tossing',tossing);
  const value=tossing?1+Math.floor(Math.max(0,elapsed)/90)%6:r?.roll||1;
  if(!tossing)die.style.transform=['rotateX(-10deg) rotateY(14deg)','rotateX(-10deg) rotateY(-76deg)','rotateX(-100deg) rotateY(14deg)','rotateX(80deg) rotateY(14deg)','rotateX(-10deg) rotateY(104deg)','rotateX(-10deg) rotateY(194deg)'][value-1];$('#roll').setAttribute('aria-label',`ทอยลูกเต๋า · ${value} แต้ม`);
  const step=moving?Math.min(r.steps,Math.max(0,Math.floor((elapsed-tossDuration)/stepDuration))):0;
  const frame=JSON.stringify([boardKey,r?.id,r?.phase,step,state.players.map(p=>p.position)]);
  if(frame!==lastFrame){lastFrame=frame;state.players.forEach(p=>{
    const pos=moving&&p.id===r.player?r.from+step:p.position;
    const token=tokens.get(p.id),holder=cells[Math.max(0,Math.min(cells.length-1,pos-1))];
    if(token&&holder&&token.parentNode!==holder){holder.append(token);if(!matchMedia('(prefers-reduced-motion: reduce)').matches)token.animate([{transform:'translateY(-12px) scale(1.15)'},{transform:'translateY(0) scale(1)'}],{duration:220,easing:'ease-out'});}
  });}
  if(r?.phase==='question')$('#question-type').textContent=`ตอบพร้อมกันทุกทีม · เหลือ ${Math.max(0,Math.ceil((r.deadline-t)/1000))} วินาที`;
}
function render(){
  if(!state)return;
  const ps=state.players||[],r=state.lastRoll,active=r&&r.phase!=='resolved';
  $('#title').textContent=state.title;$('#turn-label').textContent=state.winner?'🏆 '+state.winner.name+' ชนะเกม!':`ตาของ ${ps[state.turn]?.name||'ทีมถัดไป'}`;
  turnFocus.textContent=state.winner?'จบเกม':`คิวทอยลูกเต๋า: ${ps[state.turn]?.name||'ทีมถัดไป'}`;
  const rules=String(state.rules||defaultRules).split('\n').map(rule=>rule.trim()).filter(Boolean).slice(0,8),rulesKey=rules.join('\n');rulesCard.hidden=!rules.length;if(rulesKey!==lastRules){lastRules=rulesKey;rulesList.replaceChildren(...rules.map(rule=>node('li','',rule)));}
  $('#member-count').textContent=state.participantCount||0;$('#roll').disabled=pending||!!state.winner||!!active;$('#roll').hidden=r?.phase==='question';
  rollLabel.textContent=pending?'กำลังทอย…':r?.phase==='landing'?`${r.roll} แต้ม`:'ทอยลูกเต๋า';
  $('#players').replaceChildren(...ps.map((p,i)=>{const e=node('div','score-chip',`${i+1}. ${p.name} · ${p.points||0} คะแนน`);e.style.setProperty('--team-color',colors[i%colors.length]);return e;}));
  const leaders=(state.participants||[]).slice().sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,5);
  const teamName=id=>ps.find(p=>p.id===id)?.name||'ไม่ระบุกลุ่ม';
  leaderboard.replaceChildren(...leaders.map((p,i)=>node('span','leader-row',`${i===0?'👑':i+1} ${p.name} (${teamName(p.teamId)}) · ${p.score||0}`)));
  buildBoard();const q=r?.question,landed=r&&r.phase==='landing'&&now()>=r.readyAt-1000?state.spaces?.[Math.max(0,r.to-1)]:null;
  spaceEvent.hidden=!(landed?.text||landed?.title&&landed.title!==`ช่อง ${r.to}`);
  if(!spaceEvent.hidden){spaceEvent.replaceChildren(node('span','event-kicker',`ช่อง ${r.to}`),node('h2','',landed.title||`ช่อง ${r.to}`),node('p','',landed.text||'ทีมที่ตกช่องนี้ทำภารกิจตามป้ายช่อง'));}
  $('#question-card').hidden=!q||r.phase!=='question';
  if(q&&r.phase==='question'){
    if(q.image&&$('#question-image').getAttribute('src')!==q.image)$('#question-image').src=q.image;
    $('#question-image').hidden=!q.image;$('#question-title').textContent=q.title;
    choices.replaceChildren(...(q.type==='boolean'?['ถูก','ผิด']:q.options||[]).map((x,i)=>node('div','projector-option',`${i+1}. ${x}`)));
  }
  $('#hero').textContent=r?.hero?`ฮีโร่ล่าสุด: ${r.hero.name} (${teamName(r.hero.teamId)}) · +${r.hero.score} คะแนน`:'';
  $('#message').className=failure?'notice bad':'';
  $('#message').textContent=failure||(r?.phase==='landing'?'กำลังทอยและเดินเบี้ย…':r?.phase==='question'?'ส่งคำตอบจากมือถือได้เลย':state.winner?'จบเกม':r?.phase==='resolved'?(r.message||'จบเทิร์น · ทีมถัดไปทอยได้เลย'):'กดลูกเต๋า หรือ Space / Enter / R เพื่อทอย');paint();
}
function receive(next){if(!next)return;if(state&&next.revision<state.revision)return;state=next;render();}
async function poll(){
  try{const r=await api('monopolyPublic',{room:code},'',true);receive(r.state);}
  catch(e){failure=e.message;render();$('#message').textContent=failure;}
  finally{setTimeout(poll,500);}
}
async function roll(){
  if(!state||pending||state.winner||(state.lastRoll&&state.lastRoll.phase!=='resolved'))return;
  pending=true;failure='';render();
  try{const r=await api('monopolyRoll',{room:code});receive(r.state);}
  catch(e){failure=e.message;}
  finally{pending=false;render();}
}
$('#roll').onclick=roll;
document.addEventListener('keydown',e=>{if(qrDialog.open||e.target.closest('button,[role="button"],input,textarea,select,[contenteditable]')||e.ctrlKey||e.metaKey||e.altKey)return;if(['Space','Enter','KeyR'].includes(e.code)&&!e.repeat){e.preventDefault();roll();}});
new ResizeObserver(()=>{if(state){buildBoard();paint();}}).observe($('#board'));
setInterval(paint,50);poll();
