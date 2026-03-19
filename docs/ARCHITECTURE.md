# Magram — Архитектура проекта

> Версия: 0.12.1 · Дата документа: март 2026

---

## Стек технологий

| Категория | Технология |
|---|---|
| UI-фреймворк | React 19 |
| Сборщик | Vite |
| Состояние | Redux Toolkit |
| UI-компоненты | Material UI v7 |
| Telegram MTProto | GramJS (telegram v2.26) |
| P2P-звонки | PeerJS + WebRTC |
| Анимированные стикеры | rlottie-wasm |
| Лоттти-плеер | react-lottie / @thorvg/lottie-player |
| Стили | CSS Modules, SCSS, inline CSS-переменные |
| PWA | Service Worker + Cache API |

---

## Высокоуровневая схема

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Telegram MTProto API                        │
│                    (GramJS / telegram library)                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  client (singleton, App.jsx)
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                          Redux Store                                │
│   chatsSlice │ messagesSlice │ uiSlice │ settingsSlice              │
│   (Chats.js)   (Messages.js)  (UI.js)   (Settings.js)              │
└────────┬───────────────┬──────────────────────────┬─────────────────┘
         │               │                          │
┌────────▼──────┐ ┌──────▼──────────┐ ┌────────────▼────────────────┐
│  LeftColumn   │ │  MiddleColumn   │ │  Overlay-слои               │
│               │ │                 │ │  Call / VoiceChat /         │
│  ChatList     │ │  MessageList    │ │  MediaPreview / Stories /   │
│  Stories      │ │  Composer       │ │  Dialogs / Toasts /         │
│  Pages        │ │  ChatInfo       │ │  DeleteEffect               │
│  (Search,     │ │  PinnedMessage  │ └─────────────────────────────┘
│  UserProfile, │ │  Thread         │
│  Settings…)   │ │  MusicPlayer    │
└───────────────┘ └─────────────────┘
```

---

## Структура каталогов

```
Magram/
├── index.html                  # HTML-точка входа
├── vite.config.js              # Конфиг Vite
├── package.json                # Зависимости и скрипты
│
├── public/
│   ├── manifest.json           # PWA манифест
│   ├── robots.txt
│   ├── tgsticker.js            # TGS-стикер хэлпер
│   ├── rlottie/                # rlottie-wasm бинарники + worker
│   └── tgs/                    # Примеры TGS-анимаций
│
└── src/
    ├── index.jsx               # React root + StrictMode
    ├── App.jsx                 # Singleton TelegramClient, корневой App
    ├── config.jsx              # Глобальные константы (API, PUBLIC_URL, флаги)
    ├── sw.js                   # Service Worker логика (precache / runtime cache)
    │
    ├── assets/
    │   ├── fonts/              # OpenSans, Roboto, Vazirmatn, Material Symbols
    │   └── styles/             # Material Symbol Rounded CSS
    │
    ├── hooks/
    │   └── useIntersectionObserver.jsx   # Reusable intersection observer hook
    │
    ├── serviceWorker/
    │   ├── index.js            # SW регистрация
    │   └── assetCache.js       # Кэширование ресурсов
    │
    └── Components/
        ├── Auth/               # Экраны авторизации
        ├── App/                # Главный UI приложения
        ├── common/             # Переиспользуемые UI-примитивы
        ├── Helpers/            # Утилиты рендера (альбомы, текст, сущности)
        ├── Stores/             # Redux slice-файлы
        └── Util/               # Утилиты (медиа, форматирование, звонки, градиент)
```

---

## Модули и их ответственность

### `src/App.jsx` — точка входа приложения
- Создаёт и экспортирует **singleton** `client` типа `TelegramClient` (GramJS).
- Сессия хранится в `localStorage('auth_key')` как `StringSession`.
- `API_ID` / `API_HASH` подгружаются из Vite env-переменных.

---

### Auth (`src/Components/Auth/`)

| Файл | Роль |
|---|---|
| `Auth.jsx` | Контекст (`AuthContext`, `UserContext`), конечный автомат экранов авторизации |
| `Welcome.jsx` | Заставка / приветствие |
| `PhoneNumber.jsx` | Ввод номера телефона → `client.sendCode()` |
| `Verify.jsx` | Ввод OTP-кода → `client.signIn()` |
| `Password.jsx` | Двухфакторный пароль (2FA) → `client.signInWithPassword()` |
| `Register.jsx` | Регистрация нового пользователя → `client.signUp()` |

---

### Stores (`src/Components/Stores/`)

| Файл | Slice | Ключевые данные |
|---|---|---|
| `store.js` | root | Middleware + localStorage persistence для `settings` |
| `Chats.js` | `chatsSlice` | Карта диалогов `{[chatId]: chatObject}` |
| `Messages.js` | `messagesSlice` | Карта сообщений `{[chatId]: Message[]}` |
| `UI.js` | `uiSlice` | Весь UI-стейт: активный чат, модалки, звонок, медиа и т.д. |
| `Settings.js` | `settingsSlice` | Настройки (тема, анимации, история поиска) — персистируются |

#### Схема Redux State

```
store
├── chats
│   └── { [chatId]: TelegramChat }
├── messages
│   └── { [chatId]: TelegramMessage[] }
├── ui
│   ├── activeChat / activeFullChat
│   ├── contextMenu / reply / edit / forward
│   ├── pinnedMessage[]
│   ├── page / subPage[] / pageTitle
│   ├── userProfile / thread
│   ├── call / showCall / callMinimal / callMaximized
│   ├── groupCall { participants, connection, joined, active }
│   ├── mediaPreview / musicPlayer
│   ├── stories / storyModal
│   ├── toasts / dialogs
│   └── background / deleteEffect / positionTransition
└── settings
    ├── topPeers / searchHistory / playerVolume
    ├── animations { AnimatedStickers, ChatAnimations, AutoPlayGIFs }
    ├── darkMode
    └── customTheme { centerTopBar, bottomBar, iOSTheme, gradientMessage,
                      gradientCanvas, primaryColor }
```

---

### App/Handlers — обработчики MTProto-обновлений

```
UpdateManager.jsx
├── регистрирует addEventHandler(rawUpdate)
└── маршрутизирует обновления:
    ├── ChatHandler.jsx
    │   ├── UpdateUserStatus          → updateChatUserStatus
    │   ├── UpdateChannel             → обновление сущности канала
    │   ├── UpdateReadHistoryInbox/Outbox → updateChatRead
    │   ├── UpdateUserTyping          → handleTypingStatus / removeTypingStatus
    │   └── UpdateGroupCallParticipants → handleGroupCallParticipants
    └── MessagesHandler.jsx
        ├── UpdateEditMessage/Channel → updateMessage
        ├── UpdateDeleteMessages/Channel → removeMessages (с анимацией)
        └── NewMessage                → messageAdded, updateLastMessage, readHistory
```

---

### App/Home.jsx — корневой компонент
- Оборачивает всё приложение в MUI `ThemeProvider`.
- Инжектирует CSS-переменные кастомной темы в `document.documentElement`.
- Отображает состояние соединения (connecting/reconnecting).
- Запрашивает разрешение на push-уведомления браузера.
- Регистрирует `NewMessage` обработчик для Desktop-уведомлений.

---

### LeftColumn (`src/Components/App/LeftColumn.jsx`)

```
LeftColumn
├── TopBar (гамбургер-меню, аватар)
├── Stories (горизонтальная полоса историй)
├── CallMinimal (мини-бар активного звонка)
├── MusicBar (мини-плеер)
└── Router по страницам:
    ├── ChatList (по умолчанию)
    ├── Settings
    ├── Search
    ├── NewGroup
    ├── ChatProfile
    ├── UserProfile
    └── Forward
```

**ChatList** загружает диалоги через:
1. `client.invoke(Api.messages.GetDialogFilters())` — папки/фильтры
2. `client.getDialogs()` — все диалоги

---

### MiddleColumn (`src/Components/App/MiddleColumn/`)

```
MiddleColumn
├── ChatInfo (топ-бар: имя, статус, аватар, меню)
├── PinnedMessage (бар закреплённого сообщения)
├── VoiceChatInfo (кнопка присоединения к войс-чату)
├── MessageList / Thread
│   ├── Message (бабл)
│   │   ├── MessageText (текст + entities)
│   │   ├── MessageMedia (фото, видео, документ, стикер, голос, опрос, веб-страница)
│   │   ├── MessageReactions
│   │   ├── InlineButtons / KeyboardButton
│   │   └── MessageMeta (время, статус)
│   └── DateGroup (разделители по дате)
└── Composer (поле ввода)
    ├── ContentEditable → turndown (HTML→Markdown)
    ├── EmojiPicker
    ├── GIFPicker
    ├── BotInline (@bot query → GetInlineBotResults)
    └── Attachment preview
```

---

### Calls (`src/Components/App/Call/` + `VoiceChat/`)

| Модуль | Тип | Реализация |
|---|---|---|
| `Call.jsx` | 1-на-1 видео/голос | PeerJS (WebRTC P2P) |
| `VoiceChat.jsx` | Группой войс/видео чат | MTProto `phone.*` API + `TGCalls.js` (WebRTC) |
| `TGCalls.js` | WebRTC обёртка | SDP offer/answer, SSRC routing |
| `parseSdp.js` / `sdpbuilder.js` | SDP утилиты | Парсинг/сборка Telegram SDP |
| `voiceChat.js` | Утилиты участников | SSRC конвертация, diff участников |

---

### Pages (`src/Components/App/Pages/`)

| Страница | MTProto API |
|---|---|
| `Search.jsx` | `contacts.Search`, `contacts.GetTopPeers` |
| `UserProfile.jsx` | `users.GetFullUser`, `help.GetPeerProfileColors`, `messages.GetCommonChats`, getMessages (фото/видео/GIF) |
| `ChatProfile.jsx` | `client.getParticipants()` |
| `ManageGroup/Manage.jsx` | `messages.EditChatTitle`, `messages.EditChatAbout` |
| `ManageGroup/AdminRights.jsx` | `channels.EditAdmin` |
| `ManageGroup/Permissions.jsx` | `messages.EditChatDefaultBannedRights` |
| `Settings.jsx` | `account.CheckUsername`, `account.UpdateUsername`, `auth.LogOut` |

---

### Util (`src/Components/Util/`)

| Файл | Назначение |
|---|---|
| `media.js` | `downloadMedia()` — универсальная загрузка медиа с кэшированием (Cache API) |
| `messages.js` | `readHistory`, `deleteMessage`, `saveGIF`, `sendReaction`, `retractVote`, `getStoriesById` |
| `dateFormat.js` | Форматирование дат |
| `numbers.js` | Форматирование чисел |
| `phoneNumber.js` | Форматирование номеров телефонов |
| `username.js` | Утилиты имён пользователей |
| `gradientRenderer.js` | WebGL-рендерер градиентного фона чата |
| `deepLink.js` | Парсер Telegram deep-link URL |
| `profilePhoto.js` | Хэлперы фотографий профиля |
| `buildClassName.js` | Конструктор className строк |
| `setupServiceWorker.js` | Регистрация Service Worker |
| `Calls/TGCalls.js` | WebRTC обёртка для группового звонка |
| `Calls/voiceChat.js` | Утилиты участников войс-чата |
| `Calls/parseSdp.js` | Парсер SDP для Telegram |
| `Calls/sdpbuilder.js` | Сборщик SDP для Telegram |

---

### Common components (`src/Components/common/`)

| Компонент | Назначение |
|---|---|
| `LottiePlayer.jsx` / `RLottie.jsx` | TGS-стикеры через rlottie-wasm |
| `FullNameTitle.jsx` | Имя + бейджи (верификация, Premium) |
| `StoryCircle.jsx` | Кольцо историй вокруг аватара |
| `SoundBubbles.jsx` | Визуализатор аудио для звонков |
| `DeleteEffect.jsx` | Анимация частиц при удалении сообщения |
| `TextTransition.jsx` | Анимированная смена текста |
| `PositionTransition.jsx` / `DynamicPositionTransition.jsx` | Анимированные переходы позиции |
| `JoinChatDialog.jsx` | Диалог подтверждения вступления в чат |
| `ClearCacheDialog.jsx` | Диалог очистки кэша |
| `DeleteMessageDialog.jsx` | Диалог удаления сообщения |

---

### Helpers (`src/Components/Helpers/`)

| Файл | Назначение |
|---|---|
| `calculateAlbumLayout.jsx` | Вычисление сетки для альбомов фото |
| `chats.jsx` | Хэлперы диалогов (сортировка, форматирование) |
| `messages.jsx` | Хэлперы сообщений |
| `renderTextWithEntities.jsx` | Рендер текста с Telegram entities (bold, italic, mention, link, code…) |
| `users.jsx` | Хэлперы пользователей |
| `waveform.jsx` | Декодирование/отображение waveform для голосовых |

---

## Потоки данных

### Загрузка чатов
```
App mount
  → client.connect()
  → ChatList mount
      → client.invoke(GetDialogFilters)   [папки]
      → client.getDialogs()               [чаты]
      → dispatch(setChats)
      → render ChatList items
```

### Отправка сообщения
```
User types in Composer
  → SetTyping API call (debounced)
  → User presses Send
      → client.sendMessage() / client.sendFile()
      → optimistic message added to store
      → server confirms → updateMessageId
```

### Входящее сообщение
```
GramJS event: NewMessage
  → Home.jsx handler
      → dispatch(messageAdded)
      → dispatch(updateLastMessage)
      → readHistory() if chat is active
      → Desktop notification if chat not active
```

### Групповой звонок
```
User clicks Join (VoiceChatInfo)
  → client.invoke(phone.JoinGroupCall) with SDP
  → TGCalls.js: RTCPeerConnection setup
  → SDP exchange via Telegram API
  → Audio/video tracks added
  → Periodic phone.GetGroupParticipants for UI updates
```

---

## PWA и кэширование

```
serviceWorker/
├── index.js          — регистрация SW, событие 'updatefound'
└── assetCache.js     — кэш ресурсов (Cache API)

sw.js                 — логика SW: precache + runtime cache стратегии
```

---

## Переменные окружения

| Переменная | Назначение |
|---|---|
| `VITE_API_ID` | Telegram App API ID |
| `VITE_API_HASH` | Telegram App API Hash |

Задаются в `.env` файлах (не коммитятся в репозиторий).
