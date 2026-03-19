export function formatMessagesToHtml(chat, messages) {
  const chatTitle = chat.title || chat.firstName || 'Unknown';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(chatTitle)} - Export</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0e1621; color: #fff; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #1c2630; margin-bottom: 20px; }
    .header h1 { font-size: 24px; color: #5caffa; }
    .header p { color: #6c7883; margin-top: 8px; }
    .message { background: #182533; border-radius: 12px; padding: 16px; margin-bottom: 12px; max-width: 640px; margin-left: auto; margin-right: auto; }
    .message-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .message-author { font-weight: 600; color: #5caffa; }
    .message-date { color: #6c7883; font-size: 13px; }
    .message-text { line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
    .message-media { margin-top: 12px; padding: 12px; background: #0e1621; border-radius: 8px; }
    .message-meta { display: flex; gap: 16px; margin-top: 8px; font-size: 13px; color: #6c7883; }
    .reactions { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 8px; }
    .reaction { background: #2b3947; padding: 4px 8px; border-radius: 12px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(chatTitle)}</h1>
    <p>Exported on ${new Date().toLocaleString()} | ${messages.length} messages</p>
  </div>
  ${messages.map((msg) => renderMessage(msg)).join('')}
</body>
</html>`;
}

function renderMessage(msg) {
  const date = new Date(msg.date * 1000).toLocaleString();
  return `
  <div class="message">
    <div class="message-header">
      <span class="message-author">${escapeHtml(msg.fromName || 'Unknown')}</span>
      <span class="message-date">${date}</span>
    </div>
    <div class="message-text">${escapeHtml(msg.text || '')}</div>
    ${msg.media ? `<div class="message-media">[Media: ${msg.media.type}]</div>` : ''}
    ${msg.reactions?.length > 0 ? `<div class="reactions">${msg.reactions.map((r) => `<span class="reaction">${r.reaction?.emoticon || ''} ${r.count}</span>`).join('')}</div>` : ''}
    <div class="message-meta">
      ${msg.views ? `<span>👁 ${msg.views}</span>` : ''}
      ${msg.forwards ? `<span>↗ ${msg.forwards}</span>` : ''}
    </div>
  </div>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default formatMessagesToHtml;