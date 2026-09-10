export const initialRealtors = [];

export const initialPortals = [
  { id: 'port-1', name: 'SuperCasas', interval: 'Hourly', status: 'Active', lastSync: '2026-08-25 15:30', totalScraped: 1245 },
  { id: 'port-2', name: 'Corotos', interval: 'Daily', status: 'Active', lastSync: '2026-08-25 00:00', totalScraped: 752 }
];

export const initialLogs = [
  { id: 'log-1', timestamp: '2026-08-25 15:31:05', user: 'Neha Rodriguez', category: 'Sync', details: 'Automated sync completed for portal: SuperCasas. Imported 12 properties.', ip: '192.168.1.45' },
  { id: 'log-2', timestamp: '2026-08-25 14:10:22', user: 'Neha Rodriguez', category: 'Security', details: 'Admin user session token refreshed successfully.', ip: '192.168.1.45' },
  { id: 'log-3', timestamp: '2026-08-25 11:15:00', user: 'Support Bot', category: 'Realtor', details: 'Realtor "Elena Rostova" submitted REG-2025-4512 license registration for verification.', ip: '10.0.4.198' }
];

export const initialSyncLogs = [
  { id: 'slog-1', timestamp: '2026-08-25 15:30:00', sources: 'SuperCasas feed', imported: 12, failed: 0, duration: '12s', status: 'Success' },
  { id: 'slog-2', timestamp: '2026-08-25 00:00:00', sources: 'Corotos scraper', imported: 34, failed: 1, duration: '45s', status: 'Success' },
  { id: 'slog-3', timestamp: '2026-08-24 15:30:00', sources: 'SuperCasas feed', imported: 0, failed: 5, duration: '15s', status: 'Failed' }
];

export const initialBackups = [
  { id: 'bak-1', filename: 'db_backup_2026-08-24_00-00-01.sql', size: '24.2 MB', timestamp: '2026-08-24 00:00:05', status: 'Ready' },
  { id: 'bak-2', filename: 'db_backup_2026-08-20_00-00-01.sql', size: '23.9 MB', timestamp: '2026-08-20 00:00:04', status: 'Ready' }
];

export const initialAiSettings = {
  model: 'gpt-4o',
  temperature: 0.4,
  maxTokens: 2048,
  searchPrompt: 'You are a Dominican Republic real estate AI search advisor. Help users find properties in cities like Santo Domingo, Santiago, and tourist hubs like Punta Cana, Samana, and Las Terrenas. Map colloquial location terms to official sectors.',
  marketingPrompt: 'You are an AI copywriting assistant for realtors. Generate luxury property marketing descriptions based on attributes (price, size, rooms, views). Keep the tone professional, persuasive, and optimized for social media.'
};

export const initialUsers = [];
export const initialProperties = [];
