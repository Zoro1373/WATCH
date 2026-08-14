import { MONITORED_NODES, fetchLocationRisk, fetchLocationWeather } from './api.js';

/**
 * MCP Read-Only Tools Simulation & Assistant Inference Service.
 * Adheres strictly to the 6 read-only MCP tools in README.md & AI_ML_SPEC.md.
 */

export const MCP_TOOLS = [
  { name: 'get_location_risk', description: 'Retrieve latest risk score and risk level for a geographic point.' },
  { name: 'get_water_readings', description: 'Retrieve latest pH, TDS, Turbidity, and Temperature sensor metrics.' },
  { name: 'get_symptom_data', description: 'Retrieve aggregated community fever, diarrhea, vomiting, and abdominal pain counts.' },
  { name: 'get_weather', description: 'Retrieve contextual temperature, precipitation, and humidity observations.' },
  { name: 'get_risk_history', description: 'Retrieve 24-hour historical risk score trend line.' },
  { name: 'get_contributing_factors', description: 'Retrieve ML anomaly feature attribution breakdown.' }
];

export async function executeMcpQuery(queryText, selectedNodeId = 'NODE001') {
  const node = MONITORED_NODES.find(n => n.nodeId === selectedNodeId) || MONITORED_NODES[0];
  const query = queryText.toLowerCase();

  // Simulated thinking delay to feel realistic and intelligent
  await new Promise(r => setTimeout(r, 650));

  // 1. "Why is this location high risk?" or contributing factors
  if (query.includes('why') || query.includes('contributing') || query.includes('factor') || query.includes('cause')) {
    const factors = Object.entries(node.contributingFactors)
      .map(([key, val]) => `• **${key.toUpperCase()}**: +${(val * 100).toFixed(1)}% anomaly contribution`)
      .join('\n');

    return {
      toolUsed: 'get_contributing_factors',
      targetLocation: `${node.name} (${node.latitude}, ${node.longitude})`,
      riskLevel: node.defaultRisk,
      riskScore: node.defaultScore,
      markdownResponse: `Based on the latest unsupervised **Isolation Forest** risk inference for **${node.name}**:\n\n` +
        `The location is currently flagged at **${node.defaultRisk}** early-warning status with a normalized risk indicator of **${node.defaultScore.toFixed(2)} / 1.0**.\n\n` +
        `### Key Contributing Signals:\n` +
        `${factors}\n\n` +
        `**Contextual Analysis:**\n` +
        (node.defaultRisk === 'HIGH'
          ? `Water turbidity is significantly elevated at **${node.defaultWater.turbidity} NTU** (normal threshold is < 5 NTU), coinciding with a cluster of **${node.defaultSymptoms.feverCount} reported fevers** and **${node.defaultSymptoms.diarrheaCount} diarrhea cases** following recent heavy precipitation (**${node.defaultWeather.precipitation} mm**).`
          : node.defaultRisk === 'MEDIUM'
          ? `TDS levels are slightly elevated at **${node.defaultWater.tds} ppm**, accompanied by mild community reports and light rainfall (**${node.defaultWeather.precipitation} mm**). Precautionary monitoring is advised.`
          : `All water telemetry metrics (pH ${node.defaultWater.ph}, TDS ${node.defaultWater.tds} ppm, Turbidity ${node.defaultWater.turbidity} NTU) are within normal baseline ranges with negligible community symptom reports.`),
      disclaimer: "Read-only MCP analysis. Does not modify risk scores or provide medical diagnoses."
    };
  }

  // 2. "Show recent water readings" or water quality
  if (query.includes('water') || query.includes('reading') || query.includes('sensor') || query.includes('ph') || query.includes('turbidity') || query.includes('tds')) {
    const w = node.defaultWater;
    return {
      toolUsed: 'get_water_readings',
      targetLocation: `${node.name} (${node.nodeId})`,
      riskLevel: node.defaultRisk,
      riskScore: node.defaultScore,
      markdownResponse: `### Recent Water Telemetry for ${node.name}:\n\n` +
        `• **pH Level:** \`${w.ph}\` (Standard Range: 6.5 – 8.5)\n` +
        `• **Total Dissolved Solids (TDS):** \`${w.tds} ppm\` (Recommended: < 500 ppm)\n` +
        `• **Turbidity:** \`${w.turbidity} NTU\` (Safe Limit: < 5.0 NTU)\n` +
        `• **Water Temperature:** \`${w.temperature} °C\` (Sensor: DS18B20)\n\n` +
        `*Data ingested via Node.js \`POST /api/sensor\` from node \`${node.nodeId}\`.*`,
      disclaimer: "Read-only MCP analysis. Water quality is an environmental indicator."
    };
  }

  // 3. "What symptoms were reported?"
  if (query.includes('symptom') || query.includes('fever') || query.includes('diarrhea') || query.includes('vomit') || query.includes('pain') || query.includes('health')) {
    const s = node.defaultSymptoms;
    const total = s.feverCount + s.diarrheaCount + s.vomitingCount + s.abdominalPainCount;
    return {
      toolUsed: 'get_symptom_data',
      targetLocation: `${node.name} (${node.nodeId})`,
      riskLevel: node.defaultRisk,
      riskScore: node.defaultScore,
      markdownResponse: `### Aggregated Community Symptoms for ${node.region}:\n\n` +
        `• **Fever Reports:** **${s.feverCount}**\n` +
        `• **Diarrhea Reports:** **${s.diarrheaCount}**\n` +
        `• **Vomiting Reports:** **${s.vomitingCount}**\n` +
        `• **Abdominal Pain Reports:** **${s.abdominalPainCount}**\n` +
        `• **Total Community Submissions:** **${total}**\n\n` +
        `*Note: Symptom data is crowdsourced and aggregated at the location level. No personal health information (PHI) is collected or stored.*`,
      disclaimer: "Aggregated spatial counts only. Not an individual medical record."
    };
  }

  // 4. "What weather conditions were recorded?"
  if (query.includes('weather') || query.includes('rain') || query.includes('temperature') || query.includes('humidity') || query.includes('precipitation')) {
    const we = node.defaultWeather;
    return {
      toolUsed: 'get_weather',
      targetLocation: `${node.name}`,
      riskLevel: node.defaultRisk,
      riskScore: node.defaultScore,
      markdownResponse: `### Environmental Weather Context for ${node.name}:\n\n` +
        `• **Ambient Temperature:** \`${we.temperature} °C\`\n` +
        `• **Precipitation (Past Hour):** \`${we.precipitation} mm\`\n` +
        `• **Relative Humidity:** \`${we.humidity} %\`\n` +
        `• **Cache Source:** OpenWeatherMap Hourly Cache\n\n` +
        (we.precipitation > 5.0 
          ? `⚠️ **Heavy Rainfall Alert:** High precipitation promotes surface run-off into community water reservoirs, potentially increasing turbidity and microbiological contamination risk.` 
          : `Weather conditions are currently stable with low surface runoff potential.`),
      disclaimer: "Read-only environmental context retrieved via GET /api/weather/:location."
    };
  }

  // 5. "Show recent risk history" or default risk overview
  return {
    toolUsed: 'get_location_risk',
    targetLocation: `${node.name} (${node.nodeId})`,
    riskLevel: node.defaultRisk,
    riskScore: node.defaultScore,
    markdownResponse: `### Current Risk Assessment: **${node.name}**\n\n` +
      `• **Risk Classification:** **${node.defaultRisk}**\n` +
      `• **Normalized Risk Score:** **${node.defaultScore.toFixed(2)} / 1.0**\n` +
      `• **Model Used:** Scikit-learn Isolation Forest (Unsupervised Anomaly Model v1.0)\n` +
      `• **Monitoring Node ID:** \`${node.nodeId}\`\n` +
      `• **Coordinates:** Latitude \`${node.latitude}\`, Longitude \`${node.longitude}\`\n\n` +
      `The operational early-warning risk indicator synthesizes recent water telemetry, community symptom submissions, and weather conditions to detect anomalous contamination events before an outbreak propagates.`,
    disclaimer: "Read-only MCP analysis. Does not modify database state or model weights."
  };
}
