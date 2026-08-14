import React from 'react';
import { useApp } from '../../context/AppContext';
import { Droplet, Activity, CheckCircle2, AlertTriangle, AlertOctagon, Thermometer } from 'lucide-react';

export function SensorCard() {
  const { selectedNode } = useApp();
  const water = selectedNode?.defaultWater || { ph: 7.0, tds: 300, turbidity: 2.5, temperature: 27.0 };

  // Status thresholds for water quality
  const getPhStatus = (ph) => {
    if (ph >= 6.5 && ph <= 8.5) return { label: 'Optimal', color: '#10B981', level: 'safe' };
    if (ph >= 6.0 && ph <= 9.0) return { label: 'Sub-Optimal', color: '#F59E0B', level: 'warn' };
    return { label: 'Critical Acidity/Alkalinity', color: '#EF4444', level: 'crit' };
  };

  const getTdsStatus = (tds) => {
    if (tds <= 300) return { label: 'Excellent', color: '#10B981', level: 'safe' };
    if (tds <= 500) return { label: 'Acceptable', color: '#38BDF8', level: 'safe' };
    if (tds <= 900) return { label: 'Elevated Solids', color: '#F59E0B', level: 'warn' };
    return { label: 'High Contamination', color: '#EF4444', level: 'crit' };
  };

  const getTurbidityStatus = (turbidity) => {
    if (turbidity < 3.0) return { label: 'Clear', color: '#10B981', level: 'safe' };
    if (turbidity <= 5.0) return { label: 'Acceptable Limit', color: '#F59E0B', level: 'warn' };
    return { label: 'Particulate Hazard', color: '#EF4444', level: 'crit' };
  };

  const phStatus = getPhStatus(water.ph);
  const tdsStatus = getTdsStatus(water.tds);
  const turbStatus = getTurbidityStatus(water.turbidity);

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Card Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(0, 229, 255, 0.15)', color: '#00E5FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Droplet size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
              Water Quality Telemetry
            </h3>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              Direct Sensor Array • Node: <code style={{ color: '#00E5FF' }}>{selectedNode?.nodeId}</code>
            </div>
          </div>
        </div>

        <span className="glass-pill" style={{ fontSize: '11px', color: '#34D399', borderColor: 'rgba(52, 211, 153, 0.3)' }}>
          4/4 Sensors Active
        </span>
      </div>

      {/* Grid of 4 sensor parameters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
        
        {/* pH Card */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>pH Index</span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: phStatus.color, boxShadow: `0 0 6px ${phStatus.color}` }} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F8FAFC', marginBottom: '2px' }}>
            {water.ph}
          </div>
          <div style={{ fontSize: '10px', color: phStatus.color, fontWeight: 600 }}>
            {phStatus.label}
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${(water.ph / 14) * 100}%`, height: '100%', background: phStatus.color }} />
          </div>
        </div>

        {/* TDS Card */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>TDS Density</span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tdsStatus.color, boxShadow: `0 0 6px ${tdsStatus.color}` }} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F8FAFC', marginBottom: '2px' }}>
            {water.tds} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>ppm</span>
          </div>
          <div style={{ fontSize: '10px', color: tdsStatus.color, fontWeight: 600 }}>
            {tdsStatus.label}
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (water.tds / 800) * 100)}%`, height: '100%', background: tdsStatus.color }} />
          </div>
        </div>

        {/* Turbidity Card */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>Turbidity</span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: turbStatus.color, boxShadow: `0 0 6px ${turbStatus.color}` }} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F8FAFC', marginBottom: '2px' }}>
            {water.turbidity} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>NTU</span>
          </div>
          <div style={{ fontSize: '10px', color: turbStatus.color, fontWeight: 600 }}>
            {turbStatus.label}
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (water.turbidity / 12) * 100)}%`, height: '100%', background: turbStatus.color }} />
          </div>
        </div>

        {/* Water Temperature */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8' }}>Water Temp</span>
            <Thermometer size={12} color="#38BDF8" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F8FAFC', marginBottom: '2px' }}>
            {water.temperature} <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748B' }}>°C</span>
          </div>
          <div style={{ fontSize: '10px', color: '#38BDF8', fontWeight: 600 }}>
            DS18B20 Submerged
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (water.temperature / 45) * 100)}%`, height: '100%', background: '#38BDF8' }} />
          </div>
        </div>

      </div>

      <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
        <span>Sampling Rate: <strong>5-minute intervals</strong></span>
        <span>Payload: <code>POST /api/sensor</code></span>
      </div>
    </div>
  );
}
