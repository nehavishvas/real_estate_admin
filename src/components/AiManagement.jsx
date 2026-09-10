import React, { useState } from 'react';
import { useStateContext } from '../context/StateContext';
import {
  BrainCircuit,
  Sliders,
  Play,
  Save,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Clock,
  Settings2,
  FileCode,
  Zap,
  Search,
  DollarSign,
  AlertTriangle,
  History
} from 'lucide-react';

export default function AiManagement() {
  const {
    aiSettings,
    handleUpdateAiSettings: onUpdateAiSettings,
    addAuditLog: onAddAuditLog
  } = useStateContext();
  const [activePromptTab, setActivePromptTab] = useState('search'); // 'search' or 'marketing'
  
  // Model Parameters state
  const [selectedModel, setSelectedModel] = useState(aiSettings.model || 'gpt-4o');
  const [temperature, setTemperature] = useState(aiSettings.temperature || 0.4);
  const [maxTokens, setMaxTokens] = useState(aiSettings.maxTokens || 2048);
  const [openAiKey, setOpenAiKey] = useState('••••••••••••••••••••••••3A7G');

  // Prompts and edits state
  const [searchPrompt, setSearchPrompt] = useState(aiSettings.searchPrompt || 
`You are a Dominican Republic real estate AI search advisor. Help users find properties in cities like Santo Domingo, Santiago, and tourist hubs like Punta Cana, Samana, and Las Terrenas. Map colloquial location terms to official sectors.`);
  const [marketingPrompt, setMarketingPrompt] = useState(aiSettings.marketingPrompt ||
`You are an AI copywriting assistant for realtors. Generate luxury property marketing descriptions based on attributes (price, size, rooms, views). Keep the tone professional, persuasive, and optimized for social media.`);

  // Sandbox testing state
  const [sandboxInput, setSandboxInput] = useState('Find a 2 bedroom apartment in Piantini for under $250k USD');
  const [sandboxResponse, setSandboxResponse] = useState('');
  const [isSandboxRunning, setIsSandboxRunning] = useState(false);

  // Quotas & limits state
  const [buyerLimit, setBuyerLimit] = useState(50);
  const [realtorLimit, setRealtorLimit] = useState(100);

  // Prompt History mock
  const [promptVersions, setPromptVersions] = useState([
    { version: 'v2.1', date: '2026-08-20', author: 'Neha Rodriguez', description: 'Added location mapping for Samana peninsula' },
    { version: 'v2.0', date: '2026-08-01', author: 'Neha Rodriguez', description: 'Initial production system prompt for GPT-4o release' }
  ]);

  const handleSaveConfig = () => {
    onUpdateAiSettings({
      model: selectedModel,
      temperature,
      maxTokens,
      searchPrompt,
      marketingPrompt
    });
    onAddAuditLog('AI', `Updated GPT-4o model parameters & core system prompts`);
    alert('AI System Parameters and Prompts saved successfully!');
  };

  const handleTestSandbox = () => {
    setIsSandboxRunning(true);
    setSandboxResponse('');

    setTimeout(() => {
      // Simulate GPT-4o structured response output
      let responseText = '';
      if (activePromptTab === 'search') {
        responseText = 
`{
  "intent": "PROPERTY_SEARCH",
  "location": "Piantini, Santo Domingo",
  "max_price_usd": 250000,
  "bedrooms": 2,
  "standardized_query": "SELECT * FROM properties WHERE location = 'Piantini' AND price <= 250000 AND bedrooms >= 2",
  "system_reply": "I found 3 suitable apartments in Piantini matching your budget under $250,000 USD. Let me show you: 1. Naco-Border Loft ($210k), 2. Piantini Executive Suite ($245k)."
}`;
      } else {
        responseText = 
`🔥 EXCLUSIVE LISTING IN PIANTINI 🔥
Discover luxury living in Santo Domingo's most prestigious sector. This stunning 2-bedroom executive apartment offers contemporary design, spacious layouts, and top-tier amenities.
✨ Price: USD $245,000
🛏️ 2 Bedrooms | 🚿 2.5 Baths
🏊 Rooftop pool access & Gym
📩 DM to schedule a private tour! #DominicanRealEstate #PiantiniLux`;
      }
      setSandboxResponse(responseText);
      setIsSandboxRunning(false);
      onAddAuditLog('AI', `Simulated GPT-4o sandbox query: "${sandboxInput}"`);
    }, 1500);
  };

  const handleRollbackPrompt = (ver) => {
    if (window.confirm(`Are you sure you want to rollback to system prompt version ${ver.version}?`)) {
      if (activePromptTab === 'search') {
        setSearchPrompt(
`You are a Dominican Republic real estate AI search advisor. Helping users find listings in Santo Domingo, Santiago and Las Terrenas. Original version: ${ver.version}`
        );
      }
      onAddAuditLog('AI', `Rolled back active system prompt to ${ver.version}`);
      alert(`System prompt restored to ${ver.version}`);
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div>
        <h2>AI Engine & Prompt Configuration</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Tuner model hyperparameters, modify LLM instructions, assign realtor tokens quotas, and test prompt schemas in the sandbox.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.5rem' }} className="grid-cols-2">
        {/* Left Column: API & Hyperparameters / Prompt Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Hyperparameters Card */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} className="text-primary" />
              GPT-4o Model Hyperparameters
            </h3>

            <div className="form-group">
              <label className="form-label">OpenAI Secure API Key</label>
              <input
                type="password"
                className="form-control"
                value={openAiKey}
                onChange={(e) => setOpenAiKey(e.target.value)}
                placeholder="sk-proj-••••••••••••••••"
              />
            </div>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Base LLM Engine</label>
                <select className="form-control form-select" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                  <option value="gpt-4o">gpt-4o (Active Production)</option>
                  <option value="gpt-4o-mini">gpt-4o-mini (Cost Efficient)</option>
                  <option value="o1-mini">o1-mini (Complex Logic)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Max Token Limit</label>
                <input
                  type="number"
                  className="form-control"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="flex-between">
                <label className="form-label">Temperature: {temperature}</label>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {temperature <= 0.3 ? 'Deterministic (Strict)' : temperature >= 0.7 ? 'Creative (Copywriting)' : 'Balanced'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                style={{ width: '100%', accentColor: 'var(--primary)' }}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* Prompt Instruction Console */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileCode size={18} className="text-info" />
              Core System Prompts Manager
            </h3>

            {/* Prompt Tab Selection */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setActivePromptTab('search');
                  setSandboxInput('Find a 2 bedroom apartment in Piantini for under $250k USD');
                  setSandboxResponse('');
                }}
                style={{
                  background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600,
                  color: activePromptTab === 'search' ? 'var(--primary)' : 'var(--text-secondary)',
                  borderBottom: activePromptTab === 'search' ? '2px solid var(--primary)' : 'none', cursor: 'pointer'
                }}
              >
                Conversational Search System Prompt
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePromptTab('marketing');
                  setSandboxInput('Apartment in Bella Vista, 3 beds, USD $180,000, ocean view, rooftop terrace');
                  setSandboxResponse('');
                }}
                style={{
                  background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600,
                  color: activePromptTab === 'marketing' ? 'var(--primary)' : 'var(--text-secondary)',
                  borderBottom: activePromptTab === 'marketing' ? '2px solid var(--primary)' : 'none', cursor: 'pointer'
                }}
              >
                Marketing Copywriter System Prompt
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">System Role & Knowledge Base Context</label>
              <textarea
                className="form-control"
                rows="6"
                style={{ fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.5' }}
                value={activePromptTab === 'search' ? searchPrompt : marketingPrompt}
                onChange={(e) => activePromptTab === 'search' ? setSearchPrompt(e.target.value) : setMarketingPrompt(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={handleSaveConfig} style={{ gap: '0.35rem' }}>
                <Save size={12} />
                Save AI configuration
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Prompt Sandbox & Usage Tracker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Prompt Testing Sandbox */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'radial-gradient(circle at bottom right, rgba(99,102,241,0.06) 0%, var(--bg-surface) 100%)' }}>
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} className="text-warning animate-pulse" />
              AI Prompt Sandbox Tester
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '-0.5rem' }}>
              Test the active system prompt instructions in a simulated sandbox environment.
            </p>

            <div className="form-group">
              <label className="form-label">Input Query / Property Attributes</label>
              <input
                type="text"
                className="form-control"
                value={sandboxInput}
                onChange={(e) => setSandboxInput(e.target.value)}
              />
            </div>

            <button className="btn btn-secondary btn-sm" onClick={handleTestSandbox} disabled={isSandboxRunning} style={{ gap: '0.35rem' }}>
              <Play size={12} />
              {isSandboxRunning ? 'Processing simulation...' : 'Test Active Prompt'}
            </button>

            {/* Sandbox Response Output */}
            <div>
              <label className="form-label">Simulated GPT-4o Response</label>
              <div style={{
                background: '#040711',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                height: '150px',
                overflowY: 'auto',
                border: '1px solid var(--border-color)',
                color: activePromptTab === 'search' ? 'hsl(199, 89%, 75%)' : 'var(--text-primary)',
                whiteSpace: 'pre-wrap'
              }}>
                {sandboxResponse || (isSandboxRunning ? 'Streaming simulated tokens...' : 'Idle. Click test to run simulation.')}
              </div>
            </div>
          </div>

          {/* API Limits & Costs */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <DollarSign size={18} className="text-success" />
              AI Tokens Limit Setter
            </h3>

            <div className="grid-cols-2">
              <div className="form-group">
                <label className="form-label">Buyer AI Searches/Day</label>
                <input
                  type="number"
                  className="form-control"
                  value={buyerLimit}
                  onChange={(e) => setBuyerLimit(parseInt(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Realtor AI Copy/Day</label>
                <input
                  type="number"
                  className="form-control"
                  value={realtorLimit}
                  onChange={(e) => setRealtorLimit(parseInt(e.target.value))}
                />
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Estimated Monthly API Spend:</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--success)' }}>$480.00 DOP/USD</span>
            </div>
          </div>

        </div>
      </div>

      {/* Prompt Version Control History */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} />
          System Prompt Changelog & Rollbacks
        </h3>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Author</th>
                <th>Release Date</th>
                <th>Changelog Notes</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {promptVersions.map((ver, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{ver.version}</td>
                  <td>{ver.author}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{ver.date}</td>
                  <td>{ver.description}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleRollbackPrompt(ver)}>
                      Restore Version
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
