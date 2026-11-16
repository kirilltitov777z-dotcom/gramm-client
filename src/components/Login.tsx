import { useState } from 'react';
import { telegram } from '../telegram/client';
import { useApp } from '../store/appStore';
import type { LoginStage } from '../telegram/types';

export default function Login() {
  const setAuthorized = useApp((s) => s.setAuthorized);
  const setLoginStage = useApp((s) => s.setLoginStage);
  const loginStage = useApp((s) => s.loginStage);
  const toast = useApp((s) => s.toastMsg);

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const stage: LoginStage = loginStage === 'idle' ? 'phone' : loginStage;

  async function sendPhone() {
    if (!phone.trim()) return;
    setBusy(true); setError('');
    try {
      const result = telegram.login(phone, (s) => setLoginStage(s === 'code' ? 'code' : 'password'));
      setLoginStage('code');
      const r = await result;
      if (r.ok) { setAuthorized(true); setLoginStage('ready'); }
      else { setError(r.error ?? 'Ошибка входа'); setLoginStage('error'); }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoginStage('error');
    } finally { setBusy(false); }
  }

  function sendCode() {
    if (!code.trim()) return;
    telegram.submitCode(code);
    setCode('');
  }
  function sendPassword() {
    if (!password.trim()) return;
    telegram.submitPassword(password);
    setPassword('');
  }

  return (
    <div className="login">
      <div className="login-logo">✈</div>
      <h1>ГРАММ</h1>
      <p className="sub">Телеграм без границ · MTProto + авто-прокси</p>

      {stage === 'phone' && (
        <>
          <input className="field" placeholder="+7 999 123-45-67" value={phone}
            onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          <button className="btn" onClick={sendPhone} disabled={busy}>
            {busy ? 'Отправляю код…' : 'Продолжить'}
          </button>
        </>
      )}

      {stage === 'code' && (
        <>
          <input className="field" placeholder="Код из Telegram" value={code}
            onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoFocus />
          <button className="btn" onClick={sendCode}>Войти по коду</button>
          <button className="btn ghost" onClick={() => setLoginStage('phone')}>Изменить номер</button>
        </>
      )}

      {stage === 'password' && (
        <>
          <input className="field" type="password" placeholder="Пароль аккаунта" value={password}
            onChange={(e) => setPassword(e.target.value)} autoFocus />
          <button className="btn" onClick={sendPassword}>Подтвердить</button>
        </>
      )}

      {stage === 'error' && (
        <>
          <p style={{ color: '#ff7675', textAlign: 'center', fontSize: 13 }}>{error}</p>
          <button className="btn" onClick={() => setLoginStage('phone')}>Попробовать снова</button>
        </>
      )}
      {stage === 'ready' && <button className="btn" onClick={() => { setAuthorized(true); toast('Добро пожаловать в ГРАММ'); }}>Готово</button>}

      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, marginTop: 26, lineHeight: 1.5 }}>
        Не настоящий Telegram? Настоящий: вход через официальный MTProto<br />
        и твой аккаунт. Мы не видим твои сообщения.
      </p>
    </div>
  );
}
