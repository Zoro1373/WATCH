import React from 'react';
import { useApp } from '../../context/AppContext';
import { RiskBadge } from '../common/Badge';
import { Gauge, Activity, ShieldAlert, Sparkles, Loader2, AlertCircle } from 'lucide-react';

export function RiskScoreCard() {
  const { selectedWaterSource, activeRiskData, isLoadingRisk, isRiskUnavailable } = useApp();

  const hasLiveRisk = activeRiskData && typeof activeRiskData.riskScore === 'number';
  const score = hasLiveRisk ? activeRiskData.riskScore : selectedWaterSource?.defaultScore;
  const level = hasLiveRisk ? activeRiskData.riskLevel : selectedWaterSource?.defaultRisk || 'LOW';

  const contributingFactors = (activeRiskData && activeRiskData.contributingFactors) || {
    turbidity: 8.4,
    feverCount: 15,
    precipitation: 0.0,
    ph: 6.8
  };

  const riskColor = level === 'HIGH' ? '#EF4444' : level === 'MEDIUM' ? '#F59E0B' : '#10B981';

  // SVG Gauge calculations
  const radius = 64;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const effectiveScore = typeof score === 'number' ? score : 0;
  const strokeDashoffset = circumference - (effectiveScore * circumference);

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
              ML Early-Warning Risk
            </h3>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              Water Source: <strong style={{ color: '#00E5FF' }}>{selectedWaterSource?.name}</strong>
            </div>
          </div>
        </div>

        {isLoadingRisk ? (
          <span className="glass-pill" style={{ fontSize: '11px', color: '#38BDF8' }}>
            <Loader2 size={12} className="animate-spin" /> Evaluating...
          </span>
        ) : isRiskUnavailable ? (
          <span className="glass-pill" style={{ fontSize: '11px', color: '#94A3B8', borderColor: 'rgba(148, 163, 184, 0.3)' }}>
            Unassessed
          </span>
        ) : (
          <RiskBadge level={level} score={score} size="md" />
        )}
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
        {isLoadingRisk ? (
          <div style={{ height: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#38BDF8' }}>
            <Loader2 size={32} className="animate-spin" />
            <span style={{ fontSize: '12px' }}>Querying ML Risk Assessment...</span>
          </div>
        ) : isRiskUnavailable ? (
          <div style={{ height: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#94A3B8', textAlign: 'center', padding: '0 20px' }}>
            <AlertCircle size={32} color="#64748B" />
            <strong style={{ fontSize: '13px', color: '#CBD5E1' }}>Risk Data Unavailable</strong>
            <span style={{ fontSize: '11px', color: '#64748B' }}>No batch inference record has been generated for this water body yet.</span>
          </div>
        ) : (
          <>
            {/* SVG Circular Progress Ring */}
            <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="75"
                  cy="75"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
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
                  fontSize: '34px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: '#F8FAFC',
                  lineHeight: '1'
                }}>
                  {typeof score === 'number' ? score.toFixed(2) : '--'}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  marginTop: '4px'
                }}>
                  Risk Score
                </div>
              </div>
            </div>

            {/* Quick Metrics Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '140px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>Model Version</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#00E5FF', fontFamily: 'var(--font-mono)' }}>
                  {activeRiskData?.modelVersion || 'v1.0 (Isolation Forest)'}
                </div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>Target Entity</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#F8FAFC' }}>
                  {selectedWaterSource?.sourceId}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Contributing Factors & Disclaimers */}
      <div style={{
        background: 'rgba(7, 11, 20, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '12px 14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#E2E8F0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Contributing Anomaly Features
          </span>
          <span style={{ fontSize: '10px', color: '#64748B' }}>11-Feature Vector</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px' }}>
          {contributingFactors && Object.entries(contributingFactors).slice(0, 4).map(([key, val]) => (
            <span
              key={key}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '3px 8px',
                borderRadius: '6px',
                color: '#CBD5E1'
              }}
            >
              <strong>{key}:</strong> {typeof val === 'number' ? val : String(val)}
            </span>
          ))}
        </div>

        <div style={{ fontSize: '9.5px', color: '#64748B', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
          Prototype Association • Monitoring Reach • No Clinical Diagnosis
        </div>
      </div>
    </div>
  );
}
