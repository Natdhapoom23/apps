import { api, config, token } from './games/live/shared.js';

const $ = selector => document.querySelector(selector);
const authKey = 'workshop-admin';
const notice = (message, bad = false) => {
  const element = $('#notice');
  element.textContent = message;
  element.className = `settings-notice${bad ? ' bad' : ''}`;
  element.hidden = false;
};
const showSettings = () => {
  $('#login-panel').hidden = true;
  $('#settings-panel').hidden = false;
};
const logout = () => {
  localStorage.removeItem(authKey);
  $('#login-panel').hidden = false;
  $('#settings-panel').hidden = true;
  $('#password').value = '';
};

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const result = await api('login', { password: $('#password').value });
    localStorage.setItem(authKey, result.token);
    $('#password').value = '';
    showSettings();
    notice('เข้าสู่ระบบแล้ว');
  } catch (error) { notice(error.message, true); }
});

$('#password-form').addEventListener('submit', async event => {
  event.preventDefault();
  const auth = token(authKey);
  try {
    await api('changePassword', {
      currentPassword: $('#current-password').value,
      newPassword: $('#new-password').value,
      confirmPassword: $('#confirm-password').value
    }, auth);
    event.target.reset();
    notice('เปลี่ยนรหัสผ่านแล้ว รหัสใหม่นี้ใช้กับทุกเกมได้ทันที');
  } catch (error) {
    notice(error.message, true);
    if (error.status === 401) logout();
  }
});

$('#logout').addEventListener('click', logout);
try {
  const setup = await config();
  if (!setup.configured) $('#login-form button').disabled = true;
  else if (token(authKey)) showSettings();
} catch (error) { notice(error.message, true); }
