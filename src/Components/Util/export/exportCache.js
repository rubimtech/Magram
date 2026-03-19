import { openDB } from 'idb';

const DB_NAME = 'magram-export';
const DB_VERSION = 1;

const STORES = {
  MESSAGES: 'messages',
  PARTICIPANTS: 'participants',
  EXPORT_JOBS: 'exportJobs',
};

let dbPromise = null;

export async function initDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
          const messageStore = db.createObjectStore(STORES.MESSAGES, { keyPath: ['chatId', 'messageId'] });
          messageStore.createIndex('chatId', 'chatId');
          messageStore.createIndex('exportedAt', '_exportedAt');
        }
        if (!db.objectStoreNames.contains(STORES.PARTICIPANTS)) {
          const participantsStore = db.createObjectStore(STORES.PARTICIPANTS, { keyPath: ['chatId', 'userId'] });
          participantsStore.createIndex('chatId', 'chatId');
          participantsStore.createIndex('exportedAt', '_exportedAt');
        }
        if (!db.objectStoreNames.contains(STORES.EXPORT_JOBS)) {
          const jobsStore = db.createObjectStore(STORES.EXPORT_JOBS, { keyPath: 'jobId' });
          jobsStore.createIndex('chatId', 'chatId');
          jobsStore.createIndex('status', 'status');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveMessages(chatId, messages) {
  const db = await initDB();
  const tx = db.transaction(STORES.MESSAGES, 'readwrite');
  const store = tx.objectStore(STORES.MESSAGES);

  const timestamp = Date.now();
  const messagesToSave = messages.map((msg) => ({
    ...msg,
    chatId,
    _exportedAt: timestamp,
  }));

  await Promise.all(messagesToSave.map((msg) => store.put(msg)));
  await tx.done;
}

export async function getMessages(chatId, options = {}) {
  const db = await initDB();
  const tx = db.transaction(STORES.MESSAGES, 'readonly');
  const store = tx.objectStore(STORES.MESSAGES);
  const index = store.index('chatId');

  const messages = [];
  const cursor = await index.openCursor(IDBKeyRange.only(chatId));

  if (cursor) {
    let current = cursor;
    while (current) {
      const msg = current.value;
      const { fromId = 0, toId = Infinity } = options;

      if (msg.messageId >= fromId && msg.messageId <= toId) {
        messages.push(msg);
      }
      current = await current.continue();
    }
  }

  await tx.done;
  return messages.sort((a, b) => a.messageId - b.messageId);
}

export async function getLastMessageId(chatId) {
  const db = await initDB();
  const tx = db.transaction(STORES.MESSAGES, 'readonly');
  const store = tx.objectStore(STORES.MESSAGES);
  const index = store.index('chatId');

  const messages = await index.getAll(IDBKeyRange.only(chatId));
  await tx.done;

  if (messages.length === 0) return 0;
  return Math.max(...messages.map((m) => m.messageId));
}

export async function getMessageCount(chatId) {
  const db = await initDB();
  const tx = db.transaction(STORES.MESSAGES, 'readonly');
  const store = tx.objectStore(STORES.MESSAGES);
  const index = store.index('chatId');

  const count = await index.count(IDBKeyRange.only(chatId));
  await tx.done;
  return count;
}

export async function getCachedStats(chatId) {
  const db = await initDB();
  const tx = db.transaction(STORES.MESSAGES, 'readonly');
  const store = tx.objectStore(STORES.MESSAGES);
  const index = store.index('chatId');

  const messages = await index.getAll(IDBKeyRange.only(chatId));
  await tx.done;

  if (messages.length === 0) {
    return { messageCount: 0, oldestDate: null, newestDate: null, sizeBytes: 0 };
  }

  const dates = messages.map((m) => m.date).sort((a, b) => a - b);
  const sizeBytes = new TextEncoder().encode(JSON.stringify(messages)).length;

  return {
    messageCount: messages.length,
    oldestDate: dates[0] ? new Date(dates[0] * 1000) : null,
    newestDate: dates[dates.length - 1] ? new Date(dates[dates.length - 1] * 1000) : null,
    sizeBytes,
  };
}

export async function saveParticipants(chatId, participants) {
  const db = await initDB();
  const tx = db.transaction(STORES.PARTICIPANTS, 'readwrite');
  const store = tx.objectStore(STORES.PARTICIPANTS);

  const timestamp = Date.now();
  const participantsToSave = participants.map((p) => ({ ...p, chatId, _exportedAt: timestamp }));

  await Promise.all(participantsToSave.map((p) => store.put(p)));
  await tx.done;
}

export async function getParticipants(chatId) {
  const db = await initDB();
  const tx = db.transaction(STORES.PARTICIPANTS, 'readonly');
  const store = tx.objectStore(STORES.PARTICIPANTS);
  const index = store.index('chatId');

  const participants = await index.getAll(IDBKeyRange.only(chatId));
  await tx.done;

  return participants.sort((a, b) => b.joinedDate - a.joinedDate);
}

export async function saveExportJob(job) {
  const db = await initDB();
  const tx = db.transaction(STORES.EXPORT_JOBS, 'readwrite');
  const store = tx.objectStore(STORES.EXPORT_JOBS);

  await store.put({ ...job, createdAt: job.createdAt || Date.now(), updatedAt: Date.now() });
  await tx.done;
}

export async function getExportJob(jobId) {
  const db = await initDB();
  const tx = db.transaction(STORES.EXPORT_JOBS, 'readonly');
  const store = tx.objectStore(STORES.EXPORT_JOBS);

  const job = await store.get(jobId);
  await tx.done;
  return job;
}

export async function updateExportJob(jobId, patch) {
  const db = await initDB();
  const tx = db.transaction(STORES.EXPORT_JOBS, 'readwrite');
  const store = tx.objectStore(STORES.EXPORT_JOBS);

  const existingJob = await store.get(jobId);
  if (existingJob) {
    await store.put({ ...existingJob, ...patch, updatedAt: Date.now() });
  }
  await tx.done;
}

export async function clearCache(chatId) {
  const db = await initDB();

  const txMessages = db.transaction(STORES.MESSAGES, 'readwrite');
  const messagesStore = txMessages.objectStore(STORES.MESSAGES);
  const messagesIndex = messagesStore.index('chatId');
  const messages = await messagesIndex.getAllKeys(IDBKeyRange.only(chatId));
  await Promise.all(messages.map((key) => messagesStore.delete(key)));
  await txMessages.done;

  const txParticipants = db.transaction(STORES.PARTICIPANTS, 'readwrite');
  const participantsStore = txParticipants.objectStore(STORES.PARTICIPANTS);
  const participantsIndex = participantsStore.index('chatId');
  const participants = await participantsIndex.getAllKeys(IDBKeyRange.only(chatId));
  await Promise.all(participants.map((key) => participantsStore.delete(key)));
  await txParticipants.done;

  const txJobs = db.transaction(STORES.EXPORT_JOBS, 'readwrite');
  const jobsStore = txJobs.objectStore(STORES.EXPORT_JOBS);
  const jobsIndex = jobsStore.index('chatId');
  const jobs = await jobsIndex.getAllKeys(IDBKeyRange.only(chatId));
  await Promise.all(jobs.map((key) => jobsStore.delete(key)));
  await txJobs.done;
}

export async function getExportCacheSize() {
  const db = await initDB();

  const txMessages = db.transaction(STORES.MESSAGES, 'readonly');
  const messagesStore = txMessages.objectStore(STORES.MESSAGES);
  const allMessages = await messagesStore.getAll();
  await txMessages.done;

  const txParticipants = db.transaction(STORES.PARTICIPANTS, 'readonly');
  const participantsStore = txParticipants.objectStore(STORES.PARTICIPANTS);
  const allParticipants = await participantsStore.getAll();
  await txParticipants.done;

  const sizeBytes =
    new TextEncoder().encode(JSON.stringify(allMessages)).length +
    new TextEncoder().encode(JSON.stringify(allParticipants)).length;

  return { messageCount: allMessages.length, participantCount: allParticipants.length, sizeBytes };
}

export { STORES };
