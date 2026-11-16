import { useMemo, useState } from 'react';
import { Search, ShieldCheck, SlidersHorizontal, Wifi, WifiOff, BadgeCheck } from 'lucide-react';
import { useApp } from '../store/appStore';
import { telegram } from '../telegram/client';
import type { ChatItem } from '../telegram/types';

function initials(title: string) {
  return title.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
}
function timeAgo(ts?: number) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

function ChatRow({ chat }: { chat: ChatItem }) {
  const setActiveChat = useApp((s) => s.setActiveChat);
  return (
    <div className="chat-row" onClick={() => setActiveChat(chat.id)}>
      <div className="avatar">{initials(chat.title)}</div>
      <div className="chat-main">
        <div className="chat-top">
          <span className="chat-title">{chat.title}</span>
          {chat.verified && <BadgeCheck className="verified" size={14} />}
          {chat.grammVariant && <span className="gramm-dot" title="На ГРАММ" />}
          <span className="chat-time">{timeAgo(chat.lastMessageDate)}</span>
        </div>
        <div className="chat-preview">{chat.lastMessage || 'Нет сообщений'}</div>
      </div>
      {!!chat.unread && <span className="badge">{chat.unread}</span>}
    </div>
  );
}

export default function ChatList() {
  const chats = useApp((s) => s.chats);
  const proxyReport = useApp((s) => s.proxyReport);
  const toggleModMenu = useApp((s) => s.toggleModMenu);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => chats.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())), [chats, q]);

  return (
    <>
      <header className="header">
        <div className="brand">
          <span className="brand-logo">✈</span>
          <div><div className="brand-name">ГРАММ</div><div className="brand-tag">Телеграм без границ</div></div>
        </div>
        <div className="header-spacer" />
        <div title={proxyReport?.selected ? `Прокси ${proxyReport.selected.host}` : 'Прямое соединение'}>
          {proxyReport?.mode === 'direct' ? <WifiOff size={18} color="var(--muted)" /> : <Wifi size={18} color="#4ade80" />}
        </div>
        <button className="icon-btn" onClick={() => toggleModMenu(true)} title="Мод-меню"><SlidersHorizontal size={18} /></button>
      </header>

      {proxyReport?.selected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', color: 'var(--muted)', fontSize: 11 }}>
          <ShieldCheck size={13} color="#4ade80" /> MTProxy {proxyReport.selected.host}
          {proxyReport.selected.latency != null && <span>· {proxyReport.selected.latency} мс</span>}
        </div>
      )}

      <div className="search"><Search size={17} /><input placeholder="Поиск по чатам" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      <div className="view">
        {filtered.length ? filtered.map((c) => <ChatRow key={c.id} chat={c} />)
          : <div className="center"><div><div className="empty-ico">💬</div>Пока нет чатов<br /><small>Нажми «обновить» в настройках</small></div></div>}
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--muted)', fontSize: 11 }}>
          ГРАММ · {telegram.connected ? 'подключён' : 'ожидание'}
        </div>
      </div>
    </>
  );
}
