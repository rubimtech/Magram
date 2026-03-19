export function formatMessagesToJson(chat, messages) {
  const exportData = {
    chat: {
      id: chat.id?.value || chat.id,
      title: chat.title || chat.firstName || 'Unknown',
      type: getChatType(chat),
      exportedAt: new Date().toISOString(),
    },
    messages: messages.map((msg) => formatMessage(msg)),
  };

  return JSON.stringify(exportData, null, 2);
}

function formatMessage(msg) {
  return {
    id: msg.messageId,
    date: new Date(msg.date * 1000).toISOString(),
    from: {
      id: msg.fromId,
      firstName: msg.fromName,
    },
    text: msg.text || '',
    replyToMsgId: msg.replyToMsgId,
    media: msg.media,
    reactions: msg.reactions?.map((r) => ({
      emoji: r.reaction?.emoticon,
      count: r.count,
    })) || [],
    views: msg.views,
    forwards: msg.forwards,
  };
}

function getChatType(chat) {
  if (chat.className?.includes('Channel')) return 'channel';
  if (chat.className?.includes('Chat')) return 'group';
  if (chat.className?.includes('User')) return 'private';
  return 'unknown';
}

export default formatMessagesToJson;