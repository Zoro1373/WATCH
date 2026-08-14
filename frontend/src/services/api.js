import axios from 'axios';

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api';
const API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) || 'front_key_default';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': API_KEY,
  },
  timeout: 5000,
});

/**
 * Pre-configured monitored sensor node locations with regional identifiers.
 */
export const MONITORED_NODES = [
  {
    nodeId: 'NODE001',
    name: 'Perur Lake Basin',
    region: 'Coimbatore South',
    latitude: 11.0168,
    longitude: 76.9558,
    defaultRisk: 'HIGH',
    defaultScore: 0.76,
    defaultWater: { ph: 6.4, tds: 540, turbidity: 9.8, temperature: 29.4 },
    defaultSymptoms: { feverCount: 14, diarrheaCount: 8, vomitingCount: 5, abdominalPainCount: 6 },
    defaultWeather: { temperature: 28.5, precipitation: 14.2, humidity: 86 },
    contributingFactors: { turbidity: 0.35, feverCount: 0.28, precipitation: 0.21, ph: 0.16 }
  },
  {
    nodeId: 'NODE002',
    name: 'Singanallur Reservoir',
    region: 'Coimbatore East',
    latitude: 11.0215,
    longitude: 76.9621,
    defaultRisk: 'MEDIUM',
    defaultScore: 0.48,
    defaultWater: { ph: 7.1, tds: 380, turbidity: 4.2, temperature: 27.8 },
    defaultSymptoms: { feverCount: 4, diarrheaCount: 2, vomitingCount: 1, abdominalPainCount: 2 },
    defaultWeather: { temperature: 27.2, precipitation: 2.1, humidity: 74 },
    contributingFactors: { tds: 0.22, temperature: 0.18, humidity: 0.15 }
  },
  {
    nodeId: 'NODE003',
    name: 'Ukkadam Wetland Catchment',
    region: 'Coimbatore Central',
    latitude: 11.0093,
    longitude: 76.9510,
    defaultRisk: 'LOW',
    defaultScore: 0.19,
    defaultWater: { ph: 7.4, tds: 210, turbidity: 1.8, temperature: 26.5 },
    defaultSymptoms: { feverCount: 1, diarrheaCount: 0, vomitingCount: 0, abdominalPainCount: 1 },
    defaultWeather: { temperature: 26.8, precipitation: 0.0, humidity: 62 },
    contributingFactors: { ph: 0.08, temperature: 0.05 }
  }
];

/**
 * Fetch latest risk assessment for a coordinate pair (lat,lon).
 */
export async function fetchLocationRisk(lat, lon) {
  const locStr = `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
  try {
    const res = await client.get(`/risk/${locStr}`);
    if (res.data && res.data.success) {
      return { data: res.data.data, isLive: true };
    }
  } catch (err) {
    // Graceful fallback to static demo node representation
  }

  // Fallback matching closest node
  const match = MONITORED_NODES.find(n => 
    Math.abs(n.latitude - lat) < 0.05 && Math.abs(n.longitude - lon) < 0.05
  ) || MONITORED_NODES[0];

  return {
    data: {
      location: { latitude: lat, longitude: lon },
      riskScore: match.defaultScore,
      riskLevel: match.defaultRisk,
      timestamp: new Date().toISOString(),
      contributingFactors: match.contributingFactors
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

  const match = MONITORED_NODES.find(n => 
    Math.abs(n.latitude - lat) < 0.05 && Math.abs(n.longitude - lon) < 0.05
  ) || MONITORED_NODES[0];

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
    if (err.response && err.response.data) {
      throw err.response.data;
    }
    // Simulation fallback if backend offline
    return {
      success: true,
      message: "Symptom report accepted (Local Demo Mode)",
      data: {
        symptomId: "demo_" + Math.random().toString(36).substring(2, 9),
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
    const res = await axios.get('/health', { timeout: 2500 });
    return res.data && res.data.status === 'ok';
  } catch {
    return false;
  }
}
