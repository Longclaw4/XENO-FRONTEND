import React, { useState } from 'react';
import axios from 'axios';
import { Brain, AlertTriangle, RefreshCw } from 'lucide-react';

interface QueueSettingsProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  triggerNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const QueueSettings: React.FC<QueueSettingsProps> = ({ apiKey, setApiKey, triggerNotification }) => {
  const [loading, setLoading] = useState<boolean>(false);

  const resetCRMDatabase = async () => {
    if (!window.confirm('Are you sure you want to reset and re-seed the CRM database? All campaigns will be cleared.')) return;
    setLoading(true);
    try {
      await axios.post('/api/seed');
      // Also reset Channel Service metrics
      await axios.post('http://localhost:3001/reset');
      triggerNotification('CRM database & Channel Service reset completed', 'success');
    } catch (error) {
      triggerNotification('Reset failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings & System Controls</h1>
          <p className="subtitle">Configure AI API credentials and seed database settings.</p>
        </div>
      </div>

      <div className="responsive-grid-two">
        {/* AI Settings */}
        <div className="glass-panel card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '8px', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={18} /> AI Copilot Settings
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Gemini API Key (Optional)</label>
            <input
              type="password"
              className="ai-textarea"
              style={{ height: '40px', padding: '0 12px' }}
              placeholder="Enter Gemini API key (e.g. AIzaSy...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', lineHeight: 1.4 }}>
              If left blank, Xeno uses its high-fidelity local regex-NLP parser. Enter a valid Google Gemini API Key to enable real LLM generation of segments, SQL queries, and personalized marketing copy.
            </span>
          </div>
        </div>

        {/* Database Control */}
        <div className="glass-panel card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '8px', color: 'hsl(var(--danger))', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} /> Database Controls
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.4 }}>
            Clicking below will wipe the current SQLite database (all tables, historical campaigns, events, and communications) and re-initialize it with the brand's default customer profile seed dataset.
          </p>
          
          <button
            className="btn btn-danger"
            disabled={loading}
            onClick={resetCRMDatabase}
            style={{ alignSelf: 'flex-start' }}
          >
            {loading ? (
              'Re-seeding database...'
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} />
                <span>Reset & Seed Database</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueueSettings;
