import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { executeMcpQuery, MCP_TOOLS } from '../services/mcpService';
import { Bot, Send, Sparkles, Shield, Terminal, ArrowRight, CornerDownLeft, RefreshCw, Layers, Database } from 'lucide-react';
import { RiskBadge } from '../components/common/Badge';

export function MCPAssistantPage() {
  const { selectedWaterSource } = useApp();
  const [messages, setMessages] = useState([
    {
      id: 'msg_001',
      sender: 'assistant',
      text: `Hello! I am your **WaterGuard MCP Assistant**.\n\nI have read-only access to multi-modal water telemetry, aggregated community symptom reports, cached weather observations, and unsupervised Isolation Forest anomaly scores across all monitored basins.\n\nSelect a monitored basin and ask a question below or choose a suggested query.`,
      toolUsed: 'system_init',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disclaimer: 'Read-only MCP analysis. Does not modify risk scores or database state.'
    }
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const suggestedQuestions = [
    'Why is this location high risk?',
    'What is the current risk?',
    'Show recent water readings.',
    'What symptoms were reported?',
    'What weather conditions were recorded?',
    'List all monitored villages.',
    'Show all water sources.',
    'Tell me about Chakardeo.'
  ];

  const handleSend = async (queryToSend) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || isThinking) return;

    const userMsg = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

    try {
      const response = await executeMcpQuery(q, selectedWaterSource);
      const assistantMsg = {
        id: 'ast_' + Date.now(),
        sender: 'assistant',
        text: response.markdownResponse,
        toolUsed: response.toolUsed,
        riskLevel: response.riskLevel,
        riskScore: response.riskScore,
        targetLocation: response.targetLocation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        disclaimer: response.disclaimer
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="container-custom" style={{ padding: '36px 24px 80px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
              border: '1px solid rgba(0, 229, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00E5FF'
            }}>
              <Bot size={20} />
            </div>
            <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800 }}>
              MCP Intelligence Assistant
            </h1>
          </div>
          <p style={{ color: '#94A3B8', fontSize: '13px' }}>
            Natural-language telemetry query layer built on the NitroStack read-only Model Context Protocol.
          </p>
        </div>

        {/* Read-Only Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span className="glass-pill" style={{ color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.3)', fontSize: '12px' }}>
            <Shield size={13} /> Strictly Read-Only
          </span>
          {selectedWaterSource && (
            <span className="glass-pill" style={{ color: '#00E5FF', borderColor: 'rgba(0,229,255,0.3)', fontSize: '12px' }}>
              📍 {selectedWaterSource.name}
            </span>
          )}
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="glass-panel" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '620px',
        overflow: 'hidden',
        border: '1px solid rgba(0, 229, 255, 0.25)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
      }}>
        
        {/* Chat Messages Stream */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  gap: '12px'
                }}
              >
                {!isUser && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(0, 229, 255, 0.15)',
                    border: '1px solid rgba(0, 229, 255, 0.4)',
                    color: '#00E5FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '4px'
                  }}>
                    <Bot size={18} />
                  </div>
                )}

                <div style={{
                  maxWidth: '82%',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  background: isUser ? 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)' : 'rgba(15, 23, 42, 0.85)',
                  border: isUser ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#F8FAFC',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  boxShadow: isUser ? '0 4px 16px rgba(2, 132, 199, 0.3)' : 'none'
                }}>
                  {/* Tool used badge on assistant responses */}
                  {!isUser && msg.toolUsed && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#00E5FF', fontFamily: 'var(--font-mono)' }}>
                        <Terminal size={12} />
                        <span>MCP Tool: <strong>{msg.toolUsed}</strong></span>
                      </div>
                      {msg.riskLevel && (
                        <RiskBadge level={msg.riskLevel} score={msg.riskScore} size="sm" />
                      )}
                    </div>
                  )}

                  {/* Render Message Text with simple formatting */}
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.text.split('\n').map((line, idx) => {
                      if (line.startsWith('### ')) {
                        return <h4 key={idx} style={{ color: '#00E5FF', fontSize: '15px', margin: '8px 0 4px' }}>{line.replace('### ', '')}</h4>;
                      }
                      if (line.startsWith('• ')) {
                        return <div key={idx} style={{ marginLeft: '8px', marginBottom: '4px' }}>{line}</div>;
                      }
                      return <p key={idx} style={{ margin: '4px 0' }}>{line}</p>;
                    })}
                  </div>

                  {/* Disclaimer banner */}
                  {!isUser && msg.disclaimer && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: '11px',
                      color: '#64748B'
                    }}>
                      🔒 {msg.disclaimer}
                    </div>
                  )}

                  <div style={{ fontSize: '10px', color: isUser ? 'rgba(255,255,255,0.7)' : '#64748B', textAlign: 'right', marginTop: '6px' }}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isThinking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#00E5FF', fontSize: '13px', padding: '8px 12px' }}>
              <RefreshCw size={16} className="animate-spin" />
              <span>Querying NitroStack MCP tools & synthesizing telemetry...</span>
            </div>
          )}
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div style={{
          padding: '12px 24px',
          background: 'rgba(7, 11, 20, 0.8)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Suggested:</span>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#CBD5E1',
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              className="hover:border-cyan-400 hover:text-cyan-400"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(13, 21, 39, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${selectedNode?.name || 'this location'}... (e.g. "Why is this location high risk?")`}
            style={{
              flex: 1,
              background: 'rgba(7, 11, 20, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--radius-full)',
              padding: '12px 20px',
              color: '#F8FAFC',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'var(--font-body)'
            }}
          />

          <button
            onClick={() => handleSend()}
            disabled={!inputQuery.trim() || isThinking}
            className="btn-primary"
            style={{
              padding: '12px 22px',
              borderRadius: 'var(--radius-full)',
              opacity: !inputQuery.trim() || isThinking ? 0.5 : 1,
              cursor: !inputQuery.trim() || isThinking ? 'not-allowed' : 'pointer'
            }}
          >
            <span>Ask</span>
            <Send size={15} />
          </button>
        </div>

      </div>

      {/* 6 MCP Tools Reference Footer Card */}
      <div style={{
        marginTop: '24px',
        padding: '18px 24px',
        borderRadius: '16px',
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        fontSize: '12px',
        color: '#94A3B8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={15} color="#00E5FF" />
          <span>Active Read-Only NitroStack Tools: <code>get_location_risk</code>, <code>get_water_readings</code>, <code>get_symptom_data</code>, <code>get_weather</code>, <code>get_risk_history</code>, <code>get_contributing_factors</code></span>
        </div>
        <span style={{ color: '#64748B' }}>Zero Write Operations Allowed</span>
      </div>

    </div>
  );
}
