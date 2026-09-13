import { createHmac, timingSafeEqual } from 'node:crypto';
import { demo } from './store.mjs';
import { assert } from './engine.mjs';
const secret=()=>process.env.SESSION_SECRET || (demo ? 'local-demo-secret-not-for-production-2026' : '');
export const password=()=>process.env.ADMIN_PASSWORD || (demo ? 'workshop-demo' : '');
export function same(a,b) { const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length && timingSafeEqual(x,y); }
export const digest=v=>createHmac('sha256',secret()).update(String(v)).digest('hex');
export function sign(payload) { assert(secret().length>=24,'SESSION_SECRET ต้องยาวอย่างน้อย 24 ตัวอักษร',503);const body=Buffer.from(JSON.stringify({...payload,exp:Date.now()+12*3600*1000})).toString('base64url');return `${body}.${digest(body)}`; }
export function verify(req,room) {
  const token=String(req.headers.authorization||'').replace(/^Bearer /,'');const [body,sig,...rest]=token.split('.');
  assert(body&&sig&&!rest.length&&same(sig,digest(body)), 'กรุณาเข้าสู่ระบบอีกครั้ง',401);
  let p;try{p=JSON.parse(Buffer.from(body,'base64url').toString());}catch{assert(false,'ข้อมูลเข้าสู่ระบบไม่ถูกต้อง',401);}
  assert(p.exp>Date.now(),'หมดอายุการเข้าสู่ระบบ กรุณาเข้าใหม่',401);
  assert(p.role==='admin'||p.room===room,'ไม่มีสิทธิ์เข้าถึงห้องนี้',403);return p;
}
