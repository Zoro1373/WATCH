import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../../context/AppContext';
import { RiskBadge } from '../common/Badge';
import { Layers, Droplet, Home, ShieldCheck, Info } from 'lucide-react';

// Custom Map Controller to smoothly pan when active entity changes
function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.flyTo(center, zoom || 11, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Generate Custom Leaflet HTML icons for Water Sources
function createWaterSourceMarkerIcon(level, isSelected) {
  const color = level === 'HIGH' ? '#EF4444' : level === 'MEDIUM' ? '#F59E0B' : '#10B981';
  const size = isSelected ? 44 : 36;

  const html = `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    ">
      <div style="
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background-color: ${color};
        opacity: ${isSelected ? '0.5' : '0.25'};
        animation: pingRadar 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        position: relative;
        width: ${isSelected ? '24px' : '20px'};
        height: ${isSelected ? '24px' : '20px'};
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, #38BDF8 0%, ${color} 80%);
        border: 2px solid #FFFFFF;
        box-shadow: 0 0 16px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: #070B14;
        font-size: 11px;
      ">
        💧
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-water-source-marker',
    html: html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}

// Generate Custom Leaflet HTML icons for Villages
function createVillageMarkerIcon(isLinked, isSelected) {
  const color = isSelected ? '#00E5FF' : isLinked ? '#10B981' : '#64748B';
  const size = isSelected ? 32 : isLinked ? 26 : 22;

  const html = `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    ">
      <div style="
        width: 100%;
        height: 100%;
        border-radius: 6px;
        background-color: ${color};
        border: 1.5px solid #FFFFFF;
        box-shadow: 0 0 10px ${color}80;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #070B14;
        font-size: ${isSelected ? '13px' : '10px'};
        transform: rotate(45deg);
      ">
        <span style="transform: rotate(-45deg);">🏡</span>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-village-marker',
    html: html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}

export function GISMap() {
  const {
    waterSourcesList,
    villagesList,
    selectedWaterSource,
    setSelectedWaterSource,
    selectedVillage,
    setSelectedVillage,
    activeRiskData
  } = useApp();

  // Initial Assam Overview center
  const assamCenter = [26.1500, 92.9000];

  const currentCenter = selectedWaterSource
    ? [selectedWaterSource.latitude, selectedWaterSource.longitude]
    : assamCenter;

  const currentZoom = selectedWaterSource ? 12 : 7;

  return (
    <div className="glass-panel" style={{
      position: 'relative',
      height: '460px',
      overflow: 'hidden',
      border: '1px solid rgba(0, 229, 255, 0.25)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
    }}>
      {/* Top Floating Map Header Badge */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div className="glass-pill" style={{
          background: 'rgba(7, 11, 20, 0.85)',
          borderColor: 'rgba(0, 229, 255, 0.4)',
          color: '#F8FAFC',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
        }}>
          <Layers size={14} color="#00E5FF" />
          <span>Assam GIS Surveillance Layer • OpenStreetMap</span>
        </div>
      </div>

      {/* Map Legend Overlay */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        zIndex: 500,
        background: 'rgba(7, 11, 20, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '11px'
      }}>
        <span style={{ fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00E5FF' }} />
          <span style={{ color: '#E2E8F0' }}>💧 Monitored Water Source</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10B981', transform: 'rotate(45deg)' }} />
          <span style={{ color: '#A7F3D0' }}>🏡 Linked Village Settlement</span>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '4px', paddingTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', color: '#64748B' }}>Water Source Risk Tiers:</span>
          <div style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
            <span style={{ color: '#F87171' }}>● High</span>
            <span style={{ color: '#FBBF24' }}>● Med</span>
            <span style={{ color: '#34D399' }}>● Low</span>
          </div>
        </div>
      </div>

      {/* Leaflet Map React Container */}
      <MapContainer
        center={currentCenter}
        zoom={currentZoom}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewController center={currentCenter} zoom={currentZoom} />

        {/* 1. Render Water Sources Layer */}
        {waterSourcesList.map((source) => {
          const isSelected = selectedWaterSource?.sourceId === source.sourceId;
          const currentRiskLevel = isSelected && activeRiskData?.riskLevel
            ? activeRiskData.riskLevel
            : source.defaultRisk || 'LOW';

          const markerIcon = createWaterSourceMarkerIcon(currentRiskLevel, isSelected);

          return (
            <Marker
              key={source.sourceId}
              position={[source.latitude, source.longitude]}
              icon={markerIcon}
              eventHandlers={{
                click: () => {
                  setSelectedWaterSource(source);
                  setSelectedVillage(null);
                }
              }}
            >
              <Popup>
                <div style={{ padding: '6px 2px', minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '14px', color: '#F8FAFC' }}>{source.name}</strong>
                    <span style={{ fontSize: '11px', color: '#00E5FF', fontFamily: 'var(--font-mono)' }}>{source.sourceId}</span>
                  </div>

                  <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RiskBadge
                      level={currentRiskLevel}
                      score={isSelected && activeRiskData?.riskScore !== undefined ? activeRiskData.riskScore : source.defaultScore}
                      size="sm"
                    />
                    <span style={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase' }}>{source.type}</span>
                  </div>

                  <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '8px' }}>
                    <div><strong>District:</strong> {source.district || 'Assam'}</div>
                    <div><strong>Coordinates:</strong> {source.latitude.toFixed(4)}, {source.longitude.toFixed(4)}</div>
                    <div><strong>Monitoring:</strong> <span style={{ color: '#38BDF8' }}>{source.monitoringStatus}</span></div>
                    <div><strong>Linked Villages:</strong> {source.servedVillageIds ? source.servedVillageIds.join(', ') : 'None'}</div>
                  </div>

                  <div style={{
                    fontSize: '9.5px',
                    color: '#64748B',
                    background: 'rgba(255,255,255,0.04)',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    Prototype Association • Monitoring Reach
                  </div>

                  <button
                    onClick={() => setSelectedWaterSource(source)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #00E5FF 0%, #0284C7 100%)',
                      color: '#070B14',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Inspect Water Body Telemetry
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 2. Render Villages Layer */}
        {villagesList.map((village) => {
          const isLinked = selectedWaterSource?.sourceId === village.primaryWaterSourceId;
          const isSelected = selectedVillage?.villageId === village.villageId;
          const markerIcon = createVillageMarkerIcon(isLinked, isSelected);

          const parentSource = waterSourcesList.find(s => s.sourceId === village.primaryWaterSourceId);

          return (
            <Marker
              key={village.villageId}
              position={[village.latitude, village.longitude]}
              icon={markerIcon}
              eventHandlers={{
                click: () => {
                  setSelectedVillage(village);
                  if (parentSource) {
                    setSelectedWaterSource(parentSource);
                  }
                }
              }}
            >
              <Popup>
                <div style={{ padding: '6px 2px', minWidth: '210px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '13px', color: '#F8FAFC' }}>🏡 {village.name}</strong>
                    <span style={{ fontSize: '10px', color: '#10B981', fontFamily: 'var(--font-mono)' }}>{village.villageId}</span>
                  </div>

                  <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '8px' }}>
                    <div><strong>District:</strong> {village.district}</div>
                    <div><strong>Coordinates:</strong> {village.latitude.toFixed(4)}, {village.longitude.toFixed(4)}</div>
                    <div><strong>Associated Source:</strong> <span style={{ color: '#00E5FF' }}>{parentSource ? parentSource.name : village.primaryWaterSourceId}</span></div>
                  </div>

                  <div style={{
                    fontSize: '9.5px',
                    color: '#64748B',
                    background: 'rgba(255,255,255,0.04)',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    border: '1px solid rgba(255,255,255,0.06)'
                  }}>
                    Prototype Association • Monitoring Reach
                  </div>

                  <button
                    onClick={() => {
                      setSelectedVillage(village);
                      if (parentSource) setSelectedWaterSource(parentSource);
                    }}
                    style={{
                      width: '100%',
                      padding: '5px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#34D399',
                      border: '1px solid rgba(52, 211, 153, 0.4)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    View Associated Catchment
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
