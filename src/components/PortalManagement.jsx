import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStateContext } from '../context/StateContext';
import {
  CloudLightning,
  Settings2,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Database,
  History,
  Info,
  Clock,
  RefreshCw,
  Terminal,
  Activity,
  Plus,
  X
} from 'lucide-react';

export default function PortalManagement() {
  const {
    portals,
    syncLogs,
    handleUpdatePortal: onUpdatePortal,
    handleTriggerSyncStart: onTriggerSyncStart,
    addAuditLog: onAddAuditLog
  } = useStateContext();
  const [activePortalEdit, setActivePortalEdit] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [scrapeInterval, setScrapeInterval] = useState('Hourly');

  // Manual Sync Engine State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncTerminalLogs, setSyncTerminalLogs] = useState([]);

  // Data Quality Metrics mock
  const qualityMetrics = {
    validationErrorsToday: 4,
    autoCleanedFieldsToday: 18,
    duplicatesDetectedToday: 3,
    normalizationIssues: 2
  };

  const handleEditClick = (portal) => {
    setActivePortalEdit(portal);
    setApiKey(portal.apiKey || 'SK_LIVE_DOM_99A0X2');
    setScrapeInterval(portal.interval);
  };

  const handleSavePortalSettings = (e) => {
    e.preventDefault();
    if (!activePortalEdit) return;

    const updated = {
      ...activePortalEdit,
      apiKey,
      interval: scrapeInterval
    };

    onUpdatePortal(updated);
    onAddAuditLog('Sync', `Modified connection credentials and sync interval for ${activePortalEdit.name}`);
    setActivePortalEdit(null);
    alert(`Configuration saved successfully for ${activePortalEdit.name}!`);
  };

  const togglePortalState = (portal) => {
    const nextState = portal.status === 'Active' ? 'Paused' : 'Active';
    onUpdatePortal({
      ...portal,
      status: nextState
    });
    onAddAuditLog('Sync', `Toggled scraping status of portal source ${portal.name} to ${nextState}`);
    alert(`${portal.name} is now ${nextState}`);
  };

  // Run Manual Scrape Sync sequence
  const startManualSync = () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncTerminalLogs(['[SYSTEM] Initializing manual sync sequence...', '[SYSTEM] Fetching connection settings for active portals...']);

    // Call app parent to update state
    onTriggerSyncStart();
  };

  useEffect(() => {
    let timer;
    if (isSyncing) {
      const logs = [
        '[INFO] SuperCasas: Authenticating with API Key...',
        '[INFO] SuperCasas: Scraping feed... Found 54 properties.',
        '[INFO] Corotos: Contacting OAuth token endpoint...',
        '[INFO] Corotos: Fetching JSON responses... Found 31 properties.',
        '[CLEANER] Running structural validation schemas...',
        '[CLEANER] Warning: Auto-cleaned 4 records with empty ZIP codes.',
        '[DUPLICATE_ENGINE] Aligning coordinates & checking titles...',
        '[DUPLICATE_ENGINE] Alert: Identified 2 potential duplicates (Santo Domingo).',
        '[DATABASE] Writing normalized property objects to storage...',
        '[SYSTEM] Database write complete. Synced 85 properties successfully!',
        '[SYSTEM] Sync process finalized. Closing connection channels.'
      ];

      timer = setInterval(() => {
        setSyncProgress((prev) => {
          const next = prev + 10;
          
          // Stream logs based on progress threshold
          const logIdx = Math.floor(next / 10) - 1;
          if (logIdx >= 0 && logIdx < logs.length) {
            setSyncTerminalLogs(prevLogs => [...prevLogs, logs[logIdx]]);
          }

          if (next >= 100) {
            clearInterval(timer);
            setIsSyncing(false);
            onAddAuditLog('Sync', 'Finished manual crawler synchronization for SuperCasas & Corotos (85 listings processed)');
            return 100;
          }
          return next;
        });
      }, 600);
    }

    return () => clearInterval(timer);
  }, [isSyncing]);

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div>
        <h2>Portal & API Integration Control</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Configure connected portals API parameters, triggers scrapers scheduling, monitor validation error rates, and view synchronization records.
        </p>
      </div>

      {/* Portals Cards Grid */}
      <div className="grid-cols-3">
        {portals.map((portal) => (
          <div key={portal.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="flex-between">
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CloudLightning size={18} className="text-primary" />
                {portal.name}
              </h3>
              <span className={`badge ${portal.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                {portal.status}
              </span>
            </div>

            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <p><strong>Frequency:</strong> {portal.interval}</p>
              <p><strong>Last Sync:</strong> {portal.lastSync}</p>
              <p><strong>Imports Total:</strong> {portal.totalScraped} items</p>
              <p><strong>Health Code:</strong> 200 OK Connection</p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: 'auto' }}>
              <button
                className={`btn btn-secondary btn-sm`}
                style={{ flex: 1, gap: '0.35rem' }}
                onClick={() => togglePortalState(portal)}
              >
                {portal.status === 'Active' ? (
                  <>
                    <Pause size={12} className="text-warning" />
                    Pause Sync
                  </>
                ) : (
                  <>
                    <Play size={12} className="text-success" />
                    Resume Sync
                  </>
                )}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleEditClick(portal)}>
                <Settings2 size={12} />
                Configure
              </button>
            </div>
          </div>
        ))}

        {/* Add source placeholder */}
        <div className="glass-panel" style={{
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          border: '2px dashed var(--border-color)',
          background: 'transparent',
          cursor: 'pointer'
        }} onClick={() => alert("Simulation: New property scraper source onboarding wizard")}>
          <Plus size={24} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Add Connected Portal</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '200px', marginTop: '0.25rem' }}>
            Configure new custom REST API feed endpoints or JSON-LD scrapers.
          </p>
        </div>
      </div>

      {/* Sync Engine and Console Console */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem' }} className="grid-cols-2">
        {/* Terminal Run logs */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="flex-between">
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={18} className="text-warning" />
              Manual Import Crawler Engine
            </h3>
            {!isSyncing ? (
              <button className="btn btn-primary btn-sm" onClick={startManualSync}>
                Trigger Scrape Sync
              </button>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sync Running: {syncProgress}%</span>
            )}
          </div>

          {isSyncing && (
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${syncProgress}%`, height: '100%', background: 'linear-gradient(to right, var(--primary), var(--info))', transition: 'width 0.4s ease' }} />
            </div>
          )}

          <div style={{
            background: '#040711',
            borderRadius: '8px',
            padding: '1rem',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            height: '220px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            color: 'hsl(142, 70%, 75%)',
            border: '1px solid var(--border-color)'
          }}>
            {syncTerminalLogs.length > 0 ? (
              syncTerminalLogs.map((log, i) => (
                <div key={i} style={{ lineBreak: 'anywhere' }}>
                  {log}
                </div>
              ))
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Idle. Click "Trigger Scrape Sync" to initiate crawler.</span>
            )}
          </div>
        </div>

        {/* Data Quality Report */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} className="text-info" />
            Data Quality & Normalization
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Validation Failures</span>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.25rem' }}>
                {qualityMetrics.validationErrorsToday}
              </p>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Schema mismatches rejected</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Auto-Cleaned Fields</span>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>
                {qualityMetrics.autoCleanedFieldsToday}
              </p>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Missing fields auto-filled</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Duplicate Flags Pending</span>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.25rem' }}>
                {qualityMetrics.duplicatesDetectedToday}
              </p>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Flagged by matching rules</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Location Normalizations</span>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--info)', marginTop: '0.25rem' }}>
                {qualityMetrics.normalizationIssues}
              </p>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Mapped to DR terminology</span>
            </div>
          </div>

          <div style={{ background: 'rgba(6,182,212,0.04)', padding: '0.75rem', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '6px', fontSize: '0.8rem', color: 'hsl(199, 89%, 75%)' }}>
            <strong>Rule:</strong> Scraper maps local names (e.g. "Piantini SD") to standardized location key "Piantini, Santo Domingo".
          </div>
        </div>
      </div>

      {/* Historical Sync Records */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} />
          Synchronization Log History
        </h3>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Sync Date</th>
                <th>Portal Sources</th>
                <th>Properties Synced</th>
                <th>Failures</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {syncLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-secondary)' }}>{log.timestamp}</td>
                  <td>{log.sources}</td>
                  <td style={{ fontWeight: 600 }}>{log.imported} assets</td>
                  <td style={{ color: log.failed > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{log.failed}</td>
                  <td>{log.duration}</td>
                  <td>
                    <span className={`badge ${log.status === 'Success' ? 'badge-success' : 'badge-danger'}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PORTAL CONFIGURATION MODAL */}
      {activePortalEdit && createPortal(
        <div className="modal-overlay" onClick={() => setActivePortalEdit(null)}>
          <form className="modal-content" onSubmit={handleSavePortalSettings} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Configure {activePortalEdit.name} scraper</h3>
              <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setActivePortalEdit(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Feed API Key</label>
                <input
                  type="text"
                  className="form-control"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Insert secure authorization header key..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sync Scheduling Interval</label>
                <select className="form-control form-select" value={scrapeInterval} onChange={(e) => setScrapeInterval(e.target.value)}>
                  <option value="Hourly">Hourly Imports (Recommended)</option>
                  <option value="Daily">Daily Imports (Midnight AST)</option>
                  <option value="Weekly">Weekly Imports (Sunday)</option>
                  <option value="Manual Only">Manual Run On-Demand</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Data Schema Parser</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ color: 'var(--text-muted)', background: '#f8fafc' }}
                  value="dominica_real_estate_xml_v2.json"
                  disabled
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setActivePortalEdit(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Connection
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
}
