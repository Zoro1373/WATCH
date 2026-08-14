import { Injectable, Logger } from '@nitrostack/core';

export interface ApiError {
  code: string;
  message: string;
  details?: any[];
}

export interface GeoLocation {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface WaterSourceItem {
  sourceId: string;
  name: string;
  type: string;
  location: GeoLocation;
  servedVillageIds: string[];
  monitoringStatus: string;
  sensorNodeId?: string | null;
}

export interface VillageItem {
  villageId: string;
  name: string;
  district: string;
  location: GeoLocation;
  primaryWaterSourceId: string;
  verificationStatus: string;
}

export interface WaterSourceRiskData {
  waterSourceId: string;
  riskScore: number;
  riskLevel: string;
  timestamp: string;
  location: GeoLocation | { latitude: number; longitude: number };
  modelVersion?: string;
  contributingFactors?: Record<string, any>;
}

export interface LocationRiskResult {
  success: boolean;
  data?: {
    location: { latitude: number; longitude: number };
    riskScore: number;
    riskLevel: string;
    timestamp: string;
    waterSourceId?: string;
    contributingFactors?: Record<string, number>;
  };
  error?: ApiError;
}

export interface LocationWeatherResult {
  success: boolean;
  data?: {
    location: { latitude: number; longitude: number };
    temperature: number;
    precipitation: number;
    humidity: number;
    source: string;
    cachedAt: string;
    timestamp: string;
  };
  error?: ApiError;
}

export interface GenericApiResult<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * WaterGuardService
 * 
 * Read-only service that queries the existing WaterGuard Backend REST API.
 * 
 * BOUNDARY RULES:
 * - Read-only: Makes only HTTP GET requests.
 * - Zero MongoDB connection or credentials.
 * - Attaches X-API-KEY header from server-side environment.
 * - Does not recalculate, modify, or infer any risk values.
 */
@Injectable()
export class WaterGuardService {
  private get backendUrl(): string {
    return process.env.WATERGUARD_BACKEND_URL || 'http://127.0.0.1:3000';
  }

  private get apiKey(): string {
    return process.env.WATERGUARD_API_KEY || 'front_key_default';
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': this.apiKey
    };
  }

  /**
   * Fetch all registered water sources from GET /api/water-sources
   */
  async fetchWaterSources(logger?: Logger): Promise<GenericApiResult<WaterSourceItem[]>> {
    const url = `${this.backendUrl}/api/water-sources`;
    if (logger) logger.info(`WaterGuardService: Fetching all water sources`);

    try {
      const response = await fetch(url, { method: 'GET', headers: this.headers });
      const json = (await response.json()) as any;

      if (!response.ok) {
        return {
          success: false,
          error: json?.error || {
            code: `HTTP_${response.status}`,
            message: `Backend returned HTTP status ${response.status}`
          }
        };
      }
      return json as GenericApiResult<WaterSourceItem[]>;
    } catch (err: any) {
      if (logger) logger.error(`WaterGuardService: Error connecting to backend: ${err.message}`);
      return {
        success: false,
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: `Unable to connect to WaterGuard Backend at ${this.backendUrl}. Service may be offline.`
        }
      };
    }
  }

  /**
   * Fetch details for a specific water source from GET /api/water-sources/:sourceId
   */
  async fetchWaterSourceById(sourceId: string, logger?: Logger): Promise<GenericApiResult<WaterSourceItem>> {
    const url = `${this.backendUrl}/api/water-sources/${encodeURIComponent(sourceId)}`;
    if (logger) logger.info(`WaterGuardService: Fetching water source '${sourceId}'`);

    try {
      const response = await fetch(url, { method: 'GET', headers: this.headers });
      const json = (await response.json()) as any;

      if (!response.ok) {
        return {
          success: false,
          error: json?.error || {
            code: `HTTP_${response.status}`,
            message: `Backend returned HTTP status ${response.status}`
          }
        };
      }
      return json as GenericApiResult<WaterSourceItem>;
    } catch (err: any) {
      if (logger) logger.error(`WaterGuardService: Error connecting to backend: ${err.message}`);
      return {
        success: false,
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: `Unable to connect to WaterGuard Backend at ${this.backendUrl}. Service may be offline.`
        }
      };
    }
  }

  /**
   * Fetch all registered villages from GET /api/villages
   */
  async fetchVillages(logger?: Logger): Promise<GenericApiResult<VillageItem[]>> {
    const url = `${this.backendUrl}/api/villages`;
    if (logger) logger.info(`WaterGuardService: Fetching all registered villages`);

    try {
      const response = await fetch(url, { method: 'GET', headers: this.headers });
      const json = (await response.json()) as any;

      if (!response.ok) {
        return {
          success: false,
          error: json?.error || {
            code: `HTTP_${response.status}`,
            message: `Backend returned HTTP status ${response.status}`
          }
        };
      }
      return json as GenericApiResult<VillageItem[]>;
    } catch (err: any) {
      if (logger) logger.error(`WaterGuardService: Error connecting to backend: ${err.message}`);
      return {
        success: false,
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: `Unable to connect to WaterGuard Backend at ${this.backendUrl}. Service may be offline.`
        }
      };
    }
  }

  /**
   * Fetch details for a specific village from GET /api/villages/:villageId
   */
  async fetchVillageById(villageId: string, logger?: Logger): Promise<GenericApiResult<VillageItem>> {
    const url = `${this.backendUrl}/api/villages/${encodeURIComponent(villageId)}`;
    if (logger) logger.info(`WaterGuardService: Fetching village '${villageId}'`);

    try {
      const response = await fetch(url, { method: 'GET', headers: this.headers });
      const json = (await response.json()) as any;

      if (!response.ok) {
        return {
          success: false,
          error: json?.error || {
            code: `HTTP_${response.status}`,
            message: `Backend returned HTTP status ${response.status}`
          }
        };
      }
      return json as GenericApiResult<VillageItem>;
    } catch (err: any) {
      if (logger) logger.error(`WaterGuardService: Error connecting to backend: ${err.message}`);
      return {
        success: false,
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: `Unable to connect to WaterGuard Backend at ${this.backendUrl}. Service may be offline.`
        }
      };
    }
  }

  /**
   * Fetch stored ML risk assessment for a water source from GET /api/risk/source/:sourceId
   */
  async fetchWaterSourceRisk(sourceId: string, logger?: Logger): Promise<GenericApiResult<WaterSourceRiskData>> {
    const url = `${this.backendUrl}/api/risk/source/${encodeURIComponent(sourceId)}`;
    if (logger) logger.info(`WaterGuardService: Fetching risk for water source '${sourceId}'`);

    try {
      const response = await fetch(url, { method: 'GET', headers: this.headers });
      const json = (await response.json()) as any;

      if (!response.ok) {
        return {
          success: false,
          error: json?.error || {
            code: `HTTP_${response.status}`,
            message: `Backend returned HTTP status ${response.status}`
          }
        };
      }
      return json as GenericApiResult<WaterSourceRiskData>;
    } catch (err: any) {
      if (logger) logger.error(`WaterGuardService: Error connecting to backend: ${err.message}`);
      return {
        success: false,
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: `Unable to connect to WaterGuard Backend at ${this.backendUrl}. Service may be offline.`
        }
      };
    }
  }

  /**
   * Fetch existing risk assessment from GET /api/risk/:location
   */
  async fetchLocationRisk(location: string, logger?: Logger): Promise<LocationRiskResult> {
    const url = `${this.backendUrl}/api/risk/${encodeURIComponent(location)}`;
    if (logger) logger.info(`WaterGuardService: Fetching risk for location ${location}`);

    try {
      const response = await fetch(url, { method: 'GET', headers: this.headers });
      const json = (await response.json()) as any;

      if (!response.ok) {
        return {
          success: false,
          error: json?.error || {
            code: `HTTP_${response.status}`,
            message: `Backend returned HTTP status ${response.status}`
          }
        };
      }
      return json as LocationRiskResult;
    } catch (err: any) {
      if (logger) logger.error(`WaterGuardService: Error connecting to backend: ${err.message}`);
      return {
        success: false,
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: `Unable to connect to WaterGuard Backend at ${this.backendUrl}. Service may be offline.`
        }
      };
    }
  }

  /**
   * Fetch cached weather observations from GET /api/weather/:location
   */
  async fetchLocationWeather(location: string, logger?: Logger): Promise<LocationWeatherResult> {
    const url = `${this.backendUrl}/api/weather/${encodeURIComponent(location)}`;
    if (logger) logger.info(`WaterGuardService: Fetching weather for location ${location}`);

    try {
      const response = await fetch(url, { method: 'GET', headers: this.headers });
      const json = (await response.json()) as any;

      if (!response.ok) {
        return {
          success: false,
          error: json?.error || {
            code: `HTTP_${response.status}`,
            message: `Backend returned HTTP status ${response.status}`
          }
        };
      }
      return json as LocationWeatherResult;
    } catch (err: any) {
      if (logger) logger.error(`WaterGuardService: Error connecting to backend: ${err.message}`);
      return {
        success: false,
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message: `Unable to connect to WaterGuard Backend at ${this.backendUrl}. Service may be offline.`
        }
      };
    }
  }
}
