# Magram — План реализации AI-ассистента в Composer

> Дата: март 2026 · Версия проекта: 0.12.1

---

## Содержание

1. [Обзор и концепция](#1-обзор-и-концепция)
2. [Профили AI](#2-профили-ai)
   - 2.1 Структура данных профиля
   - 2.2 Хранение профилей
   - 2.3 Управление профилями (CRUD)
3. [AI в Composer — обработка исходящих сообщений](#3-ai-в-composer--обработка-исходящих-сообщений)
   - 3.1 Кнопка AI в панели Composer
   - 3.2 Выбор профиля
   - 3.3 Превью и редактирование результата
4. [Кнопка «Ответить с AI»](#4-кнопка-ответить-с-ai)
   - 4.1 Триггер из контекстного меню
   - 4.2 Триггер из Reply Bar
   - 4.3 Поток обработки
5. [Модуль AI-провайдера](#5-модуль-ai-провайдера)
   - 5.1 Абстракция провайдера
   - 5.2 Поддерживаемые провайдеры
   - 5.3 Streaming
6. [Архитектура модуля AI](#6-архитектура-модуля-ai)
7. [Redux: изменения в Store](#7-redux-изменения-в-store)
8. [Пошаговый план реализации](#8-пошаговый-план-реализации)
9. [UX-макеты (ASCII)](#9-ux-макеты-ascii)
10. [Безопасность](#10-безопасность)

---

## 1. Обзор и концепция

Встроенный AI-ассистент добавляет три сценария использования:

| Сценарий | Точка входа | Описание |
|---|---|---|
| **Улучшить сообщение** | Кнопка AI в тулбаре Composer | Пользователь пишет текст → AI переформулирует по выбранному профилю → пользователь подтверждает или редактирует → отправляет |
| **Ответить с AI** | Контекстное меню входящего сообщения | Пользователь выбирает входящее сообщение → AI составляет ответ → текст попадает в Composer → пользователь редактирует → отправляет |
| **Управление профилями** | Settings → AI Profiles | CRUD профилей: роль, system prompt, провайдер, модель, параметры |

Ключевые принципы:
- **AI никогда не отправляет сам** — результат всегда редактируемый черновик в Composer.
- **Профиль = набор инструкций** — system prompt + модель + параметры (температура, язык ответа).
- **API-ключ хранится только локально** — в `localStorage`, никуда не передаётся кроме нужного AI-эндпоинта.
- **Поддержка streaming** — генерация текста стриминговая (chunked), пользователь видит результат в реальном времени.

---

## 2. Профили AI

### 2.1 Структура данных профиля

```typescript
interface AIProfile {
  id: string;                   // uuid v4, генерируется при создании
  name: string;                 // Название профиля (напр. "Деловой стиль")
  icon: string;                 // Emoji-иконка (напр. "💼")
  description?: string;         // Короткое описание для UI
  provider: AIProvider;         // 'openai' | 'anthropic' | 'ollama' | 'openai-compat'
  model: string;                // напр. "gpt-4o", "claude-3-5-sonnet", "llama3.2"
  systemPrompt: string;         // Основная инструкция AI
  temperature: number;          // 0.0 – 2.0, default 0.7
  maxTokens: number;            // default 1024
  language?: string;            // Язык ответа: 'auto' | 'ru' | 'en' | ...
  baseUrl?: string;             // Для OpenAI-compatible / Ollama
  apiKeyRef: string;            // Ключ из aiKeys[provider] в Settings
  isDefault: boolean;           // Используется по умолчанию
  createdAt: string;            // ISO date
  updatedAt: string;            // ISO date
}
```

### Встроенные профили (preset-ы, не редактируемые, можно клонировать):

| ID | Название | Иконка | Назначение |
|---|---|---|---|
| `preset-rewrite` | Переформулировать | ✏️ | Сохранить смысл, улучшить стиль |
| `preset-formal` | Деловой стиль | 💼 | Формальный, профессиональный тон |
| `preset-concise` | Кратко | ⚡ | Сократить до сути |
| `preset-friendly` | Неформальный | 😊 | Дружеский, живой тон |
| `preset-reply` | Умный ответ | 🤖 | Составить ответ на сообщение |
| `preset-translate` | Перевести | 🌐 | Перевести на целевой язык |

### 2.2 Хранение профилей

**Хранилище:** `localStorage` через Redux `settingsSlice` (уже персистируется).

```
localStorage → magramState → settings.ai
  ├── profiles: AIProfile[]
  ├── keys: {
  │     openai: string,       ← API ключ OpenAI (шифруется XOR с device fingerprint)
  │     anthropic: string,
  │     ollama: string,
  │     openai_compat: string
  │   }
  └── defaultProfileId: string
```

> **Шифрование ключей:** API-ключи XOR-шифруются с device fingerprint (`navigator.userAgent + screen.width + screen.height`) перед записью в localStorage. Не криптографически стойко, но защищает от случайного чтения скриншотом или синхронизацией браузера.

### 2.3 Управление профилями (CRUD)

Реализуется как новая страница в Settings (`Settings/AIProfiles.jsx`).

**Операции:**
- **Создать** — кнопка "+ Новый профиль", открывает форму.
- **Редактировать** — клик по профилю → форма редактирования.
- **Клонировать** — "Копировать" из меню профиля → дублирует с именем "Копия …".
- **Удалить** — "Удалить" из меню (нельзя удалить последний профиль если он `isDefault`).
- **Установить по умолчанию** — переключатель в интерфейсе.

---

## 3. AI в Composer — обработка исходящих сообщений

### 3.1 Кнопка AI в панели Composer

Изменения в `src/Components/App/MiddleColumn/Composer.jsx`:

- Добавить кнопку **✨ AI** в правую часть тулбара Composer (рядом с emoji/attach).
- Кнопка активна только когда `messageInputHandled.trim().length > 0`.
- При клике — если профиль один → сразу запустить. Если несколько — показать попап выбора профиля (Dropdown).

```
┌─────────────────────────────────────────────────────┐
│  Написать сообщение...                              │
│                                                     │
│                          [📎] [😊] [✨ AI] [→ Отправить] │
└─────────────────────────────────────────────────────┘
```

### 3.2 Выбор профиля

Выпадающее меню над кнопкой AI (компонент `AIProfilePicker`):

```
┌─────────────────────┐
│ ✏️  Переформулировать│ ← активный профиль (галочка)
│ 💼  Деловой стиль   │
│ ⚡  Кратко          │
│ 😊  Неформальный    │
│ 🤖  Умный ответ     │
│ ─────────────────── │
│ ⚙️  Настройки AI    │ → Opens Settings/AIProfiles
└─────────────────────┘
```

### 3.3 Превью и редактирование результата

После нажатия на профиль — открывается **модальная панель AI Preview** (`AIPreviewPanel`) которая появляется над Composer (slide-up анимация):

```
┌────────────────────────────────────────────────────────┐
│ ✨ AI · Деловой стиль                           [✕]    │
├────────────────────────────────────────────────────────┤
│ Исходное:                                              │
│ ┌────────────────────────────────────────────────────┐ │
│ │ привет! я написал отчёт, можешь посмотреть?        │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ Результат AI:                                          │
│ ┌────────────────────────────────────────────────────┐ │
│ │ Добрый день! Подготовил отчёт и буду рад выслушать │ │
│ │ ваши замечания. Прошу ознакомиться.   ░░░          │ │
│ │                                  ← streaming       │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ [↩ Заново]  [✏️ Редактировать]  [✅ Использовать]      │
└────────────────────────────────────────────────────────┘
```

**Действия:**
- **↩ Заново** — повторный запрос к AI (можно сменить профиль).
- **✏️ Редактировать** — результат AI вставляется в Composer для ручной правки, панель закрывается.
- **✅ Использовать** — заменяет текст в Composer на результат AI, панель закрывается. Пользователь вручную жмёт "Отправить".

---

## 4. Кнопка «Ответить с AI»

### 4.1 Триггер из контекстного меню сообщения

В `ContextMenu.jsx` — добавить пункт **"🤖 Ответить с AI"** в список действий над входящим сообщением.

```
┌──────────────────────┐
│  📋 Копировать        │
│  ↩ Ответить          │
│ 🤖 Ответить с AI     │  ← новый пункт
│  ➡️ Переслать         │
│  📌 Закрепить         │
│  🗑 Удалить           │
└──────────────────────┘
```

**Условие показа:** только для входящих сообщений (`message.out === false`) и когда есть хотя бы один AI-профиль настроен.

### 4.2 Триггер из Reply-bar

Когда пользователь свайпнул сообщение (reply), в Reply-bar добавить кнопку **"AI ответ"**:

```
┌─────────────────────────────────────────────────────┐
│ ↩ Ответить: "Привет! можешь показать отчёт?"   [🤖] │
└─────────────────────────────────────────────────────┘
```

### 4.3 Поток обработки «Ответить с AI»

```
1. Пользователь нажимает "🤖 Ответить с AI" на сообщении X
2. UI:
   a. Устанавливает replyToMessage = X (как обычный reply)
   b. Определяет активный AI-профиль (defaultProfile или показывает AIProfilePicker)
3. Формирует промпт:
   {
     systemPrompt: profile.systemPrompt,
     context: [
       последние N сообщений чата (история контекста),
       message: X.text   // входящее сообщение на которое отвечаем
     ]
   }
4. Отправляет запрос к AI-провайдеру
5. Результат streaming → AIPreviewPanel (тот же что для Composer)
6. Пользователь: "✅ Использовать" → текст вставляется в Composer
   + replyToMessage остаётся установленным
7. Пользователь вручную нажимает "Отправить"
```

**Контекст сообщений для AI:**

```javascript
// Берём последние 10 сообщений для контекста (настраивается в профиле)
const contextMessages = chatMessages
  .slice(-10)
  .map(m => ({
    role: m.out ? 'assistant' : 'user',
    content: m.message || '[медиа]'
  }))

// Добавляем целевое сообщение
contextMessages.push({
  role: 'user',
  content: targetMessage.message
})
```

---

## 5. Модуль AI-провайдера

### 5.1 Абстракция провайдера

```javascript
// src/Components/Util/ai/providers/base.js
export class AIProviderBase {
  async complete(messages, options, onChunk) {
    // messages: [{ role, content }]
    // options:  { model, temperature, maxTokens }
    // onChunk:  (text: string) => void — streaming callback
    // returns:  Promise<string>        — полный результат
    throw new Error('Not implemented')
  }

  async abort() {
    // Отменить текущий запрос
  }
}
```

### 5.2 Поддерживаемые провайдеры

| Провайдер | Класс | Base URL | Примечание |
|---|---|---|---|
| OpenAI | `OpenAIProvider` | `https://api.openai.com/v1` | gpt-4o, gpt-4o-mini, gpt-3.5-turbo |
| Anthropic | `AnthropicProvider` | `https://api.anthropic.com/v1` | claude-3-5-sonnet, claude-3-haiku |
| Ollama | `OllamaProvider` | `http://localhost:11434/v1` | локальная модель, нет ключа |
| OpenAI-compatible | `OpenAICompatProvider` | настраиваемый | LM Studio, vLLM, Groq, Together AI, Deepseek |

Все провайдеры реализуют **OpenAI Chat Completions API** (`/v1/chat/completions`), поэтому классы `OpenAI`, `OllamaProvider` и `OpenAICompatProvider` разделяют один базовый класс `OpenAIBaseProvider`.

`AnthropicProvider` реализует отдельно (Anthropic Messages API).

### 5.3 Streaming

Использовать `fetch` с `ReadableStream` — нет зависимостей от внешних SDK:

```javascript
async complete(messages, options, onChunk) {
  const controller = new AbortController()
  this._abortController = controller

  const response = await fetch(`${this.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: true
    }),
    signal: controller.signal
  })

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const lines = decoder.decode(value).split('\n')
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') break

      const chunk = JSON.parse(data)
      const delta = chunk.choices[0]?.delta?.content || ''
      fullText += delta
      onChunk(delta)
    }
  }

  return fullText
}
```

---

## 6. Архитектура модуля AI

```
src/Components/
├── App/
│   ├── MiddleColumn/
│   │   ├── Composer.jsx                ← изменить: добавить кнопку AI + AIProfilePicker
│   │   └── Composer/
│   │       ├── AIButton.jsx            ← новый: кнопка ✨AI с dropdown профилей
│   │       ├── AIPreviewPanel.jsx      ← новый: панель превью + streaming результата
│   │       └── AIProfilePicker.jsx     ← новый: dropdown список профилей
│   │
│   ├── Message/
│   │   └── ContextMenu.jsx             ← изменить: добавить пункт "Ответить с AI"
│   │
│   └── Pages/
│       └── Settings/
│           ├── AIProfiles.jsx          ← новый: список профилей
│           ├── AIProfileForm.jsx       ← новый: форма создания/редактирования
│           └── AIProviderKeys.jsx      ← новый: управление API-ключами
│
├── Stores/
│   ├── Settings.js                     ← изменить: добавить ai: { profiles, keys, defaultProfileId }
│   └── UI.js                           ← изменить: добавить aiPreview: { open, loading, result, profileId, originalText, targetMessage }
│
└── Util/
    └── ai/
        ├── index.js                    ← публичный API: processMessage(), generateReply()
        ├── buildPrompt.js              ← формирование системного промпта + messages[]
        ├── keyStore.js                 ← шифрование/дешифрование API-ключей
        └── providers/
            ├── base.js                 ← абстрактный базовый класс
            ├── openai.js               ← OpenAI + Ollama + OpenAI-compat
            └── anthropic.js            ← Anthropic Claude
```

---

## 7. Redux: изменения в Store

### `Settings.js` — добавить в `initialState`:

```javascript
ai: {
  defaultProfileId: null,
  profiles: [
    // preset-профили (не удаляемые, только клонировать)
    {
      id: 'preset-rewrite',
      name: 'Переформулировать',
      icon: '✏️',
      provider: 'openai',
      model: 'gpt-4o-mini',
      systemPrompt: 'Переформулируй следующее сообщение, сохранив смысл. Улучши стиль и грамматику. Отвечай только переформулированным текстом без пояснений.',
      temperature: 0.7,
      maxTokens: 1024,
      language: 'auto',
      isDefault: true,
      isPreset: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    // ... другие presets
  ],
  keys: {
    openai: null,
    anthropic: null,
    openai_compat: null,
    ollama_url: 'http://localhost:11434'
  }
}
```

**Новые reducers:**
```javascript
aiAddProfile: (state, action) => { ... }
aiUpdateProfile: (state, action) => { ... }
aiDeleteProfile: (state, action) => { ... }
aiSetDefaultProfile: (state, action) => { ... }
aiSetKey: (state, action) => { ... }
```

### `UI.js` — добавить в `initialState`:

```javascript
aiPreview: null
// shape when active:
// {
//   open: true,
//   loading: true | false,
//   result: string,
//   profileId: string,
//   originalText: string,
//   targetMessage: TelegramMessage | null,  // null = режим Composer, message = Reply with AI
//   error: string | null
// }
```

**Новые reducers:**
```javascript
openAIPreview: (state, action) => { state.aiPreview = { open: true, loading: true, ...action.payload } }
updateAIPreview: (state, action) => { state.aiPreview = { ...state.aiPreview, ...action.payload } }
closeAIPreview: (state) => { state.aiPreview = null }
```

---

## 8. Пошаговый план реализации

### Этап 1 — Store и хранилище (1 день)

- [ ] **1.1** Обновить `Settings.js` — добавить `ai` в `initialState`
  - Presets: 6 встроенных профилей
  - Reducers: `aiAddProfile`, `aiUpdateProfile`, `aiDeleteProfile`, `aiSetDefaultProfile`, `aiSetKey`
  - Включить `ai` в список персистируемых ключей (уже всё сохраняется через `magramState`)

- [ ] **1.2** Обновить `UI.js` — добавить `aiPreview: null` + 3 reducers:
  `openAIPreview`, `updateAIPreview`, `closeAIPreview`

- [ ] **1.3** Создать `src/Components/Util/ai/keyStore.js`
  - `encryptKey(rawKey): string` — XOR с device fingerprint + btoa
  - `decryptKey(encryptedKey): string` — atob + XOR
  - `getKey(provider): string | null` — читает из redux, расшифровывает

### Этап 2 — AI-провайдеры (1-2 дня)

- [ ] **2.1** Создать `src/Components/Util/ai/providers/base.js`
  - Класс `AIProviderBase` с методами `complete(messages, options, onChunk)` и `abort()`

- [ ] **2.2** Создать `src/Components/Util/ai/providers/openai.js`
  - Класс `OpenAIProvider extends AIProviderBase`
  - fetch streaming, AbortController
  - Параметр `baseUrl` (для совместимости с Ollama, LM Studio, Groq, Deepseek)

- [ ] **2.3** Создать `src/Components/Util/ai/providers/anthropic.js`
  - Класс `AnthropicProvider extends AIProviderBase`
  - Anthropic Messages API (`/v1/messages`), streaming через SSE

- [ ] **2.4** Создать `src/Components/Util/ai/buildPrompt.js`
  - `buildMessagesForComposer(profile, originalText): ChatMessage[]`
  - `buildMessagesForReply(profile, targetMessage, contextMessages): ChatMessage[]`
  - `getProviderInstance(profile, keys): AIProviderBase`

- [ ] **2.5** Создать `src/Components/Util/ai/index.js`
  - `processMessage(originalText, profile, keys, onChunk): Promise<string>`
  - `generateReply(targetMessage, contextMessages, profile, keys, onChunk): Promise<string>`
  - Обработка ошибок: `RateLimitError`, `AuthError`, `NetworkError`

### Этап 3 — UI: Composer (2 дня)

- [ ] **3.1** Создать `src/Components/App/MiddleColumn/Composer/AIProfilePicker.jsx`
  - Dropdown список профилей над кнопкой AI
  - Пункт "Настройки AI" внизу
  - Активный профиль отмечен галочкой

- [ ] **3.2** Создать `src/Components/App/MiddleColumn/Composer/AIPreviewPanel.jsx`
  - Slide-up панель над Composer
  - Секция "Исходное" (readonly)
  - Секция "Результат" (streaming, редактируемое contenteditable)
  - Кнопки: "↩ Заново", "✏️ Редактировать", "✅ Использовать"
  - Loading/skeleton индикатор во время генерации
  - Кнопка X для закрытия (отменяет запрос через `abort()`)

- [ ] **3.3** Создать `src/Components/App/MiddleColumn/Composer/AIButton.jsx`
  - Иконка ✨ (sparkle), активируется при наличии текста
  - Открывает `AIProfilePicker` при клике

- [ ] **3.4** Обновить `Composer.jsx`:
  - Импортировать `AIButton`, `AIPreviewPanel`, `AIProfilePicker`
  - Добавить `AIButton` в тулбар (рядом с emoji-кнопкой)
  - Рендерить `AIPreviewPanel` когда `aiPreview.open === true`
  - При "✅ Использовать": `changeMessageInputHandler(aiPreview.result)`, `dispatch(closeAIPreview())`
  - При "✏️ Редактировать": то же + фокус в input

### Этап 4 — UI: Reply with AI (1 день)

- [ ] **4.1** Обновить `ContextMenu.jsx`:
  - Добавить пункт "🤖 Ответить с AI"
  - Условие: только для входящих сообщений (`!message.out`) + есть хотя бы 1 AI-профиль
  - При клике: `dispatch(handleReplyToMessage(message))` + `dispatch(openAIPreview({ targetMessage: message, ... }))`

- [ ] **4.2** Обновить Reply-bar в `Composer.jsx`:
  - Добавить кнопку `🤖` рядом с кнопкой закрытия Reply-bar
  - Клик → запускает AI reply для `replyToMessage`

- [ ] **4.3** В `AIPreviewPanel.jsx` добавить логику:
  - Если `aiPreview.targetMessage !== null` → режим Reply
  - Показывать цитату оригинального сообщения вместо "Исходное"
  - При "✅ Использовать": вставить текст В Composer И сохранить `replyToMessage`

### Этап 5 — Settings: управление профилями (2 дня)

- [ ] **5.1** Создать `src/Components/App/Pages/Settings/AIProfiles.jsx`
  - Список профилей (каждый — карточка с иконкой, именем, провайдером, моделью)
  - Preset-профили — только просмотр и клонирование
  - Пользовательские — клонировать, редактировать, удалить
  - FAB-кнопка "+ Добавить профиль"
  - Секция "API-ключи" внизу → ссылка на `AIProviderKeys`

- [ ] **5.2** Создать `src/Components/App/Pages/Settings/AIProfileForm.jsx`
  - Поля: Название, Иконка (emoji picker), Описание
  - Провайдер (dropdown) → при выборе: Model picker
  - System Prompt (multiline textarea)
  - Temperature слайдер (0.0 – 2.0)
  - Max Tokens (input number)
  - Язык ответа (auto/ru/en/…)
  - Base URL (только для openai-compat / ollama)
  - Preview кнопка: открывает `AIPreviewPanel` с тестовым сообщением

- [ ] **5.3** Создать `src/Components/App/Pages/Settings/AIProviderKeys.jsx`
  - По одному полю для каждого провайдера (password input + кнопка👁)
  - Ollama URL (input)
  - Кнопка "Тест соединения" → `getProviderInstance(profile, keys).complete([{ role: 'user', content: 'test' }], ...)` с таймаутом 5s
  - Статус: ✅ Подключено / ❌ Ошибка / ⏳ Проверка

- [ ] **5.4** Подключить AI Profiles в `Settings.jsx`:
  - Добавить пункт "🤖 AI-ассистент" в список настроек

### Этап 6 — Полировка (1 день)

- [ ] **6.1** CSS-анимация slide-up для `AIPreviewPanel`
- [ ] **6.2** Skeleton loading для streaming (перед первым чанком)
- [ ] **6.3** Toast уведомления при ошибке AI (`dispatch(addToast(...))`)
- [ ] **6.4** Keyboard shortcuts: `Ctrl+Shift+A` — открыть AI для текущего сообщения

---

## 9. UX-макеты (ASCII)

### Composer с AI-кнопкой

```
┌────────────────────────────────────────────────────────┐
│  Написать сообщение...                                 │
│                                                        │
│                              [📎] [😊] [✨] [➤ Send]  │
└────────────────────────────────────────────────────────┘
```

### AIProfilePicker dropdown

```
       ┌──────────────────────────┐
       │ ✓ ✏️  Переформулировать  │
       │   💼  Деловой стиль      │
       │   ⚡  Кратко             │
       │   😊  Неформальный       │
       │   🤖  Умный ответ        │
       │   🌐  Перевод            │
       │  ─────────────────────── │
       │   ⚙️  Настройки AI       │
       └──────────────────────────┘
[📎] [😊] [✨] [➤]
```

### AIPreviewPanel (над Composer)

```
┌────────────────────────────────────────────────────────┐
│ ✨ AI · Деловой стиль  [↩ Заново] [Профиль ▾]    [✕] │
├────────────────────────────────────────────────────────┤
│ Исходное:                                              │
│  привет! я написал отчёт, можешь посмотреть?           │
├────────────────────────────────────────────────────────┤
│ Результат:                                             │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Добрый день! Подготовил отчёт. Буду признателен  │   │
│ │ за ваши замечания и предложения.                 │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│           [✏️ Редактировать]  [✅ Использовать]        │
└────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────┐
│  привет! я написал отчёт, можешь посмотреть?           │
│                              [📎] [😊] [✨] [➤ Send]  │
└────────────────────────────────────────────────────────┘
```

### Контекстное меню с "Ответить с AI"

```
┌─────────────────────────┐
│  📋 Копировать           │
│  ↩  Ответить            │
│  🤖 Ответить с AI       │
│  ➡️  Переслать           │
│  📌 Закрепить            │
│  🗑  Удалить             │
└─────────────────────────┘
```

### Settings → AI-ассистент

```
┌────────────────────────────────────────────────┐
│ ← AI-ассистент                                 │
├────────────────────────────────────────────────┤
│                                                │
│ API-ключи                                      │
│ ─────────────────────────────────────────────  │
│ OpenAI     [••••••••••••••••••]  [✅]          │
│ Anthropic  [Не настроен]                       │
│ Ollama URL [http://localhost:11434]  [✅]       │
│                                                │
│ Профили                              [+ Новый] │
│ ─────────────────────────────────────────────  │
│ ✏️  Переформулировать   gpt-4o-mini  [preset]  │
│ 💼  Деловой стиль       gpt-4o-mini  [preset]  │
│ 🌟  Мой профиль         gpt-4o       [✏️] [🗑] │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 10. Безопасность

| Риск | Мера |
|---|---|
| API-ключ в localStorage в открытом виде | XOR-шифрование с device fingerprint (`keyStore.js`) |
| CORS при запросах к Anthropic/OpenAI | Браузер разрешает прямые fetch к этим API; Ollama требует `OLLAMA_ORIGINS=*` |
| Утечка системного промпта | Промпт хранится локально, не отправляется никуда кроме AI-провайдера |
| Prompt injection из входящих сообщений | Обёртывать `targetMessage.text` в явный тег `<userMessage>...</userMessage>` в системном промпте |
| Случайная отправка AI-ответа без проверки | AI **никогда** не вызывает `sendMessage()` напрямую — результат только вставляется в Composer |
| Rate limit ошибки | `RateLimitError` перехватывается, показывается Toast с сообщением "Превышен лимит, попробуйте позже" |

---

## Сводка: новые файлы и изменения

| Файл | Тип | Этап |
|---|---|---|
| `Util/ai/index.js` | Новый | 2 |
| `Util/ai/buildPrompt.js` | Новый | 2 |
| `Util/ai/keyStore.js` | Новый | 1 |
| `Util/ai/providers/base.js` | Новый | 2 |
| `Util/ai/providers/openai.js` | Новый | 2 |
| `Util/ai/providers/anthropic.js` | Новый | 2 |
| `Composer/AIButton.jsx` | Новый | 3 |
| `Composer/AIPreviewPanel.jsx` | Новый | 3 |
| `Composer/AIProfilePicker.jsx` | Новый | 3 |
| `Settings/AIProfiles.jsx` | Новый | 5 |
| `Settings/AIProfileForm.jsx` | Новый | 5 |
| `Settings/AIProviderKeys.jsx` | Новый | 5 |
| `Stores/Settings.js` | Изменить | 1 |
| `Stores/UI.js` | Изменить | 1 |
| `MiddleColumn/Composer.jsx` | Изменить | 3 |
| `MiddleColumn/ContextMenu.jsx` | Изменить | 4 |
| `Pages/Settings.jsx` | Изменить | 5 |
