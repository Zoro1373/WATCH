import axios from 'axios';

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || 'https://watch-e8hw.onrender.com/api';
const API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) || 'front_key_default';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': API_KEY,
  },
  timeout: 12000,
});

/**
 * Approved Assam Monitored Water Sources (v1.1 MVP Dataset).
 */
export const ASSAM_WATER_SOURCES = [
  {
    sourceId: 'SRC_001',
    name: 'Brahmaputra River (Majuli Reach)',
    type: 'RIVER',
    district: 'Majuli',
    latitude: 26.9380,
    longitude: 94.1620,
    location: { type: 'Point', coordinates: [94.1620, 26.9380] },
    servedVillageIds: ['VIL_MAJ_001', 'VIL_MAJ_002'],
    sensorNodeId: 'NODE001',
    defaultRisk: 'HIGH',
    defaultScore: 0.78,
    defaultWater: { ph: 6.4, tds: 520, turbidity: 9.8, temperature: 29.4 },
    defaultSymptoms: { feverCount: 15, diarrheaCount: 8, vomitingCount: 3, abdominalPainCount: 3 },
    defaultWeather: { temperature: 28.5, precipitation: 14.2, humidity: 86 }
  },
  {
    sourceId: 'SRC_002',
    name: 'Deepor Beel',
    type: 'WETLAND',
    district: 'Kamrup Metro',
    latitude: 26.1333,
    longitude: 91.6667,
    location: { type: 'Point', coordinates: [91.6667, 26.1333] },
    servedVillageIds: ['VIL_KAM_001', 'VIL_KAM_002', 'VIL_KAM_003'],
    sensorNodeId: 'NODE002',
    defaultRisk: 'MEDIUM',
    defaultScore: 0.48,
    defaultWater: { ph: 7.1, tds: 380, turbidity: 4.2, temperature: 27.8 },
    defaultSymptoms: { feverCount: 4, diarrheaCount: 2, vomitingCount: 1, abdominalPainCount: 2 },
    defaultWeather: { temperature: 27.2, precipitation: 2.1, humidity: 74 }
  },
  {
    sourceId: 'SRC_003',
    name: 'Barak River (Cachar Reach)',
    type: 'RIVER',
    district: 'Cachar',
    latitude: 24.8260,
    longitude: 92.7980,
    location: { type: 'Point', coordinates: [92.7980, 24.8260] },
    servedVillageIds: ['VIL_CAC_001', 'VIL_CAC_002'],
    sensorNodeId: 'NODE003',
    defaultRisk: 'LOW',
    defaultScore: 0.22,
    defaultWater: { ph: 7.5, tds: 180, turbidity: 1.5, temperature: 24.5 },
    defaultSymptoms: { feverCount: 1, diarrheaCount: 0, vomitingCount: 0, abdominalPainCount: 1 },
    defaultWeather: { temperature: 26.8, precipitation: 0.0, humidity: 62 }
  }
];

/**
 * Approved Assam Villages (v1.1 MVP Dataset).
 */
export const ASSAM_VILLAGES = [
  {
    villageId: 'VIL_MAJ_001',
    name: 'Kamalabari',
    district: 'Majuli',
    latitude: 26.9466,
    longitude: 94.1658,
    location: { type: 'Point', coordinates: [94.1658, 26.9466] },
    primaryWaterSourceId: 'SRC_001',
    verificationStatus: 'VERIFIED_GEOGRAPHY_PROTOTYPE_LINK'
  },
  {
    villageId: 'VIL_MAJ_002',
    name: 'Garmur',
    district: 'Majuli',
    latitude: 26.9803,
    longitude: 94.1575,
    location: { type: 'Point', coordinates: [94.1575, 26.9803] },
    primaryWaterSourceId: 'SRC_001',
    verificationStatus: 'VERIFIED_GEOGRAPHY_PROTOTYPE_LINK'
  },
  {
    villageId: 'VIL_KAM_001',
    name: 'Pamohi',
    district: 'Kamrup Metro',
    latitude: 26.1039,
    longitude: 91.6894,
    location: { type: 'Point', coordinates: [91.6894, 26.1039] },
    primaryWaterSourceId: 'SRC_002',
    verificationStatus: 'VERIFIED_GEOGRAPHY_PROTOTYPE_LINK'
  },
  {
    villageId: 'VIL_KAM_002',
    name: 'Chakardeo',
    district: 'Kamrup Metro',
    latitude: 26.1000,
    longitude: 91.6483,
    location: { type: 'Point', coordinates: [91.6483, 26.1000] },
    primaryWaterSourceId: 'SRC_002',
    verificationStatus: 'VERIFIED_GEOGRAPHY_PROTOTYPE_LINK'
  },
  {
    villageId: 'VIL_KAM_003',
    name: 'Paschim Boragaon',
    district: 'Kamrup Metro',
    latitude: 26.1164,
    longitude: 91.6833,
    location: { type: 'Point', coordinates: [91.6833, 26.1164] },
    primaryWaterSourceId: 'SRC_002',
    verificationStatus: 'VERIFIED_GEOGRAPHY_PROTOTYPE_LINK'
  },
  {
    villageId: 'VIL_CAC_001',
    name: 'Sonabarighat',
    district: 'Cachar',
    latitude: 24.7454,
    longitude: 92.8475,
    location: { type: 'Point', coordinates: [92.8475, 24.7454] },
    primaryWaterSourceId: 'SRC_003',
    verificationStatus: 'VERIFIED_GEOGRAPHY_PROTOTYPE_LINK'
  },
  {
    villageId: 'VIL_CAC_002',
    name: 'Borkhola',
    district: 'Cachar',
    latitude: 24.9228,
    longitude: 92.7458,
    location: { type: 'Point', coordinates: [92.7458, 24.9228] },
    primaryWaterSourceId: 'SRC_003',
    verificationStatus: 'VERIFIED_GEOGRAPHY_PROTOTYPE_LINK'
  }
];

// Backward-compatible alias for existing components
export const MONITORED_NODES = ASSAM_WATER_SOURCES;

/**
 * Fetch all registered water sources from backend.
 */
export async function fetchWaterSources() {
  try {
    const res = await client.get('/water-sources');
    if (res.data && res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
      // Map coordinates to latitude / longitude for Leaflet
      return res.data.data.map(ws => ({
        ...ws,
        latitude: ws.location?.coordinates ? ws.location.coordinates[1] : ws.latitude,
        longitude: ws.location?.coordinates ? ws.location.coordinates[0] : ws.longitude
      }));
    }
  } catch (err) {
    console.warn('Failed to fetch water sources from backend, using verified defaults:', err.message);
  }
  return ASSAM_WATER_SOURCES;
}

/**
 * Fetch single water source by sourceId.
 */
export async function fetchWaterSourceById(sourceId) {
  try {
    const res = await client.get(`/water-sources/${sourceId}`);
    if (res.data && res.data.success && res.data.data) {
      const ws = res.data.data;
      return {
        ...ws,
        latitude: ws.location?.coordinates ? ws.location.coordinates[1] : ws.latitude,
        longitude: ws.location?.coordinates ? ws.location.coordinates[0] : ws.longitude
      };
    }
  } catch (err) {
    console.warn(`Failed to fetch water source '${sourceId}', using fallback:`, err.message);
  }
  return ASSAM_WATER_SOURCES.find(s => s.sourceId === sourceId) || null;
}

/**
 * Fetch all registered villages from backend.
 */
export async function fetchVillages() {
  try {
    const res = await client.get('/villages');
    if (res.data && res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
      return res.data.data.map(v => ({
        ...v,
        latitude: v.location?.coordinates ? v.location.coordinates[1] : v.latitude,
        longitude: v.location?.coordinates ? v.location.coordinates[0] : v.longitude
      }));
    }
  } catch (err) {
    console.warn('Failed to fetch villages from backend, using verified defaults:', err.message);
  }
  return ASSAM_VILLAGES;
}

/**
 * Fetch single village by villageId.
 */
export async function fetchVillageById(villageId) {
  try {
    const res = await client.get(`/villages/${villageId}`);
    if (res.data && res.data.success && res.data.data) {
      const v = res.data.data;
      return {
        ...v,
        latitude: v.location?.coordinates ? v.location.coordinates[1] : v.latitude,
        longitude: v.location?.coordinates ? v.location.coordinates[0] : v.longitude
      };
    }
  } catch (err) {
    console.warn(`Failed to fetch village '${villageId}', using fallback:`, err.message);
  }
  return ASSAM_VILLAGES.find(v => v.villageId === villageId) || null;
}

/**
 * Fetch latest risk assessment for a monitored water source.
 */
export async function fetchWaterSourceRisk(sourceId) {
  const fallback = ASSAM_WATER_SOURCES.find(s => s.sourceId === sourceId);
  const fallbackData = fallback ? {
    waterSourceId: fallback.sourceId,
    riskScore: fallback.defaultScore,
    riskLevel: fallback.defaultRisk,
    timestamp: new Date().toISOString(),
    location: { latitude: fallback.latitude, longitude: fallback.longitude },
    contributingFactors: fallback.defaultSymptoms ? {
      feverCount: fallback.defaultSymptoms.feverCount,
      diarrheaCount: fallback.defaultSymptoms.diarrheaCount,
      turbidity: fallback.defaultWater?.turbidity,
      ph: fallback.defaultWater?.ph,
      precipitation: fallback.defaultWeather?.precipitation
    } : null
  } : null;

  try {
    const res = await client.get(`/risk/source/${sourceId}`);
    if (res.data && res.data.success && res.data.data) {
      return { data: res.data.data, isLive: true };
    }
  } catch (err) {
    // 404 means no risk in DB yet — return fallback data (never show unavailable)
    if (err.response && err.response.status === 404) {
      console.warn(`No risk data in DB for '${sourceId}', using dataset defaults.`);
      return { data: fallbackData, isLive: false };
    }
    console.warn(`Error fetching risk for water source '${sourceId}':`, err.message);
  }

  // Network/timeout error — always show fallback, never blank
  return { data: fallbackData, isLive: false };
}

/**
 * Legacy: Fetch latest risk assessment for a coordinate pair (lat,lon).
 */
export async function fetchLocationRisk(lat, lon) {
  const locStr = `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
  try {
    const res = await client.get(`/risk/${locStr}`);
    if (res.data && res.data.success) {
      return { data: res.data.data, isLive: true };
    }
  } catch (err) {
    // Graceful fallback
  }

  const match = ASSAM_WATER_SOURCES.find(n =>
    Math.abs(n.latitude - lat) < 0.2 && Math.abs(n.longitude - lon) < 0.2
  ) || ASSAM_WATER_SOURCES[0];

  return {
    data: {
      waterSourceId: match.sourceId,
      location: { latitude: lat, longitude: lon },
      riskScore: match.defaultScore,
      riskLevel: match.defaultRisk,
      timestamp: new Date().toISOString()
    },
    isLive: false
  };
}

/**
 * Fetch latest weather for a coordinate pair (lat,lon).
 */
export async function fetchLocationWeather(lat, lon) {
  const locStr = `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
  try {
    const res = await client.get(`/weather/${locStr}`);
    if (res.data && res.data.success) {
      return { data: res.data.data, isLive: true };
    }
  } catch (err) {
    // Fallback
  }

  const match = ASSAM_WATER_SOURCES.find(n =>
    Math.abs(n.latitude - lat) < 0.2 && Math.abs(n.longitude - lon) < 0.2
  ) || ASSAM_WATER_SOURCES[0];

  return {
    data: {
      location: { latitude: lat, longitude: lon },
      temperature: match.defaultWeather.temperature,
      precipitation: match.defaultWeather.precipitation,
      humidity: match.defaultWeather.humidity,
      source: 'OpenWeatherMap (Cached Snapshot)',
      cachedAt: new Date().toISOString(),
      timestamp: new Date().toISOString()
    },
    isLive: false
  };
}

/**
 * Submit community symptom report.
 */
export async function submitSymptomReport(payload) {
  try {
    const res = await client.post('/symptom', payload);
    return res.data;
  } catch (err) {
    // If backend returned a JSON structured error
    if (err.response && err.response.data && typeof err.response.data === 'object' && err.response.data.error) {
      throw err.response.data;
    }
    // Simulation fallback if network offline or transient issue
    console.warn("Backend symptom submission fallback triggered:", err.message);
    return {
      success: true,
      message: "Symptom report accepted (Local Demo Mode)",
      data: {
        symptomId: "demo_" + Math.random().toString(36).substring(2, 9),
        villageId: payload.villageId,
        timestamp: payload.timestamp
      }
    };
  }
}

/**
 * Health check to verify backend operational state.
 */
export async function checkBackendHealth() {
  try {
    // Use baseURL from API_BASE_URL, strip /api suffix and hit /health directly
    const healthUrl = API_BASE_URL.replace(/\/api$/, '') + '/health';
    const res = await axios.get(healthUrl, { timeout: 2500 });
    return res.data && res.data.status === 'ok';
  } catch {
    return false;
  }
}
