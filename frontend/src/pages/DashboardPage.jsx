import React from 'react';
import { LocationStats } from '../components/dashboard/LocationStats';
import { GISMap } from '../components/dashboard/GISMap';
import { RiskScoreCard } from '../components/dashboard/RiskScoreCard';
import { SensorCard } from '../components/dashboard/SensorCard';
import { WeatherCard } from '../components/dashboard/WeatherCard';
import { SymptomCard } from '../components/dashboard/SymptomCard';
import { AlertsFeed } from '../components/dashboard/AlertsFeed';
import { useApp } from '../context/AppContext';

export function DashboardPage() {
  const { isLoadingRisk } = useApp();

  return (
    <div className="container-custom" style={{ padding: '36px 24px 80px' }}>
      {/* 1. Header & Location Statistics */}
      <LocationStats />

      {/* 2. Top Main Area: GIS Map (60%) + Risk Score Gauge Panel (40%) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ minWidth: '0' }}>
          <GISMap />
        </div>
        <div style={{ minWidth: '0' }}>
          <RiskScoreCard />
        </div>
      </div>

      {/* 3. Bottom Quad Grid: Sensor Telemetry, Weather Context, Symptoms, Alerts Feed */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px'
      }}>
        <SensorCard />
        <WeatherCard />
        <SymptomCard />
        <AlertsFeed />
      </div>
    </div>
  );
}
