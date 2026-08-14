import React, { createContext, useContext, useState, useEffect } from 'react';
import { MONITORED_NODES, checkBackendHealth, fetchLocationRisk, fetchLocationWeather } from '../services/api.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'dashboard', 'mcp', 'village'
  const [selectedNode, setSelectedNode] = useState(MONITORED_NODES[0]);
  const [nodesList] = useState(MONITORED_NODES);
  
  const [isBackendOnline, setIsBackendOnline] = useState(true);
  const [lastHeartbeat, setLastHeartbeat] = useState(new Date());

  const [activeRiskData, setActiveRiskData] = useState(null);
  const [activeWeatherData, setActiveWeatherData] = useState(null);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);

  // Recent system alerts
  const [alerts, setAlerts] = useState([
    {
      id: 'alt_001',
      nodeId: 'NODE001',
      locationName: 'Perur Lake Basin',
      level: 'HIGH',
      title: 'Elevated Early-Warning Risk Detected',
      message: 'Turbidity spike (9.8 NTU) combined with fever cluster (14 reports) and heavy rain (14.2 mm). Precautionary water boiling advisory recommended.',
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      factors: ['Turbidity (9.8 NTU)', 'Fever Spike (14)', 'Heavy Rainfall (14.2mm)']
    },
    {
      id: 'alt_002',
      nodeId: 'NODE002',
      locationName: 'Singanallur Reservoir',
      level: 'MEDIUM',
      title: 'Attention Required: TDS Metric Above Baseline',
      message: 'Total Dissolved Solids trending upward (540 ppm). Routine secondary testing recommended.',
      timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
      factors: ['TDS Increase', 'Moderate Rainfall']
    },
    {
      id: 'alt_003',
      nodeId: 'NODE003',
      locationName: 'Ukkadam Wetland Catchment',
      level: 'LOW',
      title: 'Routine Monitoring: Normal Status',
      message: 'All sensor nodes operating within standard physical baseline limits.',
      timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
      factors: ['Nominal Parameters']
    }
  ]);

  // Check health periodically
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

  // Fetch node data when selectedNode changes
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!selectedNode) return;
      setIsLoadingRisk(true);
      try {
        const [riskRes, weatherRes] = await Promise.all([
          fetchLocationRisk(selectedNode.latitude, selectedNode.longitude),
          fetchLocationWeather(selectedNode.latitude, selectedNode.longitude)
        ]);
        if (isMounted) {
          setActiveRiskData(riskRes.data);
          setActiveWeatherData(weatherRes.data);
        }
      } catch (err) {
        console.warn('Error loading location telemetry:', err);
      } finally {
        if (isMounted) setIsLoadingRisk(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [selectedNode]);

  const selectNodeById = (nodeId) => {
    const found = nodesList.find(n => n.nodeId === nodeId);
    if (found) {
      setSelectedNode(found);
    }
  };

  const addCommunityReport = (report) => {
    // Add toast or synthetic update
    console.log('Community report stored:', report);
  };

  return (
    <AppContext.Provider value={{
      activeTab,
      setActiveTab,
      selectedNode,
      setSelectedNode,
      selectNodeById,
      nodesList,
      isBackendOnline,
      lastHeartbeat,
      activeRiskData,
      activeWeatherData,
      isLoadingRisk,
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
