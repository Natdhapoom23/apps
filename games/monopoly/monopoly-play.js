import {api,roomCode,node} from '../live/shared.js';
const $=s=>document.querySelector(s),code=roomCode();
let state,id=localStorage.getItem(`mono-${code}`),busy=false;
const notice=node('p','notice');notice.hidden=true;notice.setAttribute('role','alert');$('main').prepend(notice);
function error(e){notice.textContent=e.message;notice.hidden=false;}
function render(){
 const players=Object.values(state.players||{}),spaces=state.spaces||[];
 if(id&&!players.some(p=>p.id===id)){id=null;localStorage.removeItem(`mono-${code}`);}
 $('#join').hidden=!!id;$('#game').hidden=!id;$('#title').textContent=state.title;
 $('#players').replaceChildren(...players.map(p=>node('span','player',`${p.name} · ${p.points} คะแนน`)));
 $('#board').replaceChildren(...spaces.map((x,i)=>{const el=node('div',`space ${players.some(p=>p.position===i+1)?'active':''}`);el.append(node('b','',i+1),node('small','',x.title),node('div','',x.text||''));return el;}));
 $('#message').textContent=state.lastRoll?`${state.lastRoll.name} ทอยได้ ${state.lastRoll.roll} · ${state.lastRoll.message}`:'';
 $('#roll').disabled=busy||!id||players[state.turn%Math.max(1,players.length)]?.id!==id;
}
async function refresh(){try{const r=await api('monopolyPublic',{room:code},'',true);state=r.state;render();}catch(e){error(e);}}
$('#join-btn').onclick=async()=>{if(busy)return;busy=true;$('#join-btn').disabled=true;try{const r=await api('monopolyJoin',{room:code,name:$('#name').value});id=r.playerId;localStorage.setItem(`mono-${code}`,id);state=r.state;notice.hidden=true;render();}catch(e){error(e);}finally{busy=false;$('#join-btn').disabled=false;if(state)render();}};
$('#roll').onclick=async()=>{if(busy)return;busy=true;render();try{const r=await api('monopolyRoll',{room:code,playerId:id});state=r.state;notice.hidden=true;}catch(e){error(e);}finally{busy=false;render();}};
refresh();setInterval(refresh,1500);
