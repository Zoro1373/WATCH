import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Bell } from 'lucide-react';

export function AlertHierarchy() {
  const levels = [
    {
      level: 'LOW',
      label: 'Routine Baseline',
      status: 'Normal Monitoring',
      scoreRange: '0.00 – 0.39',
      color: '#10B981',
      bgGrad: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.35)',
      icon: ShieldCheck,
      desc: 'Sensor parameters adhere to baseline thresholds. Minimal indication of water-quality deterioration. Routine scheduled monitoring continues.',
      action: 'Standard periodic telemetry sampling.'
    },
    {
      level: 'MEDIUM',
      label: 'Attention Required',
      status: 'Increased Surveillance',
      scoreRange: '0.40 – 0.69',
      color: '#F59E0B',
      bgGrad: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.35)',
      icon: AlertTriangle,
      desc: 'Moderate parameter anomalies or symptom elevation detected. System logs warnings and flags the water source for active operational review.',
      action: 'Verification of secondary sensor metrics & local inquiry.'
    },
    {
      level: 'HIGH',
      label: 'Elevated Risk Indicator',
      status: 'Actionable Warning',
      scoreRange: '0.70 – 1.00',
      color: '#EF4444',
      bgGrad: 'rgba(239, 68, 68, 0.12)',
      border: 'rgba(239, 68, 68, 0.45)',
      icon: AlertOctagon,
      desc: 'Significant multi-modal divergence identified by Isolation Forest. Indicates elevated environmental risk. Triggers automated alert workflows.',
      action: 'Public health advisory (e.g. water boiling advisory & sanitary inspection).'
    }
  ];

  return (
    <section style={{ padding: '90px 0' }}>
      <div className="container-custom">
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 60px' }}>
          <div className="glass-pill" style={{ color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.3)', marginBottom: '16px' }}>
            <Bell size={14} /> EARLY-WARNING PROTOCOL
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, marginBottom: '16px' }}>
            Risk Classification & Alert Protocol
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.6 }}>
            Every 15 minutes, anomaly scores are normalized on a 0 to 1 scale and categorized into clear operational alert tiers for public health engineers and municipal authorities.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px'
        }}>
          {levels.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.level}
                className="glass-panel"
                style={{
                  padding: '32px 24px',
                  border: `1px solid ${item.border}`,
                  background: item.bgGrad,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      background: 'rgba(7, 11, 20, 0.8)',
                      border: `1px solid ${item.color}50`,
                      color: item.color,
                      fontSize: '12px',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      <Icon size={14} />
                      <span>{item.level} RISK</span>
                    </div>

                    <span style={{ fontSize: '12px', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                      Score: {item.scoreRange}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#F8FAFC', marginBottom: '4px' }}>
                    {item.label}
                  </h3>
                  <div style={{ fontSize: '13px', color: item.color, fontWeight: 600, marginBottom: '16px' }}>
                    {item.status}
                  </div>

                  <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.5, marginBottom: '24px' }}>
                    {item.desc}
                  </p>
                </div>

                <div style={{
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '12px',
                  color: '#CBD5E1'
                }}>
                  <strong style={{ color: '#F8FAFC', display: 'block', marginBottom: '4px' }}>Recommended Protocol:</strong>
                  <span>{item.action}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
