import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Star, 
  Bot, 
  Sparkles, 
  ThumbsUp, 
  ThumbsDown, 
  Apple, 
  Play, 
  Globe, 
  MapPin, 
  MessageSquare, 
  ShoppingBag, 
  Package, 
  Zap, 
  Car, 
  Wrench, 
  Home, 
  PhoneCall, 
  Utensils, 
  Flame,
  AlertTriangle
} from 'lucide-react';

interface Review {
  id: string;
  platform: string;
  rating: number;
  user_name: string;
  comment: string;
  created_at: string;
}

interface PlatformData {
  average: number;
  count: number;
  ratingsDistribution: number[]; // [1-star, 2-star, 3-star, 4-star, 5-star]
  topRatings: Review[];
  worstRatings: Review[];
}

interface RatingsResponse {
  platforms: Record<string, PlatformData>;
  insights: string[];
}

interface RatingsDashboardProps {
  apiKey: string;
}

const RatingsDashboard: React.FC<RatingsDashboardProps> = ({ apiKey }) => {
  const [data, setData] = useState<RatingsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlatformTab, setActivePlatformTab] = useState<string>('app_store');

  const brand = localStorage.getItem('xeno_current_brand') || 'Starbucks';

  useEffect(() => {
    setLoading(true);
    setError(null);
    axios.get(`/api/ratings?apiKey=${apiKey}`)
      .then(res => {
        setData(res.data);
        // Set first platform as active tab
        const keys = Object.keys(res.data.platforms);
        if (keys.length > 0) {
          setActivePlatformTab(keys[0]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('[RatingsDashboard] Error fetching ratings:', err);
        setError(err.response?.data?.error || err.message);
        setLoading(false);
      });
  }, [apiKey]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        size={14}
        fill={i < rating ? '#facc15' : 'transparent'}
        stroke={i < rating ? '#facc15' : 'rgba(255, 255, 255, 0.2)'}
        style={{ marginRight: '2px' }}
      />
    ));
  };

  const getPlatformLabel = (id: string) => {
    switch (id) {
      case 'app_store': return 'Apple App Store';
      case 'play_store': return 'Google Play Store';
      case 'trustpilot': return 'Trustpilot Web';
      case 'google_maps': return 'Google Maps';
      case 'zomato': return 'Zomato Delivery';
      case 'swiggy': return 'Swiggy Delivery';
      case 'mouthshut': return 'MouthShut India';
      case 'myntra': return 'Myntra India';
      case 'ajio': return 'Ajio Fashion';
      case 'nykaa': return 'Nykaa Beauty';
      case 'purplle': return 'Purplle Cosmetics';
      case 'amazon': return 'Amazon India';
      case 'flipkart': return 'Flipkart Electronics';
      case 'carwale': return 'CarWale India';
      case 'zigwheels': return 'ZigWheels Cars';
      case 'teambhp': return 'Team-BHP Forum';
      case 'pepperfry': return 'Pepperfry Furniture';
      case 'customercare': return 'Consumer Complaint Portal';
      default: return id.charAt(0).toUpperCase() + id.slice(1);
    }
  };

  const getPlatformIcon = (id: string) => {
    switch (id) {
      case 'app_store': return <Apple size={16} />;
      case 'play_store': return <Play size={16} />;
      case 'trustpilot': return <Globe size={16} />;
      case 'google_maps': return <MapPin size={16} />;
      case 'zomato': return <Utensils size={16} />;
      case 'swiggy': return <Flame size={16} />;
      case 'mouthshut': return <MessageSquare size={16} />;
      case 'myntra': return <ShoppingBag size={16} />;
      case 'ajio': return <ShoppingBag size={16} />;
      case 'nykaa': return <Sparkles size={16} />;
      case 'purplle': return <Sparkles size={16} />;
      case 'amazon': return <Package size={16} />;
      case 'flipkart': return <Zap size={16} />;
      case 'carwale': return <Car size={16} />;
      case 'zigwheels': return <Car size={16} />;
      case 'teambhp': return <Wrench size={16} />;
      case 'pepperfry': return <Home size={16} />;
      case 'customercare': return <PhoneCall size={16} />;
      default: return <Star size={16} />;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'hsl(var(--text-muted))' }}>
        <div className="typing-indicator" style={{ display: 'inline-flex', marginBottom: '16px' }}>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p style={{ fontWeight: 600 }}>Analyzing platform ratings database...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)', color: '#f87171', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <AlertTriangle size={24} />
        <div>
          <h3>Ratings Connection Error</h3>
          <p style={{ marginTop: '4px', fontSize: '0.9rem' }}>{error || 'Could not load ratings metrics.'}</p>
        </div>
      </div>
    );
  }

  const platformsKeys = Object.keys(data.platforms);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '0' }}>
        <div>
          <h1 className="page-title">{brand} App Ratings</h1>
          <p className="subtitle">Audit brand reputation and customer feedback loops across mobile stores and web platforms.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 12px', border: '1px solid hsl(var(--border-color))', borderRadius: '20px' }}>
          <div className="status-indicator-dot blink-active"></div>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Monitoring Active</span>
        </div>
      </div>

      {/* AI Insights Auditor Advice */}
      <div className="card ai-advice-card" style={{ border: '1px solid rgba(168, 85, 247, 0.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Bot size={22} style={{ color: 'hsl(var(--primary))' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'white', letterSpacing: '-0.3px' }}>AI Brand Auditor Insights</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {data.insights.map((insight, idx) => (
            <div 
              key={idx} 
              style={{ 
                padding: '12px 16px', 
                background: 'rgba(0, 0, 0, 0.3)', 
                borderLeft: '3px solid hsl(var(--primary))', 
                borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                color: 'hsl(var(--text-secondary))',
                fontSize: '0.92rem',
                lineHeight: '1.5'
              }}
              dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
            />
          ))}
        </div>
      </div>

      {/* Platform Cards Grid */}
      <div className="ratings-grid">
        {platformsKeys.map((key) => {
          const platform = data.platforms[key];
          const totalVotes = platform.count || 1;
          return (
            <div 
              key={key} 
              className="card glass-panel" 
              style={{ 
                padding: '24px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                cursor: 'default',
                transform: 'none',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', color: 'hsl(var(--primary))' }}>{getPlatformIcon(key)}</span>
                  <span>{getPlatformLabel(key)}</span>
                </span>
                <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>
                  {platform.count} reviews
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
                <span style={{ fontSize: '3.2rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'white', letterSpacing: '-1.5px' }}>
                  {platform.average}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {renderStars(Math.round(platform.average))}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', fontWeight: 500, marginTop: '4px' }}>
                    out of 5.0 stars
                  </span>
                </div>
              </div>

              {/* Distribution Charts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {platform.ratingsDistribution.slice().reverse().map((count, index) => {
                  const starsCount = 5 - index;
                  const pct = Math.max(2, Math.round((count / totalVotes) * 100));
                  return (
                    <div key={starsCount} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem' }}>
                      <span style={{ width: '8px', color: 'hsl(var(--text-muted))', fontWeight: 600 }}>{starsCount}</span>
                      <Star size={10} fill="gold" stroke="gold" />
                      <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${pct}%`, 
                            height: '100%', 
                            background: starsCount >= 4 ? 'hsl(var(--success))' : (starsCount <= 2 ? 'hsl(var(--danger))' : 'hsl(var(--warning))'),
                            borderRadius: '3px',
                            transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
                          }}
                        />
                      </div>
                      <span style={{ width: '28px', color: 'hsl(var(--text-muted))', textAlign: 'right', fontWeight: 600 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Side-by-side Ratings Comparison Section */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} style={{ color: 'hsl(var(--primary))' }} />
              <span>Customer Feedbacks Comparison</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>Inspect positive and critical user feedback side-by-side for each platform.</p>
          </div>

          {/* Platform Tab Buttons */}
          <div className="quick-questions-chips" style={{ margin: '0' }}>
            {platformsKeys.map((key) => (
              <button
                key={key}
                type="button"
                className={`quick-question-btn ${activePlatformTab === key ? 'active' : ''}`}
                style={{
                  background: activePlatformTab === key ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)' : 'rgba(255,255,255,0.02)',
                  borderColor: activePlatformTab === key ? 'hsl(var(--primary))' : 'hsl(var(--border-color))',
                  color: activePlatformTab === key ? 'white' : 'hsl(var(--text-secondary))',
                  padding: '8px 14px',
                  fontWeight: activePlatformTab === key ? 700 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => setActivePlatformTab(key)}
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>{getPlatformIcon(key)}</span>
                <span>{getPlatformLabel(key).split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Side-by-Side split grid */}
        {activePlatformTab && data.platforms[activePlatformTab] && (
          <div className="responsive-grid-two" style={{ gap: '20px' }}>
            {/* Top Ratings (Left Column) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <ThumbsUp size={14} />
                <span>Top Customer Ratings (4-5 Stars)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.platforms[activePlatformTab].topRatings.length === 0 ? (
                  <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.84rem', padding: '16px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)' }}>
                    No top ratings logged.
                  </div>
                ) : (
                  data.platforms[activePlatformTab].topRatings.map((rev) => (
                    <div 
                      key={rev.id} 
                      style={{ 
                        padding: '16px', 
                        background: 'rgba(34, 197, 94, 0.025)', 
                        border: '1px solid rgba(34, 197, 94, 0.15)', 
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'white' }}>{rev.user_name}</span>
                        <div style={{ display: 'flex' }}>
                          {renderStars(rev.rating)}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.5', fontStyle: 'italic' }}>
                        "{rev.comment}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Worst Ratings (Right Column) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <ThumbsDown size={14} />
                <span>Critical Customer Complaints (1-2 Stars)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.platforms[activePlatformTab].worstRatings.length === 0 ? (
                  <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.84rem', padding: '16px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)' }}>
                    No critical ratings logged.
                  </div>
                ) : (
                  data.platforms[activePlatformTab].worstRatings.map((rev) => (
                    <div 
                      key={rev.id} 
                      style={{ 
                        padding: '16px', 
                        background: 'rgba(239, 68, 68, 0.025)', 
                        border: '1px solid rgba(239, 68, 68, 0.15)', 
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'white' }}>{rev.user_name}</span>
                        <div style={{ display: 'flex' }}>
                          {renderStars(rev.rating)}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.88rem', color: 'hsl(var(--text-secondary))', lineHeight: '1.5', fontStyle: 'italic' }}>
                        "{rev.comment}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RatingsDashboard;
