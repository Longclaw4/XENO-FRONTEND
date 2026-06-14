import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, Eye, Link2, IndianRupee, Users, CheckCircle, BarChart2, Package, Smartphone, Scale, Trophy, Settings, Sparkles, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

interface CampaignStats {
  sent: number;
  delivered: number;
  failed: number;
  read: number;
  clicked: number;
  converted: number;
  revenue: number;
  variantStats: {
    A: { sent: number; read: number; clicked: number; converted: number; revenue: number };
    B: { sent: number; read: number; clicked: number; converted: number; revenue: number };
  };
}

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  created_at: string;
  message_template: any;
  segment_rules: any;
  stats: CampaignStats;
}

interface DashboardProps {
  apiKey: string;
  liveStatsUpdate: any; // Event pushed from App.tsx SSE handler
  triggerNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ apiKey, liveStatsUpdate, triggerNotification }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  
  // AI Insights state
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [fetchingInsights, setFetchingInsights] = useState<boolean>(false);

  // Retry sending a failed message
  const handleRetryMessage = async (commId: string) => {
    try {
      const response = await axios.post(`/api/communications/${commId}/retry`);
      if (response.data.success) {
        triggerNotification('Retry requested! Message re-routed to gateway.', 'success');
        if (selectedCampaignId) {
          fetchCampaignDetails(selectedCampaignId);
        }
      }
    } catch (error: any) {
      triggerNotification(`Retry request failed: ${error.message}`, 'error');
    }
  };

  // Fetch all campaigns
  const fetchCampaigns = async () => {
    try {
      const response = await axios.get('/api/campaigns');
      setCampaigns(response.data);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch details of selected campaign
  const fetchCampaignDetails = async (id: string) => {
    try {
      const response = await axios.get(`/api/campaigns/${id}`);
      setSelectedCampaign(response.data);
      setAiInsights([]); // Reset insights for new campaign selection
    } catch (error) {
      console.error('Failed to fetch campaign details:', error);
      setSelectedCampaign(null);
      setSelectedCampaignId(null);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Fetch campaign details on ID change
  useEffect(() => {
    if (selectedCampaignId) {
      fetchCampaignDetails(selectedCampaignId);
    } else {
      setSelectedCampaign(null);
    }
  }, [selectedCampaignId]);

  // Handle SSE live update
  useEffect(() => {
    if (!liveStatsUpdate) return;
    
    if (liveStatsUpdate.reset) {
      setCampaigns([]);
      setSelectedCampaign(null);
      setSelectedCampaignId(null);
      return;
    }
    
    const { rawEvent, stats } = liveStatsUpdate;
    if (!rawEvent) return;

    // 1. Update the campaign in the main list
    setCampaigns(prevCampaigns => 
      prevCampaigns.map(c => 
        c.id === rawEvent.campaignId ? { ...c, stats } : c
      )
    );

    // 2. Update details if currently viewing this campaign
    if (selectedCampaign && selectedCampaign.id === rawEvent.campaignId) {
      setSelectedCampaign((prev: any) => {
        // Increment specific recipient in list if matched
        const updatedComms = prev.communications.map((comm: any) => {
          if (comm.id === rawEvent.communicationId) {
            return { 
              ...comm, 
              status: rawEvent.status, 
              updated_at: rawEvent.timestamp 
            };
          }
          return comm;
        });

        return {
          ...prev,
          stats,
          communications: updatedComms
        };
      });
    }
  }, [liveStatsUpdate]);

  // Fetch AI Insights for a campaign
  const fetchAIInsights = async () => {
    if (!selectedCampaign) return;
    setFetchingInsights(true);
    try {
      const response = await axios.post(`/api/campaigns/${selectedCampaign.id}/insights`, {
        apiKey: apiKey || null
      });
      setAiInsights(response.data.insights || []);
      triggerNotification('AI campaign performance recommendations retrieved!', 'success');
    } catch (error) {
      triggerNotification('Failed to generate AI insights', 'error');
    } finally {
      setFetchingInsights(false);
    }
  };

  // Calculate Rollup Metrics across all campaigns for main dashboard
  const totalSent = campaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);
  const totalRead = campaigns.reduce((acc, c) => acc + (c.stats?.read || 0), 0);
  const totalClicked = campaigns.reduce((acc, c) => acc + (c.stats?.clicked || 0), 0);
  const totalConverted = campaigns.reduce((acc, c) => acc + (c.stats?.converted || 0), 0);
  const totalRevenue = campaigns.reduce((acc, c) => acc + (c.stats?.revenue || 0), 0);

  const avgReadRate = totalSent > 0 ? ((totalRead / totalSent) * 100).toFixed(1) : '0.0';
  const avgClickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0.0';
  const avgConvertRate = totalClicked > 0 ? ((totalConverted / totalClicked) * 100).toFixed(1) : '0.0';

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-secondary))' }}>Gathering campaign metrics...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. Main View (Overview Metrics) */}
      {!selectedCampaign ? (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Analytics Dashboard</h1>
              <p className="subtitle">Track audience reach, messaging deliverability, and conversion sales pipelines.</p>
            </div>
          </div>

          {/* Rollup Cards */}
          <div className="dashboard-grid">
            <div className="glass-panel card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-label">Messages Dispatched</div>
                <Send size={20} style={{ color: 'hsl(var(--primary))' }} />
              </div>
              <div className="card-value">{totalSent}</div>
              <div className="card-trend trend-up" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Send size={12} />
                <span>live outbox queue</span>
              </div>
            </div>
            
            <div className="glass-panel card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-label">Avg Read Rate</div>
                <Eye size={20} style={{ color: 'hsl(var(--secondary))' }} />
              </div>
              <div className="card-value">{avgReadRate}%</div>
              <div className="card-trend trend-up" style={{ color: 'hsl(var(--secondary))', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={12} />
                <span>engaged shoppers</span>
              </div>
            </div>

            <div className="glass-panel card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-label">Link Click CTR</div>
                <Link2 size={20} style={{ color: '#f472b6' }} />
              </div>
              <div className="card-value">{avgClickRate}%</div>
              <div className="card-trend trend-up" style={{ color: '#f472b6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={12} />
                <span>conversion: {avgConvertRate}%</span>
              </div>
            </div>

            <div className="glass-panel card" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, transparent 100%)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-label" style={{ color: '#4ade80' }}>Attributed Revenue</div>
                <IndianRupee size={20} style={{ color: '#4ade80' }} />
              </div>
              <div className="card-value" style={{ color: '#4ade80', background: 'none', WebkitTextFillColor: 'initial' }}>
                ₹{totalRevenue.toFixed(2)}
              </div>
              <div className="card-trend trend-up" style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <IndianRupee size={12} />
                <span>{totalConverted} order checkouts</span>
              </div>
            </div>
          </div>

          {/* Campaigns List */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Campaign Performance Records</h3>
            {campaigns.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-secondary))' }}>
                No campaigns found. Go to "Create Campaign" tab to deploy your first campaign.
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Campaign Name</th>
                      <th>Channel</th>
                      <th>Sent</th>
                      <th>Delivered</th>
                      <th>Read Rate</th>
                      <th>Clicked</th>
                      <th>Revenue</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => {
                      const readPct = c.stats.sent > 0 ? ((c.stats.read / c.stats.sent) * 100).toFixed(0) : '0';
                      return (
                        <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedCampaignId(c.id)}>
                          <td style={{ fontWeight: 600, color: 'hsl(var(--primary-hover))' }}>{c.name}</td>
                          <td>
                            <span className={`badge badge-${c.channel}`}>{c.channel.toUpperCase()}</span>
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{c.stats.sent}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{c.stats.delivered}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{readPct}% ({c.stats.read})</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{c.stats.clicked}</td>
                          <td style={{ fontWeight: 600, color: '#4ade80', fontFamily: 'var(--font-mono)' }}>
                    ₹{c.stats.revenue.toFixed(2)}
                  </td>
                          <td>
                            <span className={`badge ${c.status === 'ACTIVE' ? 'badge-active' : 'badge-completed'}`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* 2. Detailed Campaign View */
        <>
          <div className="page-header">
            <div>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setSelectedCampaignId(null)}>
                <ArrowLeft size={12} />
                <span>Back to Overview</span>
              </button>
              <h1 className="page-title">{selectedCampaign.name}</h1>
              <p className="subtitle">ID: {selectedCampaign.id} • Launched: {new Date(selectedCampaign.created_at).toLocaleDateString()}</p>
            </div>
            <span className={`badge badge-${selectedCampaign.channel}`} style={{ fontSize: '0.9rem', padding: '6px 16px' }}>
              {selectedCampaign.channel.toUpperCase()}
            </span>
          </div>

          <div className="responsive-grid-funnel">
            {/* Real-time Funnel & Variant Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
              
              {/* Funnel Progress Bars */}
              <div className="glass-panel card">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart2 size={18} style={{ color: 'hsl(var(--primary))' }} /> Live Campaign Conversion Funnel
                </h3>
                
                {/* SVG Node Flow Chart */}
                <div className="flow-container" style={{ margin: '20px 0' }}>
                  <svg className="svg-flow-map" viewBox="0 0 500 80" preserveAspectRatio="none" style={{ width: '100%', height: '80px', position: 'absolute', top: '16px', left: 0 }}>
                    <defs>
                      <filter id="glow-primary" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <filter id="glow-success" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <path d="M 60,40 L 140,40" className={selectedCampaign.stats.sent > 0 ? "flow-path-animated" : "flow-path-inactive"} strokeWidth="2" fill="none" />
                    <path d="M 160,40 L 240,40" className={selectedCampaign.stats.delivered > 0 ? "flow-path-animated" : "flow-path-inactive"} strokeWidth="2" fill="none" />
                    <path d="M 260,40 L 340,40" className={selectedCampaign.stats.read > 0 ? "flow-path-animated" : "flow-path-inactive"} strokeWidth="2" fill="none" />
                    <path d="M 360,40 L 440,40" className={selectedCampaign.stats.clicked > 0 ? "flow-path-animated" : "flow-path-inactive"} strokeWidth="2" fill="none" />
                  </svg>
                  
                  {/* Node 1: Queue */}
                  <div className="flow-node-wrapper">
                    <div key={selectedCampaign.stats.sent} className="flow-circle active node-pop">
                      <span className="flow-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Package size={14} /></span>
                      <span className="flow-count">{selectedCampaign.stats.sent}</span>
                    </div>
                    <span className="flow-label">Queued</span>
                  </div>

                  {/* Node 2: Delivered */}
                  <div className="flow-node-wrapper">
                    <div key={selectedCampaign.stats.delivered} className={`flow-circle ${selectedCampaign.stats.delivered > 0 ? 'active' : ''} node-pop`}>
                      <span className="flow-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Smartphone size={14} /></span>
                      <span className="flow-count">{selectedCampaign.stats.delivered}</span>
                    </div>
                    <span className="flow-label">Delivered</span>
                    <span className="flow-pct">{selectedCampaign.stats.sent > 0 ? ((selectedCampaign.stats.delivered / selectedCampaign.stats.sent) * 100).toFixed(0) : 0}%</span>
                  </div>

                  {/* Node 3: Read */}
                  <div className="flow-node-wrapper">
                    <div key={selectedCampaign.stats.read} className={`flow-circle ${selectedCampaign.stats.read > 0 ? 'active' : ''} node-pop`}>
                      <span className="flow-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye size={14} /></span>
                      <span className="flow-count">{selectedCampaign.stats.read}</span>
                    </div>
                    <span className="flow-label">Opened</span>
                    <span className="flow-pct">{selectedCampaign.stats.sent > 0 ? ((selectedCampaign.stats.read / selectedCampaign.stats.sent) * 100).toFixed(0) : 0}%</span>
                  </div>

                  {/* Node 4: Clicked */}
                  <div className="flow-node-wrapper">
                    <div key={selectedCampaign.stats.clicked} className={`flow-circle ${selectedCampaign.stats.clicked > 0 ? 'active' : ''} node-pop`}>
                      <span className="flow-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Link2 size={14} /></span>
                      <span className="flow-count">{selectedCampaign.stats.clicked}</span>
                    </div>
                    <span className="flow-label">Clicked</span>
                    <span className="flow-pct">{selectedCampaign.stats.sent > 0 ? ((selectedCampaign.stats.clicked / selectedCampaign.stats.sent) * 100).toFixed(0) : 0}%</span>
                  </div>

                  {/* Node 5: Converted */}
                  <div className="flow-node-wrapper">
                    <div key={selectedCampaign.stats.converted} className={`flow-circle ${selectedCampaign.stats.converted > 0 ? 'converted-active' : ''} node-pop`}>
                      <span className="flow-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IndianRupee size={14} /></span>
                      <span className="flow-count">{selectedCampaign.stats.converted}</span>
                    </div>
                    <span className="flow-label">Converted</span>
                    <span className="flow-pct">{selectedCampaign.stats.clicked > 0 ? ((selectedCampaign.stats.converted / selectedCampaign.stats.clicked) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>

                <div className="funnel-container" style={{ marginTop: '24px', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '16px' }}>
                  {/* Sent */}
                  <div className="funnel-stage">
                    <span className="funnel-stage-label">Messages Sent</span>
                    <div className="funnel-bar-bg">
                      <div className={`funnel-bar-fill ${selectedCampaign.channel}-fill`} style={{ width: '100%' }}></div>
                    </div>
                    <span className="funnel-stage-val">{selectedCampaign.stats.sent}</span>
                  </div>
                  
                  {/* Delivered */}
                  <div className="funnel-stage">
                    <span className="funnel-stage-label">Delivered</span>
                    <div className="funnel-bar-bg">
                      <div 
                        className={`funnel-bar-fill ${selectedCampaign.channel}-fill`} 
                        style={{ width: `${selectedCampaign.stats.sent > 0 ? (selectedCampaign.stats.delivered / selectedCampaign.stats.sent) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="funnel-stage-val">
                      {selectedCampaign.stats.delivered} ({selectedCampaign.stats.sent > 0 ? ((selectedCampaign.stats.delivered / selectedCampaign.stats.sent) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>

                  {/* Read */}
                  <div className="funnel-stage">
                    <span className="funnel-stage-label">Read / Opened</span>
                    <div className="funnel-bar-bg">
                      <div 
                        className={`funnel-bar-fill ${selectedCampaign.channel}-fill`} 
                        style={{ width: `${selectedCampaign.stats.sent > 0 ? (selectedCampaign.stats.read / selectedCampaign.stats.sent) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="funnel-stage-val">
                      {selectedCampaign.stats.read} ({selectedCampaign.stats.sent > 0 ? ((selectedCampaign.stats.read / selectedCampaign.stats.sent) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>

                  {/* Clicked */}
                  <div className="funnel-stage">
                    <span className="funnel-stage-label">Clicks</span>
                    <div className="funnel-bar-bg">
                      <div 
                        className={`funnel-bar-fill ${selectedCampaign.channel}-fill`} 
                        style={{ width: `${selectedCampaign.stats.sent > 0 ? (selectedCampaign.stats.clicked / selectedCampaign.stats.sent) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="funnel-stage-val">
                      {selectedCampaign.stats.clicked} ({selectedCampaign.stats.sent > 0 ? ((selectedCampaign.stats.clicked / selectedCampaign.stats.sent) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>

                  {/* Converted */}
                  <div className="funnel-stage">
                    <span className="funnel-stage-label">Conversions</span>
                    <div className="funnel-bar-bg">
                      <div 
                        className={`funnel-bar-fill ${selectedCampaign.channel}-fill`} 
                        style={{ width: `${selectedCampaign.stats.sent > 0 ? (selectedCampaign.stats.converted / selectedCampaign.stats.sent) * 100 : 0}%` }}
                      ></div>
                    </div>
                    <span className="funnel-stage-val" style={{ color: 'hsl(var(--success))' }}>
                      {selectedCampaign.stats.converted} ({selectedCampaign.stats.sent > 0 ? ((selectedCampaign.stats.converted / selectedCampaign.stats.sent) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* A/B Test Results */}
              <div className="glass-panel card">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scale size={18} style={{ color: 'hsl(var(--secondary))' }} /> A/B Split Test Analysis
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginBottom: '16px' }}>
                  Audience split 50/50 between message variants.
                </p>

                {(() => {
                  const varA = selectedCampaign.stats?.variantStats?.A || { sent: 0, clicked: 0, converted: 0, revenue: 0 };
                  const varB = selectedCampaign.stats?.variantStats?.B || { sent: 0, clicked: 0, converted: 0, revenue: 0 };
                  const ctrA = varA.sent > 0 ? (varA.clicked / varA.sent) : 0;
                  const ctrB = varB.sent > 0 ? (varB.clicked / varB.sent) : 0;
                  const isWinnerA = ctrA > ctrB;
                  const diff = Math.abs(ctrA - ctrB) * 100;

                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {/* Variant A Card */}
                        <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-color))' }}>
                          <div style={{ fontWeight: 600, color: 'hsl(var(--primary))', marginBottom: '8px' }}>Variant A</div>
                          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', height: '48px', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '12px' }}>
                            "{selectedCampaign.message_template?.A}"
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sent:</span> <strong>{varA.sent}</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Clicks:</span> <strong>{varA.clicked}</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Conversions:</span> <strong>{varA.converted}</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80' }}><span>Revenue:</span> <strong>₹{varA.revenue.toFixed(2)}</strong></div>
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginBottom: '2px' }}>
                                <span>Click CTR:</span>
                                <strong>{(ctrA * 100).toFixed(1)}%</strong>
                              </div>
                              <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${ctrA * 100}%`, background: 'hsl(var(--primary))' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Variant B Card */}
                        <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-color))' }}>
                          <div style={{ fontWeight: 600, color: 'hsl(var(--secondary))', marginBottom: '8px' }}>Variant B</div>
                          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', height: '48px', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '12px' }}>
                            "{selectedCampaign.message_template?.B}"
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sent:</span> <strong>{varB.sent}</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Clicks:</span> <strong>{varB.clicked}</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Conversions:</span> <strong>{varB.converted}</strong></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4ade80' }}><span>Revenue:</span> <strong>₹{varB.revenue.toFixed(2)}</strong></div>
                            <div style={{ marginTop: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginBottom: '2px' }}>
                                <span>Click CTR:</span>
                                <strong>{(ctrB * 100).toFixed(1)}%</strong>
                              </div>
                              <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${ctrB * 100}%`, background: 'hsl(var(--secondary))' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Winner Badge */}
                      {selectedCampaign.stats.sent > 0 && (
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                          <div className="badge" style={{ padding: '6px 16px', background: 'rgba(138,43,226,0.15)', color: 'hsl(var(--primary-hover))', border: '1px solid rgba(138,43,226,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trophy size={14} />
                            <strong>
                              {diff === 0 
                                ? 'A/B Test is currently tied' 
                                : `Variant ${isWinnerA ? 'A' : 'B'} is winning by ${diff.toFixed(1)}% in engagement!`}
                            </strong>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

            </div>

            {/* Campaign Rules & AI Insights */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
              
              {/* Campaign Configurations */}
              <div className="glass-panel card">
                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={18} /> Target Logic</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>SQL Condition:</span>
                    <pre style={{ margin: '6px 0', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid hsl(var(--border-color))', borderRadius: '4px', overflowX: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {selectedCampaign.segment_rules?.sqlQuery}
                    </pre>
                  </div>
                </div>
              </div>

              {/* AI Campaign Performance Optimizer */}
              <div className="glass-panel card ai-advice-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} style={{ color: 'hsl(var(--primary-hover))' }} /> AI Optimization Advice
                  </h3>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                    onClick={fetchAIInsights}
                    disabled={fetchingInsights}
                  >
                    {fetchingInsights ? 'Analyzing...' : 'Generate Insights'}
                  </button>
                </div>

                {aiInsights.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textAlign: 'center', padding: '20px 0' }}>
                    Click "Generate Insights" to let AI analyze customer behavior, delivery channels, and variant trends.
                  </p>
                ) : (
                  <ul style={{ paddingLeft: '16px', fontSize: '0.85rem', color: 'white', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {aiInsights.map((insight, idx) => (
                      <li key={idx} style={{ lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></li>
                    ))}
                  </ul>
                )}
              </div>

            </div>
          </div>

          {/* Recipient Deliveries Logs Table */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Campaign Outbox Logs</h3>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Shopper</th>
                    <th>Destination</th>
                    <th>Variant</th>
                    <th>Message Snippet</th>
                    <th>Delivery Status</th>
                    <th>Last Event Time</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCampaign.communications?.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.customer_name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {selectedCampaign.channel === 'email' ? c.email : c.phone}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${c.variant === 'A' ? 'badge-whatsapp' : 'badge-rcs'}`}>
                          Var {c.variant}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', maxWidth: '300px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.message_body}
                        </div>
                        {c.status === 'FAILED' && (
                          <div style={{ fontSize: '0.72rem', color: 'hsl(var(--danger))', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(239, 68, 68, 0.05)', padding: '6px 10px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.15)', whiteSpace: 'normal' }}>
                            <div>
                              <strong>
                                <AlertTriangle size={12} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                                Failure Details:
                              </strong> {c.failure_reason || 'telecom link loss'}
                            </div>
                            <div style={{ color: 'hsl(var(--text-muted))', lineHeight: 1.25, marginTop: '2px' }}>
                              {c.failure_reason?.includes('offline') 
                                ? 'The simulated channel gateway on Port 3001 is offline or unreachable.' 
                                : 'Simulated telecom carrier link dropped the packet. Click the Retry button to try again.'}
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span 
                            className={`badge badge-${c.status.toLowerCase()}`}
                            style={c.status === 'FAILED' ? { cursor: 'help', display: 'inline-flex', gap: '4px', alignItems: 'center' } : {}}
                            title={c.status === 'FAILED' ? "Hover to read error explanation" : ""}
                          >
                            {c.status === 'FAILED' && <AlertTriangle size={12} style={{ marginRight: '4px' }} />}
                            {c.status}
                          </span>
                          {c.status === 'FAILED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetryMessage(c.id);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', color: 'hsl(var(--danger))' }}
                              title="Resend this message immediately"
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <RefreshCw size={10} />
                                <span>Retry</span>
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                        {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
