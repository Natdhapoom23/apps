import {api,roomCode,node} from '../live/shared.js';
const $=s=>document.querySelector(s),code=roomCode();
let state,id=localStorage.getItem(`mono-${code}`),busy=false,animating=false,seen=0,positions={};
const colors=['#d75a52','#426ad3','#bf8b20','#8c54b4','#258f76','#b84f87'];
const notice=node('p','notice');notice.hidden=true;notice.setAttribute('role','alert');$('main').prepend(notice);
function error(e){notice.textContent=e.message;notice.hidden=false;}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function render(){
 const players=Object.values(state.players||{}),spaces=state.spaces||[];
 if(id&&!players.some(p=>p.id===id)){id=null;localStorage.removeItem(`mono-${code}`);}
 $('#join').hidden=!!id;$('#game').hidden=!id;$('#title').textContent=state.title;
 const current=players[state.turn%Math.max(1,players.length)];
 $('#players').replaceChildren(...players.map((p,i)=>{const e=node('span',`player ${p.id===current?.id?'current':''}`),dot=node('span','dot');dot.style.background=colors[i%colors.length];e.append(dot,document.createTextNode(`${p.name} · ${p.points} คะแนน`));return e;}));
 $('#turn-label').textContent=state.winner&&!animating?`🏆 ผู้ชนะ: ${state.winner.name}`:animating?'กำลังเดิน…':`ตาของ ${current?.name||'—'}`;
 let offset=0;const tiles=[];
 for(let side=0;side<4;side++){
  const count=Math.floor(spaces.length/4)+(side<spaces.length%4?1:0);
  for(let j=0;j<count;j++){
   const index=offset+j,e=node('div','space'),step=86/count;
   const coords=side===0?[j*step,0,step,14]:side===1?[86,j*step,14,step]:side===2?[100-(j+1)*step,86,step,14]:[0,100-(j+1)*step,14,step];
   ['left','top','width','height'].forEach((k,i)=>e.style[k]=`${coords[i]}%`);e.style.setProperty('--stripe',colors[side]);
   e.append(node('span','',index===0?'Start/Finish':index+1),node('span','secret',index===0?'🏁':'?'));if(index===0)e.classList.add('start-space');const tokens=node('div','tokens');
   players.forEach((p,i)=>{if((positions[p.id]??p.position)===index+1){const t=node('span','token',i+1);t.style.background=colors[i%colors.length];t.title=p.name;tokens.append(t);}});e.append(tokens);tiles.push(e);
  }offset+=count;
 }
 $('#board').replaceChildren(...tiles);$('#roll').disabled=busy||animating||!!state.winner||!id||current?.id!==id;
}
async function playResult(result){
 animating=true;positions[result.player]=result.from;render();$('#roll').classList.add('rolling');
 for(let i=0;i<10;i++){ $('#dice').textContent=String.fromCodePoint(0x2680+i%6);await delay(90); }
 $('#roll').classList.remove('rolling');$('#dice').textContent=String.fromCodePoint(0x2680+result.roll-1);
 for(let i=1;i<=(result.steps??result.roll);i++){positions[result.player]=(result.from-1+i)%state.spaces.length+1;render();await delay(180);}
 const space=state.spaces[result.spaceId-1];$('#landing-number').textContent=`${result.name} · ช่อง ${result.spaceId}`;$('#landing-title').textContent=state.winner?`🏆 ${state.winner.name} ชนะ!`:space?.title||'เปิดป้าย';$('#landing-text').textContent=result.message;$('#landing-effect').textContent=state.winner?'เดินครบหนึ่งรอบถึง Start/Finish เป็นคนแรก':`${result.to!==result.spaceId?`ย้ายไปช่อง ${result.to} · `:''}คะแนน ${space?.points||0}`;
 await new Promise(resolve=>{const dialog=$('#landing');dialog.addEventListener('close',resolve,{once:true});$('#continue').onclick=()=>dialog.close();dialog.showModal();});
 positions[result.player]=result.to;render();await delay(300);positions={};animating=false;$('#message').textContent=`${result.name} ทอยได้ ${result.roll} → ช่อง ${result.to}`;render();
}
async function accept(next){state=next;const r=state.lastRoll;if(r&&(r.at||state.revision)>seen){seen=r.at||state.revision;await playResult(r);}else render();}
async function refresh(){if(busy||animating)return;try{const r=await api('monopolyPublic',{room:code},'',true);if(!state){state=r.state;seen=state.lastRoll?.at||state.revision;render();}else await accept(r.state);}catch(e){error(e);}}
$('#join').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;$('#join-btn').disabled=true;try{const r=await api('monopolyJoin',{room:code,name:$('#name').value});id=r.playerId;localStorage.setItem(`mono-${code}`,id);state=r.state;seen=state.lastRoll?.at||state.revision;notice.hidden=true;render();}catch(e){error(e);}finally{busy=false;$('#join-btn').disabled=false;if(state)render();}};
$('#roll').onclick=async()=>{if(busy||animating)return;busy=true;render();try{const r=await api('monopolyRoll',{room:code,playerId:id});notice.hidden=true;await accept(r.state);}catch(e){error(e);}finally{busy=false;render();}};
refresh();setInterval(refresh,1500);
