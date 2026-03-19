import { Api } from 'telegram';
import { saveParticipants } from './exportCache';
import { client } from '../../../App';

async function ensureConnected() {
  if (!client.connected) {
    await client.connect();
  }
}

export class FloodWaitError extends Error {
  constructor(seconds) {
    super(`FLOOD_WAIT_${seconds}`);
    this.name = 'FloodWaitError';
    this.seconds = seconds;
  }
}

export async function fetchAllParticipants(peer, chatType, options = {}, onProgress, signal) {
  await ensureConnected();
  const chatId = String(peer.id.value);

  // For regular groups use GetFullChat (all at once)
  if (chatType === 'Group' && !peer.className?.includes('Channel')) {
    try {
      const fullChat = await client.invoke(new Api.messages.GetFullChat({ chat_id: chatId }));
      const participantsData = fullChat.fullChat?.participants?.participants || [];
      const users = fullChat.users || [];
      const normalized = participantsData.map((p) => normalizeParticipant(p, users));
      if (options.useCache !== false) await saveParticipants(chatId, normalized);
      return normalized;
    } catch (error) {
      console.error('Error fetching group participants:', error);
      throw error;
    }
  }

  // For channels/supergroups use iterParticipants (high-level, handles DC migration)
  const allParticipants = [];
  const filter = options.filter === 'admins' ? new Api.ChannelParticipantsAdmins()
               : options.filter === 'bots'   ? new Api.ChannelParticipantsBots()
               : new Api.ChannelParticipantsSearch({ q: '' });

  for await (const participant of client.iterParticipants(peer, { filter })) {
    if (signal?.aborted) throw new Error('Export aborted');

    allParticipants.push({
      userId: participant.id?.value,
      firstName: participant.firstName || '',
      lastName: participant.lastName || '',
      username: participant.username || '',
      phone: participant.phone || '',
      role: participant.participant?.className === 'ChannelParticipantCreator' ? 'creator'
          : participant.participant?.className === 'ChannelParticipantAdmin' ? 'admin'
          : participant.participant?.className === 'ChannelParticipantBanned' ? 'banned'
          : 'member',
      isBot: participant.bot || false,
      isPremium: participant.premium || false,
    });

    if (allParticipants.length % 100 === 0) {
      onProgress?.({ fetched: allParticipants.length, phase: 'participants' });
    }
  }

  if (options.useCache !== false && allParticipants.length > 0) {
    await saveParticipants(chatId, allParticipants);
  }

  return allParticipants;
}
