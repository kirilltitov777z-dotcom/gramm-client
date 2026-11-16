import { useEffect } from 'react';
import { useApp } from './store/appStore';
import { telegram } from './telegram/client';
import { selectBestProxy } from './telegram/proxy';
import { DEFAULT_CREDENTIALS } from './config';
import Login from './components/Login';
import ChatList from './components/ChatList';
import ChatView from './components/ChatView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import BottomTabs from './components/BottomTabs';
import ModMenu from './components/ModMenu';

export default function App() {
  const booted = useApp((s) => s.booted);
  const authorized = useApp((s) => s.authorized);
  const tab = useApp((s) => s.tab);
  const activeChatId = useApp((s) => s.activeChatId);
  const theme = useApp((s) => s.theme);
  const fontSize = useApp((s) => s.fontSize);
  const toast = useApp((s) => s.toast);

  const setBooted = useApp((s) => s.setBooted);
  const setAuthorized = useApp((s) => s.setAuthorized);
  const setProxyReport = useApp((s) => s.setProxyReport);
  const setConnectingProxy = useApp((s) => s.setConnectingProxy);
  const setChats = useApp((s) => s.setChats);
  const setMe = useApp((s) => s.setMe);
  const setBanner = useApp((s) => s.setBanner);
  const toastMsg = useApp((s) => s.toastMsg);
  const proxySources = useApp((s) => s.proxySources);
  const manualProxy = useApp((s) => s.manualProxy);
  const flags = useApp((s) => s.flags);

  // тема и размер шрифта
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--fs', `${fontSize}px`);
  }, [theme, fontSize]);

  // тост с авто-скрытием
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => toastMsg(null), 2600);
    return () => clearTimeout(t);
  }, [toast, toastMsg]);

  // загрузка
  useEffect(() => {
    let alive = true;
    (async () => {
      setConnectingProxy(true);
      let report = null;
      try {
        report = await selectBestProxy({
          credentials: DEFAULT_CREDENTIALS,
          sources: proxySources,
          manual: manualProxy,
          quick: !flags['proxy.verify'],
        });
      } catch { /* оставим прямое соединение */ }
      if (!alive) return;
      setProxyReport(report);
      setConnectingProxy(false);

      try {
        await telegram.init(report?.selected ?? undefined);
        if (telegram.connected) {
          const [chats, me] = await Promise.all([telegram.getDialogs(), telegram.getMe()]);
          if (!alive) return;
          setChats(chats); setMe(me); setAuthorized(true);
          const localBanner = telegram.loadLocalBanner();
          if (localBanner) setBanner(localBanner);
        }
      } catch { /* остаёмся на экране входа */ }
      if (alive) setBooted(true);
    })();
    return () => { alive = false; };
  }, []);

  if (!booted) {
    return (
      <div className="app">
        <div className="center" style={{ flexDirection: 'column' }}>
          <div className="login-logo" style={{ width: 64, height: 64, fontSize: 30 }}>✈</div>
          <h1 style={{ fontSize: 26, margin: '14px 0 4px' }}>ГРАММ</h1>
          <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 20 }}>Телеграм без границ</div>
          <div className="spinner" />
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>Ищу лучший MTProto-прокси…</div>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return <div className="app"><Login /></div>;
  }

  return (
    <div className="app">
      {activeChatId ? <ChatView chatId={activeChatId} /> : (
        <>
          {tab === 'chats' && <ChatList />}
          {tab === 'calls' && <div className="view"><header className="header"><div className="brand-name">Звонки</div></header><div className="center"><div><div className="empty-ico">📞</div>История звонков пуста</div></div></div>}
          {tab === 'profile' && <ProfileView />}
          {tab === 'settings' && <SettingsView />}
        </>
      )}
      <BottomTabs />
      <ModMenu />
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
