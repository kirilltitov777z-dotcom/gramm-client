/**
 * Авто-подбор MTProto-прокси для ГРАММ.
 *
 * Идея: тянем списки из нескольких публичных источников, парсим,
 * проверяем реальным MTProto-handshake через GramJS и выбираем
 * самый быстрый живой узел. Если ничего не помогло — прямой доступ.
 */
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import type { ProxyNode, ProxyReport, ProxySource, TelegramCredentials } from './types';

export const DEFAULT_SOURCES: ProxySource[] = [
  { name: 'ГРАММ (встроенный)', url: './proxies.json', format: 'json' },
  { name: 'MTProto list', url: 'https://raw.githubusercontent.com/gramm-app/proxies/main/proxies.json', format: 'json' },
  { name: 'tg:// подборка', url: 'https://raw.githubusercontent.com/gramm-app/proxies/main/tg-proxy.txt', format: 'tgurl' },
];

/** Fallback-узлы на случай, если сеть/list недоступны. */
export const FALLBACK_PROXIES: ProxyNode[] = [
  { host: '149.154.175.50', port: 443, secret: 'dd00000000000000000000000000000000', source: 'fallback' },
  { host: '149.154.167.51', port: 443, secret: 'dd00000000000000000000000000000000', source: 'fallback' },
];

const FETCH_TIMEOUT = 7000;
const CONNECT_TIMEOUT = 5000;
const MAX_CANDIDATES = 12;

/** Парсит текст списка в узлы в зависимости от формата. */
export function parseProxyList(text: string, format: ProxySource['format']): ProxyNode[] {
  const out: ProxyNode[] = [];
  const trimmed = text.trim();
  if (!trimmed) return out;

  if (format === 'json') {
    try {
      const data = JSON.parse(trimmed) as unknown;
      const arr = Array.isArray(data) ? data : (data as { proxies?: unknown[] }).proxies ?? [];
      for (const raw of arr) {
        const p = raw as Record<string, unknown>;
        const host = String(p.host ?? p.server ?? p.ip ?? '');
        const port = Number(p.port ?? 443);
        if (!host || !port) continue;
        out.push({ host, port, secret: p.secret ? String(p.secret) : undefined, source: 'json' });
      }
    } catch {
      /* битый JSON — тихо игнорируем */
    }
    return out;
  }

  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    const l = line.trim();
    if (!l || l.startsWith('#') || l.startsWith('//')) continue;

    if (format === 'tgurl') {
      // tg://proxy?server=1.2.3.4&port=443&secret=dd...  или https://t.me/proxy?...
      const match = l.match(/[?&](?:server|host)=([^&]+)/i);
      const port = l.match(/[?&]port=(\d+)/i);
      const secret = l.match(/[?&]secret=([^&]+)/i);
      if (match && port) {
        out.push({
          host: decodeURIComponent(match[1]),
          port: Number(port[1]),
          secret: secret ? decodeURIComponent(secret[1]) : undefined,
          source: 'tgurl',
        });
      }
      continue;
    }

    // txt: host:port#secret  |  host port secret
    const m = l.match(/^([\w.\-]+):(\d+)#?(\S+)?$/);
    if (m) {
      out.push({ host: m[1], port: Number(m[2]), secret: m[3], source: 'txt' });
      continue;
    }
    const parts = l.split(/\s+/);
    if (parts.length >= 2) {
      out.push({ host: parts[0], port: Number(parts[1]), secret: parts[2], source: 'txt' });
    }
  }
  return out;
}

async function fetchWithTimeout(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Тянет все источники, дедуплицирует по host:port. */
export async function fetchAllProxies(sources: ProxySource[]): Promise<ProxyNode[]> {
  const settled = await Promise.allSettled(sources.map((s) => fetchWithTimeout(s.url).then((t) => parseProxyList(t, s.format))));
  const map = new Map<string, ProxyNode>();
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    for (const p of r.value) {
      const key = `${p.host}:${p.port}`;
      if (!map.has(key)) map.set(key, p);
    }
  }
  const list = [...map.values()];
  return list.length ? list : FALLBACK_PROXIES;
}

/** Быстрая проверка «живости» через WebSocket (эвристика для браузера). */
export function reachableViaWebSocket(proxy: ProxyNode, timeout = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const scheme = proxy.port === 443 ? 'wss' : 'ws';
      const ws = new WebSocket(`${scheme}://${proxy.host}:${proxy.port}`);
      const done = (v: boolean) => {
        try { ws.close(); } catch { /* noop */ }
        resolve(v);
      };
      const timer = setTimeout(() => done(false), timeout);
      ws.onopen = () => { clearTimeout(timer); done(true); };
      ws.onerror = () => { clearTimeout(timer); done(false); };
    } catch {
      resolve(false);
    }
  });
}

/** Настоящая проверка: MTProto-handshake через GramJS с таймаутом. */
export async function verifyProxy(
  proxy: ProxyNode,
  creds: TelegramCredentials,
  timeout = CONNECT_TIMEOUT,
): Promise<boolean> {
  let client: TelegramClient | undefined;
  try {
    client = new TelegramClient(new StringSession(), creds.apiId, creds.apiHash, {
      connectionRetries: 1,
      useWSS: proxy.port === 443,
      proxy: { ip: proxy.host, port: proxy.port, secret: proxy.secret ?? '', MTProxy: true },
      // @ts-ignore дополнительные опции безопасно игнорируются
      autoReconnect: false,
    });
    const start = Date.now();
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
    ]);
    proxy.latency = Date.now() - start;
    return true;
  } catch {
    return false;
  } finally {
    try { await client?.disconnect(); } catch { /* noop */ }
  }
}

export interface SelectOptions {
  credentials: TelegramCredentials;
  sources?: ProxySource[];
  manual?: ProxyNode | null;
  /** Пропустить проверку (например, в демо-режиме) */
  quick?: boolean;
}

/**
 * Главная функция: выбирает лучший прокси.
 * Приоритет: ручной > быстрая проверка живых > прямой доступ.
 */
export async function selectBestProxy(opts: SelectOptions): Promise<ProxyReport> {
  const { credentials, sources = DEFAULT_SOURCES, manual, quick } = opts;

  if (manual) {
    const ok = quick ? true : await verifyProxy(manual, credentials);
    if (ok) {
      return { selected: manual, tested: 1, alive: 1, mode: 'manual', checkedAt: Date.now() };
    }
  }

  const all = await fetchAllProxies(sources);
  const candidates = all.slice(0, MAX_CANDIDATES);

  // Сначала «дешёвая» проверка, потом реальная — экономим время и трафик.
  const prefiltered: ProxyNode[] = quick
    ? candidates
    : (await Promise.all(
        candidates.map(async (p) => ({ p, ok: await reachableViaWebSocket(p) })),
      ))
        .filter((x) => x.ok || x.p.source === 'json')
        .map((x) => x.p);

  const tested = prefiltered.length || 1;
  let alive = 0;
  let best: ProxyNode | null = null;

  for (const p of prefiltered) {
    const ok = quick ? true : await verifyProxy(p, credentials);
    if (ok) {
      alive++;
      if (!best || (p.latency ?? Infinity) < (best.latency ?? Infinity)) best = p;
    }
  }

  return {
    selected: best,
    tested,
    alive,
    mode: best ? 'auto' : 'direct',
    checkedAt: Date.now(),
  };
}
