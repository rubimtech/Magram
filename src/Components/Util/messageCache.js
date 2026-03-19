import { openDB } from 'idb';

const DB_NAME = 'magram-messages';
const DB_VERSION = 1;
let dbPromise = null;

async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('messages')) {
          const store = db.createObjectStore('messages', { keyPath: ['chatId', 'id'] });
          store.createIndex('chatId', 'chatId');
        }
      },
    });
  }
  return dbPromise;
}

// serialize a Telegram message object to a plain storable object
function serialize(msg) {
  try {
    return JSON.parse(JSON.stringify(msg, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    ));
  } catch {
    return null;
  }
}

export async function cacheMessages(chatId, messages) {
  if (!messages?.length) return;
  try {
    const db = await getDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    for (const msg of messages) {
      const plain = serialize(msg);
      if (plain) {
        plain.chatId = String(chatId);
        plain.id = Number(msg.id);
        await store.put(plain);
      }
    }
    await tx.done;
  } catch (e) {
    console.warn('[messageCache] cacheMessages failed', e);
  }
}

export async function loadCachedMessages(chatId) {
  try {
    const db = await getDB();
    const all = await db.getAllFromIndex('messages', 'chatId', String(chatId));
    return all.sort((a, b) => a.id - b.id);
  } catch (e) {
    console.warn('[messageCache] loadCachedMessages failed', e);
    return [];
  }
}

export async function cacheMessage(chatId, msg) {
  return cacheMessages(chatId, [msg]);
}

export async function getCachedMessageCount(chatId) {
  try {
    const db = await getDB();
    return await db.countFromIndex('messages', 'chatId', String(chatId));
  } catch {
    return 0;
  }
}
