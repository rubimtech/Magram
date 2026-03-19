import { Api } from 'telegram';
import { sleep } from 'telegram/Utils';
import { saveMessages, getLastMessageId, getMessages } from './exportCache';
import { client } from '../../../App';

async function ensureConnected() {
  if (!client.connected) {
    await client.connect();
  }
}

const BATCH_SIZE = 100;
const BASE_DELAY = 350;

export class FloodWaitError extends Error {
  constructor(seconds) {
    super(`FLOOD_WAIT_${seconds}`);
    this.name = 'FloodWaitError';
    this.seconds = seconds;
  }
}

export async function fetchAllMessages(peer, options = {}, onProgress, signal) {
  await ensureConnected();
  const { useCache = true, fromDate = null, toDate = null } = options;

  const chatId = String(peer.id.value);
  let allMessages = [];

  // Load from cache first
  if (useCache) {
    const cachedMessages = await getMessages(chatId);
    if (cachedMessages.length > 0) {
      allMessages = cachedMessages;
      onProgress?.({ fetched: allMessages.length, total: allMessages.length, phase: 'cache' });
    }
  }

  const lastCachedId = useCache ? (await getLastMessageId(chatId)) : 0;

  // Collect new messages via high-level iterMessages (handles DC migration automatically)
  const newMessages = [];
  const iterOptions = { limit: undefined, offsetId: 0, minId: lastCachedId };
  if (fromDate) iterOptions.offsetDate = Math.floor(fromDate.getTime() / 1000);

  for await (const msg of client.iterMessages(peer, iterOptions)) {
    if (signal?.aborted) throw new Error('Export aborted');
    if (msg.className === 'MessageEmpty') continue;
    if (toDate && new Date(msg.date * 1000) > toDate) continue;
    if (fromDate && new Date(msg.date * 1000) < fromDate) break;

    const normalized = {
      messageId: msg.id, date: msg.date, fromId: msg.fromId?.value,
      text: msg.message || '',
      replyToMsgId: msg.replyTo?.replyToMsgId,
      media: msg.media ? normalizeMedia(msg.media) : null,
      reactions: msg.reactions?.results || [],
      views: msg.views, forwards: msg.forwards,
    };
    newMessages.push(normalized);

    if (newMessages.length % 100 === 0) {
      if (useCache) await saveMessages(chatId, newMessages.splice(0, 100));
      onProgress?.({ fetched: allMessages.length + newMessages.length, total: null, phase: 'messages' });
    }
  }

  if (useCache && newMessages.length > 0) await saveMessages(chatId, newMessages);
  allMessages = [...allMessages, ...newMessages];

  return allMessages.sort((a, b) => a.messageId - b.messageId);
}

function normalizeMedia(media) {
  if (!media) return null;
  const base = { type: media.className.replace('MessageMedia', '').toLowerCase(), className: media.className };
  switch (media.className) {
    case 'MessageMediaPhoto': return { ...base, photoId: media.photo?.id?.value, hasSpoiler: media.spoiler || false };
    case 'MessageMediaDocument': return { ...base, documentId: media.document?.id?.value, fileName: media.document?.filename, mimeType: media.document?.mimeType, size: media.document?.size, hasSpoiler: media.spoiler || false };
    case 'MessageMediaGeo': return { ...base, lat: media.geo?.lat, long: media.geo?.long };
    case 'MessageMediaContact': return { ...base, firstName: media.firstName, lastName: media.lastName, phoneNumber: media.phoneNumber, userId: media.userId?.value };
    case 'MessageMediaPoll': return { ...base, pollId: media.poll.id.value, question: media.poll.question.text, answers: media.poll.answers.map((a) => ({ text: a.text, votes: a.votes })) };
    default: return base;
  }
}

export async function getApproximateMessageCount(peer) {
  await ensureConnected();
  try {
    // iterMessages with limit=1 just to get the total count from the result
    const result = await client.invoke(new Api.messages.GetHistory({ peer, offset_id: 0, add_offset: 0, limit: 1, max_id: 0, min_id: 0, hash: BigInt(0) }));
    return result.count ?? result.messages?.length ?? null;
  } catch (error) {
    console.error('Error getting message count:', error);
    return null;
  }
}