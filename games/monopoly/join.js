import { api, roomCode } from '../live/shared.js';
const $ = s => document.querySelector(s), code = roomCode(), keyName = `monopoly-player-${code}`;
let joinKey = localStorage.getItem(`${keyName}-join-key`);
if (!joinKey) { joinKey = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join(''); localStorage.setItem(`${keyName}-join-key`, joinKey); }
let state = null, participant = null, answerRound = null, busy = false;
const tokenKey = `${keyName}-token`;
const notice = (message, bad = false) => { $('#notice').textContent = message; $('#notice').className = `notice${bad ? ' bad' : ''}`; $('#notice').hidden = false; };
const saveState = () => localStorage.setItem(tokenKey, participant ? (localStorage.getItem(tokenKey) || '') : '');
function render() {
  if (!state) return;
  $('#room-title').textContent = state.title;
  if (!participant) {
    const teamSelect = $('#team');
    const teams = state.players || [];
    const signature = teams.map(t => `${t.id}:${t.name}:${t.members || 0}`).join('|');
    if (teamSelect.dataset.signature !== signature) {
      const selected = teamSelect.value;
      teamSelect.replaceChildren(new Option('เลือกทีม', ''));
      teams.forEach(t => teamSelect.append(new Option(`${t.name} · ${t.members || 0} คน`, t.id)));
      teamSelect.dataset.signature = signature;
      teamSelect.value = teams.some(t => t.id === selected) ? selected : '';
    }
    $('#join-panel').hidden = false; $('#player-panel').hidden = true; return;
  }
  $('#join-panel').hidden = true; $('#player-panel').hidden = false;
  const team = state.players?.find(t => t.id === participant.teamId);
  $('#player-team').textContent = team?.name || 'ทีมของคุณ';
  const r = state.lastRoll;
  const active = r?.phase === 'question' && Date.now() < r.deadline;
  $('#question-panel').hidden = !active;
  if (!r) { $('#status').textContent = state.winner ? `🏆 ${state.winner.name} ชนะเกม` : 'รอทีมของคุณทอยลูกเต๋า'; return; }
  if (r.phase === 'landing') { $('#status').textContent = 'กำลังเดินเบี้ยบนจอหลัก...'; return; }
  if (r.phase === 'question') {
    $('#status').textContent = active ? 'ดูคำถามบนจอหลัก แล้วส่งคำตอบของคุณ' : 'หมดเวลาตอบแล้ว';
    if (active) {
      $('#question').textContent = 'คำถามแสดงอยู่บนจอหลัก';
      const options = $('#options'); options.replaceChildren();
      if (r.question.type === 'choice') r.question.options.forEach((x, i) => { const b = document.createElement('button'); b.textContent = x; b.disabled = busy || answerRound === r.id; b.onclick = () => send({choice:i}, r.id); options.append(b); });
      else { const input=document.createElement('input'); input.className='mobile-answer'; input.type=r.question.type==='number'||r.question.type==='image-count'?'number':'text'; input.inputMode=input.type==='number'?'numeric':'text'; input.placeholder='พิมพ์คำตอบ'; input.disabled=busy||answerRound===r.id; const b=document.createElement('button'); b.textContent='ส่งคำตอบ'; b.disabled=input.disabled; b.onclick=()=>send({answer:input.value},r.id); options.append(input,b); }
      $('#timer').textContent = `เหลือ ${Math.max(0, Math.ceil((r.deadline - Date.now()) / 1000))} วินาที`;
    }
  } else { $('#status').textContent = r.hero ? `เฉลยแล้ว · ฮีโร่คือ ${r.hero.name}` : 'หมดเวลา ไม่มีคำตอบถูก'; }
}
async function load() {
  try { const r = await api('monopolyPublic', { room: code }, '', true); state = r.state; if (!participant && localStorage.getItem(tokenKey)) { const me = await api('monopolyMe', { room: code }, localStorage.getItem(tokenKey), true); participant = me.participant; state = me.state; } render(); }
  catch (e) { notice(e.message, true); }
}
async function send(answer, roundId) {
  if (busy) return; busy = true; answerRound = roundId; render();
  try { const r = await api('monopolyAnswer', { room: code, roundId, ...answer }, localStorage.getItem(tokenKey)); state = r.state; notice('ส่งคำตอบแล้ว'); }
  catch (e) { answerRound = null; notice(e.message, true); }
  finally { busy = false; render(); }
}
$('#room-code').textContent = code;
$('#join-form').onsubmit = async e => { e.preventDefault(); if (busy) return; busy = true; try { const r = await api('monopolyJoin', { room: code, joinKey, name: $('#player-name').value, teamId: $('#team').value }); localStorage.setItem(tokenKey, r.token); participant = r.participant; state = r.state; notice('เข้าร่วมเกมแล้ว'); } catch (error) { notice(error.message, true); } finally { busy = false; render(); } };
$('#leave').onclick = () => { participant = null; localStorage.removeItem(tokenKey); answerRound = null; render(); };
setInterval(() => { render(); if (state) load(); }, 700);
if (!/^[A-Z0-9]{6}$/.test(code)) notice('กรุณาสแกน QR จากหน้าจอเกม', true); else load();
