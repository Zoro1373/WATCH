import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading WaterGuard telemetry...' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      gap: '16px',
      color: 'var(--text-secondary)'
    }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px solid rgba(0, 229, 255, 0.2)',
          borderTopColor: '#00E5FF',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{
          position: 'absolute',
          inset: '8px',
          borderRadius: '50%',
          border: '2px solid rgba(16, 185, 129, 0.2)',
          borderBottomColor: '#10B981',
          animation: 'spin 1.5s linear infinite reverse'
        }} />
      </div>
      <p style={{ fontSize: '14px', fontWeight: 500, color: '#94A3B8' }}>{message}</p>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function SkeletonCard({ height = '180px' }) {
  return (
    <div className="glass-panel" style={{
      height,
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }}>
      <div style={{ width: '40%', height: '18px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)' }} />
      <div style={{ width: '80%', height: '32px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.04)' }} />
      <div style={{ width: '60%', height: '14px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.03)' }} />
    </div>
  );
}

export function ErrorState({ title = 'Telemetry Unavailable', message = 'Unable to connect to live monitoring services. Displaying cached baseline.', onRetry }) {
  return (
    <div className="glass-panel" style={{
      padding: '24px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      background: 'rgba(245, 158, 11, 0.05)'
    }}>
      <AlertCircle size={24} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '15px', color: '#FBBF24', marginBottom: '4px' }}>{title}</h4>
        <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: onRetry ? '12px' : '0' }}>{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn-ghost" style={{ fontSize: '12px', padding: '6px 12px' }}>
            <RefreshCw size={14} /> Retry Connection
          </button>
        )}
      </div>
    </div>
  );
}
