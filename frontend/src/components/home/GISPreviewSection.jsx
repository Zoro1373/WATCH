import React from 'react';
import { useApp } from '../../context/AppContext';
import { Map, Layers, Radio, ArrowRight, ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';
import { RiskBadge } from '../common/Badge';

export function GISPreviewSection() {
  const { setActiveTab, selectNodeById } = useApp();

  const previewNodes = [
    { id: 'NODE001', name: 'Perur Lake Basin', lat: 11.0168, lon: 76.9558, level: 'HIGH', score: 0.76 },
    { id: 'NODE002', name: 'Singanallur Reservoir', lat: 11.0215, lon: 76.9621, level: 'MEDIUM', score: 0.48 },
    { id: 'NODE003', name: 'Ukkadam Wetland Catchment', lat: 11.0093, lon: 76.9510, level: 'LOW', score: 0.19 }
  ];

  return (
    <section style={{ padding: '90px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <div className="container-custom">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '40px',
          alignItems: 'center'
        }}>
          {/* Left Column: Descriptive text */}
          <div>
            <div className="glass-pill" style={{ color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.3)', marginBottom: '16px' }}>
              <Layers size={14} /> SPATIAL COMMAND & CONTROL
            </div>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, marginBottom: '20px', lineHeight: 1.2 }}>
              Monitor Water-Risk Conditions Spatially Across Locations.
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
              The GIS Command Center renders interactive geographic maps using Leaflet tiles, visualizing sensor node telemetry, community symptom clusters, and real-time environmental risk scores at high spatial resolution.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px #EF4444' }} />
                <span style={{ fontSize: '14px', color: '#E2E8F0' }}>
                  <strong>Elevated Risk Alerts:</strong> Immediate spatial visualization of anomalies.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 8px #F59E0B' }} />
                <span style={{ fontSize: '14px', color: '#E2E8F0' }}>
                  <strong>Contextual Overlays:</strong> Ingests weather radar and crowdsourced symptom reports.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                <span style={{ fontSize: '14px', color: '#E2E8F0' }}>
                  <strong>Interactive Inspector:</strong> Click any monitored point to drill down into raw sensor physics.
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="btn-primary"
            >
              <span>Launch Live GIS Command Center</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Right Column: Visual GIS Card Preview */}
          <div className="glass-panel" style={{
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              paddingBottom: '14px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Radio size={18} color="#00E5FF" className="animate-pulse-glow" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>
                  Regional Basin Network (Coimbatore GIS)
                </span>
              </div>
              <span className="glass-pill" style={{ fontSize: '11px', color: '#10B981', padding: '3px 10px' }}>
                3 Active Nodes
              </span>
            </div>

            {/* Simulated Map Visual Card with Nodes */}
            <div style={{
              height: '240px',
              borderRadius: '12px',
              background: 'radial-gradient(circle at 50% 50%, #0F1D36 0%, #080D1A 100%)',
              border: '1px solid rgba(0, 229, 255, 0.2)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              backgroundImage: 'radial-gradient(rgba(0, 229, 255, 0.1) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}>
              {/* GIS Grid Lines */}
              <div style={{
                position: 'absolute',
                inset: '20px',
                border: '1px dashed rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                pointerEvents: 'none'
              }} />

              {/* Monitored node markers on simulated map */}
              <div 
                onClick={() => { selectNodeById('NODE001'); setActiveTab('dashboard'); }}
                style={{
                  position: 'absolute',
                  top: '32%',
                  left: '26%',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#EF4444',
                  boxShadow: '0 0 16px #EF4444',
                  margin: '0 auto 4px',
                  border: '2px solid #FFFFFF'
                }} />
                <span style={{ fontSize: '10px', color: '#F87171', fontWeight: 700, background: 'rgba(7,11,20,0.85)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #EF444460' }}>
                  NODE001 (0.76)
                </span>
              </div>

              <div 
                onClick={() => { selectNodeById('NODE002'); setActiveTab('dashboard'); }}
                style={{
                  position: 'absolute',
                  top: '55%',
                  right: '25%',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#F59E0B',
                  boxShadow: '0 0 14px #F59E0B',
                  margin: '0 auto 4px',
                  border: '2px solid #FFFFFF'
                }} />
                <span style={{ fontSize: '10px', color: '#FBBF24', fontWeight: 700, background: 'rgba(7,11,20,0.85)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #F59E0B60' }}>
                  NODE002 (0.48)
                </span>
              </div>

              <div 
                onClick={() => { selectNodeById('NODE003'); setActiveTab('dashboard'); }}
                style={{
                  position: 'absolute',
                  bottom: '22%',
                  left: '42%',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#10B981',
                  boxShadow: '0 0 14px #10B981',
                  margin: '0 auto 4px',
                  border: '2px solid #FFFFFF'
                }} />
                <span style={{ fontSize: '10px', color: '#34D399', fontWeight: 700, background: 'rgba(7,11,20,0.85)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #10B98160' }}>
                  NODE003 (0.19)
                </span>
              </div>

              <span style={{ fontSize: '11px', color: '#64748B', position: 'absolute', bottom: '8px', right: '12px' }}>
                Spatial Resolution: 50km Cluster Radius
              </span>
            </div>

            {/* Quick node select list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {previewNodes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    selectNodeById(n.id);
                    setActiveTab('dashboard');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  className="preview-node-row"
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>{n.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                      ID: {n.id} • Lat: {n.lat}, Lon: {n.lon}
                    </div>
                  </div>
                  <RiskBadge level={n.level} score={n.score} size="sm" />
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
