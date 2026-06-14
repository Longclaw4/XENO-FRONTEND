import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Sliders, Brain, Wand2, Edit3, Target, Search, Eye, Rocket } from 'lucide-react';

interface CampaignWizardProps {
  apiKey: string;
  triggerNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
  onCampaignLaunched: () => void;
}

const CampaignWizard: React.FC<CampaignWizardProps> = ({ apiKey, triggerNotification, onCampaignLaunched }) => {
  const [creationMode, setCreationMode] = useState<'ai' | 'visual'>('ai');
  
  // Visual Rule Builder state
  const brand = localStorage.getItem('xeno_current_brand') || 'Starbucks';

  const getBrandPlaceholder = (brandName: string) => {
    switch (brandName.toLowerCase()) {
      case 'starbucks':
        return "e.g., Target coffee lovers who spent over ₹4000. Draft a WhatsApp campaign offering them a 15% discount for a coffee refill...";
      case 'zara':
        return "e.g., Target shoppers who bought jackets and spent over ₹6000. Draft a WhatsApp campaign offering them a 20% discount on winter apparel...";
      case 'sephora':
        return "e.g., Target beauty shoppers who spent over ₹5000. Draft a WhatsApp campaign offering them a free lip-balm on purchasing skincare...";
      case 'nike':
        return "e.g., Target runners who spent over ₹8000. Draft a WhatsApp campaign offering them 15% off on the Pegasus shoe series...";
      case 'apple':
        return "e.g., Target tech enthusiasts who bought an iPhone. Draft a WhatsApp campaign offering them 10% off on AirPods accessories...";
      case 'tesla':
        return "e.g., Target owners who bought charging equipment and spent over ₹10000. Draft a WhatsApp campaign offering them free supercharger credits...";
      case 'ikea':
        return "e.g., Target home decorators who spent over ₹12000. Draft a WhatsApp campaign offering them 15% off on the MALM bed frame series...";
      case 'amazon':
        return "e.g., Target active shopper segment who spent over ₹3000. Draft a WhatsApp campaign offering them free express delivery on electronics...";
      default:
        return "e.g., Target shoppers who spent over ₹4000. Draft a WhatsApp campaign offering them a 15% discount on their next order...";
    }
  };
  const [filterCategory, setFilterCategory] = useState<string>('Any');
  const [filterChannel, setFilterChannel] = useState<string>('Any');
  const [filterSpend, setFilterSpend] = useState<string>('Any');
  const [filterOrders, setFilterOrders] = useState<string>('Any');

  // Dynamic brand categories fetched from DB
  const [brandCategories, setBrandCategories] = useState<{ name: string; customerCount: number; orderCount: number; totalRevenue: number }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);

  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [parsing, setParsing] = useState<boolean>(false);
  
  // Campaign setup state (loaded from AI, user editable)
  const [campaignName, setCampaignName] = useState<string>('');
  const [channel, setChannel] = useState<string>('whatsapp');
  const [sqlQuery, setSqlQuery] = useState<string>('');
  const [queryParams, setQueryParams] = useState<any[]>([]);
  const [messageVariantA, setMessageVariantA] = useState<string>('');
  const [messageVariantB, setMessageVariantB] = useState<string>('');
  
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [sampleShoppers, setSampleShoppers] = useState<any[]>([]);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [launching, setLaunching] = useState<boolean>(false);

  // Fetch real brand categories from DB on mount
  useEffect(() => {
    setLoadingCategories(true);
    axios.get('/api/segments/categories')
      .then(res => {
        setBrandCategories(res.data.categories || []);
        setFilterCategory('Any'); // reset on brand switch
      })
      .catch(err => console.error('[CampaignWizard] Failed to fetch categories:', err.message))
      .finally(() => setLoadingCategories(false));
  }, []);

  // Compile Visual Rule Builder queries dynamically
  // Filters by actual customer favorite_category AND verifies they have orders in that category
  const compileVisualQuery = (category: string, channelPref: string, spend: string, orders: string) => {
    let whereClauses = ['1=1'];
    let havingClauses = ['1=1'];
    let params: any[] = [];

    if (category !== 'Any') {
      // Match customers whose favorite category IS this brand's category
      // AND who have at least one completed order (validating real purchase behaviour)
      whereClauses.push("json_extract(c.metadata, '$.favorite_category') = ?");
      params.push(category);
    }
    if (channelPref !== 'Any') {
      whereClauses.push("json_extract(c.metadata, '$.preferred_channel') = ?");
      params.push(channelPref.toLowerCase());
    }

    if (spend !== 'Any') {
      let minSpend = 0;
      if (spend === '>4000') minSpend = 4000;
      else if (spend === '>8000') minSpend = 8000;
      else if (spend === '>16000') minSpend = 16000;
      havingClauses.push("total_spent > ?");
      params.push(minSpend);
    }

    if (orders !== 'Any') {
      let minOrders = 0;
      if (orders === '>=1') minOrders = 1;
      else if (orders === '>=3') minOrders = 3;
      else if (orders === '>=5') minOrders = 5;
      havingClauses.push("total_orders >= ?");
      params.push(minOrders);
    }

    const generatedQuery = `SELECT c.*, COUNT(o.id) as total_orders, COALESCE(SUM(o.amount), 0) as total_spent
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id AND o.status = 'COMPLETED'
WHERE ${whereClauses.join(' AND ')}
GROUP BY c.id
HAVING ${havingClauses.join(' AND ')}`;

    return { query: generatedQuery, params };
  };

  // Run dynamic preview queries whenever visual filters change
  useEffect(() => {
    if (creationMode !== 'visual') return;

    const { query, params } = compileVisualQuery(filterCategory, filterChannel, filterSpend, filterOrders);
    setSqlQuery(query);
    setQueryParams(params);

    // Sync campaign delivery channel input if a specific channel is selected
    if (filterChannel !== 'Any') {
      setChannel(filterChannel.toLowerCase());
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await axios.post('/api/segments/preview', {
          sqlQuery: query,
          queryParams: params
        });
        setMatchCount(response.data.matchCount);
        setSampleShoppers(response.data.sampleShoppers);
      } catch (err: any) {
        console.error('Failed to preview segment:', err.message);
        setMatchCount(0);
        setSampleShoppers([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [creationMode, filterCategory, filterChannel, filterSpend, filterOrders]);

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) {
      triggerNotification('Please type a campaign goal or prompt first', 'error');
      return;
    }
    
    setParsing(true);
    try {
      const response = await axios.post('/api/ai/parse', {
        prompt: aiPrompt,
        apiKey: apiKey || null
      });

      const { segmentName, channel: aiChannel, sqlQuery: aiSql, queryParams: aiParams, variants, matchCount: count, sampleShoppers: samples } = response.data;
      
      setCampaignName(segmentName || 'New Shopper Campaign');
      setChannel(aiChannel || 'whatsapp');
      setSqlQuery(aiSql || '');
      setQueryParams(aiParams || []);
      setMessageVariantA(variants?.[0]?.text || '');
      setMessageVariantB(variants?.[1]?.text || '');
      setMatchCount(count ?? 0);
      setSampleShoppers(samples || []);
      setIsGenerated(true);
      triggerNotification(`AI segmented ${count} shoppers successfully!`, 'success');
    } catch (error: any) {
      triggerNotification(`AI generation failed: ${error.message}`, 'error');
    } finally {
      setParsing(false);
    }
  };

  const handleLaunch = async () => {
    if (!campaignName || !sqlQuery || !messageVariantA || !messageVariantB) {
      triggerNotification('Please fill in all campaign parameters before launching', 'error');
      return;
    }

    setLaunching(true);
    try {
      const response = await axios.post('/api/campaigns', {
        name: campaignName,
        sqlQuery,
        queryParams,
        channel,
        messageTemplates: {
          A: messageVariantA,
          B: messageVariantB
        }
      });

      if (response.data.success) {
        triggerNotification(`Campaign launched! Sending ${response.data.totalQueued} messages.`, 'success');
        
        // Reset states
        setAiPrompt('');
        setIsGenerated(false);
        setMatchCount(null);
        setSampleShoppers([]);
        
        // Callback to navigate to Dashboard
        onCampaignLaunched();
      }
    } catch (error: any) {
      triggerNotification(`Campaign launch failed: ${error.message}`, 'error');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Campaign</h1>
          <p className="subtitle">Let AI write copy, target segments, or build your own custom filters manually.</p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-color))' }}>
        <button
          className={`btn ${creationMode === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setCreationMode('ai');
            setIsGenerated(false);
            setMatchCount(null);
            setSampleShoppers([]);
            setCampaignName('');
            setSqlQuery('');
            setQueryParams([]);
          }}
          style={{ flex: 1, padding: '10px 16px', fontSize: '0.88rem' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Sparkles size={16} />
            <span>AI Campaign Copilot (NLP)</span>
          </span>
        </button>
        <button
          className={`btn ${creationMode === 'visual' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            setCreationMode('visual');
            setIsGenerated(true);
            setCampaignName('Visual Segment Campaign');
            setMessageVariantA('Hey {{first_name}}! Exclusive offer on our {{favorite_category}} selection. Click: {{link}}');
            setMessageVariantB('Hi {{name}}, custom deals ready for you in {{favorite_category}}! Click: {{link}}');
            // triggers compileVisualQuery in useEffect automatically
          }}
          style={{ flex: 1, padding: '10px 16px', fontSize: '0.88rem' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Sliders size={16} />
            <span>Dynamic Segment Rule Builder</span>
          </span>
        </button>
      </div>

      {/* AI Assistant Chat Console */}
      {creationMode === 'ai' && !isGenerated && (
        <div className="glass-panel ai-console-card card" style={{ padding: '24px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Sparkles size={18} style={{ color: 'hsl(var(--primary-hover))' }} /> Xeno AI Campaign Copilot
          </h3>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '14px' }}>
            Describe who you want to reach, what you want to offer, and what channel to use in natural language.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <textarea
              className="ai-textarea"
              placeholder={getBrandPlaceholder(brand)}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={parsing}
            />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} />
                <span>{apiKey ? 'Powered by Gemini Flash' : 'Powered by Local NLP Parser (Offline)'}</span>
              </span>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={parsing}
                style={{ minWidth: '150px' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  {parsing ? <Brain size={14} className="blink-active" /> : <Wand2 size={14} />}
                  <span>{parsing ? 'Segmenting...' : 'Generate Campaign'}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor & Launch Console */}
      {isGenerated && (
        <div className="responsive-grid-split">
          {/* Settings Editor */}
          <div className="glass-panel card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h3 style={{ borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '8px', color: 'hsl(var(--primary))' }}>
              {creationMode === 'ai' ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Edit3 size={18} /> Review Campaign Design
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={18} /> Configure Visual Campaign Filters
                </span>
              )}
            </h3>

            {/* Visual Criteria selectors rendered only in visual mode */}
            {creationMode === 'visual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-color))' }}>
                <h4 style={{ color: 'hsl(var(--secondary))', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Search size={16} style={{ color: 'hsl(var(--secondary))' }} /> Filter Audience Attributes (AND Logic)
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>
                      Favorite Category
                      {loadingCategories && <span style={{ marginLeft: '6px', color: 'hsl(var(--text-muted))', fontSize: '0.7rem' }}>loading...</span>}
                    </label>
                    <select
                      className="ai-textarea"
                      style={{ height: '36px', padding: '0 8px', fontSize: '0.85rem' }}
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      disabled={loadingCategories}
                    >
                      <option value="Any">Any Category</option>
                      {brandCategories.map(cat => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name} ({cat.orderCount} orders)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Preferred Channel</label>
                    <select
                      className="ai-textarea"
                      style={{ height: '36px', padding: '0 8px', fontSize: '0.85rem' }}
                      value={filterChannel}
                      onChange={(e) => setFilterChannel(e.target.value)}
                    >
                      <option value="Any">Any Channel Preference</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="SMS">SMS (Text)</option>
                      <option value="Email">Email</option>
                      <option value="RCS">RCS Chat</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Min Lifetime Spend</label>
                    <select
                      className="ai-textarea"
                      style={{ height: '36px', padding: '0 8px', fontSize: '0.85rem' }}
                      value={filterSpend}
                      onChange={(e) => setFilterSpend(e.target.value)}
                    >
                      <option value="Any">Any Total Spend</option>
                      <option value=">4000">Over ₹4,000</option>
                      <option value=">8000">Over ₹8,000</option>
                      <option value=">16000">Over ₹16,000</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Min Orders Count</label>
                    <select
                      className="ai-textarea"
                      style={{ height: '36px', padding: '0 8px', fontSize: '0.85rem' }}
                      value={filterOrders}
                      onChange={(e) => setFilterOrders(e.target.value)}
                    >
                      <option value="Any">Any Order Count</option>
                      <option value=">=1">At least 1 order</option>
                      <option value=">=3">At least 3 orders</option>
                      <option value=">=5">At least 5 orders</option>
                    </select>
                  </div>
                </div>

                {/* Category Distribution Panel */}
                {brandCategories.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'hsl(var(--text-muted))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Order Distribution by Category (This Brand)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {brandCategories.map(cat => {
                        const maxOrders = Math.max(...brandCategories.map(c => c.orderCount), 1);
                        const pct = Math.round((cat.orderCount / maxOrders) * 100);
                        const isSelected = filterCategory === cat.name;
                        return (
                          <div
                            key={cat.name}
                            onClick={() => setFilterCategory(isSelected ? 'Any' : cat.name)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              cursor: 'pointer',
                              padding: '5px 8px',
                              borderRadius: '4px',
                              background: isSelected ? 'rgba(138,43,226,0.15)' : 'transparent',
                              border: isSelected ? '1px solid rgba(138,43,226,0.4)' : '1px solid transparent',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ width: '90px', fontSize: '0.75rem', color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--text-secondary))', fontWeight: isSelected ? 700 : 400, flexShrink: 0 }}>
                              {cat.name}
                            </div>
                            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: isSelected
                                  ? 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))'
                                  : 'rgba(255,255,255,0.2)',
                                borderRadius: '99px',
                                transition: 'width 0.4s ease'
                              }} />
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', width: '64px', textAlign: 'right', flexShrink: 0 }}>
                              {cat.orderCount} orders
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', width: '50px', textAlign: 'right', flexShrink: 0 }}>
                              {cat.customerCount} cust
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '6px' }}>
                      Click a category bar to filter by it · Data sourced from live brand DB
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Campaign Name</label>
                <input
                  type="text"
                  className="ai-textarea"
                  style={{ height: '40px', padding: '0 12px' }}
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Delivery Channel</label>
                <select
                  className="ai-textarea"
                  style={{ height: '40px', padding: '0 12px' }}
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS (Text)</option>
                  <option value="email">Email</option>
                  <option value="rcs">RCS Chat</option>
                </select>
              </div>
            </div>

            {/* A/B Test Variants */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Variant A Message (50% Audience)</label>
                <textarea
                  className="ai-textarea"
                  style={{ height: '110px' }}
                  value={messageVariantA}
                  onChange={(e) => setMessageVariantA(e.target.value)}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Variant B Message (50% Audience)</label>
                <textarea
                  className="ai-textarea"
                  style={{ height: '110px' }}
                  value={messageVariantB}
                  onChange={(e) => setMessageVariantB(e.target.value)}
                />
              </div>
            </div>

            {/* Target SQL Query */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>Target SQL Filter Query (Advanced)</label>
              <textarea
                className="ai-textarea"
                style={{ height: '80px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Segment Summary & Launch Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="glass-panel card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '8px', color: 'hsl(var(--secondary))', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} /> Target Segment Preview
              </h3>
              
              <div>
                <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>MATCHING SHOPPERS</div>
                <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'white' }}>
                  {matchCount}
                </div>
              </div>

              {sampleShoppers.length > 0 ? (
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'hsl(var(--text-secondary))', marginBottom: '8px' }}>Matched Sample Shoppers:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {sampleShoppers.map((s) => (
                      <div key={s.id} style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                        <span style={{ color: 'hsl(var(--text-muted))' }}>{s.metadata?.favorite_category || 'General'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--danger))' }}>No shopper profiles match these filters. Verify the SQL query criteria.</div>
              )}
            </div>

            {/* Launch Campaign */}
            <div className="glass-panel card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'linear-gradient(135deg, rgba(138,43,226,0.1) 0%, transparent 100%)' }}>
              <h3>Ready to Publish?</h3>
              <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.4 }}>
                This campaign will dispatch messages. The Channel Service will simulate shopper outcomes asynchronously.
              </p>
              
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
                onClick={handleLaunch}
                disabled={launching || matchCount === 0}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Rocket size={18} />
                  <span>{launching ? 'Launching...' : 'Review & Launch Campaign'}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignWizard;
