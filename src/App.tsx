import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import CampaignWizard from './components/CampaignWizard';
import CustomerList from './components/CustomerList';
import QueueSettings from './components/QueueSettings';
import TerminalLogs, { LogEntry } from './components/TerminalLogs';
import AIAssistant from './components/AIAssistant';
import RatingsDashboard from './components/RatingsDashboard';
import { Shield, Bot, Zap, CheckCircle, XCircle, Info } from 'lucide-react';

// Set Axios baseURL if VITE_API_URL environment variable is provided
if ((import.meta as any).env.VITE_API_URL) {
  axios.defaults.baseURL = (import.meta as any).env.VITE_API_URL;
}

// Configure Axios global brand interceptor
axios.interceptors.request.use((config) => {
  const brand = localStorage.getItem('xeno_current_brand') || 'starbucks';
  config.headers['X-Brand'] = brand.toLowerCase();
  return config;
});

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>(() => localStorage.getItem('xeno_current_tab') || 'dashboard');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('xeno_gemini_key') || '');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [liveStatsUpdate, setLiveStatsUpdate] = useState<any>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [devMode, setDevMode] = useState<boolean>(() => localStorage.getItem('xeno_dev_mode') === 'true');
  
  // Brand selection states (starts unselected if no local storage is present)
  const [currentBrand, setCurrentBrand] = useState<string>(() => localStorage.getItem('xeno_current_brand') || '');
  const [isBrandSelected, setIsBrandSelected] = useState<boolean>(() => !!localStorage.getItem('xeno_current_brand'));
  const [brandStats, setBrandStats] = useState<Record<string, { customers: number; orders: number }> | null>(null);
  const [showIntro, setShowIntro] = useState<boolean>(() => !localStorage.getItem('xeno_current_brand'));

  // Fetch statistics of all tenant brand databases
  useEffect(() => {
    if (!isBrandSelected) {
      axios.get('/api/brands/stats')
        .then(res => {
          setBrandStats(res.data);
        })
        .catch(err => {
          console.error('[App] Failed to fetch brand stats:', err);
        });
    }
  }, [isBrandSelected]);

  // Sync API Key to localStorage
  useEffect(() => {
    localStorage.setItem('xeno_gemini_key', apiKey);
  }, [apiKey]);

  // Sync Dev Mode to localStorage
  useEffect(() => {
    localStorage.setItem('xeno_dev_mode', String(devMode));
  }, [devMode]);

  // Sync currentTab to localStorage
  useEffect(() => {
    localStorage.setItem('xeno_current_tab', currentTab);
  }, [currentTab]);

  // Reset main panel scroll on tab change
  useEffect(() => {
    const mainEl = document.querySelector('.main-content');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, [currentTab]);

  const triggerNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Add items to live log console
  const addLog = (log: LogEntry) => {
    setLogs((prev) => {
      const updated = [log, ...prev];
      return updated.slice(0, 100); // keep last 100 entries
    });
  };

  // Connect to SSE stream (re-establishes connection and clears logs on brand change)
  useEffect(() => {
    if (!isBrandSelected || !currentBrand) return;

    console.log(`[SSE] Connecting to live metrics stream for brand: ${currentBrand}...`);
    setLogs([]); // clear logs for clean tenant switching
    const eventSource = new EventSource(`${(import.meta as any).env.VITE_API_URL || ''}/api/live-metrics?brand=${currentBrand.toLowerCase()}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'CONNECTED':
            console.log(`[SSE] Broadcast connection verified for brand: ${currentBrand}.`);
            break;
            
          case 'COMMUNICATION_SENT':
            addLog({
              timestamp: data.payload.timestamp,
              type: 'sent',
              message: `[${currentBrand}] CRM outbox routed message to ${data.payload.recipient} via ${data.payload.channel.toUpperCase()}`,
              communicationId: data.payload.communicationId,
              campaignId: data.payload.campaignId
            });
            break;

          case 'COMMUNICATION_FAILED':
            addLog({
              timestamp: new Date().toISOString(),
              type: 'failed',
              message: `[${currentBrand}] CRM route error: ${data.payload.error}`,
              communicationId: data.payload.communicationId,
              campaignId: data.payload.campaignId
            });
            triggerNotification(`Message delivery route failed: ${data.payload.error}`, 'error');
            break;

          case 'RECEIPT_PROCESSED':
            const { rawEvent, stats } = data.payload;
            
            let desc = '';
            const recipientLabel = rawEvent.metadata?.amount 
              ? `attributing order: ${rawEvent.metadata.order_id} ($${rawEvent.metadata.amount})`
              : `recipient callback status updated`;

            switch (rawEvent.status) {
              case 'DELIVERED': desc = `Simulated phone gateway confirmed message delivery`; break;
              case 'READ': desc = `Shopper opened and read communication`; break;
              case 'CLICKED': desc = `Shopper clicked short-link URL in message`; break;
              case 'CONVERTED': desc = `Shopper completed conversion checkout: ${recipientLabel}`; break;
              case 'FAILED': desc = `Carrier reporting delivery failed: ${rawEvent.metadata?.error || 'telecom link loss'}`; break;
            }

            addLog({
              timestamp: rawEvent.timestamp,
              type: rawEvent.status.toLowerCase(),
              message: `[${currentBrand}] ${desc}`,
              communicationId: rawEvent.communicationId,
              campaignId: rawEvent.campaignId,
              status: rawEvent.status
            });

            if (rawEvent.status === 'CONVERTED') {
              triggerNotification(`[${currentBrand}] Sale attributed! Customer completed purchase of ₹${rawEvent.metadata.amount}`, 'success');
            }

            setLiveStatsUpdate({ rawEvent, stats });
            break;

          case 'DATABASE_RESET':
            setLogs([]);
            setLiveStatsUpdate({ reset: true });
            triggerNotification(`[${currentBrand}] CRM database wiped and re-seeded successfully.`, 'info');
            break;
        }
      } catch (err) {
        console.error('[SSE] Error processing stream frame:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Stream link lost. Attempting automatic reconnection...', err);
    };

    return () => {
      console.log('[SSE] Closing connection.');
      eventSource.close();
    };
  }, [currentBrand, isBrandSelected]);

  const handleSelectBrand = (brand: string) => {
    localStorage.setItem('xeno_current_brand', brand);
    setCurrentBrand(brand);
    setIsBrandSelected(true);
  };

  const handleSwitchBrand = () => {
    localStorage.removeItem('xeno_current_brand');
    setCurrentBrand('');
    setIsBrandSelected(false);
    setShowIntro(false);
  };

  // Render the Brand Selection Landing Portal or Intro page if no brand has been selected
  if (!isBrandSelected || !currentBrand) {
    if (showIntro) {
      return (
        <div className="intro-container">
          <div className="mesh-bg"></div>
          <div className="intro-badge">✦ ENTERPRISE CAMPAIGN PORTAL</div>
          <h1 className="intro-title">Xeno</h1>
          <p className="intro-subtitle">
            Next-generation AI-native marketing platform. Segment shopper audiences, compose automated message flows, and monitor conversion metrics with isolated tenant environments.
          </p>
          
          <button className="intro-btn" onClick={() => setShowIntro(false)}>
            Dive In
          </button>

          <div className="intro-features">
            <div className="intro-feature-card">
              <div className="intro-feature-icon"><Shield size={24} style={{ color: 'hsl(var(--primary))' }} /></div>
              <h3>Multi-Tenant Isolation</h3>
              <p>Every retail tenant operates on an isolated SQLite database node, ensuring absolute data privacy.</p>
            </div>
            <div className="intro-feature-card">
              <div className="intro-feature-icon"><Bot size={24} style={{ color: 'hsl(var(--secondary))' }} /></div>
              <h3>AI-Powered Copilot</h3>
              <p>Execute complex customer segmentation using plain natural language to auto-generate standard SQL rules.</p>
            </div>
            <div className="intro-feature-card">
              <div className="intro-feature-icon"><Zap size={24} style={{ color: '#eab308' }} /></div>
              <h3>Real-Time Dispatch</h3>
              <p>Simulated SMS and Email delivery pathways with instant conversion feedback and campaign loop tracking.</p>
            </div>
          </div>
        </div>
      );
    }

    const brands = [
      { name: 'Starbucks', industry: 'Coffee & Beverages' },
      { name: 'Zara', industry: 'Fashion & Apparel' },
      { name: 'Sephora', industry: 'Beauty & Cosmetics' },
      { name: 'Nike', industry: 'Sports & Footwear' },
      { name: 'Apple', industry: 'Electronics & Tech' },
      { name: 'Tesla', industry: 'Automotive & Lifestyle' },
      { name: 'IKEA', industry: 'Furniture & Home Goods' },
      { name: 'Amazon', industry: 'Retail & E-commerce' }
    ];

    return (
      <div className="brand-portal-container">
        <div className="mesh-bg"></div>
        <div className="enterprise-badge">
          <span>✦</span> Xeno Multi-Tenant Portal
        </div>
        <h1 className="brand-portal-title">Select a Brand Tenant</h1>
        <p className="brand-portal-subtitle">
          Choose one of the active retail brand databases to manage customer profiles, launch marketing campaigns, and query metrics.
        </p>
        <div className="brand-grid-layout">
          {brands.map((b) => {
            const brandKey = b.name.toLowerCase();
            const stats = brandStats?.[brandKey] || { customers: 30, orders: 80 };
            return (
              <div
                key={b.name}
                className={`brand-select-card card-${brandKey}`}
                onClick={() => handleSelectBrand(b.name)}
              >
                <div className="brand-card-status">
                  <div className="brand-card-status-dot"></div>
                  <span>LIVE DB</span>
                </div>
                <div className="brand-card-name">{b.name}</div>
                <div className="brand-card-industry">{b.industry}</div>
                <div className="brand-card-stats">
                  <div className="brand-stat-item">
                    <span className="brand-stat-val">{stats.customers}</span>
                    <span className="brand-stat-lbl">Shoppers</span>
                  </div>
                  <div className="brand-stat-item">
                    <span className="brand-stat-val">{stats.orders}</span>
                    <span className="brand-stat-lbl">Orders</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="mesh-bg"></div>
      {/* 1. Left Navigation Menu */}
      <Navigation 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        devMode={devMode} 
        setDevMode={setDevMode} 
        currentBrand={currentBrand}
        onSwitchBrand={handleSwitchBrand}
      />

      {/* 2. Main Work Panel */}
      <main className="main-content">
        {/* Floating Notification Toast */}
        {notification && (
          <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            padding: '12px 24px',
            background: notification.type === 'success' ? 'rgba(34, 197, 94, 0.95)' : notification.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(138, 43, 226, 0.95)',
            color: 'white',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 9999,
            fontWeight: 600,
            fontSize: '0.9rem',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {notification.type === 'success' && <CheckCircle size={16} />}
              {notification.type === 'error' && <XCircle size={16} />}
              {notification.type === 'info' && <Info size={16} />}
            </span>
            {notification.message}
          </div>
        )}

        <div style={{ flex: 1, marginBottom: '24px' }}>
          {currentTab === 'dashboard' && (
            <Dashboard 
              key={currentBrand}
              apiKey={apiKey} 
              liveStatsUpdate={liveStatsUpdate} 
              triggerNotification={triggerNotification} 
            />
          )}
          {currentTab === 'campaigns' && (
            <CampaignWizard 
              key={currentBrand}
              apiKey={apiKey} 
              triggerNotification={triggerNotification}
              onCampaignLaunched={() => setCurrentTab('dashboard')} 
            />
          )}
          {currentTab === 'shoppers' && <CustomerList key={currentBrand} />}
          {currentTab === 'assistant' && <AIAssistant key={currentBrand} apiKey={apiKey} />}
          {currentTab === 'ratings' && <RatingsDashboard key={currentBrand} apiKey={apiKey} />}
          {currentTab === 'settings' && (
            <QueueSettings 
              key={currentBrand}
              apiKey={apiKey} 
              setApiKey={setApiKey} 
              triggerNotification={triggerNotification} 
            />
          )}
        </div>

        {/* 3. Live-feed Terminal Logs Console */}
        {currentTab !== 'assistant' && currentTab !== 'ratings' && <TerminalLogs logs={logs} devMode={devMode} />}
      </main>
    </div>
  );
};

export default App;
