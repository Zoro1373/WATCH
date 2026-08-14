import React, { useState, useEffect } from 'react';
import { Waves, Server, Database, Brain, Gauge, Map, BellRing, ArrowRight, CheckCircle2 } from 'lucide-react';

export function PipelineSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: 0,
      title: 'Water Sensors',
      tech: 'ESP32 / IoT Sim',
      desc: 'pH, TDS, Turbidity, Temp',
      icon: Waves,
      color: '#00E5FF',
      sub: 'POST /api/sensor'
    },
    {
      id: 1,
      title: 'Node.js API',
      tech: 'Express.js & Auth',
      desc: 'X-API-KEY & Joi validation',
      icon: Server,
      color: '#38BDF8',
      sub: 'Port 3000 / Ingestion'
    },
    {
      id: 2,
      title: 'MongoDB',
      tech: 'Geospatial DB',
      desc: 'waterReadings, symptoms, weather',
      icon: Database,
      color: '#10B981',
      sub: '2dsphere GeoJSON'
    },
    {
      id: 3,
      title: 'AI / ML Engine',
      tech: 'Isolation Forest',
      desc: '15-min scheduled inference job',
      icon: Brain,
      color: '#F59E0B',
      sub: 'Scikit-learn v1.0'
    },
    {
      id: 4,
      title: 'Risk Scoring',
      tech: 'riskScores DB',
      desc: 'Normalized (0–1) & LOW/MED/HIGH',
      icon: Gauge,
      color: '#F43F5E',
      sub: 'riskScores collection'
    },
    {
      id: 5,
      title: 'GIS Dashboard',
      tech: 'React 18 & Leaflet',
      desc: 'Spatial visualization & layers',
      icon: Map,
      color: '#A855F7',
      sub: 'GET /api/risk'
    },
    {
      id: 6,
      title: 'Alert Service',
      tech: 'Public Health Alert',
      desc: 'Triggers on elevated risk',
      icon: BellRing,
      color: '#EF4444',
      sub: 'SMS / Push Webhook'
    }
  ];

  // Automatic progression for animated pipeline pulse
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <section style={{ padding: '90px 0', background: 'rgba(7, 11, 20, 0.6)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <div className="container-custom">
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 50px' }}>
          <div className="glass-pill" style={{ color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.3)', marginBottom: '16px' }}>
            <CheckCircle2 size={14} /> END-TO-END ARCHITECTURE
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, marginBottom: '16px' }}>
            Real-Time Data Pipeline
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.6 }}>
            Follow the live operational telemetry flow from physical sampling to AI anomaly inference and automated stakeholder alert dissemination.
          </p>
        </div>

        {/* Pipeline Steps Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '14px',
          position: 'relative'
        }}>
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isCurrent = activeStep === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setActiveStep(s.id)}
                style={{
                  background: isCurrent ? 'rgba(22, 34, 60, 0.95)' : 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid',
                  borderColor: isCurrent ? s.color : 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '20px 14px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isCurrent ? 'translateY(-6px)' : 'none',
                  boxShadow: isCurrent ? `0 8px 24px ${s.color}30` : 'none',
                  position: 'relative'
                }}
              >
                {/* Step indicator badge */}
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: isCurrent ? s.color : '#1E293B',
                  color: isCurrent ? '#070B14' : '#94A3B8',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  fontFamily: 'var(--font-mono)'
                }}>
                  0{idx + 1}
                </div>

                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: `${s.color}15`,
                  border: `1px solid ${s.color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '8px auto 14px',
                  color: s.color
                }}>
                  <Icon size={20} />
                </div>

                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px', color: isCurrent ? '#F8FAFC' : '#CBD5E1' }}>
                  {s.title}
                </h4>
                <div style={{ fontSize: '11px', color: s.color, fontWeight: 600, marginBottom: '6px' }}>
                  {s.tech}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.3 }}>
                  {s.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Step Deep Dive Banner */}
        <div style={{
          marginTop: '32px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: `1px solid ${steps[activeStep].color}50`,
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: steps[activeStep].color,
              boxShadow: `0 0 12px ${steps[activeStep].color}`
            }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC' }}>
                Stage 0{activeStep + 1}: {steps[activeStep].title} — <span style={{ color: steps[activeStep].color }}>{steps[activeStep].sub}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                {steps[activeStep].desc} • Adheres strictly to locked architecture in <code>PROJECT_ARCHITECTURE.md</code>.
              </div>
            </div>
          </div>
          <span className="glass-pill" style={{ color: steps[activeStep].color, fontSize: '12px', borderColor: `${steps[activeStep].color}40` }}>
            Stage Active
          </span>
        </div>

      </div>
    </section>
  );
}
