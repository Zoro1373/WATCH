import React from 'react';
import { Droplet, Users, CloudRain, Cpu, ArrowRight, ShieldCheck } from 'lucide-react';

export function HowItWorksSection() {
  const cards = [
    {
      step: '01',
      title: 'Water-Quality Monitoring',
      subtitle: 'Real-time telemetry inputs',
      icon: Droplet,
      accentColor: '#00E5FF',
      gradient: 'rgba(0, 229, 255, 0.1)',
      items: [
        { label: 'pH Level', desc: 'Acidity & alkalinity baseline (0–14)' },
        { label: 'Total Dissolved Solids', desc: 'Mineral & salt density in ppm' },
        { label: 'Turbidity', desc: 'Light-scattering suspended particulates (NTU)' },
        { label: 'Water Temperature', desc: 'DS18B20 submersible thermal sensor (°C)' }
      ],
      tag: 'ESP32 Ingestion'
    },
    {
      step: '02',
      title: 'Community Symptoms',
      subtitle: 'Spatial health reporting',
      icon: Users,
      accentColor: '#10B981',
      gradient: 'rgba(16, 185, 129, 0.1)',
      items: [
        { label: 'Fever Count', desc: 'Elevated body temperature reports' },
        { label: 'Diarrhea Count', desc: 'Gastrointestinal distress signals' },
        { label: 'Vomiting Count', desc: 'Acute nausea & dehydration risk' },
        { label: 'Abdominal Pain', desc: 'Digestive cramping & inflammation' }
      ],
      tag: 'Aggregated / Zero PII'
    },
    {
      step: '03',
      title: 'Weather Context',
      subtitle: 'Environmental catalysts',
      icon: CloudRain,
      accentColor: '#38BDF8',
      gradient: 'rgba(56, 189, 248, 0.1)',
      items: [
        { label: 'Precipitation', desc: 'Rainfall runoff washing contaminants into water' },
        { label: 'Ambient Temp', desc: 'Microbial bacterial growth velocity factor' },
        { label: 'Relative Humidity', desc: 'Atmospheric moisture saturation percentage' },
        { label: 'Hourly Cache', desc: 'Stored in MongoDB weather collection' }
      ],
      tag: 'Hourly Weather Cache'
    },
    {
      step: '04',
      title: 'AI Risk Analysis',
      subtitle: 'Isolation Forest anomaly model',
      icon: Cpu,
      accentColor: '#F59E0B',
      gradient: 'rgba(245, 158, 11, 0.1)',
      items: [
        { label: 'Isolation Forest', desc: 'Unsupervised tree-based anomaly detection' },
        { label: 'Normalized Score', desc: 'Continuous 0.0 to 1.0 risk indicator' },
        { label: 'Risk Categorization', desc: 'Thresholded to LOW, MEDIUM, or HIGH' },
        { label: 'Explainability', desc: 'Contributing factor attribution ranking' }
      ],
      tag: 'Python / Scikit-learn'
    }
  ];

  return (
    <section style={{ padding: '90px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', position: 'relative' }}>
      <div className="container-custom">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 60px' }}>
          <div className="glass-pill" style={{ color: '#00E5FF', borderColor: 'rgba(0, 229, 255, 0.3)', marginBottom: '16px' }}>
            <ShieldCheck size={14} /> MULTI-MODAL DATA FUSION
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, marginBottom: '16px' }}>
            How WaterGuard AI Operates
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '16px', lineHeight: 1.6 }}>
            Our pipeline bridges physical water sensor physics, anonymized community health signals, and ambient meteorological factors into an unsupervised anomaly detection engine.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.step}
                className="glass-panel-interactive"
                style={{
                  padding: '30px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Accent Top Border Bar */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: `linear-gradient(90deg, transparent, ${card.accentColor}, transparent)`
                }} />

                <div>
                  {/* Step and Icon Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: card.gradient,
                      border: `1px solid ${card.accentColor}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: card.accentColor
                    }}>
                      <Icon size={24} />
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#475569'
                    }}>
                      {card.step}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: '#F8FAFC' }}>
                    {card.title}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '20px' }}>
                    {card.subtitle}
                  </div>

                  {/* Bullet feature list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                    {card.items.map((item, idx) => (
                      <div key={idx} style={{ fontSize: '13px', lineHeight: 1.4 }}>
                        <strong style={{ color: '#E2E8F0', display: 'block' }}>{item.label}</strong>
                        <span style={{ color: '#64748B', fontSize: '12px' }}>{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Tag */}
                <div style={{
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span className="glass-pill" style={{ fontSize: '11px', padding: '4px 10px', color: card.accentColor, borderColor: `${card.accentColor}30` }}>
                    {card.tag}
                  </span>
                  <span style={{ color: '#475569', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                    ACTIVE PIPELINE
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Model Architecture Note */}
        <div style={{
          marginTop: '40px',
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 10px #F59E0B' }} />
            <div style={{ fontSize: '14px', color: '#CBD5E1' }}>
              <strong>Unsupervised Anomaly Model (v1.0):</strong> Utilizes <code>Isolation Forest</code> trained on baseline physical boundaries to score deviation without requiring pre-labeled clinical outbreak ground-truth.
            </div>
          </div>
          <span className="glass-pill" style={{ color: '#94A3B8', fontSize: '12px' }}>
            Scheduled Cron: */15 * * * *
          </span>
        </div>

      </div>
    </section>
  );
}
