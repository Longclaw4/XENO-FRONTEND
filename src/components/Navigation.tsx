import React from 'react';
import { 
  LayoutDashboard, 
  Megaphone, 
  Users, 
  Bot, 
  Star, 
  Settings, 
  RefreshCw, 
  Sliders, 
  CheckCircle,
  Coffee,
  Tag,
  Sparkles,
  Activity,
  Smartphone,
  Zap,
  Home,
  ShoppingCart,
  Briefcase
} from 'lucide-react';

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  devMode: boolean;
  setDevMode: (val: boolean) => void;
  currentBrand: string;
  onSwitchBrand: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ 
  currentTab, 
  setCurrentTab, 
  devMode, 
  setDevMode, 
  currentBrand,
  onSwitchBrand
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Megaphone size={18} /> },
    { id: 'shoppers', label: 'Shoppers', icon: <Users size={18} /> },
    { id: 'assistant', label: 'AI Assistant', icon: <Bot size={18} /> },
    { id: 'ratings', label: 'App Ratings', icon: <Star size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  // Map brand names to Lucide icons for styling consistency
  const getBrandIcon = (brandName: string) => {
    switch (brandName.toLowerCase()) {
      case 'starbucks': return <Coffee size={18} style={{ color: '#10b981' }} />;
      case 'zara': return <Tag size={18} style={{ color: '#e2e8f0' }} />;
      case 'sephora': return <Sparkles size={18} style={{ color: '#ec4899' }} />;
      case 'nike': return <Activity size={18} style={{ color: '#f97316' }} />;
      case 'apple': return <Smartphone size={18} style={{ color: '#94a3b8' }} />;
      case 'tesla': return <Zap size={18} style={{ color: '#ef4444' }} />;
      case 'ikea': return <Home size={18} style={{ color: '#eab308' }} />;
      case 'amazon': return <ShoppingCart size={18} style={{ color: '#ff9900' }} />;
      default: return <Briefcase size={18} />;
    }
  };

  return (
    <div className="sidebar">
      <div className="brand">
        <span>Xeno</span>
      </div>

      {/* Elegant Switch-Tenant button */}
      <div className="brand-selector-panel" style={{ padding: '0 12px', marginBottom: '24px' }}>
        <button
          onClick={onSwitchBrand}
          style={{
            width: '100%',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid hsl(var(--border-color))',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.86rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
            transition: 'var(--transition)'
          }}
          className="brand-switch-btn"
          title="Switch to another brand tenant database"
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{getBrandIcon(currentBrand)}</span>
            <span>{currentBrand}</span>
          </span>
          <span style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={12} />
            <span>Switch</span>
          </span>
        </button>
      </div>
      
      <ul className="nav-links">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <a
              className={`nav-link ${currentTab === tab.id ? 'active' : ''}`}
              onClick={() => setCurrentTab(tab.id)}
            >
              <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </a>
          </li>
        ))}
      </ul>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="dev-mode-container" style={{ margin: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="switch-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={14} />
            <span>Dev Mode</span>
          </span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={devMode} 
              onChange={(e) => setDevMode(e.target.checked)} 
            />
            <span className="slider"></span>
          </label>
        </div>

        <div style={{ padding: '8px', borderTop: '1px solid hsl(var(--border-color))' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#22c55e' }}>
            <CheckCircle size={14} />
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>System Healthy</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navigation;
