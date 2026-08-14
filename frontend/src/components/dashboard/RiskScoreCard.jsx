import React from 'react';
import { useApp } from '../../context/AppContext';
import { RiskBadge } from '../common/Badge';
import { Gauge, Info, Activity, Layers, Sparkles } from 'lucide-react';

export function RiskScoreCard() {
  const { selectedNode, activeRiskData } = useApp();

  const score = activeRiskData?.riskScore !== undefined 
    ? activeRiskData.riskScore 
    : selectedNode?.defaultScore || 0.15;

  const level = activeRiskData?.riskLevel || selectedNode?.defaultRisk || 'LOW';

  const contributingFactors = activeRiskData?.contributingFactors || selectedNode?.contributingFactors || {
    turbidity: 0.35,
    feverCount: 0.28,
    precipitation: 0.21,
    ph: 0.16
  };

  // Color mapping
  const riskColor = level === 'HIGH' ? '#EF4444' : level === 'MEDIUM' ? '#F59E0B' : '#10B981';

  // SVG Gauge calculations (radius = 70, stroke = 12, circumference = 2 * PI * 70 = 439.82)
  const radius = 64;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  // Use 75% arc (semi-circular open gauge)
  const strokeDashoffset = circumference - (score * circumference);

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${riskColor}20`, color: riskColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gauge size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
              Early-Warning Risk Score
            </h3>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              Unsupervised Anomaly Indicator (0.00 – 1.00)
            </div>
          </div>
        </div>

        <RiskBadge level={level} score={score} size="md" />
      </div>

      {/* Center Circular Score Meter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        margin: '10px 0 20px',
        flexWrap: 'wrap'
      }}>
        {/* SVG Circular Progress Ring */}
        <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background Track */}
            <circle
              cx="75"
              cy="75"
              r={radius}
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Animated Glowing Progress Ring */}
            <circle
              cx="75"
              cy="75"
              r={radius}
              stroke={riskColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                transition: 'stroke-dashoffset 1s ease-in-out',
                filter: `drop-shadow(0 0 8px ${riskColor})`
              }}
            />
          </svg>

          {/* Center Digital Score Readout */}
          <div style={{ position: 'absolute', textAlign: 'center', userSelect: 'none' }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 900,
              fontFamily: 'var(--font-heading)',
              color: '#F8FAFC',
              lineHeight: 1
            }}>
              {Number(score).toFixed(2)}
            </div>
            <div style={{
              fontSize: '11px',
              fontWeight: 700,
              color: riskColor,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginTop: '4px'
            }}>
              {level} RISK
            </div>
          </div>
        </div>

        {/* Location Metadata */}
        <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ color: '#64748B', display: 'block' }}>Target Location</span>
            <strong style={{ color: '#F8FAFC' }}>{selectedNode?.name}</strong>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ color: '#64748B', display: 'block' }}>ML Engine</span>
            <strong style={{ color: '#00E5FF' }}>Isolation Forest v1.0</strong>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <span style={{ color: '#64748B', display: 'block' }}>Coordinates</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>{selectedNode?.latitude}, {selectedNode?.longitude}</span>
          </div>
        </div>
      </div>

      {/* Contributing Factors Section */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#E2E8F0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Contributing Anomaly Features
          </span>
          <span style={{ fontSize: '11px', color: '#64748B' }}>
            Isolation Forest Attribution
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Object.entries(contributingFactors).map(([factor, weight]) => {
            const factorPercent = Math.min(100, Math.round(Number(weight) * 100));
            return (
              <div key={factor}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                  <span style={{ color: '#CBD5E1', textTransform: 'capitalize' }}>{factor.replace(/([A-Z])/g, ' $1')}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: riskColor, fontWeight: 600 }}>+{factorPercent}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'rgba(255, 255, 255, 0.06)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${factorPercent}%`,
                    height: '100%',
                    borderRadius: '3px',
                    background: `linear-gradient(90deg, ${riskColor}80, ${riskColor})`
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Regulatory Notice Banner */}
      <div style={{
        marginTop: '16px',
        padding: '8px 12px',
        borderRadius: '8px',
        background: 'rgba(0, 229, 255, 0.05)',
        border: '1px solid rgba(0, 229, 255, 0.15)',
        fontSize: '11px',
        color: '#94A3B8',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <Info size={13} color="#00E5FF" style={{ flexShrink: 0 }} />
        <span>Calculated as an environmental early-warning risk indicator; not a clinical medical diagnosis.</span>
      </div>

    </div>
  );
}
