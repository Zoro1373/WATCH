import React from 'react';
import { useApp } from '../../context/AppContext';
import { Users, HeartPulse, ShieldCheck, ArrowUpRight } from 'lucide-react';

export function SymptomCard() {
  const { selectedNode, setActiveTab } = useApp();
  const symptoms = selectedNode?.defaultSymptoms || {
    feverCount: 0,
    diarrheaCount: 0,
    vomitingCount: 0,
    abdominalPainCount: 0
  };

  const totalSymptoms = symptoms.feverCount + symptoms.diarrheaCount + symptoms.vomitingCount + symptoms.abdominalPainCount;

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
              Community Health Signals
            </h3>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              Aggregated Spatial Reports • Region: <strong style={{ color: '#E2E8F0' }}>{selectedNode?.region}</strong>
            </div>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('village')}
          className="glass-pill"
          style={{ fontSize: '11px', color: '#34D399', borderColor: 'rgba(52, 211, 153, 0.3)', cursor: 'pointer' }}
        >
          <span>+ Report</span>
          <ArrowUpRight size={12} />
        </button>
      </div>

      {/* 4 Symptom Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        
        {/* Fever */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>
            <span>Fever Reports</span>
            <span style={{ color: '#F87171', fontWeight: 700 }}>Thermal</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F8FAFC' }}>
            {symptoms.feverCount}
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '6px' }}>
            <div style={{ width: `${Math.min(100, (symptoms.feverCount / 20) * 100)}%`, height: '100%', background: '#F87171' }} />
          </div>
        </div>

        {/* Diarrhea */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>
            <span>Diarrhea Reports</span>
            <span style={{ color: '#FBBF24', fontWeight: 700 }}>GI Signal</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F8FAFC' }}>
            {symptoms.diarrheaCount}
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '6px' }}>
            <div style={{ width: `${Math.min(100, (symptoms.diarrheaCount / 20) * 100)}%`, height: '100%', background: '#FBBF24' }} />
          </div>
        </div>

        {/* Vomiting */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>
            <span>Vomiting Reports</span>
            <span style={{ color: '#38BDF8', fontWeight: 700 }}>Acute</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F8FAFC' }}>
            {symptoms.vomitingCount}
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '6px' }}>
            <div style={{ width: `${Math.min(100, (symptoms.vomitingCount / 20) * 100)}%`, height: '100%', background: '#38BDF8' }} />
          </div>
        </div>

        {/* Abdominal Pain */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>
            <span>Abdominal Pain</span>
            <span style={{ color: '#A855F7', fontWeight: 700 }}>Distress</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F8FAFC' }}>
            {symptoms.abdominalPainCount}
          </div>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '6px' }}>
            <div style={{ width: `${Math.min(100, (symptoms.abdominalPainCount / 20) * 100)}%`, height: '100%', background: '#A855F7' }} />
          </div>
        </div>

      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', fontSize: '11px', color: '#64748B' }}>
        <span>Total Cluster Submissions: <strong style={{ color: '#E2E8F0' }}>{totalSymptoms}</strong></span>
        <span>Zero Individual Health Data Stored</span>
      </div>
    </div>
  );
}
