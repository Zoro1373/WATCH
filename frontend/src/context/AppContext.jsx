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
          if (riskRes.unavailable || !riskRes.data) {
            if (isInitial) {
              setActiveRiskData(null);
              setIsRiskUnavailable(true);
            }
          } else {
            setActiveRiskData(riskRes.data);
            setIsRiskUnavailable(false);
          }
          if (weatherRes?.data) {
            setActiveWeatherData(weatherRes.data);
          }
        }
      } catch (err) {
        console.warn('Error loading water source risk:', err);
        if (isMounted && isInitial) {
          setIsRiskUnavailable(true);
        }
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
  }, [selectedWaterSource]);

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

    // Optimistically update the symptom counts in the dashboard right away
    setActiveRiskData(prev => {
      if (!prev) {
        // No live risk data yet — create a minimal record so the dashboard shows something
        return {
          waterSourceId: selectedWaterSource?.sourceId,
          riskScore: selectedWaterSource?.defaultScore || 0,
          riskLevel: selectedWaterSource?.defaultRisk || 'LOW',
          timestamp: new Date().toISOString(),
          contributingFactors: {
            feverCount: report.feverCount,
            diarrheaCount: report.diarrheaCount,
            vomitingCount: report.vomitingCount,
            abdominalPainCount: report.abdominalPainCount,
          }
        };
      }
      // Merge symptom counts into existing contributing factors
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

    // Also add a live alert for this submission
    const village = villagesList.find(v => v.villageId === report.villageId);
    const source = waterSourcesList.find(s => s.sourceId === village?.primaryWaterSourceId);
    const total = report.feverCount + report.diarrheaCount + report.vomitingCount + report.abdominalPainCount;
    if (total > 0) {
      const newAlert = {
        id: 'alt_live_' + Date.now(),
        waterSourceId: source?.sourceId || 'UNKNOWN',
        locationName: village?.name || report.villageId,
        level: total >= 10 ? 'HIGH' : total >= 5 ? 'MEDIUM' : 'LOW',
        title: 'Community Report Submitted',
        message: `New symptom report from ${village?.name || report.villageId}: ${total} total cases reported (Fever: ${report.feverCount}, Diarrhea: ${report.diarrheaCount}, Vomiting: ${report.vomitingCount}, Abdominal Pain: ${report.abdominalPainCount}).`,
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
