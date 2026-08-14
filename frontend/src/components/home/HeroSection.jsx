import React from 'react';
import { useApp } from '../../context/AppContext';
import { HeroCanvas } from './HeroCanvas';
import { ArrowRight, ShieldAlert, Cpu, Activity, MapPin, Database } from 'lucide-react';

export function HeroSection() {
  const { setActiveTab } = useApp();

  return (
    <section style={{
      position: 'relative',
      minHeight: '88vh',
      display: 'flex',
      alignItems: 'center',
      padding: '70px 0 90px',
      overflow: 'hidden',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
    }}>
      {/* Background Hero Canvas Wave & Particle Visualizer */}
      <HeroCanvas />

      {/* Ambient background glow orbs */}
      <div className="ambient-glow ambient-cyan" style={{ top: '10%', left: '20%', width: '450px', height: '450px' }} />
      <div className="ambient-glow ambient-emerald" style={{ bottom: '15%', right: '15%', width: '400px', height: '400px' }} />

      <div className="container-custom" style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '980px', margin: '0 auto' }}>
        
        {/* Top Feature Pill */}
        <div style={{ display: 'inline-flex', marginBottom: '24px' }}>
          <div className="glass-pill" style={{
            borderColor: 'rgba(0, 229, 255, 0.35)',
            boxShadow: '0 0 20px rgba(0, 229, 255, 0.15)',
            color: '#E2E8F0'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#00E5FF',
              boxShadow: '0 0 8px #00E5FF'
            }} />
            <span>TENET SRCAS HACKATHON 3.0 • ENVIRONMENTAL INTELLIGENCE</span>
          </div>
        </div>

        {/* Main Hero Headline */}
        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 68px)',
          fontWeight: 900,
          letterSpacing: '-0.03em',
          lineHeight: 1.12,
          marginBottom: '24px',
        }} className="text-gradient-hero">
          Detect Water Contamination Before It Becomes an Outbreak.
        </h1>

        {/* Supporting Copy */}
        <p style={{
          fontSize: 'clamp(16px, 2vw, 20px)',
          lineHeight: 1.6,
          color: '#94A3B8',
          maxWidth: '820px',
          margin: '0 auto 36px',
          fontWeight: 400
        }}>
          WaterGuard AI combines <strong style={{ color: '#00E5FF', fontWeight: 600 }}>water-quality sensor telemetry</strong>, <strong style={{ color: '#34D399', fontWeight: 600 }}>community symptom signals</strong>, and <strong style={{ color: '#38BDF8', fontWeight: 600 }}>environmental weather context</strong> with unsupervised machine learning to generate a real-time <strong style={{ color: '#F8FAFC', fontWeight: 600 }}>location-level early-warning risk indicator</strong>.
        </p>

        {/* Hero CTA Buttons */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '54px'
        }}>
          <button
            onClick={() => {
              setActiveTab('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="btn-primary"
            style={{ fontSize: '16px', padding: '16px 36px' }}
          >
            <span>Explore Dashboard</span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={() => {
              setActiveTab('village');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="btn-secondary"
            style={{ fontSize: '16px', padding: '16px 32px' }}
          >
            <span>Report Community Symptoms</span>
          </button>
        </div>

        {/* Real-Time Platform Feature Badges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '20px'
        }}>
          <div className="glass-panel" style={{ padding: '16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF' }}>
              <Activity size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>4-Sensor Telemetry</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>pH • TDS • Turbidity • Temp</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
              <Cpu size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>Isolation Forest ML</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Unsupervised Anomaly Scoring</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8' }}>
              <MapPin size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>Interactive GIS</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Spatial Early-Warning Map</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
              <Database size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>Read-Only MCP AI</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>NitroStack Assistant Layer</div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
