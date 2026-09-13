import { randomBytes } from 'node:crypto';
import { seedQuestions } from './questions.mjs';
export class GameError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export const assert = (condition, message, status) => { if (!condition) throw new GameError(message, status); };
export const id = () => randomBytes(12).toString('hex');
const clean = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const integer = (v, min, max, label) => { const n = Number(v); assert(Number.isInteger(n) && n >= min && n <= max, `${label} ต้องอยู่ระหว่าง ${min}–${max}`); return n; };
export function validateQuestion(q) {
  assert(q && typeof q === 'object', 'คำถามไม่ถูกต้อง');
  const title = clean(q.title, 1000);
  assert(title, 'กรุณาใส่คำถาม');
  assert(Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 6, 'ต้องมี 2–6 ตัวเลือก');
  const options = q.options.map(o => clean(o, 160));
  assert(options.every(Boolean) && new Set(options).size === options.length, 'ตัวเลือกต้องไม่ว่างหรือซ้ำกัน');
  const correct = q.correct == null || q.correct === '' ? null : integer(q.correct, 0, options.length - 1, 'เฉลย');
  const image = clean(q.image, 2000), source = clean(q.source, 2000);
  assert(!image || /^https:\/\//.test(image) || /^\/assets\/[a-zA-Z0-9_./-]+$/.test(image), 'รูปต้องเป็นลิงก์ HTTPS หรือ /assets/...');
  assert(!source || /^https:\/\//.test(source), 'แหล่งภาพต้องเป็นลิงก์ HTTPS');
  return { id: clean(q.id, 50) || id(), title, options, correct, image, source, explanation: clean(q.explanation, 3000), seconds: integer(q.seconds, 5, 300, 'เวลา') };
}
export function newRoom(code, now) {
  return { code, title: 'AI Workshop Live', createdAt: now, updatedAt: now, phase: 'lobby', accepting: true,
    groups: ['กลุ่ม 1','กลุ่ม 2','กลุ่ม 3','กลุ่ม 4'], questions: structuredClone(seedQuestions), players: {}, rounds: {}, current: null,
    settings: { base: 1000, speed: 500, steady: 100, showDistribution: false, capacity: 100, shuffleQuestions: false }, revision: 0 };
}
export function points(answer, round, settings) {
  if (!answer || round.question.correct == null || answer.choice !== round.question.correct) return 0;
  const fraction = Math.max(0, Math.min(1, 1 - (answer.at - round.startAt) / (round.deadline - round.startAt)));
  return settings.base + Math.round(settings.speed * fraction) + (answer.changes === 0 ? settings.steady : 0);
}
export function rankings(room) {
  const rounds = Object.values(room.rounds || {}).filter(r => r.revealed);
  return Object.values(room.players || {}).map(p => {
    let score = 0, correct = 0, changes = 0, responseTotal = 0, answered = 0;
    for (const r of rounds) {
      const a = r.answers?.[p.id];
      if (!a) continue;
      score += points(a, r, r.settings); changes += a.changes;
      if (r.question.correct != null) { answered++; responseTotal += a.at - r.startAt; if (a.choice === r.question.correct) correct++; }
    }
    return { id:p.id, name:p.name, group:p.group, score, correct, changes, answered, averageMs: answered ? Math.round(responseTotal / answered) : null };
  }).sort((a,b) => b.score-a.score || b.correct-a.correct || (a.averageMs ?? Infinity)-(b.averageMs ?? Infinity) || a.id.localeCompare(b.id));
}
export function publicState(room, now) {
  const r = room.current ? room.rounds?.[room.current] : null;
  const leaderboard = rankings(room);
  const groups = room.groups.map(name => {
    const members = leaderboard.filter(p => p.group === name);
    return { name, members: members.length, score: members.length ? Math.round(members.reduce((s,p)=>s+p.score,0)/members.length) : 0 };
  }).sort((a,b)=>b.score-a.score);
  const answers = Object.values(r?.answers || {});
  const round = r ? { id:r.id, number:r.number, startAt:r.startAt, deadline:r.deadline, closedAt:r.closedAt || null,
    revealed:!!r.revealed, title:r.question.title, image:r.question.image, source:r.question.source, options:r.question.options,
    total:answers.length, distribution: r.revealed || room.settings.showDistribution ? r.question.options.map((_,i)=>answers.filter(a=>a.choice===i).length) : null,
    correct: r.revealed ? (r.question.correct ?? null) : undefined, explanation:r.revealed ? r.question.explanation : undefined,
    fastest: r.revealed ? Object.entries(r.answers || {}).filter(([,a])=>r.question.correct != null && a.choice === r.question.correct).sort((a,b)=>a[1].at-b[1].at).slice(0,3).map(([pid,a])=>({name:room.players[pid]?.name, ms:a.at-r.startAt})) : [] } : null;
  // JSON removes undefined; Firebase does not accept undefined values.
  return JSON.parse(JSON.stringify({ code:room.code, title:room.title, phase:room.phase, accepting:room.accepting, groups:room.groups,
    playerCount:leaderboard.length, capacity:room.settings.capacity, questionCount:room.questions.length, leaderboard, groupScores:groups,
    settings:room.settings, round, revision:room.revision, serverNow:now }));
}
export function mutate(room, action, data, actor, now) {
  assert(room, 'ไม่พบห้องนี้ ตรวจรหัสห้องอีกครั้ง', 404);
  const r = room.current ? room.rounds?.[room.current] : null;
  room.players ||= {}; room.rounds ||= {};
  let result = {};
  if (action === 'join') {
    if(room.players[actor.id])return {player:room.players[actor.id]};
    assert(room.accepting && room.phase !== 'finished', 'ห้องนี้ปิดรับผู้เล่นแล้ว', 409);
    const name = clean(data.name, 40), group = clean(data.group, 50);
    assert(name, 'กรุณาใส่ชื่อ'); assert(room.groups.includes(group), 'กรุณาเลือกกลุ่มที่มีในห้อง');
    assert(Object.keys(room.players).length < room.settings.capacity, 'จำนวนผู้เล่นเต็มแล้ว', 409);
    assert(!Object.values(room.players).some(p=>p.name.toLocaleLowerCase() === name.toLocaleLowerCase()), 'ชื่อนี้มีผู้ใช้แล้ว กรุณาเพิ่มชื่อเล่นหรือนามสกุล');
    room.players[actor.id] = { id:actor.id, name, group, joinedAt:now };
    result.player = room.players[actor.id];
  } else if (action === 'answer') {
    assert(actor.role === 'player' && room.players[actor.id], 'กรุณาเข้าร่วมใหม่', 401);
    assert(r && data.roundId === r.id && room.phase === 'open' && now < r.deadline && !r.closedAt, 'หมดเวลาหรือรอบนี้ปิดแล้ว', 409);
    const choice = integer(data.choice,0,r.question.options.length-1,'คำตอบ');
    r.answers ||= {};
    const prev = r.answers[actor.id];
    // Idempotent retry of an identical selection never changes time or change count.
    if (!prev || prev.choice !== choice) {
      assert(!prev || now - prev.at >= 250, 'โปรดรอสักครู่ก่อนเปลี่ยนคำตอบ', 429);
      r.answers[actor.id] = { choice, firstAt: prev?.firstAt || now, at:now, changes:prev ? prev.changes+1 : 0 };
    }
    result.answer = r.answers[actor.id];
  } else {
    assert(actor.role === 'admin', 'เฉพาะผู้สอนเท่านั้น', 403);
    if (action === 'save') {
      assert(room.phase !== 'open', 'ปิดรอบที่กำลังเล่นก่อนแก้คำถามหรือกติกา', 409);
      const groups = Array.isArray(data.groups) ? data.groups.map(v=>clean(v,50)).filter(Boolean) : room.groups;
      assert(groups.length >= 1 && groups.length <= 20 && new Set(groups).size === groups.length, 'กำหนดกลุ่ม 1–20 กลุ่ม ชื่อไม่ซ้ำกัน');
      assert(!Object.values(room.players).some(p=>!groups.includes(p.group)), 'ลบหรือเปลี่ยนชื่อกลุ่มที่มีผู้เล่นแล้วไม่ได้');
      assert(Array.isArray(data.questions) && data.questions.length >= 1 && data.questions.length <= 100, 'ต้องมีคำถาม 1–100 ข้อ');
      const questions = data.questions.map(validateQuestion);
      assert(new Set(questions.map(q=>q.id)).size === questions.length, 'รหัสคำถามซ้ำกัน');
      const s=data.settings || room.settings;
      room.settings = { base:integer(s.base,0,10000,'คะแนนถูก'), speed:integer(s.speed,0,10000,'โบนัสเร็ว'), steady:integer(s.steady,0,10000,'โบนัสไม่เปลี่ยนใจ'),
        capacity:integer(s.capacity,1,200,'จำนวนผู้เล่น'), showDistribution:!!s.showDistribution, shuffleQuestions:!!s.shuffleQuestions };
      assert(room.settings.capacity >= Object.keys(room.players).length, 'จำนวนสูงสุดต้องไม่น้อยกว่าผู้เล่นปัจจุบัน');
      room.title = clean(data.title,100) || room.title; room.groups = groups; room.questions = questions;
    } else if (action === 'start') {
      assert(room.phase !== 'open' && room.phase !== 'closed' && room.phase !== 'finished', 'เฉลยรอบปัจจุบันก่อนเริ่มข้อใหม่',409);
      let q = room.questions.find(q=>q.id === data.questionId);
      if (data.next) {
        const played = new Set(Object.values(room.rounds).map(x=>x.question.id));
        const remaining = room.questions.filter(x=>!played.has(x.id));
        assert(remaining.length,'เล่นครบทุกข้อแล้ว กรุณาจบกิจกรรมเพื่อดูผลรวม',409);
        q = room.settings.shuffleQuestions ? remaining[randomBytes(1)[0] % remaining.length] : remaining[0];
      }
      assert(q,'ไม่พบคำถาม');
      assert(!Object.values(room.rounds).some(r=>r.question.id===q.id), 'ข้อนี้เล่นแล้ว กรุณาเลือกข้อใหม่',409);
      const rid = data.newRoundId; assert(rid, 'ไม่พบรหัสรอบ');
      const number=Object.keys(room.rounds).length+1;
      const question=structuredClone(q);
      room.rounds[rid] = { id:rid, number, question, settings:structuredClone(room.settings), startAt:now, deadline:now+question.seconds*1000, answers:{}, revealed:false };
      room.current=rid; room.phase='open';
    } else if (action === 'close') {
      assert(r && room.phase==='open','ไม่มีรอบที่เปิดอยู่',409); r.closedAt=Math.min(now,r.deadline); room.phase='closed';
    } else if (action === 'reveal') {
      assert(r && (room.phase==='closed' || (room.phase==='open' && now>=r.deadline)), 'ปิดรับคำตอบก่อนเฉลย',409);
      r.closedAt ||= Math.min(now,r.deadline); r.revealed=true; room.phase='revealed';
    } else if (action === 'admission') { room.accepting=!!data.accepting;
    } else if (action === 'finish') {
      assert(room.phase !== 'open' && room.phase !== 'closed', 'ปิดรับและเฉลยข้อปัจจุบันก่อนจบกิจกรรม',409); room.phase='finished'; room.accepting=false;
    } else throw new GameError('ไม่รู้จักคำสั่ง');
  }
  room.revision++; room.updatedAt=now; room.public=publicState(room,now);
  return result;
}
