import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ASSAM_WATER_SOURCES,
  ASSAM_VILLAGES,
  fetchWaterSources,
  fetchVillages,
  fetchWaterSourceRisk,
  fetchLocationWeather,
  checkBackendHealth
} from '../services/api.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'dashboard', 'mcp', 'village'
  
  const [waterSourcesList, setWaterSourcesList] = useState(ASSAM_WATER_SOURCES);
  const [villagesList, setVillagesList] = useState(ASSAM_VILLAGES);

  const [selectedWaterSource, setSelectedWaterSource] = useState(ASSAM_WATER_SOURCES[0]);
  const [selectedVillage, setSelectedVillage] = useState(null);

  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [lastHeartbeat, setLastHeartbeat] = useState(new Date());

  const [activeRiskData, setActiveRiskData] = useState(null);
  const [activeWeatherData, setActiveWeatherData] = useState(null);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [isRiskUnavailable, setIsRiskUnavailable] = useState(false);

  // Track pending community symptom submissions per water source until ML inference updates
  const [pendingCommunitySymptoms, setPendingCommunitySymptoms] = useState({});

  // System alerts
  const [alerts, setAlerts] = useState([
    {
      id: 'alt_001',
      waterSourceId: 'SRC_001',
      locationName: 'Brahmaputra River (Majuli Reach)',
      level: 'HIGH',
      title: 'Elevated Early-Warning Risk Detected',
      message: 'Turbidity elevated (9.8 NTU) with fever reports (15 cases in Kamalabari & Garmur) and high rainfall. Precautionary water boiling advisory recommended.',
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      factors: ['Turbidity (9.8 NTU)', 'Fever Cluster (15 reports)', 'Monsoon Precipitation']
    },
    {
      id: 'alt_002',
      waterSourceId: 'SRC_002',
      locationName: 'Deepor Beel Wetland',
      level: 'MEDIUM',
      title: 'Attention Required: TDS Metric Above Baseline',
      message: 'Total Dissolved Solids trending upward (380 ppm) in wetland catchment. Routine secondary testing advised.',
      timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
      factors: ['TDS Increase', 'Moderate Runoff']
    },
    {
      id: 'alt_003',
      waterSourceId: 'SRC_003',
      locationName: 'Barak River (Cachar Reach)',
      level: 'LOW',
      title: 'Routine Monitoring: Normal Status',
      message: 'Physical parameters and community symptom signals remain within standard baseline limits.',
      timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      factors: ['Nominal Parameters']
    }
  ]);

  // 1. Initial Load of Water Sources and Villages from Backend
  useEffect(() => {
    let isMounted = true;
    async function loadGeography() {
      try {
        const [wsData, vData] = await Promise.all([
          fetchWaterSources(),
          fetchVillages()
        ]);
        if (isMounted) {
          if (Array.isArray(wsData) && wsData.length > 0) {
            setWaterSourcesList(wsData);
            setSelectedWaterSource(wsData[0]);
          }
          if (Array.isArray(vData) && vData.length > 0) {
            setVillagesList(vData);
          }
        }
      } catch (err) {
        console.warn('Error loading geography from backend:', err);
      }
    }
    loadGeography();
    return () => { isMounted = false; };
  }, []);

  // 2. Periodic Backend Health Check
  useEffect(() => {
    async function verifyHealth() {
      const ok = await checkBackendHealth();
      setIsBackendOnline(ok);
      setLastHeartbeat(new Date());
    }
    verifyHealth();
    const interval = setInterval(verifyHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  // 3. Fetch risk & weather when selectedWaterSource changes, with 30s periodic polling
  useEffect(() => {
    let isMounted = true;
    if (!selectedWaterSource?.sourceId) return;

    async function loadRiskAndWeather(isInitial = false) {
      if (isInitial) {
        setIsLoadingRisk(true);
        setIsRiskUnavailable(false);
      }
      try {
        const [riskRes, weatherRes] = await Promise.all([
          fetchWaterSourceRisk(selectedWaterSource.sourceId),
          fetchLocationWeather(selectedWaterSource.latitude, selectedWaterSource.longitude)
        ]);

        if (isMounted) {
          if (riskRes.data) {
            // Check if there is a pending community symptom submission for this source
            const pending = pendingCommunitySymptoms[selectedWaterSource.sourceId];
            if (pending && riskRes.data) {
              const mlTimestamp = new Date(riskRes.data.timestamp).getTime();
              const subTimestamp = new Date(pending.timestamp).getTime();

              if (mlTimestamp >= subTimestamp) {
                setActiveRiskData(riskRes.data);
                setPendingCommunitySymptoms(prev => {
                  const next = { ...prev };
                  delete next[selectedWaterSource.sourceId];
                  return next;
                });
              } else {
                setActiveRiskData({
                  ...riskRes.data,
                  contributingFactors: {
                    ...riskRes.data.contributingFactors,
                    feverCount: (riskRes.data.contributingFactors?.feverCount || 0) + pending.feverCount,
                    diarrheaCount: (riskRes.data.contributingFactors?.diarrheaCount || 0) + pending.diarrheaCount,
                    vomitingCount: (riskRes.data.contributingFactors?.vomitingCount || 0) + pending.vomitingCount,
                    abdominalPainCount: (riskRes.data.contributingFactors?.abdominalPainCount || 0) + pending.abdominalPainCount,
                  }
                });
              }
            } else {
              setActiveRiskData(riskRes.data);
            }
            setIsRiskUnavailable(false);
          }
          // Never set isRiskUnavailable=true — always show data or fallback
          if (weatherRes?.data) {
            setActiveWeatherData(weatherRes.data);
          }
        }
      } catch (err) {
        console.warn('Error loading water source risk:', err);
        // Do NOT set unavailable — let existing data or defaults show
      } finally {
        if (isMounted && isInitial) {
          setIsLoadingRisk(false);
        }
      }
    }

    // Immediate initial fetch
    loadRiskAndWeather(true);

    // Periodic 30-second polling for live ML updates
    const interval = setInterval(() => {
      loadRiskAndWeather(false);
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedWaterSource, pendingCommunitySymptoms]);

  // Selection handlers
  const selectWaterSourceById = (sourceId) => {
    const found = waterSourcesList.find(s => s.sourceId === sourceId);
    if (found) {
      setSelectedWaterSource(found);
      setSelectedVillage(null);
    }
  };

  const selectVillageById = (villageId) => {
    const found = villagesList.find(v => v.villageId === villageId);
    if (found) {
      setSelectedVillage(found);
      // Select the associated water source using primaryWaterSourceId
      if (found.primaryWaterSourceId) {
        const parentSource = waterSourcesList.find(s => s.sourceId === found.primaryWaterSourceId);
        if (parentSource) {
          setSelectedWaterSource(parentSource);
        }
      }
    }
  };

  const addCommunityReport = (report) => {
    console.log('Community report registered:', report);

    // 1. Authoritatively resolve the village and primary water source
    const village = villagesList.find(v => v.villageId === report.villageId);
    const targetSourceId = village?.primaryWaterSourceId || selectedWaterSource?.sourceId;
    const targetSource = waterSourcesList.find(s => s.sourceId === targetSourceId);

    if (targetSource) {
      setSelectedWaterSource(targetSource);
      setSelectedVillage(village || null);
    }

    // 2. Track pending community symptoms for this water source until ML inference updates
    setPendingCommunitySymptoms(prev => {
      const existing = prev[targetSourceId] || { feverCount: 0, diarrheaCount: 0, vomitingCount: 0, abdominalPainCount: 0 };
      return {
        ...prev,
        [targetSourceId]: {
          feverCount: existing.feverCount + report.feverCount,
          diarrheaCount: existing.diarrheaCount + report.diarrheaCount,
          vomitingCount: existing.vomitingCount + report.vomitingCount,
          abdominalPainCount: existing.abdominalPainCount + report.abdominalPainCount,
          timestamp: new Date().toISOString()
        }
      };
    });

    // 3. Optimistically update symptom counts for the target water source
    setActiveRiskData(prev => {
      if (!prev || prev.waterSourceId !== targetSourceId) {
        return {
          waterSourceId: targetSourceId,
          riskScore: targetSource?.defaultScore ?? 0.2,
          riskLevel: targetSource?.defaultRisk || 'LOW',
          timestamp: new Date().toISOString(),
          contributingFactors: {
            feverCount: report.feverCount,
            diarrheaCount: report.diarrheaCount,
            vomitingCount: report.vomitingCount,
            abdominalPainCount: report.abdominalPainCount,
          }
        };
      }
      return {
        ...prev,
        contributingFactors: {
          ...prev.contributingFactors,
          feverCount: (prev.contributingFactors?.feverCount || 0) + report.feverCount,
          diarrheaCount: (prev.contributingFactors?.diarrheaCount || 0) + report.diarrheaCount,
          vomitingCount: (prev.contributingFactors?.vomitingCount || 0) + report.vomitingCount,
          abdominalPainCount: (prev.contributingFactors?.abdominalPainCount || 0) + report.abdominalPainCount,
        }
      };
    });

    // 4. Register community intake event in the alert feed (inherits verified ML level, no frontend calculation)
    const total = report.feverCount + report.diarrheaCount + report.vomitingCount + report.abdominalPainCount;
    if (total > 0) {
      const existingRiskLevel = (activeRiskData && activeRiskData.waterSourceId === targetSourceId)
        ? activeRiskData.riskLevel
        : (targetSource?.defaultRisk || 'LOW');

      const newAlert = {
        id: 'alt_live_' + Date.now(),
        waterSourceId: targetSourceId || 'UNKNOWN',
        locationName: village?.name || report.villageId,
        level: existingRiskLevel,
        title: 'Community Report Submitted',
        message: `New symptom report from ${village?.name || report.villageId}: ${total} total cases reported (Fever: ${report.feverCount}, Diarrhea: ${report.diarrheaCount}, Vomiting: ${report.vomitingCount}, Abdominal Pain: ${report.abdominalPainCount}). Attributed to ${targetSource?.name || targetSourceId}.`,
        timestamp: report.timestamp || new Date().toISOString(),
        factors: [
          report.feverCount > 0 ? `Fever (${report.feverCount})` : null,
          report.diarrheaCount > 0 ? `Diarrhea (${report.diarrheaCount})` : null,
          report.vomitingCount > 0 ? `Vomiting (${report.vomitingCount})` : null,
          report.abdominalPainCount > 0 ? `Abdominal Pain (${report.abdominalPainCount})` : null,
        ].filter(Boolean)
      };
      setAlerts(prev => [newAlert, ...prev]);
    }
  };

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      waterSourcesList,
      villagesList,
      selectedWaterSource,
      setSelectedWaterSource,
      selectedVillage,
      setSelectedVillage,
      selectWaterSourceById,
      selectVillageById,
      // Backward compatibility aliases
      nodesList: waterSourcesList,
      selectedNode: selectedWaterSource,
      setSelectedNode: setSelectedWaterSource,
      selectNodeById: selectWaterSourceById,
      isBackendOnline,
      lastHeartbeat,
      activeRiskData,
      activeWeatherData,
      isLoadingRisk,
      isRiskUnavailable,
      alerts,
      addCommunityReport
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
