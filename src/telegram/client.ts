/**
 * ГРАММ · TelegramClient (GramJS / MTProto).
 * Реальное подключение к Telegram, авторизация, диалоги, сообщения
 * и фирменные фишки (профиль-баннер через маркер в bio + реестр на GitHub).
 */
import { Api, TelegramClient } from 'telegram';
import { Session } from 'telegram/session';
import { NewMessage } from 'telegram/events';
import { DEFAULT_CREDENTIALS } from '../config';
import type { ChatItem, MessageItem, ProfileBanner, ProxyNode } from './types';

const SESSION_KEY = 'gramm.session.v1';
const BANNER_KEY = 'gramm.mybanner.v1';
const REGISTRY_URL =
  'https://raw.githubusercontent.com/kirilltitov777z-dotcom/gramm-client/main/.github/registry/banners.json';

export interface LoginResult {
  ok: boolean;
  stage: 'phone' | 'code' | 'password' | 'ready' | 'error';
  error?: string;
}

type Resolver = (value: string) => void;

function loadSessionString(): string | null {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}
function saveSessionString(s: string) {
  try { localStorage.setItem(SESSION_KEY, s); } catch { /* noop */ }
}

/** Маркер баннера в bio: ⟦g:abc123⟧ или ⟦g|https://...⟧ */
export function encodeBannerMarker(id: string): string {
  return `⟦g:${id}⟧`;
}
export function decodeBannerMarker(bio: string | undefined): { id?: string; url?: string } | null {
  if (!bio) return null;
  const idm = bio.match(/⟦g:([A-Za-z0-9_-]{3,16})⟧/);
  if (idm) return { id: idm[1] };
  const urlm = bio.match(/⟦g\|(https?:\/\/[^\s⟧]+)⟧/);
  if (urlm) return { url: urlm[1] };
  return null;
}

class GrammClient {
  private client?: TelegramClient;
  private session?: Session;
  private proxy?: ProxyNode;
  private messageListeners = new Set<(m: MessageItem) => void>();
  private resolvers: { code?: Resolver; password?: Resolver } = {};
  private loginPromise?: Promise<LoginResult>;
  private eventRegistered = false;

  get connected(): boolean {
    return !!this.client?.connected;
  }
  get authorized(): boolean {
    return !!this.client && this.client.connected;
  }

  /** Создаёт клиент с выбранным прокси. */
  async init(proxy?: ProxyNode): Promise<void> {
    this.proxy = proxy;
    const saved = loadSessionString();
    this.session = new Session();
    if (saved) this.session.setString(saved);

    const params: Record<string, unknown> = {
      connectionRetries: 4,
      retryDelay: 800,
      useWSS: proxy ? proxy.port === 443 : true,
      autoReconnect: true,
      timeout: 15,
    };
    if (proxy) {
      params.proxy = { host: proxy.host, port: proxy.port, secret: proxy.secret ?? '' };
    }

    this.client = new TelegramClient(this.session, DEFAULT_CREDENTIALS.apiId, DEFAULT_CREDENTIALS.apiHash, params);
    await this.client.connect();
    this.registerEvents();
  }

  private registerEvents() {
    if (!this.client || this.eventRegistered) return;
    this.eventRegistered = true;
    this.client.addEventHandler(async (event) => {
      try {
        const msg = event.message as Api.Message;
        const item = this.toMessageItem(msg);
        this.messageListeners.forEach((cb) => cb(item));
      } catch { /* noop */ }
    }, new NewMessage({}));
  }

  onNewMessage(cb: (m: MessageItem) => void): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  /** Запускает авторизацию; код и пароль подаются позже через submit*. */
  login(phone: string, onStage?: (s: 'code' | 'password') => void): Promise<LoginResult> {
    if (!this.client) throw new Error('Клиент не инициализирован');
    const phoneNumber = phone.replace(/[^\d+]/g, '');

    this.loginPromise = new Promise<LoginResult>((resolve) => {
      this.client!.start({
        phoneNumber: async () => phoneNumber,
        phoneCode: async () => {
          onStage?.('code');
          return new Promise<string>((r) => { this.resolvers.code = r; });
        },
        password: async () => {
          onStage?.('password');
          return new Promise<string>((r) => { this.resolvers.password = r; });
        },
        onError: (err: unknown) => {
          resolve({ ok: false, stage: 'error', error: err instanceof Error ? err.message : String(err) });
        },
      })
        .then(async () => {
          this.persistSession();
          resolve({ ok: true, stage: 'ready' });
        })
        .catch((err: unknown) => {
          resolve({ ok: false, stage: 'error', error: err instanceof Error ? err.message : String(err) });
        });
    });
    return this.loginPromise;
  }

  submitCode(code: string) {
    this.resolvers.code?.(code.replace(/\s/g, ''));
    this.resolvers.code = undefined;
  }
  submitPassword(password: string) {
    this.resolvers.password?.(password);
    this.resolvers.password = undefined;
  }
  hasPendingPasswordResolver(): boolean { return !!this.resolvers.password; }

  private persistSession() {
    try {
      const s = this.session?.stringify();
      if (s) saveSessionString(s);
    } catch { /* noop */ }
  }

  async getMe(): Promise<ChatItem | null> {
    if (!this.client) return null;
    try {
      const me = (await this.client.getMe()) as Api.User;
      return {
        id: String(me.id),
        title: [me.firstName, me.lastName].filter(Boolean).join(' ') || me.username || 'Я',
        username: me.username,
        avatar: undefined,
        type: 'user',
      };
    } catch { return null; }
  }

  /** Диалоги (чаты, группы, каналы). */
  async getDialogs(limit = 100): Promise<ChatItem[]> {
    if (!this.client) return [];
    try {
      const dialogs = await this.client.getDialogs({ limit });
      const out: ChatItem[] = [];
      for (const d of dialogs) {
        const entity = (d as { entity?: Api.TypeEntity }).entity;
        if (!entity || !('id' in entity)) continue;
        const id = String((entity as { id: number }).id);
        const last = (d as { message?: Api.Message }).message;
        out.push({
          id,
          title: (d as { title?: string }).title ?? 'Без названия',
          type: (entity as { className?: string }).className === 'User' ? 'user' : (entity as { megagroup?: boolean }).megagroup ? 'supergroup' : (entity as { broadcast?: boolean }).broadcast ? 'channel' : 'group',
          lastMessage: last?.message ? String(last.message).slice(0, 120) : undefined,
          lastMessageDate: last?.date,
          unread: (d as { unreadCount?: number }).unreadCount ?? 0,
          muted: !!(d as { dialog?: { notifySettings?: { muteUntil?: number } } }).dialog?.notifySettings?.muteUntil,
          verified: !!(entity as { verified?: boolean }).verified,
          username: (entity as { username?: string }).username,
        });
      }
      return out;
    } catch { return []; }
  }

  /** Сообщения чата (новые сверху вниз). */
  async getMessages(chatId: string, limit = 60): Promise<MessageItem[]> {
    if (!this.client) return [];
    try {
      const entity = await this.client.getInputEntity(chatId.includes(':') ? Number(chatId.split(':')[0]) : Number(chatId));
      const msgs = await this.client.getMessages(entity, { limit });
      return msgs.filter((m): m is Api.Message => !!(m && m.className === 'Message')).map((m) => this.toMessageItem(m));
    } catch { return []; }
  }

  private toMessageItem(m: Api.Message): MessageItem {
    const from = (m as { fromId?: { userId?: number; channelId?: number } }).fromId;
    const fromId = String(from?.userId ?? from?.channelId ?? 0);
    let media: MessageItem['media'];
    if (m.media) {
      const c = (m.media as { className?: string }).className ?? '';
      if (c.includes('Photo')) media = 'photo';
      else if (c.includes('Document')) media = 'file';
      else if (c.includes('Voice')) media = 'voice';
      else if (c.includes('Sticker')) media = 'sticker';
      else if (c.includes('Video')) media = 'video';
    }
    return {
      id: m.id,
      chatId: String((m as { peerId?: { channelId?: number; userId?: number } }).peerId?.channelId ?? (m as { peerId?: { userId?: number } }).peerId?.userId ?? 0),
      text: typeof m.message === 'string' ? m.message : '',
      fromId,
      date: m.date,
      outgoing: !!m.out,
      replyTo: (m as { replyTo?: { replyToMsgId?: number } }).replyTo?.replyToMsgId,
      edited: !!m.editDate,
      media,
    };
  }

  async sendMessage(chatId: string, text: string, replyTo?: number): Promise<boolean> {
    if (!this.client) return false;
    try {
      const entity = await this.client.getInputEntity(Number(chatId.split(':')[0]));
      await this.client.sendMessage(entity, { message: text, ...(replyTo ? { replyTo } : {}) });
      return true;
    } catch { return false; }
  }

  async markRead(chatId: string) {
    if (!this.client) return;
    try {
      const entity = await this.client.getInputEntity(Number(chatId.split(':')[0]));
      await (this.client as unknown as { sendReadAcknowledgement: (e: unknown) => Promise<void> })
        .sendReadAcknowledgement(entity);
    } catch { /* noop */ }
  }

  /** about пользователя (для чтения маркера баннера). */
  async getUserBio(userId: string): Promise<string | undefined> {
    if (!this.client) return undefined;
    try {
      const full = await this.client.invoke(new Api.users.GetFullUser({ id: userId.includes(':') ? userId.split(':')[0] : userId }));
      const users = (full as unknown as { users?: Array<{ about?: string }> }).users ?? [];
      return users[0]?.about;
    } catch { return undefined; }
  }

  /** Ставит/обновляет маркер баннера в bio (макс 70 символов). */
  async setBannerMarker(marker: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const full = await this.client.invoke(new Api.users.GetFullUser({ id: 'me' }));
      const users = (full as unknown as { users?: Array<{ about?: string }> }).users ?? [];
      const about = (users[0]?.about ?? '').replace(/⟦g:[^\]]*⟧/g, '').replace(/⟦g\|[^\]]*⟧/g, '').trim();
      const next = `${about} ${marker}`.trim().slice(0, 70);
      await this.client.invoke(new Api.account.UpdateProfile({ about: next }));
      return true;
    } catch { return false; }
  }

  /** Реестр баннеров ГРАММ (публикуется через GitHub Actions). */
  async fetchBannerRegistry(): Promise<Record<string, ProfileBanner>> {
    try {
      const res = await fetch(REGISTRY_URL, { cache: 'no-store' });
      if (!res.ok) return {};
      return await res.json() as Record<string, ProfileBanner>;
    } catch { return {}; }
  }

  saveLocalBanner(b: ProfileBanner) {
    try { localStorage.setItem(BANNER_KEY, JSON.stringify(b)); } catch { /* noop */ }
  }
  loadLocalBanner(): ProfileBanner | null {
    try { const s = localStorage.getItem(BANNER_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
  }

  async disconnect() {
    try { await this.client?.disconnect(); } catch { /* noop */ }
    this.client = undefined;
    this.eventRegistered = false;
  }
  async logout() {
    await this.disconnect();
    try { localStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
  }
}

export const telegram = new GrammClient();
