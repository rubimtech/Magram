# Magram — План реализации экспорта истории и участников

> Дата: март 2026  
> Версия проекта: 0.12.1  
> **Статус**: ✅ Реализовано (версия 1.0.0)

---

## Статус реализации

**Все этапы завершены!** ✅

- [x] Этап 1 — Инфраструктура (exportCache, fetchHistory, fetchParticipants)
- [x] Этап 2 — Форматтеры (JSON, CSV, HTML)
- [x] Этап 3 — Загрузчик файлов (downloader.js)
- [x] Этап 4 — Публичный API (index.js)
- [x] Этап 5 — UI (ExportDialog, ExportComplete)
- [x] Этап 6 — Интеграция в Settings Storage
- [x] Этап 7 — Сборка и тестирование

**Сборка**: `npm run build` ✅ (19.75s)

**Документация**: `docs/EXPORT_README.md`

---

## Содержание

1. [Обзор и концепция](#1-обзор-и-концепция)
2. [Экспорт истории сообщений](#2-экспорт-истории-сообщений)
   - 2.1 Получение всех сообщений (пагинация)
   - 2.2 Кэширование сообщений
   - 2.3 Форматы экспорта
   - 2.4 Скачивание медиафайлов
   - 2.5 UI и прогресс
3. [Экспорт участников группы/канала](#3-экспорт-участников-группыканала)
   - 3.1 Получение всех участников
   - 3.2 Форматы экспорта
   - 3.3 UI
4. [Архитектура модуля Export](#4-архитектура-модуля-export)
5. [Пошаговый план реализации](#5-пошаговый-план-реализации)
6. [MTProto API — справка](#6-mtproto-api--справка)
7. [Ограничения и обходные пути](#7-ограничения-и-обходные-пути)

---

## 1. Обзор и концепция

Реализовать встроенный в Magram инструмент экспорта, который:
- Получает всю историю сообщений из любого чата (личный, группа, канал, супергруппа) через MTProto API гаже без использования официального Telegram Export.
- Кэширует полученные сообщения локально (IndexedDB / Cache API / localStorage) чтобы не перегружать API при повторных экспортах и не превышать rate limits.
- Даёт возможность сохранить историю в `JSON`, `CSV` или `HTML` файл.
- Опционально подгружает и встраивает медиафайлы (фото, документы, голосовые) в экспорт.
- Экспортирует полный список участников группы/канала с метаданными (id, имя, username, телефон, роль).

---

## 2. Экспорт истории сообщений

### 2.1 Получение всех сообщений (пагинация)

Telegram API возвращает максимум **100 сообщений** на запрос (`messages.GetHistory`). Для полного экспорта нужен цикл с пагинацией по `offset_id`.

**Алгоритм:**

```
offsetId = 0
allMessages = []

loop:
  batch = client.invoke(messages.GetHistory {
    peer: chatPeer,
    offset_id: offsetId,
    add_offset: 0,
    limit: 100,
    max_id: 0,
    min_id: 0,
    hash: 0
  })

  if batch.messages.length == 0 → STOP

  allMessages.push(...batch.messages)
  offsetId = batch.messages[last].id

  delay(350ms)   ← обязательная задержка во избежание FloodWait

until batch.messages.length < 100
```

**Дополнительно** — при наличии `FloodWaitError` (`FLOOD_WAIT_X`) — ждать указанное количество секунд и продолжить.

**MTProto API:**
```
messages.GetHistory {
  peer: InputPeer,
  offset_id: int,
  add_offset: int,
  limit: int,       // max 100
  max_id: int,
  min_id: int,
  hash: long
}
```

---

### 2.2 Кэширование сообщений

**Уровни кэша:**

| Уровень | Технология | Что хранит | TTL |
|---|---|---|---|
| L1 — быстрый | Redux `messagesSlice` | Текущие загруженные сообщения в памяти | До перезагрузки |
| L2 — сессионный | `localStorage` | Уже реализовано в проекте (`handleCachedMessages`) | До очистки |
| L3 — постоянный | `IndexedDB` | Полный кэш экспорта (батчи по chatId + messageId) | Управляемый TTL |
| L4 — медиа | Cache API (`ma-media`) | Уже реализовано в `Util/media.js` | До очистки |

**Новое: IndexedDB схема для экспорта**

```
DB: magram-export
├── objectStore: messages
│   ├── key: [chatId, messageId]
│   └── value: { ...telegramMessage, _exportedAt: timestamp }
├── objectStore: exportJobs
│   ├── key: jobId (uuid)
│   └── value: { chatId, status, progress, total, startedAt, completedAt, format }
└── objectStore: participants
    ├── key: [chatId, userId]
    └── value: { ...participantData, _exportedAt: timestamp }
```

**Инвалидация кэша:**
- При экспорте проверять последний `messageId` из кэша — если он соответствует последнему в чате, докачивать только новые сообщения (incremental export).
- Явная кнопка "Очистить кэш экспорта" в Settings → Storage.

---

### 2.3 Форматы экспорта

#### JSON
```json
{
  "chat": {
    "id": 123456789,
    "title": "My Group",
    "type": "supergroup",
    "exportedAt": "2026-03-11T10:00:00Z"
  },
  "messages": [
    {
      "id": 1001,
      "date": "2025-01-15T14:32:00Z",
      "from": {
        "id": 987654321,
        "firstName": "Иван",
        "lastName": "Иванов",
        "username": "ivan_ivanov"
      },
      "text": "Привет всем!",
      "replyToMsgId": null,
      "media": null,
      "reactions": [{ "emoji": "👍", "count": 5 }],
      "views": 120,
      "forwards": 2
    }
  ]
}
```

#### CSV
```
id,date,from_id,from_name,from_username,text,reply_to,has_media,media_type,views,forwards
1001,2025-01-15T14:32:00Z,987654321,"Иван Иванов",ivan_ivanov,"Привет всем!",,false,,120,2
```

#### HTML
- Самодостаточный HTML-файл с inline CSS в стиле Magram.
- Медиафайлы встроены как `base64` Data URL (опционально, только для фото < 5MB).
- Для крупных файлов — ссылки на скачанные рядом файлы в папке `media/`.

---

### 2.4 Скачивание медиафайлов (опционально)

При включении опции "Включить медиа" в диалоге экспорта:

```
for each message with media:
  1. Проверить Cache API (уже реализовано в media.js → downloadMedia)
  2. Если не кэшировано → client.downloadMedia(media, { progressCallback })
  3. Для JSON/CSV: сохранить имя файла в поле message.media.localPath
  4. Для HTML: встроить small фото как base64, крупные — отдельный файл
  5. Задержка 100ms между запросами
```

Использовать `File System Access API` (`window.showDirectoryPicker()`) чтобы пользователь выбрал папку назначения.

---

### 2.5 UI и прогресс

**Точка входа:** Контекстное меню чата (ChatInfo.jsx) → "Экспорт истории"

**Диалог ExportDialog:**

```
┌─────────────────────────────────────────┐
│        Экспорт истории чата             │
│                                         │
│  Формат:  ○ JSON  ○ CSV  ○ HTML        │
│                                         │
│  Период:  ○ Всё время                  │
│           ○ С [дата] по [дата]          │
│                                         │
│  □ Включить медиафайлы                  │
│  □ Использовать кэш (пропустить         │
│    уже загруженные)                     │
│                                         │
│  [Начать экспорт]          [Отмена]     │
└─────────────────────────────────────────┘
```

**Экран прогресса (in-place в диалоге):**

```
┌─────────────────────────────────────────┐
│  Загрузка сообщений...                  │
│                                         │
│  ████████████░░░░░  1 240 / ~3 500      │
│                                         │
│  Скорость: ~280 msg/s                   │
│  Медиа: 48 файлов / 124 MB              │
│                                         │
│  [Приостановить]        [Отменить]      │
└─────────────────────────────────────────┘
```

**После завершения:**
- Автоматически скачать файл через `<a download>` (для JSON/CSV).
- Для HTML + медиа — использовать `File System Access API` или ZIP-архив через `JSZip`.

---

## 3. Экспорт участников группы/канала

### 3.1 Получение всех участников

**Для супергрупп и каналов (InputPeerChannel):**

```
offset = 0
limit = 200   ← максимум для channels.GetParticipants
allParticipants = []

loop:
  result = client.invoke(channels.GetParticipants {
    channel: InputChannel,
    filter: ChannelParticipantsSearch { q: "" },
    offset: offset,
    limit: 200,
    hash: 0
  })

  allParticipants.push(...result.participants)
  users = result.users   ← хранить для join по userId

  if result.participants.length < 200 → STOP
  offset += result.participants.length
  delay(500ms)
```

**Для обычных групп (messages.GetFullChat):**

```
fullChat = client.invoke(messages.GetFullChat { chat_id: chatId })
→ fullChat.fullChat.participants   ← ChatParticipants object, все сразу
```

**Роли участников:**

| Тип `ChannelParticipant` | Роль |
|---|---|
| `ChannelParticipantCreator` | Владелец |
| `ChannelParticipantAdmin` | Администратор |
| `ChannelParticipant` | Участник |
| `ChannelParticipantBanned` | Забанен |
| `ChannelParticipantLeft` | Покинул |

**Дополнительно список администраторов отдельно:**

```
client.invoke(channels.GetParticipants {
  filter: ChannelParticipantsAdmins,
  ...
})
```

---

### 3.2 Форматы экспорта участников

#### JSON
```json
{
  "chat": { "id": 123, "title": "My Group", "type": "supergroup" },
  "exportedAt": "2026-03-11T10:00:00Z",
  "total": 1500,
  "participants": [
    {
      "userId": 987654321,
      "firstName": "Иван",
      "lastName": "Иванов",
      "username": "ivan_ivanov",
      "phone": "+79991234567",
      "role": "admin",
      "adminRights": {
        "canPostMessages": true,
        "canEditMessages": false,
        "canDeleteMessages": true,
        "canBanUsers": false,
        "canInviteUsers": true,
        "canPinMessages": true,
        "canManageCall": false,
        "isAnonymous": false
      },
      "joinedDate": "2024-06-10T09:00:00Z",
      "lastSeen": "2026-03-10T18:00:00Z",
      "isBot": false,
      "isPremium": true,
      "isVerified": false
    }
  ]
}
```

#### CSV
```
user_id,first_name,last_name,username,phone,role,joined_date,last_seen,is_bot,is_premium
987654321,Иван,Иванов,ivan_ivanov,+79991234567,admin,2024-06-10,2026-03-10,false,true
```

> **Примечание:** Номер телефона доступен только если пользователь в контактах или есть соответствующие настройки приватности.

---

### 3.3 UI

**Точка входа:** ChatProfile.jsx / ManageGroup → "Экспорт участников"

**Диалог:**

```
┌─────────────────────────────────────────┐
│      Экспорт участников                 │
│                                         │
│  Формат:  ○ JSON  ○ CSV                │
│                                         │
│  Фильтр:  ○ Все                        │
│           ○ Только администраторы       │
│           ○ Только боты                 │
│                                         │
│  □ Включить телефоны (если доступны)    │
│  □ Включить дату вступления             │
│  □ Включить last seen                  │
│                                         │
│  [Начать экспорт]          [Отмена]     │
└─────────────────────────────────────────┘
```

---

## 4. Архитектура модуля Export

```
src/Components/
├── App/
│   └── Pages/
│       └── Export/
│           ├── ExportDialog.jsx          ← модальный диалог настроек
│           ├── ExportProgress.jsx        ← экран прогресса
│           └── ExportComplete.jsx        ← экран завершения
│
└── Util/
    └── export/
        ├── index.js                      ← публичный API модуля
        ├── fetchHistory.js               ← пагинация GetHistory + FloodWait
        ├── fetchParticipants.js          ← пагинация GetParticipants
        ├── exportCache.js                ← IndexedDB обёртка (CRUD кэша)
        ├── formatters/
        │   ├── toJson.js                 ← Message[] → JSON string
        │   ├── toCsv.js                  ← Message[] → CSV string
        │   ├── toHtml.js                 ← Message[] → HTML string
        │   ├── participantsToJson.js
        │   └── participantsToCsv.js
        └── downloader.js                 ← сохранение файлов (blob URL / FSA API / JSZip)
```

**Публичный API (`index.js`):**

```js
// Экспорт истории
export async function exportHistory(chatId, peer, options, onProgress)
// options: { format: 'json'|'csv'|'html', includeMedia: bool,
//            fromDate: Date|null, toDate: Date|null, useCache: bool }
// onProgress: ({ fetched, total, phase: 'messages'|'media' }) => void
// returns: Blob

// Экспорт участников
export async function exportParticipants(chatId, peer, options, onProgress)
// options: { format: 'json'|'csv', filter: 'all'|'admins'|'bots',
//            includePhone: bool, includeJoinDate: bool }
// returns: Blob

// Управление кэшем
export async function getCachedStats(chatId)
// returns: { messageCount, oldestDate, newestDate, sizeBytes }

export async function clearExportCache(chatId)
```

---

## 5. Пошаговый план реализации

### Этап 1 — Инфраструктура (2-3 дня) ✅ ВЫПОЛНЕНО

- [x] **1.1** Создать `src/Components/Util/export/exportCache.js`
  - Инициализация IndexedDB (`magram-export`)
  - CRUD: `saveMessages(chatId, messages[])`, `getMessages(chatId)`, `getLastMessageId(chatId)`
  - CRUD: `saveParticipants(chatId, participants[])`, `getParticipants(chatId)`
  - CRUD: `saveExportJob(job)`, `getExportJob(jobId)`, `updateExportJob(jobId, patch)`
  - `clearCache(chatId)`, `getCacheStats(chatId)`

- [x] **1.2** Создать `src/Components/Util/export/fetchHistory.js`
  - `fetchAllMessages(peer, options, onProgress)` — цикл пагинации с `offset_id`
  - `FloodWaitError` handler — `await sleep(waitSeconds * 1000)`
  - Incrementral fetch — стартовать с `lastCachedMessageId + 1`
  - Date range filter (`fromDate`, `toDate`)

- [x] **1.3** Создать `src/Components/Util/export/fetchParticipants.js`
  - `fetchAllParticipants(peer, filter, onProgress)` — цикл для каналов
  - `fetchGroupParticipants(chatId)` — `messages.GetFullChat` для обычных групп
  - Нормализация: join participant + users[] → единый объект

### Этап 2 — Форматтеры (1-2 дня) ✅ ВЫПОЛНЕНО

- [x] **2.1** `src/Components/Util/export/formatters/toJson.js`
  - Нормализация `TelegramMessage` → plain JSON объект
  - Рекурсивный обход `media`, `entities`, `reactions`, `replyTo`
  - Заголовок чата (мета-блок)

- [x] **2.2** `src/Components/Util/export/formatters/toCsv.js`
  - CSV escape (кавычки, переносы строк)
  - Плоская структура строки сообщения
  - BOM для Excel (`\uFEFF`)

- [x] **2.3** `src/Components/Util/export/formatters/toHtml.js`
  - Шаблон HTML с inline CSS (копия bubble из Magram Dark theme)
  - Рендер `entities` (bold/italic/code/link)
  - Встраивание фото как `<img src="data:...">`, документы как `<a download>`
  - `<details>` для длинных сообщений

- [x] **2.4** `src/Components/Util/export/formatters/participantsToJson.js`
- [x] **2.5** `src/Components/Util/export/formatters/participantsToCsv.js`

### Этап 3 — Загрузчик файлов (1 день) ✅ ВЫПОЛНЕНО

- [x] **3.1** `src/Components/Util/export/downloader.js`
  - `downloadBlob(blob, filename)` — базовый `<a download>` метод
  - `saveToDirectory(files, dirHandle)` — File System Access API (если поддерживается)
  - `saveAsZip(files)` — JSZip-архив (медиа + основной файл) — добавить зависимость `jszip`

### Этап 4 — Публичный API (0.5 дня) ✅ ВЫПОЛНЕНО

- [x] **4.1** `src/Components/Util/export/index.js`
  - Оркестрация: fetch → cache → format → download
  - AbortController для отмены
  - Suspend/Resume через сохранение прогресса в IndexedDB

### Этап 5 — UI (2-3 дня) ✅ ВЫПОЛНЕНО

- [x] **5.1** `ExportDialog.jsx` — диалог настроек экспорта
  - Props: `open`, `onClose`, `chatId`, `peer`, `type: 'history'|'participants'`
  - MUI Dialog + FormControl + RadioGroup + Checkbox
  - Валидация: дата From < дата To

- [x] **5.2** `ExportProgress.jsx` — inline прогресс внутри диалога (интегрирован в ExportDialog)
  - LinearProgress + счётчик сообщений
  - Кнопки "Приостановить" / "Отменить"
  - Отображение этапа: "Загрузка сообщений", "Загрузка медиа", "Формирование файла"

- [x] **5.3** `ExportComplete.jsx` — экран результата
  - Статистика: кол-во сообщений, размер файла, затраченное время
  - Кнопка "Скачать снова"
  - Информация о кэше ("3 500 сообщений в кэше, след. экспорт будет быстрее")

- [x] **5.4** Подключить в `ChatInfo.jsx` (пункт меню "Экспорт истории")
- [x] **5.5** Подключить в `ChatProfile.jsx` (пункт меню "Экспорт участников")

### Этап 6 — Интеграция с Settings → Storage (0.5 дня) ✅ ВЫПОЛНЕНО

- [x] **6.1** В `Settings/StorageUsage.jsx` добавить раздел "Кэш экспорта"
  - Показывать размер кэша по чатам
  - Кнопка "Очистить кэш экспорта"

### Этап 7 — Тестирование и обработка граничных случаев ✅ ВЫПОЛНЕНО

- [x] **7.1** FloodWait recovery (FLOOD_WAIT_X)
- [x] **7.2** Очень большие чаты (100k+ сообщений) — стриминг в IndexedDB батчами
- [x] **7.3** Каналы без прав на чтение участников
- [x] **7.4** Прерванный экспорт — возобновление с последней позиции
- [x] **7.5** Очень старые сообщения (1970-е даты из Telegram legacy)
- [x] **7.6** Медиа недоступны (удалены с серверов Telegram)

**Сборка**: ✅ Успешно (19.75s)

---

## 6. MTProto API — справка

### История сообщений

```
messages.GetHistory {
  peer:       InputPeer
  offset_id:  int        // начать с этого message_id (0 = самые новые)
  add_offset: int        // смещение (обычно 0)
  limit:      int        // max 100
  max_id:     int        // включительно до (0 = без ограничений)
  min_id:     int        // включительно от (0 = без ограничений)
  hash:       long       // для кэширования (0 = без кэша)
}

// Возвращает:
messages.Messages {
  messages: Message[]
  chats:    Chat[]
  users:    User[]
  count?:   int      // только для messages.ChannelMessages
}
```

### Участники

```
// Для каналов и супергрупп:
channels.GetParticipants {
  channel: InputChannel
  filter:  ChannelParticipantsFilter
    // ChannelParticipantsSearch { q: string }  — поиск по имени
    // ChannelParticipantsAdmins                — только администраторы
    // ChannelParticipantsBots                  — только боты
    // ChannelParticipantsBanned { q: string }  — забаненные
    // ChannelParticipantsKicked { q: string }  — кикнутые
    // ChannelParticipantsContacts              — только контакты
  offset: int     // пагинация (макс. 200 за запрос)
  limit:  int     // max 200
  hash:   long
}

// Для обычных групп:
messages.GetFullChat { chat_id: long }
// → result.fullChat.participants: ChatParticipants (все сразу, лимит ~200)
```

### Обработка ошибок

| Ошибка | Причина | Решение |
|---|---|---|
| `FLOOD_WAIT_X` | Слишком частые запросы | `await sleep(X * 1000)`, затем повтор |
| `CHANNEL_PRIVATE` | Нет доступа к каналу | Показать ошибку пользователю |
| `CHAT_ADMIN_REQUIRED` | Нет прав читать участников | Экспортировать без участников или показать ошибку |
| `MESSAGE_ID_INVALID` | Невалидный offset_id | Сбросить offset_id = 0 |
| `PARTICIPANTS_TOO_FEW` | Группа слишком мала | Игнорировать, обработать как обычную группу |

---

## 7. Ограничения и обходные пути

| Ограничение | Детали | Обходной путь |
|---|---|---|
| Макс. 100 сообщений за запрос | Telegram API жёсткий лимит | Пагинация по `offset_id` |
| Макс. 200 участников за запрос | `channels.GetParticipants` | Пагинация по `offset` |
| FloodWait при интенсивных запросах | ~1-2 минуты ожидания | Задержка 350ms между батчами + FloodWait handler |
| Участники >10k без прав админа | Telegram не отдаёт полный список рядовым участникам | Показывать предупреждение; экспортировать то что доступно |
| Медиа удалено с серверов | `client.downloadMedia` вернёт ошибку | Skip + отмечать как `[media unavailable]` |
| File System Access API (только Chrome) | Safari/Firefox не поддерживают | Fallback: ZIP через JSZip |
| Телефоны участников | Доступны только для контактов | Показывать только то что доступно, не ломаться |
| Старые сообщения мигрировавшего чата | `messages.GetHistory` не переходит в мигрировавший чат | Также запрашивать `migrated_from_chat_id` из fullChat |

### Рекомендуемые задержки (rate limiting)

```
Между батчами GetHistory:       350 ms
Между батчами GetParticipants:  500 ms
Между загрузками медиа:         100 ms
При FloodWait:                  ждать указанное время + 5 сек буфер
```

### Зависимости для добавления в package.json

```json
{
  "dependencies": {
    "jszip": "^3.10.1",
    "idb": "^8.0.0"
  }
}
```

- **`idb`** — удобная Promise-обёртка над IndexedDB (мал по размеру, ~1KB gzip).
- **`jszip`** — создание ZIP-архивов в браузере для экспорта с медиафайлами.
