import React from 'react';
import { Droplet, Shield, Cpu, ExternalLink, Activity, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function Footer() {
  const { setActiveTab } = useApp();

  const handleNav = (tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer style={{
      marginTop: 'auto',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      background: '#04070D',
      padding: '60px 0 30px',
      color: '#94A3B8',
      fontSize: '14px'
    }}>
      <div className="container-custom">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '40px',
          marginBottom: '40px'
        }}>
          {/* Col 1: Brand & Mission */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #00E5FF 0%, #0284C7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#070B14'
              }}>
                <Droplet size={18} />
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 800, color: '#F8FAFC' }}>
                WATERGUARD <span style={{ color: '#00E5FF' }}>AI</span>
              </span>
            </div>
            <p style={{ lineHeight: 1.6, color: '#94A3B8', fontSize: '13px', marginBottom: '16px' }}>
              Autonomous environmental intelligence and spatial early-warning platform fusing multi-modal water telemetry, crowdsourced symptom indicators, and weather context.
            </p>
            <div className="glass-pill" style={{ fontSize: '11px', color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
              <Cpu size={12} /> TENET SRCAS Hackathon 3.0
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontSize: '14px', fontWeight: 700, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Platform Navigation
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', padding: 0 }}>
              <li>
                <button onClick={() => handleNav('home')} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
                  Home Landing & Architecture
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('dashboard')} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
                  GIS Command Center
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('mcp')} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
                  MCP AI Intelligence Assistant
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('village')} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
                  Community Health Report Form
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Architecture & Security */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontSize: '14px', fontWeight: 700, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Pipeline
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#64748B' }}>
              <div>• <strong>Sensors:</strong> ESP32 (pH, TDS, Turbidity, Temp)</div>
              <div>• <strong>Backend:</strong> Node.js REST API with X-API-KEY</div>
              <div>• <strong>Storage:</strong> MongoDB Geospatial Collections</div>
              <div>• <strong>AI Engine:</strong> Python Scikit-learn (Isolation Forest)</div>
              <div>• <strong>Interface:</strong> React 18 GIS Leaflet Dashboard</div>
              <div>• <strong>MCP Layer:</strong> NitroStack Read-Only Tool Protocol</div>
            </div>
          </div>

          {/* Col 4: Important Public Health Disclaimer */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontSize: '14px', fontWeight: 700, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} color="#00E5FF" /> Regulatory Notice
            </h4>
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '12px',
              lineHeight: 1.5,
              color: '#94A3B8'
            }}>
              <strong>Early-Warning Risk Indicator Only:</strong>
              <br />
              WaterGuard AI calculates a location-level environmental risk metric based on anomaly detection. It does <strong>not</strong> diagnose individual disease or assert clinical medical probabilities.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          paddingTop: '24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          fontSize: '12px',
          color: '#64748B'
        }}>
          <div>
            © {new Date().getFullYear()} WaterGuard AI. Built for <strong>TENET SRCAS Hackathon 3.0</strong>.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>Status: <strong style={{ color: '#10B981' }}>Operational</strong></span>
            <span>API Version: <strong style={{ color: '#F8FAFC' }}>v1.0 (REST)</strong></span>
            <span>ML Model: <strong style={{ color: '#00E5FF' }}>Isolation Forest v1.0</strong></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
