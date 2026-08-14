import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { submitSymptomReport } from '../services/api';
import confetti from 'canvas-confetti';
import { HeartHandshake, MapPin, Send, CheckCircle2, AlertCircle, Plus, Minus, Lock, RefreshCw, Sparkles } from 'lucide-react';

export function VillageFormPage() {
  const { nodesList, addCommunityReport } = useApp();

  const [selectedNodeId, setSelectedNodeId] = useState(nodesList[0]?.nodeId || 'NODE001');
  const [latitude, setLatitude] = useState(nodesList[0]?.latitude || 11.0168);
  const [longitude, setLongitude] = useState(nodesList[0]?.longitude || 76.9558);

  const [feverCount, setFeverCount] = useState(0);
  const [diarrheaCount, setDiarrheaCount] = useState(0);
  const [vomitingCount, setVomitingCount] = useState(0);
  const [abdominalPainCount, setAbdominalPainCount] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Handle Preset node selection
  const handleNodeChange = (nodeId) => {
    setSelectedNodeId(nodeId);
    const found = nodesList.find(n => n.nodeId === nodeId);
    if (found) {
      setLatitude(found.latitude);
      setLongitude(found.longitude);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    // Validation
    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setErrorMessage('Please enter a valid Latitude between -90 and 90.');
      return;
    }
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setErrorMessage('Please enter a valid Longitude between -180 and 180.');
      return;
    }

    const totalReported = feverCount + diarrheaCount + vomitingCount + abdominalPainCount;
    if (totalReported === 0) {
      setErrorMessage('Please report at least 1 observed symptom count before submitting.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      location: {
        latitude: latNum,
        longitude: lonNum
      },
      timestamp: new Date().toISOString(),
      feverCount: parseInt(feverCount, 10),
      diarrheaCount: parseInt(diarrheaCount, 10),
      vomitingCount: parseInt(vomitingCount, 10),
      abdominalPainCount: parseInt(abdominalPainCount, 10)
    };

    try {
      const res = await submitSymptomReport(payload);
      setIsSubmitting(false);
      setSuccessMessage('Community report submitted successfully. Data has been queued for the next 15-minute ML risk inference cycle.');
      
      // Trigger festive celebratory confetti
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
    } catch (err) {
      setIsSubmitting(false);
      const msg = err.error?.message || 'Failed to submit report. Please verify connection and try again.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="container-custom" style={{ padding: '40px 24px 90px', maxWidth: '820px', margin: '0 auto' }}>
      
      {/* Page Header */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div className="glass-pill" style={{ color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.3)', marginBottom: '14px' }}>
          <HeartHandshake size={14} /> PUBLIC HEALTH COMMUNITY REPORT
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, marginBottom: '10px' }}>
          Community Health Report
        </h1>
        <p style={{ color: '#94A3B8', fontSize: '15px', maxWidth: '620px', margin: '0 auto' }}>
          Help WaterGuard AI understand emerging symptom patterns in your area to detect potential water contamination before an outbreak spreads.
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
            marginBottom: '24px'
          }}>
            <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', color: '#F8FAFC' }}>Community Report Accepted</strong>
              <span>{successMessage}</span>
            </div>
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
            marginBottom: '24px'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ display: 'block', color: '#F8FAFC' }}>Submission Error</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Section 1: Geographic Location Selection */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="#00E5FF" />
            <span>1. Monitored Village / Basin Location</span>
          </h3>

          {/* Quick Preset Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            {nodesList.map(node => {
              const isSelected = selectedNodeId === node.nodeId;
              return (
                <button
                  type="button"
                  key={node.nodeId}
                  onClick={() => handleNodeChange(node.nodeId)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid',
                    borderColor: isSelected ? '#00E5FF' : 'rgba(255, 255, 255, 0.1)',
                    background: isSelected ? 'rgba(0, 229, 255, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                    color: isSelected ? '#00E5FF' : '#CBD5E1',
                    fontSize: '13px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📍 {node.name} ({node.nodeId})
                </button>
              );
            })}
          </div>

          {/* Lat / Lon Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px', fontWeight: 600 }}>
                Latitude (-90 to 90)
              </label>
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(7, 11, 20, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#F8FAFC',
                  fontSize: '14px',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#94A3B8', marginBottom: '6px', fontWeight: 600 }}>
                Longitude (-180 to 180)
              </label>
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(7, 11, 20, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#F8FAFC',
                  fontSize: '14px',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Aggregated Symptom Tallies */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC', marginBottom: '8px' }}>
            2. Observed Symptom Counts (Aggregated Group Tally)
          </h3>
          <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
            Enter the number of individuals observed with symptoms in the reporting window.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            
            {/* Fever Counter */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#F8FAFC', display: 'block' }}>Fever</strong>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>High body temperature</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFeverCount(Math.max(0, feverCount - 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Minus size={16} />
                </button>
                <span style={{ minWidth: '32px', textAlign: 'center', fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F87171' }}>
                  {feverCount}
                </span>
                <button
                  type="button"
                  onClick={() => setFeverCount(feverCount + 1)}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(248, 113, 113, 0.2)', border: '1px solid rgba(248, 113, 113, 0.4)', color: '#F87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Diarrhea Counter */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#F8FAFC', display: 'block' }}>Diarrhea</strong>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>Watery loose stools</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setDiarrheaCount(Math.max(0, diarrheaCount - 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Minus size={16} />
                </button>
                <span style={{ minWidth: '32px', textAlign: 'center', fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#FBBF24' }}>
                  {diarrheaCount}
                </span>
                <button
                  type="button"
                  onClick={() => setDiarrheaCount(diarrheaCount + 1)}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#FBBF24', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Vomiting Counter */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#F8FAFC', display: 'block' }}>Vomiting</strong>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>Nausea & vomiting</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setVomitingCount(Math.max(0, vomitingCount - 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Minus size={16} />
                </button>
                <span style={{ minWidth: '32px', textAlign: 'center', fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38BDF8' }}>
                  {vomitingCount}
                </span>
                <button
                  type="button"
                  onClick={() => setVomitingCount(vomitingCount + 1)}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38BDF8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Abdominal Pain Counter */}
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong style={{ fontSize: '15px', color: '#F8FAFC', display: 'block' }}>Abdominal Pain</strong>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>Cramping & spasms</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAbdominalPainCount(Math.max(0, abdominalPainCount - 1))}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Minus size={16} />
                </button>
                <span style={{ minWidth: '32px', textAlign: 'center', fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#A855F7' }}>
                  {abdominalPainCount}
                </span>
                <button
                  type="button"
                  onClick={() => setAbdominalPainCount(abdominalPainCount + 1)}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.4)', color: '#A855F7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Privacy Assurance Banner */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: '#94A3B8'
        }}>
          <Lock size={16} color="#10B981" style={{ flexShrink: 0 }} />
          <span>
            <strong>Data Privacy Guaranteed:</strong> Submissions strictly contain numerical aggregates. No patient names, telephone numbers, or medical diagnoses are ever stored or processed.
          </span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.35)',
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span>Transmitting Community Report to Node.js Ingestion API...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Submit Community Health Report</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}
