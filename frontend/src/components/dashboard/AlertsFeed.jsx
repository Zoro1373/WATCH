import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, ShieldCheck, AlertTriangle, AlertOctagon, Clock, ShieldAlert, ArrowRight } from 'lucide-react';
import { RiskBadge } from '../common/Badge';

export function AlertsFeed() {
  const { alerts, selectNodeById, setActiveTab } = useApp();

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
              Real-Time Alert Feed & Dissemination
            </h3>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              Automated triggers on <code>MEDIUM</code> & <code>HIGH</code> anomaly scores
            </div>
          </div>
        </div>

        <span className="glass-pill" style={{ fontSize: '11px', color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          {alerts.length} Active Events
        </span>
      </div>

      {/* Alert Feed Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alerts.map((alert) => {
          const borderStyle = alert.level === 'HIGH' 
            ? '1px solid rgba(239, 68, 68, 0.4)' 
            : alert.level === 'MEDIUM' 
            ? '1px solid rgba(245, 158, 11, 0.35)' 
            : '1px solid rgba(16, 185, 129, 0.3)';

          const bgStyle = alert.level === 'HIGH' 
            ? 'rgba(239, 68, 68, 0.06)' 
            : alert.level === 'MEDIUM' 
            ? 'rgba(245, 158, 11, 0.05)' 
            : 'rgba(16, 185, 129, 0.05)';

          return (
            <div
              key={alert.id}
              style={{
                border: borderStyle,
                background: bgStyle,
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <RiskBadge level={alert.level} size="sm" />
                  <strong style={{ fontSize: '14px', color: '#F8FAFC' }}>{alert.locationName}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748B' }}>
                  <Clock size={12} />
                  <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.4 }}>
                {alert.message}
              </div>

              {/* Factors Pills & Action button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {alert.factors.map((factor, idx) => (
                    <span key={idx} style={{ fontSize: '11px', background: 'rgba(15, 23, 42, 0.8)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                      {factor}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => selectNodeById(alert.nodeId)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#00E5FF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>Focus Basin</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
