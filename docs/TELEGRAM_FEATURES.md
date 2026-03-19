# Magram — Отчёт по реализации функций Telegram

> Версия: 0.12.1 · Дата: март 2026  
> Клиент: GramJS (telegram v2.26) + MTProto API

---

## Легенда

| Статус | Значение |
|---|---|
| ✅ Реализовано | Полноценная реализация, работает в production |
| ⚠️ Частично | Есть UI или заглушка, функциональность не завершена |
| ❌ Не реализовано | Функция отсутствует или не начата |

---

## 1. Авторизация

| Функция | Статус | Файл | MTProto API |
|---|---|---|---|
| Вход по номеру телефона | ✅ | `Auth/PhoneNumber.jsx` | `client.sendCode()` |
| Подтверждение кода (OTP) | ✅ | `Auth/Verify.jsx` | `client.signIn()` |
| Двухфакторная аутентификация (2FA) | ✅ | `Auth/Password.jsx` | `client.signInWithPassword()` |
| Регистрация нового аккаунта | ✅ | `Auth/Register.jsx` | `client.signUp()` |
| Сохранение сессии (StringSession) | ✅ | `App.jsx` | `localStorage('auth_key')` |
| Выход из аккаунта | ✅ | `Pages/Settings.jsx` | `auth.LogOut` |
| QR-код вход | ❌ | — | `auth.exportLoginToken` |

---

## 2. Диалоги и чаты

| Функция | Статус | Файл | MTProto API |
|---|---|---|---|
| Загрузка списка диалогов | ✅ | `ChatList.jsx` | `client.getDialogs()` |
| Папки/фильтры диалогов | ✅ | `ChatList.jsx` | `messages.GetDialogFilters` |
| Архив чатов | ✅ | `ChatList.jsx` | — (через флаг `archived`) |
| Сортировка диалогов | ✅ | `ChatList.jsx` | — (по lastMessage.date) |
| Индикатор непрочитанных | ✅ | `ChatList.jsx` | — (store: `unreadCount`) |
| Мьют чата | ⚠️ | `ChatInfo.jsx` | UI есть, API `account.UpdateNotifySettings` не вызывается |
| Закрепить/открепить чат | ❌ | — | `messages.ToggleDialogPin` |
| Удаление/выход из чата | ✅ | `ChatInfo.jsx` | `messages.DeleteHistory` / `channels.LeaveChannel` |
| Создание новой группы | ⚠️ | `Pages/NewGroup.jsx` | UI есть, финальный API вызов не проверен |
| Создание канала | ❌ | — | `channels.CreateChannel` |
| Статус соединения (reconnecting) | ✅ | `Home.jsx` | `UpdateConnectionState` |

---

## 3. Сообщения

| Функция | Статус | Файл | MTProto API |
|---|---|---|---|
| Загрузка истории сообщений | ✅ | `MessageList.jsx` | `client.getMessages()` |
| Бесконечная прокрутка (пагинация) | ✅ | `MessageList.jsx` | `client.getMessages({ minId })` |
| Отправка текстового сообщения | ✅ | `Composer.jsx` | `client.sendMessage()` |
| Отправка файлов/медиа | ✅ | `Composer.jsx` | `client.sendFile()` |
| Редактирование сообщения | ✅ | `Composer.jsx` | `messages.EditMessage` |
| Удаление сообщений | ✅ | `Util/messages.js` | `client.deleteMessages()` |
| Ответ на сообщение | ✅ | `Composer.jsx` | `sendMessage({ replyToMsgId })` |
| Пересылка сообщений | ✅ | `Composer.jsx` | `messages.ForwardMessages` |
| Прочтение истории (mark as read) | ✅ | `Util/messages.js` | `client.markAsRead()` |
| Обновление сообщений (входящих) | ✅ | `Handlers/MessagesHandler.jsx` | `UpdateEditMessage` |
| Удаление сообщений (входящих) | ✅ | `Handlers/MessagesHandler.jsx` | `UpdateDeleteMessages` |
| Закреплённые сообщения | ✅ | `MiddleColumn/PinnedMessage.jsx` | — (из fullChat) |
| Закрепить/открепить сообщение | ❌ | — | `messages.UpdatePinnedMessage` |
| Поиск по чату | ⚠️ | `ChatInfo.jsx` | Меню есть, функционал поиска не реализован |
| Переход к сообщению | ✅ | `Home.jsx` | `goToMessage()` (scroll + highlight) |
| Группировка по дате | ✅ | `MessageList.jsx` | — (клиентская логика) |
| Альбомы (сетка фото) | ✅ | `Message.jsx` | `calculateAlbumLayout()` |
| Черновики сообщений | ❌ | — | `messages.SaveDraft` |
| Планировщик сообщений | ❌ | — | `messages.SendMessage { schedule_date }` |

---

## 4. Медиа

| Функция | Статус | Файл | MTProto API |
|---|---|---|---|
| Просмотр фотографий | ✅ | `Message/MessageMedia.jsx` | — |
| Просмотр видео | ✅ | `Message/MessageMedia.jsx` | — |
| Документы (скачивание) | ✅ | `Message/MessageMedia.jsx` | `client.downloadMedia()` |
| Голосовые сообщения | ✅ | `Message/Audio.jsx` | `client.downloadMedia()` |
| Аудио / музыка | ✅ | `Message/Audio.jsx` + `MusicPlayer.jsx` | `client.downloadMedia()` |
| Кружки (round video / VideoNote) | ✅ | `Message/MessageMedia.jsx` | — |
| Анимированные стикеры (TGS) | ✅ | `Message/AnimatedSticker.jsx` | rlottie-wasm |
| Статичные стикеры | ✅ | `Message/MessageMedia.jsx` | — |
| GIF-анимации | ✅ | `Message/MessageMedia.jsx` | — |
| Сохранить GIF | ✅ | `Util/messages.js` | `messages.SaveGif` |
| Кастомные эмодзи | ✅ | `Message/CustomEmoji.jsx` | `messages.GetCustomEmojiDocuments` |
| Предпросмотр медиа (zoom) | ✅ | `App/MediaPreview.jsx` | — |
| Прогресс загрузки медиа | ✅ | `Message/MessageMedia.jsx` | `updateMessageMediaUploadProgress` |
| Кэширование медиа | ✅ | `Util/media.js` | Cache API |
| Набор стикеров (просмотр, отправка) | ❌ | — | `messages.GetAllStickers`, `messages.GetStickerSet` |
| Поиск стикеров | ❌ | — | `messages.SearchStickerSets` |

---

## 5. Форматирование текста

| Функция | Статус | Файл | Примечание |
|---|---|---|---|
| Bold, Italic, Underline, Strikethrough | ✅ | `Helpers/renderTextWithEntities.jsx` | MessageEntityBold/Italic/… |
| Моноширинный текст (code, pre) | ✅ | `Message/Pre.jsx` | — |
| Ссылки | ✅ | `Message/Link.jsx` | `MessageEntityUrl` / `MessageEntityTextUrl` |
| Упоминания (`@username`) | ✅ | `Message/MentionLink.jsx` | `MessageEntityMention` |
| Именные упоминания | ✅ | `Message/MentionName.jsx` | `MessageEntityMentionName` |
| Хэштеги | ⚠️ | `Helpers/renderTextWithEntities.jsx` | Рендерится, клик не реализован |
| Спойлер | ✅ | `Message/Spoiler.jsx` | — |
| Команды ботов | ✅ | `Message/BotCommand.jsx` | — |
| Кавычки (blockquote) | ⚠️ | — | Не реализовано в Composer |
| Эмодзи в тексте | ✅ | `Composer.jsx` | `emoji-js` |

---

## 6. Интерактив сообщений

| Функция | Статус | Файл | MTProto API |
|---|---|---|---|
| Реакции на сообщения | ✅ | `Message/MessageReactions.jsx` | `messages.SendReaction` |
| Контекстное меню сообщения | ✅ | `MiddleColumn/ContextMenu.jsx` | — |
| Inline-кнопки ботов | ✅ | `Message/InlineButtons.jsx` | — |
| Keyboard-кнопки ботов | ✅ | `Message/KeyboardButton.jsx` | — |
| Опросы (голосование) | ✅ | `Message/Poll.jsx` | `messages.SendVote` |
| Отзыв голоса в опросе | ✅ | `Util/messages.js` | `messages.SendVote (retract)` |
| Просмотры сообщений (seen) | ✅ | `Message/MessageSeen.jsx` | — |
| Дата прочтения сообщения | ✅ | `Util/messages.js` | `messages.GetMessageReadParticipants` |
| Dice / игры | ✅ | `Message/Dice.jsx` | рендер, отправка через Composer |
| Giveaway | ✅ | `Message/Giveaway.jsx` | только рендер |
| Веб-страница превью | ✅ | `Message/WebPage.jsx` | — |

---

## 7. Треды (комментарии)

| Функция | Статус | Файл | MTProto API |
|---|---|---|---|
| Открыть тред сообщения | ✅ | `MiddleColumn/Thread.jsx` | `messages.GetReplies` |
| Загрузка комментариев | ✅ | `MiddleColumn/Thread.jsx` | `messages.GetReplies` |
| Отправка комментария | ✅ | `Composer.jsx` | `sendMessage({ replyTo: thread })`  |
| Кол-во комментариев в бабле | ✅ | `Message/MessageMeta.jsx` | — |

---

## 8. Поиск

| Функция | Статус | Файл | MTProto API |
|---|---|---|---|
| Глобальный поиск контактов и сообщений | ✅ | `Pages/Search.jsx` | `contacts.Search` |
| Топ-контакты | ✅ | `Pages/Search.jsx` | `contacts.GetTopPeers` |
| История поиска | ✅ | `Pages/Search.jsx` | localStorage через `settingsSlice` |
| Поиск по чату | ⚠️ | `ChatInfo.jsx` | Меню есть, реализация отсутствует |
| Поиск медиа по типу (фото/видео) | ✅ | `Pages/UserProfile.jsx` | `messages.GetMessages (filter)` |

---

## 9. Профили

| Функция | Статус | Файл | MTProto API |
|---|---|---|---|
| Профиль пользователя | ✅ | `Pages/UserProfile.jsx` | `users.GetFullUser` |
| Цвет профиля | ✅ | `Pages/UserProfile.jsx` | `help.GetPeerProfileColors` |
| Общие чаты | ✅ | `Pages/UserProfile.jsx` | `messages.GetCommonChats` |
| Медиа пользователя (фото/видео/GIF) | ✅ | `Pages/UserProfile.jsx` | `client.getMessages({ filter })` |
| Профиль группы/канала | ✅ | `Pages/ChatProfile.jsx` | `client.getParticipants()` |
| Редактирование своего профиля (имя, username, bio) | ✅ | `Pages/Settings.jsx` | `account.UpdateUsername` |
| Смена аватара | ❌ | — | `photos.UploadProfilePhoto` |
| Просмотр истории профильных фото | ❌ | — | `photos.GetUserPhotos` |

---

## 10. Управление группами

| Функция | Статус | Файл | MTProto API |
|---|---|---|---|
| Просмотр участников | ✅ | `Pages/ChatProfile.jsx` | `client.getParticipants()` |
| Список администраторов | ✅ | `Pages/ManageGroup/Administrators.jsx` | — (из store) |
| Управление правами администратора | ✅ | `Pages/ManageGroup/AdminRights.jsx` | `channels.EditAdmin` |
| Управление правами участников | ✅ | `Pages/ManageGroup/Permissions.jsx` | `messages.EditChatDefaultBannedRights` |
| Редактирование названия группы | ✅ | `Pages/ManageGroup/Manage.jsx` | `messages.EditChatTitle` |
| Редактирование описания группы | ✅ | `Pages/ManageGroup/Manage.jsx` | `messages.EditChatAbout` |
| Баны / кик участников | ❌ | — | `channels.EditBanned` |
| Пригласительные ссылки | ❌ | — | `messages.ExportChatInvite` |
| Статистика канала/группы | ❌ | — | `stats.GetBroadcastStats` |

---

## 11. Истории (Stories)

| Функция | Статус | Файл | MTProto API |
|---|---|---|---|
| Список историй (полоса) | ✅ | `App/Stories.jsx` | `stories.GetAllStories` |
| Просмотр истории | ✅ | `App/StoryModal.jsx` | — |
| Навигация между историями (пред./след.) | ⚠️ | `App/StoryModal.jsx` | Показывает по одной, нет навигации |
| Ответ на историю | ⚠️ | `App/StoryModal.jsx` | UI не реализован |
| Просмотры истории | ⚠️ | `App/StoryModal.jsx` | Счётчик есть, детали нет |
| Создание истории | ❌ | — | `stories.SendStory` |
| Удаление истории | ❌ | — | `stories.DeleteStories` |

---

## 12. Звонки

### 12.1 Личные звонки (1-на-1)

| Функция | Статус | Файл | Технология |
|---|---|---|---|
| Исходящий звонок | ⚠️ | `Call/Call.jsx` | PeerJS (сигнализация через socket.io закомментирована) |
| Входящий звонок | ⚠️ | `Call/Call.jsx` | PeerJS (частично) |
| Видео | ⚠️ | `Call/Call.jsx` | WebRTC |
| Аудио | ⚠️ | `Call/Call.jsx` | WebRTC |
| Демонстрация экрана | ⚠️ | `Call/Call.jsx` | `getDisplayMedia()` |
| MTProto телефонный звонок | ❌ | — | `phone.RequestCall`, `phone.AcceptCall`, `phone.ConfirmCall` |

> **Примечание:** Личные звонки реализованы через PeerJS (WebRTC P2P), но серверная часть сигнализации (`socket.emit('MakeCall', ...)`) закомментирована. Нативные MTProto-звонки (`phone.RequestCall` и т.д.) не реализованы.

### 12.2 Групповые звонки / Войс-чаты

| Функция | Статус | Файл | MTProto API |
|---|---|---|---|
| Присоединение к войс-чату | ✅ | `MiddleColumn/VoiceChatInfo.jsx` | `phone.JoinGroupCall` |
| Выход из войс-чата | ✅ | `VoiceChat/VoiceChat.jsx` | `phone.LeaveGroupCall` |
| Список участников | ✅ | `VoiceChat/VoiceChat.jsx` | `phone.GetGroupParticipants` |
| Мьют/размьют | ✅ | `VoiceChat/VoiceChat.jsx` | WebRTC stream toggle |
| Видео участников | ✅ | `VoiceChat/VideoParticipant.jsx` | WebRTC |
| Демонстрация экрана | ✅ | `VoiceChat/VoiceChat.jsx` | `getDisplayMedia()` |
| Минимизированный бар | ✅ | `Call/CallMinimal.jsx` | — |
| Панель в топ-баре | ✅ | `App/CallHeader.jsx` | — |
| Создание войс-чата | ❌ | — | `phone.CreateGroupCall` |
| Завершение войс-чата (для всех) | ❌ | — | `phone.DiscardGroupCall` |

---

## 13. Боты

| Функция | Статус | Файл | MTProto API |
|---|---|---|---|
| Запуск бота (`/start`) | ✅ | `Composer.jsx` | `messages.StartBot` |
| Inline-режим (`@bot query`) | ✅ | `Composer.jsx` | `messages.GetInlineBotResults`, `messages.SendInlineBotResult` |
| Inline-кнопки | ✅ | `Message/InlineButtons.jsx` | — |
| Keyboard-кнопки | ✅ | `Message/KeyboardButton.jsx` | — |
| Bot commands menu | ❌ | — | `bots.GetBotCommands` |
| Web App (Telegram Mini App) | ❌ | — | `messages.RequestWebView` |

---

## 14. Настройки и аккаунт

| Функция | Статус | Файл | MTProto API |
|---|---|---|---|
| Смена username | ✅ | `Pages/Settings.jsx` | `account.UpdateUsername` |
| Проверка username | ✅ | `Pages/Settings.jsx` | `account.CheckUsername` |
| Выход из аккаунта | ✅ | `Pages/Settings.jsx` | `auth.LogOut` |
| Активные сессии (устройства) | ⚠️ | `Pages/Settings/Devices.jsx` | UI есть, API `account.GetAuthorizations` не подключён |
| Настройки уведомлений | ⚠️ | `Pages/Settings/General.jsx` | UI есть, `account.UpdateNotifySettings` не вызывается |
| Настройки приватности | ⚠️ | `Pages/Settings/Privacy.jsx` | UI-заглушка, `account.GetPrivacy` не вызывается |
| Тема интерфейса (dark/light) | ✅ | `Pages/Settings/ChatSettings.jsx` | localStorage |
| Кастомная тема | ✅ | `Pages/Settings/Themes.jsx` | CSS-переменные |
| Анимации | ✅ | `Pages/Settings/Animations.jsx` | settingsSlice |
| Размер шрифта | ⚠️ | `Pages/Settings/ChatSettings.jsx` | Слайдер есть, значение не применяется |
| Управление хранилищем | ⚠️ | `Pages/Settings/Storage.jsx` | UI есть, очистка кэша частичная |
| Смена номера телефона | ❌ | — | `account.ChangePhone` |
| Удаление аккаунта | ❌ | — | `account.DeleteAccount` |
| 2FA управление | ❌ | — | `account.UpdatePasswordSettings` |
| Привязанные аккаунты | ❌ | — | — |

---

## 15. PWA / Системные функции

| Функция | Статус | Файл | Примечание |
|---|---|---|---|
| Service Worker регистрация | ✅ | `serviceWorker/index.js` | — |
| Кэширование статики (precache) | ⚠️ | `sw.js` | Частично реализовано |
| Кэширование медиа (runtime cache) | ✅ | `Util/media.js` | Cache API |
| Push-уведомления браузера | ⚠️ | `Home.jsx` | Запрос разрешения есть, Web Push не подключён |
| Desktop-уведомления (Notification API) | ✅ | `Home.jsx` | Для новых сообщений |
| Установка как PWA (Add to Home Screen) | ⚠️ | `manifest.json` | Манифест есть, install prompt не обработан |
| Deep links (`tg://`, `t.me/`) | ✅ | `Util/deepLink.js` | Парсер реализован |
| Оффлайн-режим | ❌ | — | SW не реализует offline fallback |

---

## Итоговая сводка

| Область | Реализовано ✅ | Частично ⚠️ | Не реализовано ❌ |
|---|---|---|---|
| Авторизация | 6 | 0 | 1 |
| Диалоги и чаты | 7 | 2 | 3 |
| Сообщения | 15 | 2 | 3 |
| Медиа | 13 | 0 | 2 |
| Форматирование | 9 | 2 | 1 |
| Интерактив | 10 | 0 | 0 |
| Треды | 4 | 0 | 0 |
| Поиск | 4 | 1 | 0 |
| Профили | 5 | 0 | 2 |
| Управление группами | 5 | 0 | 3 |
| Истории | 2 | 3 | 2 |
| Личные звонки | 0 | 5 | 1 |
| Групповые звонки | 8 | 0 | 2 |
| Боты | 5 | 0 | 2 |
| Настройки | 6 | 6 | 5 |
| PWA / Системные | 3 | 3 | 1 |
| **Итого** | **102** | **24** | **28** |

---

## Приоритетные направления для доработки

### Высокий приоритет
1. **Личные MTProto-звонки** — реализовать `phone.RequestCall` / `phone.AcceptCall`; текущий PeerJS-подход требует внешнего сервера сигнализации.
2. **Настройки уведомлений** — подключить `account.UpdateNotifySettings` (UI уже есть).
3. **Настройки приватности** — реализовать `account.GetPrivacy` / `account.SetPrivacy`.
4. **Мьют чата** — вызвать `account.UpdateNotifySettings` из `ChatInfo.jsx`.

### Средний приоритет
5. **Истории** — навигация между историями, ответ на историю.
6. **Поиск по чату** — подключить `messages.Search` к существующему UI.
7. **Закрепить/открепить сообщение** — `messages.UpdatePinnedMessage`.
8. **Telegram Mini Apps (Web Apps)** — `messages.RequestWebView`.
9. **Bot commands menu** — `bots.GetBotCommands`.
10. **Баны/кик участников** — `channels.EditBanned`.

### Низкий приоритет
11. **QR-код вход** — `auth.exportLoginToken`.
12. **Смена аватара** — `photos.UploadProfilePhoto`.
13. **Планировщик сообщений** — `sendMessage({ schedule_date })`.
14. **Черновики** — `messages.SaveDraft`.
15. **Статистика каналов** — `stats.GetBroadcastStats`.
16. **Пригласительные ссылки** — `messages.ExportChatInvite`.
17. **Оффлайн-режим** — Service Worker offline fallback.
