import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  CircleDollarSign, 
  Send, 
  Bot, 
  User, 
  BookOpen, 
  Database, 
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Table
} from 'lucide-react';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  sqlQuery?: string | null;
  results?: any[] | null;
  timestamp: string;
}

interface AIAssistantProps {
  apiKey: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ apiKey }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Hey! I'm your **Database Assistant** for this brand. You can type any question about customers, orders, revenue, or campaigns — I'll query the live database and answer you.\n\nNot sure where to start? Use the quick questions on the left, or just ask me anything about the data.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('shoppers');

  const inputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const categories = [
    { id: 'shoppers', label: 'Shoppers', icon: <Users size={16} /> },
    { id: 'revenue', label: 'Sales & Revenue', icon: <CircleDollarSign size={16} /> },
    { id: 'campaigns', label: 'Campaigns', icon: <Send size={16} /> }
  ];

  const questionsMap: Record<string, string[]> = {
    shoppers: [
      "How many shoppers do we have in total?",
      "Who is our top spender?",
      "What is the category breakdown of our shoppers?",
      "What are the preferred communication channels for our shoppers?"
    ],
    revenue: [
      "What is our total revenue?",
      "What is the total number of orders placed?",
      "What is our average order value?",
      "Show me the breakdown of order statuses"
    ],
    campaigns: [
      "How many campaigns have been launched?",
      "What is the status breakdown of our campaigns?",
      "Show me a list of all active campaigns"
    ]
  };

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setInputValue('');

    const userMsg: Message = {
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await axios.post('/api/ai/chat', {
        question: trimmed,
        apiKey: apiKey
      });

      const assistantMsg: Message = {
        sender: 'assistant',
        text: response.data.answer || "I ran the query but couldn't formulate a summary.",
        sqlQuery: response.data.sqlQuery,
        results: response.data.results,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        sender: 'assistant',
        text: `Error connecting to database helper: ${err.response?.data?.error || err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const formatText = (text: string) => {
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Replace bold syntax **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace italic syntax *text*
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Replace code blocks `code`
    escaped = escaped.replace(/`(.*?)`/g, '<code>$1</code>');

    return escaped.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.startsWith('-')) {
        const content = trimmed.substring(1).trim();
        return (
          <li key={i} dangerouslySetInnerHTML={{ __html: content }} style={{ marginLeft: '18px', listStyleType: 'disc', marginBottom: '4px' }} />
        );
      }
      return <p key={i} dangerouslySetInnerHTML={{ __html: line }} style={{ minHeight: '1em', marginBottom: '8px' }} />;
    });
  };

  return (
    <div className="chatbot-container">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="page-title">AI Database Assistant</h1>
          <p className="subtitle">Ask anything about this brand's customers, orders, revenue, or campaigns. Type freely or pick a quick question.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '6px 12px', border: '1px solid hsl(var(--border-color))', borderRadius: '20px' }}>
          <div className="status-indicator-dot blink-active"></div>
          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>{apiKey ? 'Gemini AI' : 'Local NLP'}</span>
        </div>
      </div>

      <div className="chatbot-grid">
        {/* Left Predefined Questions Library Pane */}
        <div className="chatbot-sidebar glass-panel">
          <div className="sidebar-header-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={16} />
            <span>Question Library</span>
          </div>
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`category-tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <span className="category-icon" style={{ display: 'flex', alignItems: 'center' }}>{cat.icon}</span>
                <span className="category-label-text">{cat.label}</span>
              </button>
            ))}
          </div>

          <div className="questions-list">
            {questionsMap[activeCategory].map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="question-item-btn"
                disabled={loading}
                onClick={() => handleSend(q)}
              >
                <HelpCircle size={14} style={{ marginTop: '2px', color: 'hsl(var(--primary))', flexShrink: 0 }} />
                <span className="question-text-content">{q}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Active Chat Pane */}
        <div className="chatbot-main-pane">
          <div ref={chatScrollRef} className="chat-history-scroll glass-panel">
            <div className="chat-messages-container">
              {messages.map((msg, index) => (
                <div key={index} className={`chat-message-row ${msg.sender === 'user' ? 'user-align' : 'assistant-align'}`}>
                  {msg.sender === 'assistant' && (
                    <div className="chat-avatar" style={{ color: 'hsl(var(--primary))' }}>
                      <Bot size={20} />
                    </div>
                  )}
                  <div className="chat-message-wrapper">
                    <div className={`chat-bubble chat-bubble-${msg.sender}`}>
                      <div className="chat-bubble-content">
                        {formatText(msg.text)}
                      </div>
                      <span className="chat-timestamp">{msg.timestamp}</span>
                    </div>

                    {/* SQL inspection dropdown */}
                    {msg.sender === 'assistant' && msg.sqlQuery && (
                      <div className="sql-inspection-wrapper">
                        <button
                          type="button"
                          className="sql-collapsible-btn"
                          onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                        >
                          <Database size={12} />
                          <span>{expandedIndex === index ? 'Hide SQL & Results' : 'View SQL Query & Results'}</span>
                          {expandedIndex === index ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>

                        {expandedIndex === index && (
                          <div className="sql-details-panel">
                            <div className="sql-details-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Database size={12} />
                              <span>Database Query (SQLite)</span>
                            </div>
                            <pre className="sql-codeblock">
                              <code>{msg.sqlQuery}</code>
                            </pre>

                            <div className="sql-details-header" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Table size={12} />
                              <span>Query Result Data ({msg.results?.length || 0} rows)</span>
                            </div>
                            <div className="results-table-container">
                              {msg.results && msg.results.length > 0 ? (
                                <table className="results-table">
                                  <thead>
                                    <tr>
                                      {Object.keys(msg.results[0]).map((key) => (
                                        <th key={key}>{key}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {msg.results.map((row, rowIdx) => (
                                      <tr key={rowIdx}>
                                        {Object.values(row).map((val: any, colIdx) => (
                                          <td key={colIdx}>
                                            {val !== null && typeof val === 'object' 
                                              ? JSON.stringify(val) 
                                              : String(val)}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="no-results-text">No rows returned.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {msg.sender === 'user' && (
                    <div className="chat-avatar user-avatar" style={{ color: 'white' }}>
                      <User size={20} />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing Loading Indicator */}
              {loading && (
                <div className="chat-message-row assistant-align">
                  <div className="chat-avatar" style={{ color: 'hsl(var(--primary))' }}>
                    <Bot size={20} />
                  </div>
                  <div className="chat-bubble chat-bubble-assistant">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Typeable chat input */}
          <div className="chat-input-form" style={{ marginTop: '16px' }}>
            <input
              ref={inputRef}
              type="text"
              className="chat-text-input"
              placeholder="Ask about customers, orders, revenue, campaigns..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              autoFocus
            />
            <button
              type="button"
              className="chat-send-btn"
              onClick={() => handleSend(inputValue)}
              disabled={loading || !inputValue.trim()}
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
