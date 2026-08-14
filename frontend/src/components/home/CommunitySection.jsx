import React from 'react';
import { useApp } from '../../context/AppContext';
import { Users, HeartHandshake, ShieldCheck, ArrowRight, Lock } from 'lucide-react';

export function CommunitySection() {
  const { setActiveTab } = useApp();

  return (
    <section style={{ padding: '90px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
      <div className="container-custom">
        <div className="glass-panel" style={{
          padding: '60px 40px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(13, 21, 39, 0.85) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Ambient Glow */}
          <div className="ambient-glow ambient-emerald" style={{ top: '-20%', right: '-10%', width: '350px', height: '350px' }} />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '40px',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1
          }}>
            <div>
              <div className="glass-pill" style={{ color: '#34D399', borderColor: 'rgba(52, 211, 153, 0.3)', marginBottom: '16px' }}>
                <HeartHandshake size={14} /> COMMUNITY-DRIVEN SURVEILLANCE
              </div>
              <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, marginBottom: '18px', lineHeight: 1.2 }}>
                Your Community Data Can Help Detect Risk Earlier.
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
                When community health workers and residents report observed symptoms, WaterGuard AI aggregates counts at the location level to correlate with physical water readings, detecting biological risk spikes before clinics become overwhelmed.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#E2E8F0' }}>
                  <Lock size={15} color="#34D399" />
                  <span><strong>Zero PII Policy:</strong> No patient names, phone numbers, or individual identities are ever gathered.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#E2E8F0' }}>
                  <ShieldCheck size={15} color="#34D399" />
                  <span><strong>Fast 30-Second Reporting:</strong> Simplified counter tallies designed for mobile devices.</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveTab('village');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.35)' }}
              >
                <span>Submit Village Report</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Visual symptom cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px'
            }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#F87171', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                  Fever
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Thermal anomaly signal</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#FBBF24', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                  Diarrhea
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Waterborne pathogen proxy</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#38BDF8', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                  Vomiting
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Acute toxicity indicator</div>
              </div>

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#A855F7', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
                  Abdominal
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Gastrointestinal distress</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
