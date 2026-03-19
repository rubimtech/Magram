export function formatParticipantsToJson(chat, participants) {
  return JSON.stringify({
    chat: { id: chat.id?.value || chat.id, title: chat.title || 'Unknown', type: 'group' },
    exportedAt: new Date().toISOString(),
    total: participants.length,
    participants: participants.map(p => ({
      userId: p.userId,
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      username: p.username || '',
      phone: p.phone || '',
      role: p.role || 'member',
      adminRights: p.adminRights,
      joinedDate: p.joinedDate ? new Date(p.joinedDate * 1000).toISOString() : null,
      isBot: !!p.isBot,
      isPremium: !!p.isPremium,
      isVerified: !!p.isVerified,
    })),
  }, null, 2);
}
export default formatParticipantsToJson;
