import React, { useState } from 'react';
import { Terminal, ArrowLeftRight, ChevronUp, ChevronDown } from 'lucide-react';

export interface LogEntry {
  timestamp: string;
  type: string;
  message: string;
  communicationId?: string;
  campaignId?: string;
  status?: string;
  recipient?: string;
  channel?: string;
  metadata?: any;
}

interface TerminalLogsProps {
  logs: LogEntry[];
  devMode: boolean;
}

const TerminalLogs: React.FC<TerminalLogsProps> = ({ logs, devMode }) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  const getLogColorClass = (type: string, status?: string) => {
    const key = (status || type || '').toLowerCase();
    if (key.includes('deliver')) return 'term-delivered';
    if (key.includes('fail') || key.includes('error') || key.includes('warning')) return 'term-failed';
    if (key.includes('read')) return 'term-read';
    if (key.includes('click')) return 'term-clicked';
    if (key.includes('convert')) return 'term-converted';
    if (key.includes('queue')) return 'term-queued';
    if (key.includes('sent')) return 'term-sent';
    return '';
  };

  return (
    <div className={`terminal-window ${isCollapsed ? 'collapsed' : ''}`} style={{ marginTop: 'auto' }}>
      <div 
        className="terminal-header" 
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="terminal-dots">
            <div className="terminal-dot dot-red"></div>
            <div className="terminal-dot dot-yellow"></div>
            <div className="terminal-dot dot-green"></div>
          </div>
          <div className="terminal-title" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={14} style={{ color: 'hsl(var(--primary))' }} />
            <span>
              Live Webhook Stream {devMode ? (
                <span> (Port 3000 <ArrowLeftRight size={11} style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 2px' }} /> 3001)</span>
              ) : ''}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="blink-active" style={{ fontSize: '0.65rem', color: '#10b981', fontFamily: 'var(--font-mono)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 6px #10b981' }}></span>
            STREAMING ({logs.length})
          </div>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
          </span>
        </div>
      </div>
      {!isCollapsed && (
        <div className="terminal-body">
          {logs.length === 0 ? (
            <div style={{ color: 'hsl(var(--text-muted))', textAlign: 'center', marginTop: '60px' }}>
              No incoming webhook callbacks detected yet. Launch a campaign to see the gateway process traffic!
            </div>
          ) : (
            logs.map((log, index) => {
              const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour12: false });
              return (
                <div key={index} className="terminal-line">
                  <span className="terminal-time">[{timeStr}]</span>
                  <span className={`terminal-type ${getLogColorClass(log.type, log.status)}`}>
                    [{log.type.toUpperCase()}]
                  </span>
                  <span style={{ color: '#e2e8f0' }}>{log.message}</span>
                  {log.communicationId && (
                    <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', marginLeft: '6px' }}>
                      ({log.communicationId})
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default TerminalLogs;
