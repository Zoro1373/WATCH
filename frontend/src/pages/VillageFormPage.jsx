import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { submitSymptomReport } from '../services/api';
import confetti from 'canvas-confetti';
import { HeartHandshake, MapPin, Send, CheckCircle2, AlertCircle, Plus, Minus, Home, Sparkles } from 'lucide-react';

export function VillageFormPage() {
  const { villagesList, waterSourcesList, addCommunityReport, setActiveTab } = useApp();

  const [selectedVillageId, setSelectedVillageId] = useState(villagesList[0]?.villageId || 'VIL_MAJ_001');

  const [feverCount, setFeverCount] = useState(0);
  const [diarrheaCount, setDiarrheaCount] = useState(0);
  const [vomitingCount, setVomitingCount] = useState(0);
  const [abdominalPainCount, setAbdominalPainCount] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const currentVillage = villagesList.find(v => v.villageId === selectedVillageId) || villagesList[0];
  const parentWaterSource = currentVillage && waterSourcesList.find(s => s.sourceId === currentVillage.primaryWaterSourceId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!selectedVillageId) {
      setErrorMessage('Please select a registered Assam village settlement.');
      return;
    }

    const totalReported = feverCount + diarrheaCount + vomitingCount + abdominalPainCount;
    if (totalReported === 0) {
      setErrorMessage('Please report at least 1 observed symptom count before submitting.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      villageId: selectedVillageId,
      timestamp: new Date().toISOString(),
      feverCount: parseInt(feverCount, 10),
      diarrheaCount: parseInt(diarrheaCount, 10),
      vomitingCount: parseInt(vomitingCount, 10),
      abdominalPainCount: parseInt(abdominalPainCount, 10)
    };

    try {
      const res = await submitSymptomReport(payload);
      setIsSubmitting(false);
      setSuccessMessage(`✅ Report for ${currentVillage?.name || selectedVillageId} submitted successfully! Data attributed to ${parentWaterSource?.name || currentVillage?.primaryWaterSourceId} and queued for ML inference. Redirecting you to the dashboard in 2.5 seconds...`);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00E5FF', '#10B981', '#38BDF8']
      });

      addCommunityReport(payload);

      // Reset counters after success
      setFeverCount(0);
      setDiarrheaCount(0);
      setVomitingCount(0);
      setAbdominalPainCount(0);

      // Navigate to dashboard after 2.5 seconds so user sees their data
      setTimeout(() => {
        setActiveTab('dashboard');
      }, 2500);
    } catch (err) {
      setIsSubmitting(false);
      const msg = err.error?.message || err.message || 'Failed to submit report. Please verify connection and try again.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="container-custom" style={{ padding: '40px 24px 90px', maxWidth: '820px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div className="glass-pill" style={{ color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.3)', marginBottom: '14px' }}>
          <HeartHandshake size={14} /> PUBLIC HEALTH COMMUNITY INTAKE
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, marginBottom: '10px' }}>
          Community Health Report
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '15px', maxWidth: '620px', margin: '0 auto' }}>
          Submit community-level symptom observations for registered Assam settlements to enable early anomaly detection and waterborne epidemic prevention.
        </p>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="glass-panel" style={{
        padding: '36px',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
      }}>

        {/* Success Banner */}
        {successMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '12px',
            padding: '16px 20px',
            color: '#34D399',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '28px'
          }}>
            <CheckCircle2 size={20} color="#10B981" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            padding: '16px 20px',
            color: '#F87171',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '28px'
          }}>
            <AlertCircle size={20} color="#EF4444" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* 1. Village Selection Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Home size={18} color="#10B981" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
              1. Select Registered Assam Village / Settlement
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {villagesList.map(vil => {
              const isSelected = selectedVillageId === vil.villageId;
              const source = waterSourcesList.find(s => s.sourceId === vil.primaryWaterSourceId);

              return (
                <div
                  key={vil.villageId}
                  onClick={() => setSelectedVillageId(vil.villageId)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: isSelected ? '#10B981' : 'rgba(255, 255, 255, 0.08)',
                    background: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 0 16px rgba(16, 185, 129, 0.25)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '14px', color: isSelected ? '#A7F3D0' : '#F8FAFC' }}>
                      🏡 {vil.name}
                    </strong>
                    <span style={{ fontSize: '10px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                      {vil.villageId}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '4px' }}>
                    <strong>District:</strong> {vil.district}
                  </div>
                  <div style={{ fontSize: '10px', color: '#00E5FF' }}>
                    Associated: {source ? source.name : vil.primaryWaterSourceId}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            fontSize: '11px',
            color: '#64748B',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '8px 12px',
            borderRadius: '8px',
            marginTop: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            Authoritative attribution flow: <strong>Symptom Report</strong> → <strong>villageId</strong> → <strong>primaryWaterSourceId</strong> → <strong>ML Anomaly Risk Evaluation</strong>. Zero coordinate guessing used.
          </div>
        </div>

        {/* 2. Symptom Counters Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sparkles size={18} color="#00E5FF" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
              2. Observed Community Symptom Counts (Past 24 Hours)
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            
            {/* Fever */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>Fever Cases</span>
                <span style={{ fontSize: '11px', color: '#F87171', fontWeight: 700 }}>Thermal Indicator</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setFeverCount(Math.max(0, feverCount - 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="0"
                  value={feverCount}
                  onChange={(e) => setFeverCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  style={{ width: '70px', textAlign: 'center', fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC', padding: '6px' }}
                />
                <button
                  type="button"
                  onClick={() => setFeverCount(feverCount + 1)}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Diarrhea */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>Diarrhea Cases</span>
                <span style={{ fontSize: '11px', color: '#FBBF24', fontWeight: 700 }}>GI Signal</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setDiarrheaCount(Math.max(0, diarrheaCount - 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="0"
                  value={diarrheaCount}
                  onChange={(e) => setDiarrheaCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  style={{ width: '70px', textAlign: 'center', fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC', padding: '6px' }}
                />
                <button
                  type="button"
                  onClick={() => setDiarrheaCount(diarrheaCount + 1)}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Vomiting */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>Vomiting Cases</span>
                <span style={{ fontSize: '11px', color: '#38BDF8', fontWeight: 700 }}>Acute Distress</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setVomitingCount(Math.max(0, vomitingCount - 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="0"
                  value={vomitingCount}
                  onChange={(e) => setVomitingCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  style={{ width: '70px', textAlign: 'center', fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC', padding: '6px' }}
                />
                <button
                  type="button"
                  onClick={() => setVomitingCount(vomitingCount + 1)}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Abdominal Pain */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>Abdominal Pain Cases</span>
                <span style={{ fontSize: '11px', color: '#A855F7', fontWeight: 700 }}>Enteric Cramping</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setAbdominalPainCount(Math.max(0, abdominalPainCount - 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="0"
                  value={abdominalPainCount}
                  onChange={(e) => setAbdominalPainCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  style={{ width: '70px', textAlign: 'center', fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F8FAFC', padding: '6px' }}
                />
                <button
                  type="button"
                  onClick={() => setAbdominalPainCount(abdominalPainCount + 1)}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            background: isSubmitting
              ? 'rgba(16, 185, 129, 0.4)'
              : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#070B14',
            border: 'none',
            fontSize: '15px',
            fontWeight: 800,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.35)',
            transition: 'all 0.2s ease'
          }}
        >
          {isSubmitting ? (
            <span>Transmitting Report...</span>
          ) : (
            <>
              <Send size={18} />
              <span>Submit Community Symptom Intake</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}
