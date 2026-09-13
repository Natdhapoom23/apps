import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { GameError } from './engine.mjs';
export const demo = process.env.DEMO_MODE === 'true' && !process.env.VERCEL;
export const configured = demo || !!(process.env.FIREBASE_DATABASE_URL && process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.ADMIN_PASSWORD && process.env.SESSION_SECRET);
let db;
let adminPasswordCache;
export function database() {
  if (!configured) throw new GameError('ยังไม่ได้ตั้งค่า Firebase และรหัสผู้สอน กรุณาดูคู่มือติดตั้ง',503);
  if (!db) {
    const app = getApps()[0] || initializeApp({ credential:cert({ projectId:process.env.FIREBASE_PROJECT_ID, clientEmail:process.env.FIREBASE_CLIENT_EMAIL, privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n') }), databaseURL:process.env.FIREBASE_DATABASE_URL });
    db=getDatabase(app);
  }
  return db;
}
export async function getAdminPassword() {
  if (demo) return process.env.ADMIN_PASSWORD || 'workshop-demo';
  if (adminPasswordCache) return adminPasswordCache;
  const ref = database().ref('settings/adminPassword');
  const saved = (await ref.get()).val();
  adminPasswordCache = saved || process.env.ADMIN_PASSWORD || '';
  if (!saved && adminPasswordCache) await ref.set(adminPasswordCache);
  return adminPasswordCache;
}
export async function setAdminPassword(value) {
  if (demo) { adminPasswordCache = value; return; }
  await database().ref('settings/adminPassword').set(value);
  adminPasswordCache = value;
}
let memory, chain=Promise.resolve();
const file=resolve(process.env.DEMO_DATA_FILE || '.local/workshop.json');
async function load() { if (!memory) { try { memory=JSON.parse(await readFile(file,'utf8')); } catch(e) { if(e.code!=='ENOENT')throw e; memory={rooms:{},index:{},boards:{},wheels:{},monopolies:{},limits:{}}; } memory.boards ||= {}; memory.wheels ||= {}; memory.monopolies ||= {}; } return memory; }
async function persist() { await mkdir(dirname(file),{recursive:true}); await writeFile(`${file}.tmp`,JSON.stringify(memory)); await rename(`${file}.tmp`,file); }
function serial(fn) { const work=chain.then(fn); chain=work.catch(()=>{}); return work; }
export async function readRoom(code) { return demo ? structuredClone((await load()).rooms[code] || null) : (await database().ref(`rooms/${code}`).get()).val(); }
export async function readPublic(code) { return demo ? structuredClone((await load()).rooms[code]?.public || null) : (await database().ref(`rooms/${code}/public`).get()).val(); }
export async function listBoards() { const rows = demo ? (await load()).boards : (await database().ref('boards').get()).val(); return Object.values(rows||{}).sort((a,b)=>b.createdAt-a.createdAt); }
export async function createBoard(board) { const entry={code:board.code,title:board.title,createdAt:board.createdAt}; if(demo)return serial(async()=>{const state=await load();state.boards ||= {};if(state.boards[board.code])return false;state.boards[board.code]=board;await persist();return true;}); const out=await database().ref(`boards/${board.code}`).transaction(current=>current?undefined:board,undefined,false); return out.committed; }
export async function deleteBoard(code){if(demo)return serial(async()=>{const s=await load();if(!s.boards?.[code])return false;delete s.boards[code];await persist();return true;});const ref=database().ref(`boards/${code}`),e=await ref.get();if(!e.exists())return false;await ref.remove();return true;}
export async function readBoard(code) { return demo ? structuredClone((await load()).boards?.[code]||null) : (await database().ref(`boards/${code}`).get()).val(); }
export async function updateBoard(code,fn) { if(demo)return serial(async()=>{const state=await load();state.boards ||= {};const draft=structuredClone(state.boards[code]||null);const result=fn(draft);state.boards[code]=draft;await persist();return {board:draft,result};}); const ref=database().ref(`boards/${code}`);const latest=(await ref.get()).val();if(!latest)throw new GameError('ไม่พบห้องนี้',404);const result=fn(latest);await ref.set(latest);return {board:latest,result}; }
export async function listWheels(){const rows=demo?(await load()).wheels:(await database().ref('wheels').get()).val();return Object.values(rows||{}).sort((a,b)=>b.createdAt-a.createdAt);}
export async function createWheel(w){if(demo)return serial(async()=>{const s=await load();if(s.wheels[w.code])return false;s.wheels[w.code]=w;await persist();return true;});const o=await database().ref(`wheels/${w.code}`).transaction(c=>c?undefined:w,undefined,false);return o.committed;}
export async function deleteWheel(code){if(demo)return serial(async()=>{const s=await load();if(!s.wheels?.[code])return false;delete s.wheels[code];await persist();return true;});const ref=database().ref(`wheels/${code}`),exists=await ref.get();if(!exists.exists())return false;await ref.remove();return true;}
export async function readWheel(code){return demo?structuredClone((await load()).wheels?.[code]||null):(await database().ref(`wheels/${code}`).get()).val();}
export async function updateWheel(code,fn){if(demo)return serial(async()=>{const s=await load(),d=structuredClone(s.wheels[code]||null),result=fn(d);s.wheels[code]=d;await persist();return {wheel:d,result};});const ref=database().ref(`wheels/${code}`),d=(await ref.get()).val();if(!d)throw new GameError('ไม่พบห้องนี้',404);const result=fn(d);await ref.set(d);return {wheel:d,result};}
export async function listMonopolies(){const rows=demo?(await load()).monopolies:(await database().ref('monopolies').get()).val();return Object.values(rows||{}).sort((a,b)=>b.createdAt-a.createdAt);}
export async function createMonopoly(g){if(demo)return serial(async()=>{const s=await load();if(s.monopolies[g.code])return false;s.monopolies[g.code]=g;await persist();return true;});const o=await database().ref(`monopolies/${g.code}`).transaction(c=>c?undefined:g,undefined,false);return o.committed;}
export async function readMonopoly(c){return demo?structuredClone((await load()).monopolies?.[c]||null):(await database().ref(`monopolies/${c}`).get()).val();}
export async function updateMonopoly(c,fn){if(demo)return serial(async()=>{const s=await load(),d=structuredClone(s.monopolies[c]||null),result=fn(d);s.monopolies[c]=d;await persist();return {game:d,result};});const ref=database().ref(`monopolies/${c}`);await ref.get();let result;const out=await ref.transaction(d=>{if(!d)return;result=fn(d);return d;},undefined,false);if(!out.committed)throw new GameError('กรุณาลองอีกครั้ง',409);return {game:out.snapshot.val(),result};}

export async function deleteMonopoly(c){if(demo)return serial(async()=>{const s=await load();if(!s.monopolies?.[c])return false;delete s.monopolies[c];await persist();return true;});const ref=database().ref(`monopolies/${c}`),e=await ref.get();if(!e.exists())return false;await ref.remove();return true;}
export async function listRooms() { const rows=demo ? (await load()).index : (await database().ref('roomIndex').get()).val(); return Object.values(rows||{}).sort((a,b)=>b.createdAt-a.createdAt); }
export async function createRoom(room) {
  const entry={code:room.code,title:room.title,createdAt:room.createdAt};
  if (demo) return serial(async()=>{const state=await load();if(state.rooms[room.code])return false;state.rooms[room.code]=room;state.index[room.code]=entry;await persist();return true;});
  const out=await database().ref(`rooms/${room.code}`).transaction(current=>current ? undefined : room,undefined,false);
  if(out.committed) await database().ref(`roomIndex/${room.code}`).set(entry);
  return out.committed;
}
export async function deleteRoom(code) {
  if (demo) return serial(async()=>{const state=await load();if(!state.rooms[code])return false;delete state.rooms[code];delete state.index[code];await persist();return true;});
  const exists=await database().ref(`rooms/${code}`).get();
  if(!exists.exists())return false;
  await database().ref().update({[`rooms/${code}`]:null,[`roomIndex/${code}`]:null});
  return true;
}
export async function updateRoom(code,fn) {
  if (demo) return serial(async()=>{const state=await load(), draft=structuredClone(state.rooms[code]||null);const result=fn(draft);state.rooms[code]=draft;await persist();return {room:draft,result};});
  const ref=database().ref(`rooms/${code}`);
  for(let attempt=0;attempt<3;attempt++){
    let result;
    // Populate the SDK cache before the transaction; callback still handles null safely.
    await ref.get();
    const out=await ref.transaction(current=>{if(!current)return;result=fn(current);return current;},undefined,false);
    if(out.committed)return {room:out.snapshot.val(),result};
    await new Promise(resolve=>setTimeout(resolve,150*(attempt+1)));
  }
  // Some Firebase regions can return an uncommitted transaction when the
  // serverless connection is briefly cold. Host actions are serialized in
  // the UI, so a read-modify-write fallback keeps the room usable.
  const latest=(await ref.get()).val();
  if(!latest)throw new GameError('ไม่พบห้องนี้',404);
  const result=fn(latest);
  await ref.set(latest);
  return {room:latest,result};
}
export async function takeLimit(key, max, windowMs) {
  const now=Date.now();
  const next=current=>{const v=current?.until>now?current:{count:0,until:now+windowMs};return {...v,count:v.count+1};};
  if(demo)return serial(async()=>{const s=await load(); s.limits ||= {};const v=next(s.limits[key]);s.limits[key]=v;return v.count<=max;});
  const out=await database().ref(`limits/${key}`).transaction(next,undefined,false);
  return out.snapshot.val().count<=max;
}
let rulesCheckedAt=0;
export async function checkRules() {
  if(demo || !configured || Date.now()-rulesCheckedAt<60000)return;
  const base=process.env.FIREBASE_DATABASE_URL.replace(/\/$/,'');
  const response=await fetch(`${base}/rooms/__private_rules_probe__/questions.json`,{signal:AbortSignal.timeout(6000)});
  if(![401,403].includes(response.status))throw new GameError('ต้องติดตั้ง Database Rules ให้ปิดการอ่านข้อมูลส่วนตัวก่อนใช้งาน ดู firebase.rules.json',503);
  rulesCheckedAt=Date.now();
}
