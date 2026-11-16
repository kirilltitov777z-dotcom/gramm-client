import { create } from 'zustand';
import { FEATURES } from '../features/registry';
import type { ChatItem, MessageItem, ProxyReport, ProfileBanner, ProxyNode, ProxySource } from '../telegram/types';
import { DEFAULT_SOURCES } from '../telegram/proxy';

export type TabId = 'chats' | 'calls' | 'profile' | 'settings';
export type ThemeId = 'midnight' | 'amoled' | 'aurora' | 'sunset' | 'matrix';

const STORAGE_KEY = 'gramm.settings.v1';

interface PersistedSettings {
  flags: Record<string, boolean>;
  theme: ThemeId;
  fontSize: number;
  proxySources: ProxySource[];
  manualProxy: ProxyNode | null;
  banner: ProfileBanner | null;
}

function loadSettings(): Partial<PersistedSettings> {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}

const saved = loadSettings();
const defaultFlags: Record<string, boolean> = Object.fromEntries(
  FEATURES.map((x) => [x.id, x.defaultOn]),
);

interface AppState {
  // авторизация / сеть
  booted: boolean;
  authorized: boolean;
  loginStage: 'idle' | 'phone' | 'code' | 'password' | 'ready' | 'error';
  proxyReport: ProxyReport | null;
  connectingProxy: boolean;

  // данные
  chats: ChatItem[];
  messages: Record<string, MessageItem[]>;
  activeChatId: string | null;
  me: ChatItem | null;

  // UI
  tab: TabId;
  theme: ThemeId;
  fontSize: number;
  modMenuOpen: boolean;
  bannerModalOpen: boolean;
  toast: string | null;

  // настройки
  flags: Record<string, boolean>;
  proxySources: ProxySource[];
  manualProxy: ProxyNode | null;
  banner: ProfileBanner | null;

  // действия
  setBooted: (v: boolean) => void;
  setAuthorized: (v: boolean) => void;
  setLoginStage: (v: AppState['loginStage']) => void;
  setProxyReport: (v: ProxyReport | null) => void;
  setConnectingProxy: (v: boolean) => void;
  setChats: (v: ChatItem[]) => void;
  setMe: (v: ChatItem | null) => void;
  prependMessage: (m: MessageItem) => void;
  appendMessages: (chatId: string, m: MessageItem[]) => void;
  setActiveChat: (id: string | null) => void;
  setTab: (t: TabId) => void;
  setTheme: (t: ThemeId) => void;
  setFontSize: (n: number) => void;
  toggleModMenu: (v?: boolean) => void;
  setBannerModal: (v: boolean) => void;
  toastMsg: (s: string | null) => void;
  toggleFlag: (id: string) => void;
  setProxySources: (v: ProxySource[]) => void;
  setManualProxy: (v: ProxyNode | null) => void;
  setBanner: (v: ProfileBanner | null) => void;
  resetSettings: () => void;
}

function persist(state: AppState) {
  const data: PersistedSettings = {
    flags: state.flags,
    theme: state.theme,
    fontSize: state.fontSize,
    proxySources: state.proxySources,
    manualProxy: state.manualProxy,
    banner: state.banner,
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* noop */ }
}

export const useApp = create<AppState>((set, get) => ({
  booted: false,
  authorized: false,
  loginStage: 'idle',
  proxyReport: null,
  connectingProxy: false,
  chats: [],
  messages: {},
  activeChatId: null,
  me: null,
  tab: 'chats',
  theme: saved.theme ?? 'midnight',
  fontSize: saved.fontSize ?? 15,
  modMenuOpen: false,
  bannerModalOpen: false,
  toast: null,
  flags: { ...defaultFlags, ...(saved.flags ?? {}) },
  proxySources: saved.proxySources ?? DEFAULT_SOURCES,
  manualProxy: saved.manualProxy ?? null,
  banner: saved.banner ?? null,

  setBooted: (v) => set({ booted: v }),
  setAuthorized: (v) => set({ authorized: v }),
  setLoginStage: (v) => set({ loginStage: v }),
  setProxyReport: (v) => set({ proxyReport: v }),
  setConnectingProxy: (v) => set({ connectingProxy: v }),
  setChats: (v) => set({ chats: v }),
  setMe: (v) => set({ me: v }),
  prependMessage: (m) => set((s) => ({
    messages: { ...s.messages, [m.chatId]: [...(s.messages[m.chatId] ?? []), m] },
  })),
  appendMessages: (chatId, m) => set((s) => ({
    messages: { ...s.messages, [chatId]: [...m, ...(s.messages[chatId] ?? [])] },
  })),
  setActiveChat: (id) => set({ activeChatId: id }),
  setTab: (t) => set({ tab: t }),
  setTheme: (t) => { set({ theme: t }); persist(get()); },
  setFontSize: (n) => { set({ fontSize: n }); persist(get()); },
  toggleModMenu: (v) => set((s) => ({ modMenuOpen: v ?? !s.modMenuOpen })),
  setBannerModal: (v) => set({ bannerModalOpen: v }),
  toastMsg: (s) => set({ toast: s }),
  toggleFlag: (id) => {
    set((s) => ({ flags: { ...s.flags, [id]: !s.flags[id] } }));
    persist(get());
  },
  setProxySources: (v) => { set({ proxySources: v }); persist(get()); },
  setManualProxy: (v) => { set({ manualProxy: v }); persist(get()); },
  setBanner: (v) => { set({ banner: v }); persist(get()); },
  resetSettings: () => {
    set({ flags: defaultFlags, theme: 'midnight', fontSize: 15, proxySources: DEFAULT_SOURCES, manualProxy: null, banner: null });
    persist(get());
  },
}));

/** Удобный хук одной фичи */
export const useFlag = (id: string) => useApp((s) => !!s.flags[id]);
