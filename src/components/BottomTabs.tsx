import { MessageCircle, Phone, User, Settings } from 'lucide-react';
import { useApp, type TabId } from '../store/appStore';

const TABS: { id: TabId; label: string; icon: typeof MessageCircle }[] = [
  { id: 'chats', label: 'Чаты', icon: MessageCircle },
  { id: 'calls', label: 'Звонки', icon: Phone },
  { id: 'profile', label: 'Профиль', icon: User },
  { id: 'settings', label: 'Настройки', icon: Settings },
];

export default function BottomTabs() {
  const tab = useApp((s) => s.tab);
  const setTab = useApp((s) => s.setTab);
  const setActiveChat = useApp((s) => s.setActiveChat);

  return (
    <nav className="tabs">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button key={id} className={`tab ${tab === id ? 'active' : ''}`}
          onClick={() => { setTab(id); if (id !== 'chats') setActiveChat(null); }}>
          <span className="tab-ico"><Icon size={20} strokeWidth={2} /></span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
