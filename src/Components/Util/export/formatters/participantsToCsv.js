export function formatParticipantsToCsv(participants) {
  const BOM = '\uFEFF';
  const headers = ['user_id', 'first_name', 'last_name', 'username', 'phone', 'role', 'joined_date', 'is_bot', 'is_premium'];
  const rows = participants.map(p => [
    p.userId || '',
    escapeCsv(p.firstName || ''),
    escapeCsv(p.lastName || ''),
    escapeCsv(p.username || ''),
    escapeCsv(p.phone || ''),
    p.role || 'member',
    p.joinedDate ? new Date(p.joinedDate * 1000).toISOString() : '',
    !!p.isBot,
    !!p.isPremium,
  ].join(','));
  return BOM + [headers.join(','), ...rows].join('\n');
}

function escapeCsv(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export default formatParticipantsToCsv;
