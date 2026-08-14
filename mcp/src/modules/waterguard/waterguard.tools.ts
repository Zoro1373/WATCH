import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { WaterGuardService } from './waterguard.service.js';

export class WaterGuardTools {
  private service = new WaterGuardService();

  // =========================================================================
  // 1. NEW ASSAM GEOGRAPHY READ TOOLS
  // =========================================================================

  /**
   * Tool: list_water_sources
   * Lists all monitored Assam water sources from GET /api/water-sources.
   * Strictly read-only; retrieves dynamic backend data.
   */
  @Tool({
    name: 'list_water_sources',
    description: 'Retrieve all registered monitored water sources and wetlands across Assam from the WaterGuard backend.',
    inputSchema: z.object({})
  })
  async listWaterSources(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Executing list_water_sources');

    const result = await this.service.fetchWaterSources(ctx.logger);

    if (!result.success || !result.data) {
      return {
        status: 'error',
        error: result.error?.message || 'Unable to retrieve water sources list from backend.',
        disclaimer: 'Prototype Association • Environmental Surveillance Reach'
      };
    }

    return {
      status: 'success',
      totalSources: result.data.length,
      waterSources: result.data,
      disclaimer: 'Prototype Association • Environmental Surveillance Reach • Not a verified municipal drinking network'
    };
  }

  /**
   * Tool: get_water_source_details
   * Retrieves specific water source metadata from GET /api/water-sources/:sourceId.
   * Strictly read-only.
   */
  @Tool({
    name: 'get_water_source_details',
    description: 'Retrieve detailed metadata and linked village IDs for a specific water source by its canonical identifier (e.g., SRC_001).',
    inputSchema: z.object({
      sourceId: z.string().describe("Unique identifier of the monitored water source, e.g. 'SRC_001', 'SRC_002', 'SRC_003'")
    })
  })
  async getWaterSourceDetails(input: { sourceId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Executing get_water_source_details for sourceId: ${input.sourceId}`);

    const result = await this.service.fetchWaterSourceById(input.sourceId, ctx.logger);

    if (!result.success || !result.data) {
      return {
        status: 'error',
        sourceId: input.sourceId,
        error: result.error?.message || `Water source '${input.sourceId}' not found.`,
        disclaimer: 'Prototype Association • Environmental Surveillance Reach'
      };
    }

    return {
      status: 'success',
      data: result.data,
      disclaimer: 'Prototype Association • Environmental Surveillance Reach • Not a verified municipal drinking network'
    };
  }

  /**
   * Tool: list_villages
   * Lists all registered Assam community settlements from GET /api/villages.
   * Strictly read-only.
   */
  @Tool({
    name: 'list_villages',
    description: 'Retrieve all registered Assam community settlements and their prototype water source associations.',
    inputSchema: z.object({})
  })
  async listVillages(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Executing list_villages');

    const result = await this.service.fetchVillages(ctx.logger);

    if (!result.success || !result.data) {
      return {
        status: 'error',
        error: result.error?.message || 'Unable to retrieve villages list from backend.',
        disclaimer: 'Prototype Association • Public Health Surveillance'
      };
    }

    return {
      status: 'success',
      totalVillages: result.data.length,
      villages: result.data,
      disclaimer: 'Prototype Association • Public Health Surveillance • No Clinical Diagnosis'
    };
  }

  /**
   * Tool: get_village_details
   * Retrieves specific village metadata from GET /api/villages/:villageId.
   * Strictly read-only.
   */
  @Tool({
    name: 'get_village_details',
    description: 'Retrieve detailed metadata and primary associated water source ID for a registered Assam village (e.g., VIL_MAJ_001).',
    inputSchema: z.object({
      villageId: z.string().describe("Unique identifier of the village settlement, e.g. 'VIL_MAJ_001', 'VIL_KAM_001', 'VIL_CAC_001'")
    })
  })
  async getVillageDetails(input: { villageId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Executing get_village_details for villageId: ${input.villageId}`);

    const result = await this.service.fetchVillageById(input.villageId, ctx.logger);

    if (!result.success || !result.data) {
      return {
        status: 'error',
        villageId: input.villageId,
        error: result.error?.message || `Village '${input.villageId}' not found.`,
        disclaimer: 'Prototype Association • Public Health Surveillance'
      };
    }

    return {
      status: 'success',
      data: result.data,
      disclaimer: 'Prototype Association • Public Health Surveillance • Authoritative primaryWaterSourceId association'
    };
  }

  /**
   * Tool: get_water_source_risk
   * Retrieves stored ML early-warning risk from GET /api/risk/source/:sourceId.
   * Strictly read-only; does NOT calculate or infer risk.
   */
  @Tool({
    name: 'get_water_source_risk',
    description: 'Retrieve the latest ML early-warning anomaly risk assessment for a monitored water source by sourceId (e.g., SRC_001).',
    inputSchema: z.object({
      sourceId: z.string().describe("Unique identifier of the monitored water source, e.g. 'SRC_001', 'SRC_002', 'SRC_003'")
    })
  })
  async getWaterSourceRisk(input: { sourceId: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Executing get_water_source_risk for sourceId: ${input.sourceId}`);

    const result = await this.service.fetchWaterSourceRisk(input.sourceId, ctx.logger);

    if (!result.success || !result.data) {
      if (result.error?.code === 'NOT_FOUND') {
        return {
          status: 'no_risk_data',
          waterSourceId: input.sourceId,
          message: result.error.message || `No risk assessment record has been generated for water source '${input.sourceId}' yet.`,
          disclaimer: 'Calculated as an environmental early-warning risk indicator; not a medical diagnosis.'
        };
      }

      return {
        status: 'error',
        waterSourceId: input.sourceId,
        error: result.error?.message || 'Unable to retrieve water source risk from backend.',
        disclaimer: 'Calculated as an environmental early-warning risk indicator; not a medical diagnosis.'
      };
    }

    const { waterSourceId, riskScore, riskLevel, timestamp, contributingFactors, modelVersion, location } = result.data;

    return {
      status: 'success',
      waterSourceId: waterSourceId || input.sourceId,
      riskScore,
      riskLevel,
      timestamp,
      location,
      modelVersion: modelVersion || 'v1.0 (Isolation Forest)',
      contributingFactors: contributingFactors || null,
      disclaimer: 'Calculated as an environmental early-warning risk indicator; not a medical diagnosis.'
    };
  }

  // =========================================================================
  // 2. PRESERVED LEGACY READ TOOLS
  // =========================================================================

  /**
   * Tool: get_location_risk
   * Returns existing backend risk assessment (riskScore, riskLevel, location, timestamp).
   * Strictly read-only; does not recalculate or modify risk.
   */
  @Tool({
    name: 'get_location_risk',
    description: 'Retrieve the latest ML early-warning risk assessment for a specified location from the WaterGuard backend.',
    inputSchema: z.object({
      location: z.string().describe("Location coordinates formatted as 'latitude,longitude', e.g., '26.9380,94.1620'")
    })
  })
  async getLocationRisk(input: { location: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Executing get_location_risk for location: ${input.location}`);
    
    const result = await this.service.fetchLocationRisk(input.location, ctx.logger);
    
    if (!result.success || !result.data) {
      return {
        status: 'error',
        location: input.location,
        error: result.error?.message || 'No risk data available for this location.',
        disclaimer: 'Calculated as an environmental early-warning risk indicator; not a medical diagnosis.'
      };
    }

    const { location, riskScore, riskLevel, timestamp, contributingFactors, waterSourceId } = result.data;

    return {
      status: 'success',
      location,
      waterSourceId: waterSourceId || null,
      riskScore,
      riskLevel,
      timestamp,
      contributingFactors: contributingFactors || null,
      disclaimer: 'Calculated as an environmental early-warning risk indicator; not a medical diagnosis.'
    };
  }

  /**
   * Tool: get_contributing_factors
   * Extracts stored contributingFactors from existing GET /api/risk/:location.
   * Strictly read-only; does not compute SHAP or recalculate attribution.
   */
  @Tool({
    name: 'get_contributing_factors',
    description: 'Retrieve the stored ML anomaly feature attribution breakdown for a specified location.',
    inputSchema: z.object({
      location: z.string().describe("Location coordinates formatted as 'latitude,longitude', e.g., '26.9380,94.1620'")
    })
  })
  async getContributingFactors(input: { location: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Executing get_contributing_factors for location: ${input.location}`);
    
    const result = await this.service.fetchLocationRisk(input.location, ctx.logger);
    
    if (!result.success || !result.data) {
      return {
        status: 'error',
        location: input.location,
        error: result.error?.message || 'No contributing factor data available for this location.',
        disclaimer: 'Contributing features represent correlation signals from unsupervised Isolation Forest anomaly scoring; not causal medical claims.'
      };
    }

    return {
      status: 'success',
      location: result.data.location,
      waterSourceId: result.data.waterSourceId || null,
      riskLevel: result.data.riskLevel,
      riskScore: result.data.riskScore,
      contributingFactors: result.data.contributingFactors || {},
      disclaimer: 'Contributing features represent correlation signals from unsupervised Isolation Forest anomaly scoring; not causal medical claims.'
    };
  }

  /**
   * Tool: get_weather
   * Retrieves cached weather observations from GET /api/weather/:location.
   * Strictly read-only.
   */
  @Tool({
    name: 'get_weather',
    description: 'Retrieve contextual meteorological observations (temperature, precipitation, humidity) for a specified location.',
    inputSchema: z.object({
      location: z.string().describe("Location coordinates formatted as 'latitude,longitude', e.g., '26.9380,94.1620'")
    })
  })
  async getWeather(input: { location: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Executing get_weather for location: ${input.location}`);
    
    const result = await this.service.fetchLocationWeather(input.location, ctx.logger);
    
    if (!result.success || !result.data) {
      return {
        status: 'error',
        location: input.location,
        error: result.error?.message || 'No cached weather data available for this location.',
        disclaimer: 'Environmental context retrieved via WaterGuard backend weather service.'
      };
    }

    return {
      status: 'success',
      location: result.data.location,
      temperature: result.data.temperature,
      precipitation: result.data.precipitation,
      humidity: result.data.humidity,
      source: result.data.source,
      cachedAt: result.data.cachedAt,
      timestamp: result.data.timestamp,
      disclaimer: 'Environmental context retrieved via WaterGuard backend weather service.'
    };
  }

  /**
   * Tool: get_water_readings
   * Safe API-gap handler reporting that historical sensor readings are not exposed via MVP API contract.
   * Strictly does not fabricate data.
   */
  @Tool({
    name: 'get_water_readings',
    description: 'Query water-quality sensor telemetry (pH, TDS, turbidity, temperature) for a specified location.',
    inputSchema: z.object({
      location: z.string().describe("Location coordinates formatted as 'latitude,longitude', e.g., '26.9380,94.1620'")
    })
  })
  async getWaterReadings(input: { location: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Executing get_water_readings for location: ${input.location}`);
    
    return {
      status: 'api_contract_limitation',
      location: input.location,
      message: 'Historical water sensor reading queries are not currently exposed through the approved WaterGuard MVP API contract (API_CONTRACT.md). Current water telemetry features used in anomaly evaluation are integrated into the risk assessment.',
      suggestion: 'Use get_water_source_risk or get_location_risk to inspect the latest evaluation for this location.'
    };
  }

  /**
   * Tool: get_symptom_data
   * Safe API-gap handler reporting that historical symptom records are not exposed via MVP API contract.
   * Strictly does not fabricate data.
   */
  @Tool({
    name: 'get_symptom_data',
    description: 'Query aggregated community symptom reports (fever, diarrhea, vomiting, abdominal pain) for a specified location.',
    inputSchema: z.object({
      location: z.string().describe("Location coordinates formatted as 'latitude,longitude', e.g., '26.9380,94.1620'")
    })
  })
  async getSymptomData(input: { location: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Executing get_symptom_data for location: ${input.location}`);
    
    return {
      status: 'api_contract_limitation',
      location: input.location,
      message: 'Historical community symptom report queries are not currently exposed through the approved WaterGuard MVP API contract (API_CONTRACT.md). Symptom signals are crowdsourced and aggregated at the village/source level for ML inference.',
      suggestion: 'Use get_water_source_risk or get_location_risk to inspect symptom factors associated with the latest risk score.'
    };
  }

  /**
   * Tool: get_risk_history
   * Safe API-gap handler reporting that risk history time-series queries are not exposed via MVP API contract.
   * Strictly does not fabricate data.
   */
  @Tool({
    name: 'get_risk_history',
    description: 'Query historical risk score trend lines for a specified location.',
    inputSchema: z.object({
      location: z.string().describe("Location coordinates formatted as 'latitude,longitude', e.g., '26.9380,94.1620'")
    })
  })
  async getRiskHistory(input: { location: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Executing get_risk_history for location: ${input.location}`);
    
    return {
      status: 'api_contract_limitation',
      location: input.location,
      message: 'Historical risk score time-series queries are not currently exposed through the approved WaterGuard MVP API contract (API_CONTRACT.md). Only the most recent location risk evaluation is served via GET /api/risk/source/:sourceId or GET /api/risk/:location.',
      suggestion: 'Use get_water_source_risk to inspect the latest operational risk assessment.'
    };
  }
}
