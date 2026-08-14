import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useApp } from '../../context/AppContext';
import { RiskBadge } from '../common/Badge';
import { Maximize2, Layers, MapPin, Eye } from 'lucide-react';

// Custom Map Controller to smoothly pan when active node changes
function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && map) {
      map.flyTo(center, zoom || 14, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Generate Custom Leaflet pulsing HTML icons for each risk tier
function createRiskMarkerIcon(level, score, isSelected) {
  const color = level === 'HIGH' ? '#EF4444' : level === 'MEDIUM' ? '#F59E0B' : '#10B981';
  const size = isSelected ? 42 : 34;

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
        width: ${isSelected ? '22px' : '18px'};
        height: ${isSelected ? '22px' : '18px'};
        border-radius: 50%;
        background-color: ${color};
        border: 2px solid #FFFFFF;
        box-shadow: 0 0 16px ${color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: #070B14;
        font-size: 9px;
        font-weight: 800;
        font-family: var(--font-mono);
      ">
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}

export function GISMap() {
  const { nodesList, selectedNode, setSelectedNode } = useApp();

  const currentCenter = selectedNode 
    ? [selectedNode.latitude, selectedNode.longitude] 
    : [11.0168, 76.9558];

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
          <span>GIS Surveillance Layer • OpenStreetMap Tiles</span>
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
        <span style={{ fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Levels</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 6px #EF4444' }} />
          <span style={{ color: '#F87171' }}>High (Score ≥ 0.70)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', boxShadow: '0 0 6px #F59E0B' }} />
          <span style={{ color: '#FBBF24' }}>Medium (0.40 – 0.69)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
          <span style={{ color: '#34D399' }}>Low (&lt; 0.40)</span>
        </div>
      </div>

      {/* Leaflet Map React Container */}
      <MapContainer
        center={currentCenter}
        zoom={14}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewController center={currentCenter} zoom={14} />

        {nodesList.map((node) => {
          const isSelected = selectedNode?.nodeId === node.nodeId;
          const markerIcon = createRiskMarkerIcon(node.defaultRisk, node.defaultScore, isSelected);

          return (
            <Marker
              key={node.nodeId}
              position={[node.latitude, node.longitude]}
              icon={markerIcon}
              eventHandlers={{
                click: () => {
                  setSelectedNode(node);
                }
              }}
            >
              <Popup>
                <div style={{ padding: '6px 2px', minWidth: '190px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '14px', color: '#F8FAFC' }}>{node.name}</strong>
                    <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'var(--font-mono)' }}>{node.nodeId}</span>
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <RiskBadge level={node.defaultRisk} score={node.defaultScore} size="sm" />
                  </div>

                  <div style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '10px' }}>
                    <div><strong>Region:</strong> {node.region}</div>
                    <div><strong>Coordinates:</strong> {node.latitude}, {node.longitude}</div>
                    <div><strong>Turbidity:</strong> {node.defaultWater.turbidity} NTU</div>
                  </div>

                  <button
                    onClick={() => setSelectedNode(node)}
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
                    Inspect Telemetry
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
