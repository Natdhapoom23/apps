export const $ = s=>document.querySelector(s);
export const node=(tag, cls='', text)=>{const e=document.createElement(tag);e.className=cls;if(text!==undefined)e.textContent=text;return e;};
export const roomCode=()=>new URLSearchParams(location.search).get('room')?.toUpperCase()||'';
let offset=0;
export const now=()=>Date.now()+offset;
export function token(key){return localStorage.getItem(key)||'';}
export function notify(message,bad=false){const e=$('#notice');e.textContent=message;e.className=`notice ${bad?'bad':''}`;e.hidden=false;}
export async function api(action,data={},auth='',get=false){
  const start=Date.now();
  const url=get?`/api/game?${new URLSearchParams({action,...data})}`:'/api/game';
  const res=await fetch(url,{method:get?'GET':'POST',headers:{...(get?{}:{'Content-Type':'application/json'}),...(auth?{Authorization:`Bearer ${auth}`}:{})},body:get?undefined:JSON.stringify({action,...data})});
  let result;try{result=await res.json();}catch{throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาเปิดผ่านเว็บที่ติดตั้งระบบแล้ว');}
  if(!res.ok){const e=new Error(result.error||'เชื่อมต่อไม่สำเร็จ');e.status=res.status;throw e;}
  if(result.serverNow)offset=result.serverNow-(start+Date.now())/2;
  return result;
}
export async function config(){const c=await api('config',{},'',true);if(c.demo){const b=node('div','demo-banner','โหมดทดลองในเครื่อง · ข้อมูลยังไม่เชื่อม Firebase');document.body.prepend(b);}if(!c.configured)notify('ยังไม่พร้อมใช้งาน: ต้องตั้งค่า Firebase และรหัสผู้สอนตามคู่มือติดตั้ง',true);return c;}
export function joinUrl(code,c){return `${c.shareOrigin||location.origin}/games/live/play.html?room=${code}`;}
export async function copy(text){try{await navigator.clipboard.writeText(text);notify('คัดลอกลิงก์แล้ว');}catch{notify(`ลิงก์สำหรับเข้าร่วม: ${text}`);}}
// REST streaming reads only the public projection. All mutations go through the server.
export function subscribe(code,c,onState){
  let stopped=false,stream=null,poll=null,last=-1,cache=null,backoff=1500,streamHealthy=false;
  const status=text=>{const e=$('#connection');if(e)e.textContent=text;};
  const apply=s=>{if(s&&s.revision>=last){last=s.revision;cache=s;onState(s);}};
  async function refresh(){if(stopped)return;try{const r=await api('public',{room:code},'',true);apply(r.state);status(c.demo?'เชื่อมต่อโหมดทดลอง':'เชื่อมต่อแล้ว');backoff=1500;}catch(e){status('กำลังเชื่อมต่อใหม่');if(e.status===404)notify(e.message,true);backoff=Math.min(backoff*1.5,10000);}finally{if(!stopped&&(c.demo||!streamHealthy))poll=setTimeout(refresh,c.demo?1000:backoff);}}
  if(c.databaseURL&&!c.demo){
    stream=new EventSource(`${c.databaseURL.replace(/\/$/,'')}/rooms/${code}/public.json`);
    const receive=event=>{try{
      const {path,data}=JSON.parse(event.data);
      if(path==='/') {if(event.type==='patch')cache={...(cache||{}),...data};else cache=data;}
      else {cache ||= {};const keys=path.slice(1).split('/');let target=cache;for(const k of keys.slice(0,-1))target=target[k] ||= {};const k=keys.at(-1);if(event.type==='patch')target[k]={...(target[k]||{}),...data};else if(data===null)delete target[k];else target[k]=data;}
      if(cache){streamHealthy=true;apply(cache);status('อัปเดตสด');if(poll){clearTimeout(poll);poll=null;}}
    }catch{status('กำลังเชื่อมต่อใหม่');}};
    stream.addEventListener('put',receive);stream.addEventListener('patch',receive);
    stream.addEventListener('cancel',()=>{status('ตรวจสิทธิ์ Firebase');stream.close();if(!poll)refresh();});
    stream.onerror=()=>{streamHealthy=false;status('กำลังเชื่อมต่อใหม่');if(!poll)refresh();};
    // Initial server response also synchronizes the clock; SSE data has its own revision.
    api('public',{room:code},'',true).then(r=>apply(r.state)).catch(e=>notify(e.message,true));
  }else refresh();
  const clock=setInterval(()=>api('config',{},'',true).catch(()=>{}),60000);
  return ()=>{stopped=true;stream?.close();clearTimeout(poll);clearInterval(clock);};
}
export function secondsLeft(s){const r=s?.round;return r?Math.max(0,Math.ceil((r.deadline-now())/1000)):0;}
export const formatMs=ms=>ms===null||ms===undefined?'—':`${(ms/1000).toFixed(2)} วินาที`;
export function scoreList(container,rows=[],group=false,limit=10){rows ||= [];container.replaceChildren();if(!rows.length){container.append(node('p','muted','ยังไม่มีผู้เข้าร่วม'));return;}rows.slice(0,limit).forEach((p,i)=>{const row=node('div','rank-row');row.append(node('span','rank-number',String(i+1)));const name=node('div','rank-name');name.append(node('strong','',group?p.name:p.name),node('small','muted',group?`${p.members} คน · คะแนนเฉลี่ย`:`${p.group} · ถูก ${p.correct} ข้อ`));row.append(name,node('strong','rank-score',p.score.toLocaleString()));container.append(row);});}
export function csvDownload(room){
  const rows=[['ชื่อ','กลุ่ม','คะแนน','ตอบถูก','จำนวนเปลี่ยนคำตอบ','เวลาตอบเฉลี่ย (ms)']];
  for(const p of room.leaderboard)rows.push([p.name,p.group,p.score,p.correct,p.changes,p.averageMs??'']);
  const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=node('a');a.href=url;a.download=`workshop-${room.code}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
