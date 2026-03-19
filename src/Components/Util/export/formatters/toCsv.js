export function formatMessagesToCsv(messages) {
  const BOM = '\uFEFF';
  const headers = ['id', 'date', 'from_id', 'from_name', 'text', 'reply_to', 'has_media', 'media_type', 'views', 'forwards'];
  
  const rows = messages.map((msg) => [
    msg.messageId,
    new Date(msg.date * 1000).toISOString(),
    msg.fromId || '',
    escapeCsv(msg.fromName || ''),
    escapeCsv(msg.text || ''),
    msg.replyToMsgId || '',
    !!msg.media,
    msg.media?.type || '',
    msg.views || 0,
    msg.forwards || 0,
  ].join(','));

  return BOM + [headers.join(','), ...rows].join('\n');
}

function escapeCsv(str) {
  if (str === null || str === undefined) return '';
  const stringified = String(str);
  if (stringified.includes(',') || stringified.includes('"') || stringified.includes('\n') || stringified.includes('\r')) {
    return '"' + stringified.replace(/"/g, '""') + '"';
  }
  return stringified;
}

export default formatMessagesToCsv;