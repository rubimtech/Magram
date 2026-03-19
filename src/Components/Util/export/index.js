import { v4 as uuidv4 } from 'uuid';
import { fetchAllMessages, getApproximateMessageCount, FloodWaitError as HistoryFloodWaitError } from './fetchHistory';
import { fetchAllParticipants, FloodWaitError as ParticipantsFloodWaitError } from './fetchParticipants';
import { saveExportJob, updateExportJob, clearCache, getCachedStats } from './exportCache';
import { formatMessagesToJson } from './formatters/toJson';
import { formatMessagesToCsv } from './formatters/toCsv';
import { formatMessagesToHtml } from './formatters/toHtml';
import { formatParticipantsToJson } from './formatters/participantsToJson';
import { formatParticipantsToCsv } from './formatters/participantsToCsv';
import { downloadBlob, saveAsZip } from './downloader';

// Экспорт истории
export async function exportHistory(chatId, peer, options = {}, onProgress) {
  const {
    format = 'json',
    includeMedia = false,
    fromDate = null,
    toDate = null,
    useCache = true,
  } = options;

  const jobId = uuidv4();
  const abortController = new AbortController();

  await saveExportJob({
    jobId,
    chatId,
    type: 'history',
    format,
    status: 'in_progress',
    progress: 0,
    startedAt: Date.now(),
  });

  try {
    // Получаем приблизительное количество сообщений
    const totalMessages = await getApproximateMessageCount(peer);
    
    // Получаем все сообщения
    const messages = await fetchAllMessages(
      peer,
      { useCache, fromDate, toDate },
      (progress) => {
        const percent = totalMessages > 0 ? Math.round((progress.fetched / totalMessages) * 100) : 0;
        updateExportJob(jobId, { progress: percent });
        onProgress?.({ ...progress, total: totalMessages, percent });
      },
      abortController.signal
    );

    // Форматируем
    let content, mimeType, extension;
    const chatInfo = { id: { value: chatId } };

    switch (format) {
      case 'csv':
        content = formatMessagesToCsv(messages);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'html':
        content = formatMessagesToHtml(chatInfo, messages);
        mimeType = 'text/html';
        extension = 'html';
        break;
      default:
        content = formatMessagesToJson(chatInfo, messages);
        mimeType = 'application/json';
        extension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });

    await updateExportJob(jobId, {
      status: 'completed',
      completedAt: Date.now(),
      messageCount: messages.length,
      fileSize: blob.size,
    });

    return { blob, filename: `chat_${chatId}.${extension}`, jobId, messages };
  } catch (error) {
    await updateExportJob(jobId, {
      status: 'failed',
      error: error.message,
      completedAt: Date.now(),
    });
    throw error;
  }
}

// Экспорт участников
export async function exportParticipants(chatId, peer, options = {}, onProgress) {
  const {
    format = 'json',
    filter = 'all',
    includePhone = false,
    includeJoinDate = true,
  } = options;

  const jobId = uuidv4();
  const abortController = new AbortController();
  const chatType = peer.className?.includes('Channel') ? 'channel' : 'group';

  await saveExportJob({
    jobId,
    chatId,
    type: 'participants',
    format,
    status: 'in_progress',
    progress: 0,
    startedAt: Date.now(),
  });

  try {
    const participants = await fetchAllParticipants(
      peer,
      chatType,
      { filter, useCache: true },
      (progress) => {
        updateExportJob(jobId, { progress: progress.fetched });
        onProgress?.(progress);
      },
      abortController.signal
    );

    // Фильтрация
    let filteredParticipants = participants;
    if (filter === 'admins') {
      filteredParticipants = participants.filter((p) => p.role === 'admin' || p.role === 'creator');
    } else if (filter === 'bots') {
      filteredParticipants = participants.filter((p) => p.isBot);
    }

    // Форматируем
    let content, mimeType, extension;
    const chatInfo = { id: { value: chatId } };

    switch (format) {
      case 'csv':
        content = formatParticipantsToCsv(filteredParticipants);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      default:
        content = formatParticipantsToJson(chatInfo, filteredParticipants);
        mimeType = 'application/json';
        extension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });

    await updateExportJob(jobId, {
      status: 'completed',
      completedAt: Date.now(),
      participantCount: filteredParticipants.length,
      fileSize: blob.size,
    });

    return { blob, filename: `participants_${chatId}.${extension}`, jobId, participants: filteredParticipants };
  } catch (error) {
    await updateExportJob(jobId, {
      status: 'failed',
      error: error.message,
      completedAt: Date.now(),
    });
    throw error;
  }
}

// Управление кэшем
export { getCachedStats, getCachedStats as getExportCacheSize, clearCache };

// Утилита для скачивания
export function downloadExport(exportResult) {
  downloadBlob(exportResult.blob, exportResult.filename);
}

export default {
  exportHistory,
  exportParticipants,
  downloadExport,
  getCachedStats,
  getExportCacheSize: getCachedStats,
  clearCache,
};