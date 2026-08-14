import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Activity, Sparkles } from 'lucide-react';

export function RiskBadge({ level, score, showIcon = true, size = 'md' }) {
  const normalizedLevel = (level || 'LOW').toUpperCase();

  const config = {
    LOW: {
      label: 'LOW RISK',
      sublabel: 'Normal Monitoring',
      icon: ShieldCheck,
      classes: 'badge-risk-low',
      dotColor: '#34D399'
    },
    MEDIUM: {
      label: 'MEDIUM RISK',
      sublabel: 'Attention Required',
      icon: AlertTriangle,
      classes: 'badge-risk-medium',
      dotColor: '#FBBF24'
    },
    HIGH: {
      label: 'HIGH RISK',
      sublabel: 'Elevated Early Warning',
      icon: AlertOctagon,
      classes: 'badge-risk-high',
      dotColor: '#F87171'
    }
  }[normalizedLevel] || {
    label: 'UNKNOWN',
    sublabel: 'Status Pending',
    icon: Activity,
    classes: 'badge-risk-low',
    dotColor: '#94A3B8'
  };

  const IconComponent = config.icon;
  const isLarge = size === 'lg';

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-semibold ${config.classes} ${isLarge ? 'text-sm px-4 py-1.5' : 'text-xs'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: isLarge ? '6px 16px' : '4px 12px', borderRadius: '9999px', fontWeight: 600, fontSize: isLarge ? '14px' : '12px' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: config.dotColor, boxShadow: `0 0 8px ${config.dotColor}`, display: 'inline-block' }} />
      {showIcon && <IconComponent size={isLarge ? 16 : 13} />}
      <span>{config.label}</span>
      {score !== undefined && (
        <span style={{ opacity: 0.75, borderLeft: '1px solid currentColor', paddingLeft: '6px', marginLeft: '2px', fontFamily: 'var(--font-mono)' }}>
          {Number(score).toFixed(2)}
        </span>
      )}
    </span>
  );
}

export function StatusBadge({ status = 'Online', isLive = true }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 12px',
      borderRadius: '9999px',
      background: 'rgba(15, 23, 42, 0.7)',
      border: '1px solid rgba(0, 229, 255, 0.2)',
      fontSize: '12px',
      fontWeight: 500,
      color: '#E2E8F0'
    }}>
      <span style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '8px',
        height: '8px'
      }}>
        <span style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          backgroundColor: isLive ? '#10B981' : '#F59E0B',
          opacity: 0.75,
          animation: 'pingRadar 2s cubic-bezier(0, 0, 0.2, 1) infinite'
        }} />
        <span style={{
          position: 'relative',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isLive ? '#10B981' : '#F59E0B'
        }} />
      </span>
      <span>System Status: <strong style={{ color: isLive ? '#34D399' : '#FBBF24' }}>{status}</strong></span>
    </div>
  );
}
