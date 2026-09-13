import QRCode from 'qrcode';
import { randomBytes } from 'node:crypto';
import { configured, demo, readRoom, readPublic, listRooms, createRoom, deleteRoom, updateRoom, takeLimit, checkRules, getAdminPassword, setAdminPassword, listBoards, createBoard, readBoard, updateBoard, listWheels, createWheel, readWheel, updateWheel } from '../lib/store.mjs';
import { newRoom, publicState, mutate, id, assert, GameError } from '../lib/engine.mjs';
import { newBoard, boardPublic, mutateBoard } from '../lib/board.mjs';
import { newWheel, wheelPublic, mutateWheel } from '../lib/wheel.mjs';
import { same, sign, verify, digest } from '../lib/auth.mjs';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
  const send=(code,data)=>{res.statusCode=code;res.end(JSON.stringify(data));};
  try {
    const url=new URL(req.url,'http://localhost');
    if(configured)await checkRules();
    if(req.method==='GET' && url.searchParams.get('action')==='config')return send(200,{configured,demo,shareOrigin:process.env.PUBLIC_URL||null,databaseURL:demo?null:process.env.FIREBASE_DATABASE_URL||null,serverNow:Date.now()});
    assert(configured,'ยังไม่ได้ตั้งค่า Firebase และรหัสผู้สอน ดูคู่มือ SETUP.md',503);
    if(req.method==='GET') {
      const action=url.searchParams.get('action'),code=url.searchParams.get('room')||'';
      if(action==='rooms'){assert(verify(req).role==='admin','เฉพาะผู้สอน',403);return send(200,{rooms:await listRooms(),serverNow:Date.now()});}
      if(action==='boardRooms'){assert(verify(req).role==='admin','เฉพาะผู้สอน',403);return send(200,{rooms:await listBoards(),serverNow:Date.now()});}
      if(action==='wheelRooms'){assert(verify(req).role==='admin','เฉพาะผู้สอน',403);return send(200,{rooms:await listWheels(),serverNow:Date.now()});}
      assert(/^[A-Z0-9]{6}$/.test(code),'รหัสห้องไม่ถูกต้อง');
      if(action==='qr'){
        assert(await readPublic(code),'ไม่พบห้องนี้',404);
        const proto=req.headers['x-forwarded-proto']==='https'?'https':(process.env.VERCEL?'https':'http');
        const base=process.env.PUBLIC_URL||process.env.SITE_URL||`${proto}://${req.headers.host}`;
        const link=new URL(`/games/live/play.html?room=${code}`,base).href;
        const svg=await QRCode.toString(link,{type:'svg',margin:2,width:280});
        res.setHeader('Content-Type','image/svg+xml');res.statusCode=200;return res.end(svg);
      }
      if(action==='public'){const state=await readPublic(code);assert(state,'ไม่พบห้องนี้',404);return send(200,{state,serverNow:Date.now()});}
      if(action==='boardPublic'){const board=await readBoard(code);assert(board,'ไม่พบห้องแผ่นป้าย',404);return send(200,{state:board.public||boardPublic(board),serverNow:Date.now()});}
      if(action==='boardAdmin'){const actor=verify(req);assert(actor.role==='admin','เฉพาะผู้สอน',403);const board=await readBoard(code);assert(board,'ไม่พบห้องแผ่นป้าย',404);return send(200,{board,serverNow:Date.now()});}
      if(action==='wheelPublic'){const w=await readWheel(code);assert(w,'ไม่พบห้องวงล้อ',404);return send(200,{state:w.public||wheelPublic(w),serverNow:Date.now()});}
      if(action==='wheelAdmin'){const actor=verify(req);assert(actor.role==='admin','เฉพาะผู้สอน',403);const w=await readWheel(code);assert(w,'ไม่พบห้องวงล้อ',404);return send(200,{wheel:w,serverNow:Date.now()});}
      const actor=verify(req,code),room=await readRoom(code);assert(room,'ไม่พบห้องนี้',404);
      if(action==='admin'){assert(actor.role==='admin','เฉพาะผู้สอน',403);const {public:_,...privateRoom}=room;return send(200,{room:privateRoom,serverNow:Date.now()});}
      assert(action==='me'&&actor.role==='player','ไม่รู้จักคำสั่ง');
      assert(room.players?.[actor.id],'ไม่พบผู้เล่นนี้',401);
      return send(200,{player:room.players[actor.id],answer:room.rounds?.[room.current]?.answers?.[actor.id]||null,roundId:room.current,serverNow:Date.now()});
    }
    assert(req.method==='POST','รองรับ GET และ POST เท่านั้น',405);
    const origin=req.headers.origin;
    if(origin){const expected=process.env.SITE_URL ? new URL(process.env.SITE_URL).host : req.headers.host;assert(new URL(origin).host===expected,'ไม่อนุญาตคำขอจากเว็บไซต์อื่น',403);}
    assert(String(req.headers['content-type']||'').includes('application/json'),'ต้องส่งข้อมูล JSON',415);
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    assert(body&&typeof body==='object'&&!Array.isArray(body),'ข้อมูลคำขอไม่ถูกต้อง');
    assert(JSON.stringify(body).length<512000,'ข้อมูลใหญ่เกินไป',413);
    const {action,room:code,...data}=body;
    if(action==='login') {
      const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
      assert(await takeLimit(`login-${digest(ip)}`,20,15*60000),'ลองเข้าสู่ระบบหลายครั้งเกินไป รอ 15 นาที',429);
      const currentPassword=await getAdminPassword();
      assert(currentPassword.length>=8,'รหัสผู้สอนต้องยาวอย่างน้อย 8 ตัวอักษร',503);
      assert(same(data.password,currentPassword),'รหัสผู้สอนไม่ถูกต้อง',401);
      return send(200,{token:sign({role:'admin'}),demo,serverNow:Date.now()});
    }
    if(action==='changePassword') {
      const actor=verify(req);assert(actor.role==='admin','เฉพาะผู้สอน',403);
      const currentPassword=await getAdminPassword();
      assert(same(data.currentPassword,currentPassword),'รหัสผ่านเดิมไม่ถูกต้อง',401);
      assert(typeof data.newPassword==='string'&&data.newPassword.length>=8,'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร',400);
      assert(data.newPassword===data.confirmPassword,'ยืนยันรหัสผ่านใหม่ไม่ตรงกัน',400);
      await setAdminPassword(data.newPassword);
      return send(200,{ok:true});
    }
    if(action==='create') {
      const actor=verify(req);assert(actor.role==='admin','เฉพาะผู้สอน',403);
      let room;for(let i=0;i<5;i++){const code=randomBytes(3).toString('hex').toUpperCase();room=newRoom(code,Date.now());room.public=publicState(room,Date.now());if(await createRoom(room))return send(200,{room,serverNow:Date.now()});}
      throw new GameError('สร้างห้องไม่สำเร็จ กรุณาลองใหม่',503);
    }
    if(action==='boardCreate') { const actor=verify(req);assert(actor.role==='admin','เฉพาะผู้สอน',403);let board;for(let i=0;i<5;i++){const code=randomBytes(3).toString('hex').toUpperCase();board=newBoard(code,Date.now());board.public=boardPublic(board);if(await createBoard(board))return send(200,{board,serverNow:Date.now()});}throw new GameError('สร้างห้องแผ่นป้ายไม่สำเร็จ',503); }
    if(action==='wheelCreate') { const actor=verify(req);assert(actor.role==='admin','เฉพาะผู้สอน',403);let w;for(let i=0;i<5;i++){const code=randomBytes(3).toString('hex').toUpperCase();w=newWheel(code,Date.now());w.public=wheelPublic(w);if(await createWheel(w))return send(200,{wheel:w,serverNow:Date.now()});}throw new GameError('สร้างห้องวงล้อไม่สำเร็จ',503); }
    if(action==='delete') {
      const actor=verify(req);assert(actor.role==='admin','เฉพาะผู้สอน',403);assert(/^[A-Z0-9]{6}$/.test(code||''),'รหัสห้องไม่ถูกต้อง');
      assert(await deleteRoom(code),'ไม่พบห้องนี้',404);return send(200,{ok:true,serverNow:Date.now()});
    }
    assert(/^[A-Z0-9]{6}$/.test(code||''),'รหัสห้องไม่ถูกต้อง');
    if(action==='boardOpen'){const board=await readBoard(code);assert(board,'ไม่พบห้องแผ่นป้าย',404);const result=await updateBoard(code,draft=>mutateBoard(draft,action,data,{role:'player'},Date.now()));return send(200,{...result.result,state:result.board.public,serverNow:Date.now()});}
    if(['boardSave','boardReset'].includes(action)){const actor=verify(req);assert(actor.role==='admin','เฉพาะผู้สอน',403);const result=await updateBoard(code,draft=>mutateBoard(draft,action,data,actor,Date.now()));return send(200,{...result.result,state:result.board.public,serverNow:Date.now()});}
    if(action==='wheelSpin'){const result=await updateWheel(code,draft=>mutateWheel(draft,action,data,{role:'player'},Date.now()));return send(200,{...result.result,state:result.wheel.public,serverNow:Date.now()});}
    if(['wheelSave','wheelReset'].includes(action)){const actor=verify(req);assert(actor.role==='admin','เฉพาะผู้สอน',403);const result=await updateWheel(code,draft=>mutateWheel(draft,action,data,actor,Date.now()));return send(200,{...result.result,state:result.wheel.public,serverNow:Date.now()});}
    if(action==='join'&&data.joinKey!==undefined)assert(/^[a-f0-9]{32}$/.test(data.joinKey),'รหัสเข้าร่วมไม่ถูกต้อง');
    const actor=action==='join'?{role:'player',id:data.joinKey?digest(`${code}:${data.joinKey}`).slice(0,24):id(),room:code}:verify(req,code);
    if(action==='join')assert(await takeLimit(`join-${code}`,400,60000),'มีผู้เข้าร่วมมาก กรุณาลองใหม่ในอีกสักครู่',429);
    if(action==='start')data.newRoundId=id();
    const now=Date.now();
    const {room,result}=await updateRoom(code,draft=>mutate(draft,action,data,actor,now));
    send(200,{...result,state:room.public,...(action==='join'?{token:sign(actor)}:{}),serverNow:Date.now()});
  } catch(e) {if(!(e instanceof GameError))console.error('Game API:',e.code||e.message);send(e.status||500,{error:e instanceof GameError?e.message:'ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง'});}
}
