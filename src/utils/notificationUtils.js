// Helper to normalize and extract notification fields
export const getNotifDetails = (item) => {
  if (!item) return { id: 'empty', title: '', message: '', date: '', isRead: false, isUnread: false, leadData: null, type: 'info', raw: {} };
  const id = item._id || item.id || item.notificationId || (typeof item === 'string' ? item : Math.random().toString());
  const title = item.title || item.subject || item.heading || (item.lead ? `New Lead Inquiry: ${item.lead.name || 'Client'}` : item.name ? `Notification from ${item.name}` : (item.text || 'Platform Notification'));
  const message = item.message || item.text || item.description || item.body || item.details || item.content || '';
  const date = item.createdAt || item.created_at || item.timestamp || item.date || item.time || '';
  
  // Check if notification is read (true) or unread (false)
  const isRead =
    item.isRead === true ||
    item.isRead === 'true' ||
    item.isRead === 1 ||
    item.read === true ||
    item.read === 'true' ||
    item.read === 1 ||
    item.status === 'read' ||
    item.unread === false;

  const isUnread = !isRead;
  
  // Extract lead information if available
  let leadData = null;
  if (item.lead && typeof item.lead === 'object') {
    leadData = item.lead;
  } else if (item.leadName || item.clientName || item.senderName || item.email || item.phone) {
    leadData = {
      name: item.leadName || item.clientName || item.senderName || item.name,
      email: item.leadEmail || item.email,
      phone: item.leadPhone || item.phone,
      property: item.propertyTitle || item.property || item.propertyName,
      notes: item.leadNotes || item.notes || item.inquiryMessage
    };
  }

  const type = (item.type || (leadData ? 'lead' : (item.isWarning ? 'warning' : 'info'))).toLowerCase();
  return { id, title, message, date, isRead, isUnread, leadData, type, raw: item };
};

// Helper to format timestamps
export const formatNotifDate = (dateStr) => {
  if (!dateStr) return 'Recent';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return String(dateStr);
  }
};
