# Magram Export Module — Документация

> Версия: 1.0.0  
> Дата: Март 2026

## Быстрый старт

Модуль экспорта уже установлен и интегрирован. Для использования:

1. Откройте чат
2. Нажмите меню (⋮) → **Export History**
3. Выберите формат (JSON/CSV/HTML) и настройки
4. Нажмите **Start Export**

## Функции

### Экспорт истории
- **Форматы**: JSON, CSV, HTML
- **Кэширование**: Автоматическое ускорение повторных экспортов
- **Прогресс**: Отображение в реальном времени

### Экспорт участников
- **Форматы**: JSON, CSV
- **Фильтры**: Все, Администраторы, Боты
- **Данные**: ID, имя, username, роль, дата вступления

### Управление кэшем
- **Просмотр**: Settings → Storage Usage
- **Очистка**: Кнопка "Clear Export Cache"

## API для разработчиков

```javascript
import { exportHistory, exportParticipants } from './Util/export';

// Экспорт истории
const result = await exportHistory(chatId, peer, {
  format: 'json',
  useCache: true,
}, (progress) => {
  console.log(`${progress.percent}%`);
});

// Экспорт участников
const result = await exportParticipants(chatId, peer, {
  format: 'json',
  filter: 'admins',
});
```

Полная документация: см. `EXPORT_PLAN.md`
