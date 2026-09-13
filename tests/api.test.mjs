import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
test('end-to-end API: 100 players, concurrent answers, auth, QR, isolation, export state and durable reload',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'workshop-test-'));let server;
 const port=String(20000+Math.floor(Math.random()*20000)),base=`http://127.0.0.1:${port}`;
 const env={...process.env,PORT:port,DEMO_MODE:'true',DEMO_DATA_FILE:join(dir,'data.json'),ADMIN_PASSWORD:'test-password-123',SESSION_SECRET:'test-secret-only-12345678901234567890'};delete env.VERCEL;
 async function start(){server=spawn(process.execPath,['scripts/dev.mjs'],{env,stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);for(let i=0;i<100;i++){try{const r=await fetch(`${base}/api/game?action=config`);if(r.ok)return;}catch{}await sleep(50);}throw new Error(logs);}
 async function stop(){if(!server||server.exitCode!==null)return;await new Promise(resolve=>{server.once('exit',resolve);server.kill();});}
 t.after(async()=>{await stop();await rm(dir,{recursive:true,force:true});});await start();
 async function call(action,data={},token='',get=false){const res=await fetch(get?`${base}/api/game?${new URLSearchParams({action,...data})}`:`${base}/api/game`,{method:get?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:get?undefined:JSON.stringify({action,...data})});return {status:res.status,body:await res.json()};}
 assert.equal((await call('login',{password:'bad'})).status,401);
 const admin=(await call('login',{password:env.ADMIN_PASSWORD})).body.token;
 const created=await call('create',{},admin);assert.equal(created.status,200);const code=created.body.room.code;
 assert.equal((await call('admin',{room:code},'',true)).status,401);
 const players=await Promise.all(Array.from({length:100},(_,i)=>call('join',{room:code,joinKey:i.toString(16).padStart(32,'0'),name:`ผู้เล่น ${i+1}`,group:`กลุ่ม ${i%4+1}`})));
 assert.equal(players.filter(p=>p.status===200).length,100);
 assert.equal((await call('join',{room:code,name:'เกิน',group:'กลุ่ม 1'})).status,409);
 const first=players[0].body.token;
 const retried=await call('join',{room:code,joinKey:'0'.repeat(32),name:'ผู้เล่น 1',group:'กลุ่ม 1'});assert.equal(retried.status,200);assert.equal(retried.body.player.id,players[0].body.player.id);assert.equal(retried.body.state.playerCount,100);
 assert.equal((await call('close',{room:code},first)).status,403);
 const startRound=await call('start',{room:code,questionId:'q1'},admin);assert.equal(startRound.status,200);const rid=startRound.body.state.round.id;
 const before=Date.now();const answered=await Promise.all(players.map((p,i)=>call('answer',{room:code,roundId:rid,choice:i%2},p.body.token)));
 assert.equal(answered.filter(r=>r.status===200).length,100);t.diagnostic(`100 simultaneous demo answers completed in ${Date.now()-before} ms (local store, not Firebase benchmark)`);
 const pub=(await call('public',{room:code},'',true)).body.state;assert.equal(pub.round.total,100);assert.equal(pub.round.correct,undefined);assert.equal(pub.leaderboard.every(p=>p.score===0),true);
 await call('close',{room:code},admin);assert.equal((await call('answer',{room:code,roundId:rid,choice:1},first)).status,409);
 const reveal=await call('reveal',{room:code},admin);assert.equal(reveal.body.state.leaderboard.filter(p=>p.score>0).length,50);
 const second=(await call('create',{},admin)).body.room.code;assert.equal((await call('me',{room:second},first,true)).status,403);
 const qr=await fetch(`${base}/api/game?action=qr&room=${code}`);assert.equal(qr.status,200);assert.match(await qr.text(),/<svg/);
 assert.equal((await fetch(`${base}/lib/engine.mjs`)).status,404);assert.equal((await fetch(`${base}/.env`)).status,404);
 assert.equal((await fetch(`${base}/games/live/play.html?room=${code}`)).status,200);
 await call('finish',{room:code},admin);await stop();await start();assert.equal((await call('public',{room:code},'',true)).body.state.phase,'finished');
});
