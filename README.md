# ГРАММ ✈ — Телеграм без границ

**ГРАММ** — mod-клиент Telegram на **реальном MTProto** (библиотека GramJS). Не фейк, не симулятор: подключается к настоящему Telegram под твоим аккаунтом, с авто-подбором MTProto-прокси (чтобы работало в России), мод-меню, нижними вкладками, 5 темами и фирменным фоном профиля, который видят другие пользователи ГРАММ.

> Честно: это прочная основа с реальным ядром и ключевыми фишками. В реестре **100+ возможностей**, часть уже работает (помечены `готово`), часть — в плане development. Список смотри в [FEATURES.md](FEATURES.md).

---

## ✨ Что уже работает

- 🔐 **Реальная авторизация** Telegram: номер → код → (2FA пароль). Сессия сохраняется локально (string session).
- 💬 **Диалоги и сообщения**: список чатов, история, отправка, обновления в реальном времени через `NewMessage`, markdown в inputs.
- 🌐 **Авто-подбор MTProto-прокси**: тянет списки из источников → проверяет WebSocket-эвристикой → делает **настоящий MTProto-handshake** через GramJS → выбирает самый быстрый. Есть fallback на прямое соединение и ручной прокси.
- 🎛 **Мод-меню** в Настройках: поиск, категории, переключатели, сохранение в localStorage.
- 📑 **Нижние вкладки**: Чаты / Звонки / Профиль / Настройки.
- 🖼 **Фон профиля (баннер)**: своё фото/градиент, маркер `⟦g:id⟧` в bio (≤70 симв.) + публичный реестр на GitHub — другие ГРАММ-пользователи видят твой фон.
- 🎨 **5 тем**: Midnight, AMOLED, Aurora, Sunset, Matrix. Размер текста.
- ⚙️ **Всё через GitHub Actions**: сборка, Pages, APK, публикация баннеров, обновление прокси.

---

## 📁 Структура

```
gramm-client/
├── .github/
│   ├── workflows/
│   │   ├── build.yml           # typecheck + build на каждый push/PR
│   │   ├── deploy-pages.yml    # деплой веб-версии на GitHub Pages
│   │   ├── android-apk.yml     # сборка APK через Capacitor + Release
│   │   ├── publish-banner.yml  # публикация баннера в реестр
│   │   └── update-proxies.yml  # обновление списка MTProto-прокси
│   └── registry/banners.json   # реестр баннеров
├── public/                     # proxies.json, manifest, иконка
├── src/
│   ├── components/             # UI (чаты, чат, профиль, настройки, мод-меню)
│   ├── telegram/               # client.ts (GramJS), proxy.ts, types.ts
│   ├── features/registry.ts    # 100+ фич
│   ├── store/appStore.ts       # состояние (zustand)
│   ├── styles/global.css       # дизайн-система и темы
│   └── config.ts               # API_ID / API_HASH
├── capacitor.config.ts
└── ...
```

---

## 🚀 Запуск

### Локально
```bash
npm install
npm run dev
```
Открой `http://localhost:5173`.

### Через GitHub Actions (основной путь)
1. Создай репозиторий и запушь:
   ```bash
   git remote add origin https://github.com/<твой-логин>/gramm-client.git
   git push -u origin main
   ```
2. В настройках репозитория: **Settings → Pages → Source: GitHub Actions** (включается вручную — API-токену это не всегда доступно). После включения можно вернуть в `deploy-pages.yml` триггер `push` для авто-деплоя.
3. Воркфлоу сами соберут:
   - `build.yml` — при каждом push/PR;
   - `deploy-pages.yml` — веб-версия на Pages;
   - `android-apk.yml` (вручную, **Actions → Build Android APK → Run workflow**) — APK + Release.

### Сборка APK
Запусти `android-apk.yml` вручную. Он: `npm run build` → `npx cap add android && npx cap sync` → `./gradlew assembleDebug` → APK в артефактах и в Release. Установи APK на телефон (разреши «неизвестные источники»).

---

## ⚙️ Настройка

### API-ключи
В `src/config.ts` уже вбиты данные, которые ты дал:
```ts
export const DEFAULT_CREDENTIALS = { apiId: 38916708, apiHash: '…' };
```
⚠️ Для публичного репозитория вынеси их в `VITE_API_ID` / `VITE_API_HASH` и GitHub Secrets — так ключ не будет в исходниках. (Сейчас они в коде, как ты и просил.)

### Прокси
`public/proxies.json` содержит **заглушки-примеры**. Замени на реальные MTProto-прокси:
```json
[{ "host": "1.2.3.4", "port": 443, "secret": "dd..." }]
```
Форматы источников: `json`, `tg://` (`tg://proxy?server=…&port=…&secret=…`), `txt` (`host:port#secret`). Свои URL добавляй в Настройки → Мод-меню → «Свои списки прокси». Воркфлоу `update-proxies.yml` обновляет список каждые 6 часов.

### Фон профиля (баннер)
1. Профиль → «Фон профиля» → выбери фото/градиент → Сохранить.
2. Клиент ставит маркер `⟦g:abc123⟧` в твой `bio` (Telegram разрешает 70 символов).
3. Чтобы другие видели картинку, опубликуй её через **Actions → Publish profile banner** (или `repository_dispatch` с полями `id`, `image`, `caption`). Workflow обновит `.github/registry/banners.json`.

---

## 🛡 Приватность

- Клиент общается с Telegram напрямую через MTProto. Сообщения не проходят через наш сервер (его нет).
- Сессия и настройки хранятся только на твоём устройстве (`localStorage`).
- Реестр баннеров — публичный JSON в GitHub, туда попадает только то, что ты сам решил опубликовать.

---

## 📜 Стек

React 18 + TypeScript + Vite · GramJS (MTProto) · Zustand · Lucide icons · Capacitor (APK) · GitHub Actions.

---

Сделано как **ГРАММ** — Телеграм без границ. ГРАММ
