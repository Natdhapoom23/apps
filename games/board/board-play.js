import {api, roomCode} from '../live/shared.js';
const $ = s => document.querySelector(s);
const code = roomCode();
const cards = new Map();
const pending = new Map();
let state;

function notice(message) {
  $('#notice').textContent = message;
  $('#notice').hidden = !message;
}
function accept(next) {
  if (!state || next.revision >= state.revision) state = next;
  render();
}
function createCard(id) {
  const button = document.createElement('button');
  button.className = 'tile';
  button.type = 'button';
  button.innerHTML = '<span class="tile-tilt"><span class="tile-flipper"><span class="tile-face tile-front"><span class="tile-number"></span><span class="tile-hint">คลิกเพื่อเปิด</span></span><span class="tile-face tile-back"><span class="tile-text"></span><img hidden alt=""><span class="tile-hint">คลิกเพื่อปิด</span></span></span></span>';
  button.querySelector('.tile-number').textContent = id;
  button.onclick = () => toggle(id);
  button.onpointermove = e => {
    if (e.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = button.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    button.style.setProperty('--tilt-x', `${(0.5 - y) * 12}deg`);
    button.style.setProperty('--tilt-y', `${(x - 0.5) * 12}deg`);
    button.style.setProperty('--glow-x', `${x * 100}%`);
    button.style.setProperty('--glow-y', `${y * 100}%`);
  };
  button.onpointerleave = button.onpointercancel = () => {
    button.style.setProperty('--tilt-x', '0deg');
    button.style.setProperty('--tilt-y', '0deg');
  };
  $('#tiles').append(button);
  return button;
}
function render() {
  if (!state) return;
  $('#title').textContent = state.title;
  const ids = new Set(state.tiles.map(t => t.id));
  for (const [id, button] of cards) if (!ids.has(id)) { button.remove(); cards.delete(id); }
  let openedCount = 0;
  for (const tile of state.tiles) {
    let button = cards.get(tile.id);
    if (!button) { button = createCard(tile.id); cards.set(tile.id, button); }
    const opened = pending.get(tile.id)?.desired ?? tile.opened;
    openedCount += Number(opened);
    button.classList.toggle('opened', opened);
    button.setAttribute('aria-pressed', String(opened));
    button.setAttribute('aria-label', `แผ่นป้าย ${tile.id} ${opened ? 'คลิกเพื่อปิด' : 'คลิกเพื่อเปิด'}`);
    button.querySelector('.tile-front').setAttribute('aria-hidden', String(opened));
    button.querySelector('.tile-back').setAttribute('aria-hidden', String(!opened));
    // Retain the back during the closing animation; content is replaced on the next reveal.
    if (tile.opened || (opened && !button.dataset.content)) {
      button.querySelector('.tile-text').textContent = tile.opened ? (tile.text || (tile.image ? '' : tile.title) || '') : 'กำลังเปิด…';
      const img = button.querySelector('img');
      img.hidden = !tile.image;
      if (tile.image && img.getAttribute('src') !== tile.image) img.src = tile.image;
      if (tile.opened) button.dataset.content = 'ready';
    }
  }
  $('#count').textContent = `เปิดแล้ว ${openedCount}/${state.tiles.length}`;
  $('#tiles').style.setProperty('--rows', Math.ceil(state.tiles.length / 5));
  $('#tiles').style.setProperty('--mobile-rows', Math.ceil(state.tiles.length / 3));
}
async function toggle(id) {
  const tile = state?.tiles.find(t => t.id === id);
  if (!tile) return;
  const active = pending.get(id);
  if (active) { active.desired = !active.desired; render(); return; }
  const operation = {desired: !tile.opened};
  pending.set(id, operation);
  render();
  try {
    // Serialize this card's clicks and send the desired state, so rapid clicks stay in order.
    while (true) {
      const opened = operation.desired;
      const result = await api('boardOpen', {room: code, tile: id, opened});
      accept(result.state);
      if (operation.desired === opened) break;
    }
    notice('');
  } catch (error) {
    notice(error.message);
  } finally {
    pending.delete(id);
    render();
  }
}
async function refresh() {
  try { accept((await api('boardPublic', {room: code}, '', true)).state); }
  catch (error) { notice(error.message); }
  finally { setTimeout(refresh, 1500); }
}
const fullscreen = $('#fullscreen');
if (!document.fullscreenEnabled) fullscreen.hidden = true;
fullscreen.onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { notice('เปิดโหมดเต็มหน้าจอไม่ได้ในเบราว์เซอร์นี้'); }
};
document.addEventListener('fullscreenchange', () => {
  fullscreen.textContent = document.fullscreenElement ? 'ออกจากเต็มจอ ↙' : 'เต็มหน้าจอ ↗';
});
refresh();
