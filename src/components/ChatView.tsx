import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Send, MoreVertical, Paperclip } from 'lucide-react';
import { useApp } from '../store/appStore';
import { telegram } from '../telegram/client';
import type { MessageItem } from '../telegram/types';

function hhmm(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatView({ chatId }: { chatId: string }) {
  const chat = useApp((s) => s.chats.find((c) => c.id === chatId));
  const messages = useApp((s) => s.messages[chatId] ?? []);
  const appendMessages = useApp((s) => s.appendMessages);
  const prependMessage = useApp((s) => s.prependMessage);
  const setActiveChat = useApp((s) => s.setActiveChat);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    telegram.getMessages(chatId).then((m) => {
      if (alive) { appendMessages(chatId, m); setLoading(false); }
    });
    telegram.markRead(chatId);
    const unsub = telegram.onNewMessage((m: MessageItem) => {
      if (m.chatId === chatId || m.fromId === chatId) prependMessage(m);
    });
    return () => { alive = false; unsub(); };
  }, [chatId]);

  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [messages.length]);

  async function send() {
    if (!text.trim()) return;
    const value = text.trim();
    setText('');
    const ok = await telegram.sendMessage(chatId, value);
    if (!ok) {
      // локальный предпросмотр, если отправка не удалась
      prependMessage({ id: Date.now(), chatId, text: value, fromId: 'me', date: Math.floor(Date.now() / 1000), outgoing: true });
    }
  }

  return (
    <div className="chat-view">
      <div className="chat-header">
        <button className="icon-btn" onClick={() => setActiveChat(null)}><ArrowLeft size={19} /></button>
        <div className="avatar">{(chat?.title ?? '?')[0]}</div>
        <div style={{ flex: 1 }}>
          <h2>{chat?.title ?? 'Чат'}</h2>
          <small>{chat?.type === 'user' ? 'личный чат' : chat?.type}</small>
        </div>
        <button className="icon-btn"><MoreVertical size={19} /></button>
      </div>

      <div className="messages">
        {loading && <div className="spinner" />}
        {messages.map((m) => (
          <div key={`${m.chatId}-${m.id}`} className={`msg ${m.outgoing ? 'out' : 'in'}`}>
            {m.text || (m.media ? `[${m.media}]` : '')}
            <div className="meta">{hhmm(m.date)}{m.edited ? ' · изм.' : ''}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        <button className="icon-btn"><Paperclip size={19} /></button>
        <input placeholder="Написать сообщение…" value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
        <button className="send" onClick={send}><Send size={19} /></button>
      </div>
    </div>
  );
}
