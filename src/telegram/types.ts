// Публичные типы ГРАММ для слоя Telegram.

export interface ProxyNode {
  /** IP или hostname MTProto-прокси */
  host: string;
  /** Порт (обычно 443 / 80 / 1080) */
  port: number;
  /** MTProto secret (для tg://proxy) */
  secret?: string;
  /** Источник, откуда взят прокси */
  source?: string;
  /** Задержка в мс (заполняется после проверки) */
  latency?: number;
  /** Рабочий ли узел */
  alive?: boolean;
}

export interface ProxySource {
  name: string;
  url: string;
  format: 'json' | 'tgurl' | 'txt';
}

export interface TelegramCredentials {
  apiId: number;
  apiHash: string;
}

export interface ChatItem {
  id: string;
  title: string;
  avatar?: string;
  type: 'user' | 'group' | 'channel' | 'supergroup';
  lastMessage?: string;
  lastMessageDate?: number;
  unread?: number;
  muted?: boolean;
  verified?: boolean;
  username?: string;
  /** Маркер «свой клиент» ← баннер/profile theme */
  grammBanner?: ProfileBanner;
  /** Пользователь тоже на ГРАММ */
  grammVariant?: boolean;
}

export interface MessageItem {
  id: number;
  chatId: string;
  text: string;
  fromId: string;
  fromName?: string;
  date: number;
  outgoing: boolean;
  replyTo?: number;
  edited?: boolean;
  media?: 'photo' | 'video' | 'file' | 'voice' | 'sticker' | 'gif';
}

/** Профиль-баннер, видимый другим пользователям ГРАММ. */
export interface ProfileBanner {
  /** URL изображения (data: или https:) */
  image: string;
  /** Градиент/цвет, если нет картинки */
  gradient?: string;
  /** Подпись */
  caption?: string;
  /** Версия формата маркера */
  v?: number;
}

export type LoginStage = 'idle' | 'phone' | 'code' | 'password' | 'ready' | 'error';

export interface ProxyReport {
  selected: ProxyNode | null;
  tested: number;
  alive: number;
  mode: 'auto' | 'manual' | 'direct';
  checkedAt: number;
}
