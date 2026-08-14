import React from 'react';
import { useApp } from '../../context/AppContext';
import { MapPin, ShieldCheck, Droplet, Home, Radio } from 'lucide-react';

export function LocationStats() {
  const {
    waterSourcesList,
    villagesList,
    selectedWaterSource,
    selectWaterSourceById,
    activeRiskData
  } = useApp();

  const highCount = waterSourcesList.filter(s => s.defaultRisk === 'HIGH').length;
  const mediumCount = waterSourcesList.filter(s => s.defaultRisk === 'MEDIUM').length;
  const lowCount = waterSourcesList.filter(s => s.defaultRisk === 'LOW').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
      {/* Top Banner with Title and Water Source Selector */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800 }}>
              Assam GIS Command Center
            </h1>
            <span className="glass-pill" style={{ fontSize: '11px', color: '#00E5FF', borderColor: 'rgba(0, 229, 255, 0.3)' }}>
              <Radio size={12} className="animate-pulse-glow" /> LIVE SURVEILLANCE
            </span>
          </div>
          <p style={{ color: '#94A3B8', fontSize: '13px' }}>
            Real-time geospatial water quality surveillance and early-warning anomaly scoring across Assam river basins & wetlands.
          </p>
        </div>

        {/* Quick Water Source Selector Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Active Water Body:</span>
          {waterSourcesList.map(source => {
            const isSelected = selectedWaterSource?.sourceId === source.sourceId;
            const currentRiskLevel = isSelected && activeRiskData?.riskLevel
              ? activeRiskData.riskLevel
              : source.defaultRisk || 'LOW';
            const badgeColor = currentRiskLevel === 'HIGH' ? '#EF4444' : currentRiskLevel === 'MEDIUM' ? '#F59E0B' : '#10B981';

            return (
              <button
                key={source.sourceId}
                onClick={() => selectWaterSourceById(source.sourceId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid',
                  borderColor: isSelected ? 'rgba(0, 229, 255, 0.6)' : 'rgba(255, 255, 255, 0.08)',
                  background: isSelected ? 'rgba(0, 229, 255, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                  color: isSelected ? '#00E5FF' : '#CBD5E1',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 0 14px rgba(0, 229, 255, 0.25)' : 'none'
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: badgeColor, boxShadow: `0 0 6px ${badgeColor}` }} />
                <span>{source.name}</span>
                <span style={{ color: '#64748B', fontFamily: 'var(--font-mono)' }}>({source.sourceId})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 Stat Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {/* Monitored Water Bodies */}
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Droplet size={22} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#F8FAFC' }}>
              {waterSourcesList.length}
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Monitored Water Bodies</div>
          </div>
        </div>

        {/* Registered Villages */}
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Home size={22} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#34D399' }}>
              {villagesList.length}
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Assam Catchment Villages</div>
          </div>
        </div>

        {/* Elevated Risk Bodies */}
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#F87171' }}>
              {highCount}
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>High Risk (Advisory)</div>
          </div>
        </div>

        {/* Active Telemetry Nodes */}
        <div className="glass-panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={22} />
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#38BDF8' }}>
              3 / 3
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Simulated Sensor Nodes</div>
          </div>
        </div>
      </div>
    </div>
  );
}
