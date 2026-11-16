/**
 * Конфигурация ГРАММ.
 * API_ID / API_HASH — данные, которые выдал разработчик.
 * ВАЖНО: для продакшена вынеси их в environment variables и не публикуй в репозитории.
 */
export const DEFAULT_CREDENTIALS = {
  apiId: 38916708,
  apiHash: '8accfb8a7d10b998aa8113263e37b539',
} as const;

/** Режим демо без реального подключения (для разработки UI). */
export const DEMO_MODE = (import.meta.env.VITE_DEMO_MODE === '1') as boolean;

export const APP = {
  name: 'ГРАММ',
  tagline: 'Телеграм без границ',
  version: '1.0.0',
  markerPrefix: 'g',
} as const;
