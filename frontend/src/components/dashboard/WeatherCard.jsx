import React from 'react';
import { useApp } from '../../context/AppContext';
import { CloudRain, Sun, Droplets, Wind, Info, CloudLightning } from 'lucide-react';

export function WeatherCard() {
  const { selectedNode, activeWeatherData } = useApp();

  const weather = activeWeatherData || selectedNode?.defaultWeather || {
    temperature: 28.0,
    precipitation: 0.0,
    humidity: 75
  };

  const isRain = weather.precipitation > 0;
  const isHeavyRain = weather.precipitation > 10.0;

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isHeavyRain ? <CloudLightning size={18} /> : <CloudRain size={18} />}
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>
              Weather & Environmental Context
            </h3>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              Meteorological Catalysts • Ingested via <code>GET /api/weather/:location</code>
            </div>
          </div>
        </div>

        <span className="glass-pill" style={{ fontSize: '11px', color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
          Hourly Cache
        </span>
      </div>

      {/* 3 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        
        {/* Ambient Temp */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '4px' }}>
            Ambient Temp
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F8FAFC' }}>
            {weather.temperature} <span style={{ fontSize: '11px', color: '#64748B' }}>°C</span>
          </div>
          <div style={{ fontSize: '10px', color: '#38BDF8', marginTop: '4px' }}>
            Surface Atmosphere
          </div>
        </div>

        {/* Precipitation */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '4px' }}>
            Precipitation
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: isRain ? '#38BDF8' : '#F8FAFC' }}>
            {weather.precipitation} <span style={{ fontSize: '11px', color: '#64748B' }}>mm</span>
          </div>
          <div style={{ fontSize: '10px', color: isRain ? '#38BDF8' : '#64748B', marginTop: '4px' }}>
            {isHeavyRain ? 'Run-off Alert' : isRain ? 'Light Showers' : 'Dry Conditions'}
          </div>
        </div>

        {/* Relative Humidity */}
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, marginBottom: '4px' }}>
            Humidity
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#F8FAFC' }}>
            {weather.humidity} <span style={{ fontSize: '11px', color: '#64748B' }}>%</span>
          </div>
          <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>
            Relative Moisture
          </div>
        </div>

      </div>

      {/* Surface Runoff Explanation Note */}
      <div style={{
        background: isHeavyRain ? 'rgba(239, 68, 68, 0.08)' : 'rgba(56, 189, 248, 0.05)',
        border: `1px solid ${isHeavyRain ? 'rgba(239, 68, 68, 0.25)' : 'rgba(56, 189, 248, 0.15)'}`,
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '12px',
        color: '#CBD5E1',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Info size={14} color={isHeavyRain ? '#EF4444' : '#38BDF8'} style={{ flexShrink: 0 }} />
        <span>
          {isHeavyRain
            ? 'Heavy rainfall increases topsoil erosion and agricultural/sewage runoff into community reservoirs.'
            : 'Weather factors provide environmental context for unsupervised anomaly detection.'}
        </span>
      </div>

    </div>
  );
}
