import {api, roomCode} from '../live/shared.js';
import {landingAngle, coastProgress} from './wheel-motion.js';
const $ = s => document.querySelector(s);
const code = roomCode();
const wheel = $('#wheel');
const modal = $('#result-modal');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let state, busy = false, angle = 0, optionsKey = '', shownSpin = null;
const colors = ['#5364ec', '#eba331', '#239c80', '#df626e', '#9160dc', '#198eae', '#dd8033', '#478447'];

function notice(message = '') {
  $('#notice').textContent = message;
  $('#notice').hidden = !message;
}
function render() {
  if (!state) return;
  $('#title').textContent = state.title;
  $('#spin').disabled = busy || !state.options.length;
  $('#spin').innerHTML = busy ? 'กำลังหมุน…' : 'หมุนวงล้อ <span aria-hidden="true">↻</span>';
  const key = JSON.stringify(state.options);
  if (key === optionsKey) return;
  optionsKey = key;
  const n = state.options.length;
  wheel.style.background = `conic-gradient(${state.options.map((_, i) => `${colors[i % colors.length]} ${i * 100 / n}% ${(i + 1) * 100 / n}%`).join(',')})`;
  wheel.replaceChildren();
  state.options.forEach((label, i) => {
    const rad = (i + .5) * 2 * Math.PI / n;
    const el = document.createElement('span');
    el.className = 'wheel-label';
    el.textContent = label;
    el.title = label;
    el.style.left = `${50 + 32 * Math.sin(rad)}%`;
    el.style.top = `${50 - 32 * Math.cos(rad)}%`;
    el.style.width = `${Math.min(32, 150 / n)}%`;
    el.style.fontSize = `clamp(9px, ${Math.max(1.3, Math.min(4.4, 22 / n))}cqi, 34px)`;
    wheel.append(el);
  });
}
function setAngle(value) {
  angle = value;
  wheel.style.setProperty('--rotation', `${value}deg`);
}
function spinKey(s) { return s.spinRevision ?? (s.result ? s.revision : null); }
function showResult(result) {
  $('#result').textContent = `ตัวเลือกที่ได้: ${result}`;
  $('#modal-result').textContent = result;
  if (!modal.open) modal.showModal();
}
function closeResult() { modal.close(); }
$('#close-modal').onclick = $('#dismiss-result').onclick = closeResult;
modal.onclick = e => { if (e.target === modal) closeResult(); };

function coast(target, duration, initialSpeed = 0) {
  const from = angle;
  const started = performance.now();
  const ramp = reducedMotion.matches ? 0 : Math.min(350, duration * .15);
  const distance = target - from;
  const startSpeed = initialSpeed / 1000;
  const peakSpeed = (distance - startSpeed * ramp / 2) / (ramp / 2 + (duration - ramp) / 4);
  const rampDistance = (startSpeed + peakSpeed) * ramp / 2;
  return new Promise(resolve => {
    function frame(now) {
      const elapsed = Math.min(duration, now - started);
      const progress = elapsed / duration;
      const traveled = elapsed < ramp
        ? startSpeed * elapsed + (peakSpeed - startSpeed) * elapsed * elapsed / (2 * ramp)
        : rampDistance + (distance - rampDistance) * coastProgress((elapsed - ramp) / (duration - ramp));
      setAngle(from + traveled);
      if (progress < 1) requestAnimationFrame(frame);
      else { setAngle(((target % 360) + 360) % 360); resolve(); }
    }
    requestAnimationFrame(frame);
  });
}
async function finishSpin(next, initialSpeed = 0) {
  state = next;
  render();
  const index = Number.isInteger(state.resultIndex) ? state.resultIndex : Math.max(0, state.options.indexOf(state.result));
  const target = landingAngle(angle, index, state.options.length, reducedMotion.matches ? 0 : Math.max(5, Math.ceil(state.duration * .8)));
  await coast(target, reducedMotion.matches ? 120 : Math.max(1000, state.duration * 1000), initialSpeed);
  shownSpin = spinKey(state);
  // This is the sole reveal point, after the final animation frame has settled.
  busy = false;
  document.body.classList.remove('spinning');
  render();
  showResult(state.result);
}
async function refresh() {
  try {
    const {state: next} = await api('wheelPublic', {room: code}, '', true);
    if (busy || (state && next.revision < state.revision)) return;
    const initial = !state;
    const newResult = next.result && !initial && spinKey(next) !== shownSpin;
    state = next;
    if (newResult) {
      busy = true;
      modal.close();
      document.body.classList.add('spinning');
      $('#result').textContent = 'กำลังลุ้นผล…';
      await finishSpin(next);
    } else {
      render();
      if (initial && state.result) {
        shownSpin = spinKey(state);
        const index = state.resultIndex ?? Math.max(0, state.options.indexOf(state.result));
        setAngle(landingAngle(0, index, state.options.length, 0));
        $('#result').textContent = `ผลล่าสุด: ${state.result}`;
      } else if (!state.result) {
        shownSpin = null;
        modal.close();
        $('#result').textContent = 'พร้อมลุ้นไปด้วยกัน';
      }
    }
  } catch (error) { notice(error.message); }
  finally { setTimeout(refresh, 1500); }
}
$('#spin').onclick = async () => {
  if (busy || !state) return;
  busy = true;
  modal.close();
  notice();
  document.body.classList.add('spinning');
  $('#result').textContent = 'กำลังลุ้นผล…';
  render();
  // Start moving immediately while the server selects the result.
  let waiting = true;
  let lastFrame = performance.now();
  let speed = 0;
  function accelerate(now) {
    if (!waiting) return;
    const dt = Math.min(50, now - lastFrame);
    lastFrame = now;
    speed = Math.min(720, speed + dt * 1.5);
    if (!reducedMotion.matches) setAngle(angle + speed * dt / 1000);
    requestAnimationFrame(accelerate);
  }
  requestAnimationFrame(accelerate);
  try {
    const response = await api('wheelSpin', {room: code});
    waiting = false;
    await finishSpin(response.state, reducedMotion.matches ? 0 : speed);
  } catch (error) {
    waiting = false;
    busy = false;
    document.body.classList.remove('spinning');
    render();
    notice(error.message);
    $('#result').textContent = 'หมุนไม่สำเร็จ กรุณาลองอีกครั้ง';
  }
};
$('#fullscreen').hidden = !document.fullscreenEnabled;
$('#fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { notice('เบราว์เซอร์นี้ไม่สามารถเปิดโหมดเต็มหน้าจอได้'); }
};
document.addEventListener('fullscreenchange', () => {
  $('#fullscreen').textContent = document.fullscreenElement ? 'ออกจากเต็มจอ ↙' : 'เต็มหน้าจอ ↗';
});
refresh();
