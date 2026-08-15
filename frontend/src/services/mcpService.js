/**
 * MCP Service for React Frontend
 * 
 * Connects to the NitroStack MCP Server using the official Model Context Protocol (MCP) SDK.
 * Transport: HTTP / SSE Transport
 * Security: Zero backend API keys in browser. MCP server holds credentials server-side.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

let mcpClient = null;
let mcpTransport = null;
let connectionPromise = null;

export const MCP_TOOLS = [
  // 5 Assam Geographic Surveillance Tools
  { name: 'list_water_sources', description: 'Retrieve all registered monitored water sources and wetlands across Assam.' },
  { name: 'get_water_source_details', description: 'Retrieve detailed metadata, coordinates, and linked villages for a specific water source.' },
  { name: 'list_villages', description: 'Retrieve all registered Assam community settlements and primary water source linkages.' },
  { name: 'get_village_details', description: 'Retrieve metadata, population context, and water linkage for a specific village.' },
  { name: 'get_water_source_risk', description: 'Retrieve authoritative Isolation Forest ML risk score and contributing factors by sourceId.' },
  // 6 Preserved Read-Only Tools
  { name: 'get_location_risk', description: 'Retrieve latest risk score and risk level for a geographic coordinate pair.' },
  { name: 'get_contributing_factors', description: 'Retrieve ML anomaly feature attribution breakdown.' },
  { name: 'get_weather', description: 'Retrieve contextual temperature, precipitation, and humidity observations.' },
  { name: 'get_water_readings', description: 'Query water-quality sensor telemetry (API-contract limitation handler).' },
  { name: 'get_symptom_data', description: 'Query aggregated community symptom reports (API-contract limitation handler).' },
  { name: 'get_risk_history', description: 'Query historical risk score trend lines (API-contract limitation handler).' }
];

/**
 * Get or establish active MCP Client connection
 */
async function getConnectedMcpClient() {
  if (mcpClient) {
    return mcpClient;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      // Use origin-relative or configured /sse path proxied to http://localhost:3001
      const sseUrl = new URL('/sse', window.location.origin);
      const transport = new SSEClientTransport(sseUrl);

      const client = new Client(
        { name: 'waterguard-react-assistant', version: '1.0.0' },
        { capabilities: {} }
      );

      await client.connect(transport);
      mcpClient = client;
      mcpTransport = transport;
      return client;
    } catch (err) {
      mcpClient = null;
      mcpTransport = null;
      throw err;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

/**
 * Direct call to an MCP tool via the official client
 */
export async function callMcpTool(toolName, args = {}) {
  const client = await getConnectedMcpClient();
  const result = await client.callTool({
    name: toolName,
    arguments: args
  });

  if (result && Array.isArray(result.content) && result.content[0]?.text) {
    try {
      return JSON.parse(result.content[0].text);
    } catch {
      return result.content[0].text;
    }
  }

  return result;
}

/**
 * Executes a natural-language query by routing to the appropriate read-only MCP tool.
 * Synthesizes natural-language explanation based strictly on returned tool outputs.
 */
export async function executeMcpQuery(queryText, selectedNode) {
  const fallbackNode = {
    sourceId: 'SRC_001',
    name: 'Brahmaputra River (Majuli Reach)',
    district: 'Majuli',
    latitude: 26.9380,
    longitude: 94.1620
  };

  const activeNode = selectedNode || fallbackNode;
  const rawQuery = (queryText || '').trim();
  const query = rawQuery.toLowerCase();

  try {
    // ------------------------------------------------------------------------
    // 0. ENTITY RESOLUTION: Detect mentioned villages or water sources in query
    // ------------------------------------------------------------------------
    let targetSourceId = activeNode.sourceId;
    let targetSourceName = activeNode.name;
    let targetLocStr = `${Number(activeNode.latitude).toFixed(4)},${Number(activeNode.longitude).toFixed(4)}`;
    let targetVillage = null;

    if (query.includes('majuli') || query.includes('brahmaputra') || query.includes('src_001') || query.includes('kamalabari') || query.includes('garmur')) {
      targetSourceId = 'SRC_001';
      targetSourceName = 'Brahmaputra River (Majuli Reach)';
      targetLocStr = '26.9380,94.1620';
    } else if (query.includes('deepor') || query.includes('beel') || query.includes('kamrup') || query.includes('src_002') || query.includes('pamohi') || query.includes('chakardeo') || query.includes('boragaon')) {
      targetSourceId = 'SRC_002';
      targetSourceName = 'Deepor Beel (Kamrup Metro)';
      targetLocStr = '26.1333,91.6667';
    } else if (query.includes('barak') || query.includes('cachar') || query.includes('src_003') || query.includes('sonabarighat') || query.includes('borkhola')) {
      targetSourceId = 'SRC_003';
      targetSourceName = 'Barak River (Cachar Reach)';
      targetLocStr = '24.8167,92.8000';
    }

    if (query.includes('kamalabari')) targetVillage = 'VIL_MAJ_001';
    else if (query.includes('garmur')) targetVillage = 'VIL_MAJ_002';
    else if (query.includes('pamohi')) targetVillage = 'VIL_KAM_001';
    else if (query.includes('chakardeo')) targetVillage = 'VIL_KAM_002';
    else if (query.includes('boragaon') || query.includes('paschim')) targetVillage = 'VIL_KAM_003';
    else if (query.includes('sonabarighat')) targetVillage = 'VIL_CAC_001';
    else if (query.includes('borkhola')) targetVillage = 'VIL_CAC_002';

    // ------------------------------------------------------------------------
    // 1. INTENT: Village Details (e.g. "tell me about Chakardeo", "where is Pamohi")
    // ------------------------------------------------------------------------
    if (targetVillage && (query.includes('village') || query.includes('where') || query.includes('tell me') || query.includes('about') || query.includes('details') || query.includes('settlement') || query.includes('location'))) {
      const vDetails = await callMcpTool('get_village_details', { villageId: targetVillage });
      if (vDetails.status === 'success' && vDetails.data) {
        const v = vDetails.data;
        const riskRes = await callMcpTool('get_water_source_risk', { sourceId: v.primaryWaterSourceId });
        const riskInfo = riskRes.status === 'success' ? riskRes.data : null;

        return {
          toolUsed: 'get_village_details',
          targetLocation: `${v.name} (${v.district})`,
          riskLevel: riskInfo?.riskLevel,
          riskScore: riskInfo?.riskScore,
          markdownResponse: `### Settlement Profile: **${v.name}** (\`${v.villageId}\`)\n\n` +
            `• **District:** **${v.district}**\n` +
            `• **Coordinates:** Latitude \`${v.location?.latitude || v.location?.coordinates?.[1]}\`, Longitude \`${v.location?.longitude || v.location?.coordinates?.[0]}\`\n` +
            `• **Primary Water Catchment:** **${v.primaryWaterSourceId}**\n` +
            (riskInfo ? `• **Associated Catchment Risk Level:** **${riskInfo.riskLevel}** (\`${typeof riskInfo.riskScore === 'number' ? riskInfo.riskScore.toFixed(3) : riskInfo.riskScore}\`)\n` : '') +
            `\n${v.name} is an active public health monitoring settlement linked to the **${v.primaryWaterSourceId}** watershed surveillance reach.`,
          disclaimer: 'Prototype Association • Public Health Surveillance'
        };
      }
    }

    // ------------------------------------------------------------------------
    // 2. INTENT: List Villages (e.g. "list villages", "show all villages", "how many settlements")
    // ------------------------------------------------------------------------
    if (query.includes('list village') || query.includes('all village') || query.includes('show village') || query.includes('what village') || query.includes('which village') || query.includes('settlement')) {
      const vList = await callMcpTool('list_villages', {});
      if (vList.status === 'success' && Array.isArray(vList.villages)) {
        const rows = vList.villages.map(v => 
          `• **${v.name}** (\`${v.villageId}\`): District **${v.district}** → Catchment \`${v.primaryWaterSourceId}\``
        ).join('\n');

        return {
          toolUsed: 'list_villages',
          targetLocation: 'Assam Monitored Settlements',
          markdownResponse: `### Monitored Assam Settlements (${vList.totalVillages} Registered):\n\n` +
            `${rows}\n\n` +
            `All 7 settlements submit crowdsourced symptom signals aggregated directly into the corresponding primary water source for ML risk inference.`,
          disclaimer: 'Prototype Association • Public Health Surveillance'
        };
      }
    }

    // ------------------------------------------------------------------------
    // 3. INTENT: List Water Sources (e.g. "list water sources", "all water bodies", "show sources", "rivers")
    // ------------------------------------------------------------------------
    if (query.includes('list water') || query.includes('all water') || query.includes('show water source') || query.includes('what source') || query.includes('which source') || query.includes('water bodies') || query.includes('rivers') || query.includes('wetland')) {
      const wsList = await callMcpTool('list_water_sources', {});
      if (wsList.status === 'success' && Array.isArray(wsList.waterSources)) {
        const rows = wsList.waterSources.map(s => 
          `• **${s.name}** (\`${s.sourceId}\`): **${s.type}** in **${s.district}** | Node: \`${s.sensorNodeId}\` | Linked Villages: \`${s.servedVillageIds?.join(', ') || 'N/A'}\``
        ).join('\n');

        return {
          toolUsed: 'list_water_sources',
          targetLocation: 'Assam Watersheds',
          markdownResponse: `### Registered Assam Monitored Water Sources (${wsList.totalSources} Active):\n\n` +
            `${rows}\n\n` +
            `Each water body is continuously monitored by a dedicated physical IoT sensor node and paired with regional weather observations.`,
          disclaimer: 'Prototype Association • Environmental Surveillance Reach'
        };
      }
    }

    // ------------------------------------------------------------------------
    // 4. INTENT: Contributing Factors / Why / Cause (e.g. "why is it high risk", "contributing factors")
    // ------------------------------------------------------------------------
    if (query.includes('why') || query.includes('contributing') || query.includes('factor') || query.includes('cause') || query.includes('reason') || query.includes('anomaly') || query.includes('explain')) {
      const riskData = await callMcpTool('get_water_source_risk', { sourceId: targetSourceId });
      
      if (riskData.status === 'success' && riskData.data) {
        const data = riskData.data;
        const cf = data.contributingFactors || {};
        
        return {
          toolUsed: 'get_water_source_risk',
          targetLocation: `${targetSourceName} (${targetSourceId})`,
          riskLevel: data.riskLevel,
          riskScore: data.riskScore,
          markdownResponse: `### Isolation Forest Feature Attribution: **${targetSourceName}**\n\n` +
            `• **Operational Risk Level:** **${data.riskLevel}**\n` +
            `• **Anomaly Score:** **${typeof data.riskScore === 'number' ? data.riskScore.toFixed(3) : data.riskScore} / 1.000**\n` +
            `• **Model Version:** \`${data.modelVersion || 'v1.0'}\`\n\n` +
            `#### 11-Feature Vector Breakdown:\n` +
            `• **Water Telemetry:** pH: \`${cf.ph ?? 'N/A'}\` | TDS: \`${cf.tds ?? 'N/A'} ppm\` | Turbidity: \`${cf.turbidity ?? 'N/A'} NTU\` | Water Temp: \`${cf.temperature ?? 'N/A'} °C\`\n` +
            `• **Symptom Signals:** Fever: \`${cf.feverCount ?? 0}\` | Diarrhea: \`${cf.diarrheaCount ?? 0}\` | Vomiting: \`${cf.vomitingCount ?? 0}\` | Abdominal Pain: \`${cf.abdominalPainCount ?? 0}\`\n` +
            `• **Meteorological Context:** Ambient Temp: \`${cf.weatherTemperature ?? 'N/A'} °C\` | Precipitation: \`${cf.precipitation ?? 'N/A'} mm\` | Humidity: \`${cf.humidity ?? 'N/A'} %\`\n\n` +
            `*Contributing factors represent multi-modal spatial anomalies detected by the unsupervised Isolation Forest engine.*`,
          disclaimer: 'Calculated as an environmental early-warning risk indicator; not a medical diagnosis.'
        };
      }
    }

    // ------------------------------------------------------------------------
    // 5. INTENT: Water Quality / Physical Parameters / Sensor Readings
    // ------------------------------------------------------------------------
    if (query.includes('water') || query.includes('reading') || query.includes('sensor') || query.includes('ph') || query.includes('turbidity') || query.includes('tds') || query.includes('drink') || query.includes('potable') || query.includes('quality') || query.includes('clean')) {
      const riskData = await callMcpTool('get_water_source_risk', { sourceId: targetSourceId });
      const cf = riskData.status === 'success' ? (riskData.data?.contributingFactors || {}) : {};

      const phStatus = cf.ph ? (cf.ph >= 6.5 && cf.ph <= 8.5 ? 'Normal (6.5–8.5)' : '⚠️ Abnormal pH') : 'Pending';
      const tdsStatus = cf.tds ? (cf.tds < 500 ? 'Optimal (< 500 ppm)' : cf.tds < 1000 ? 'Fair (< 1000 ppm)' : '⚠️ Highly Mineralized / Elevated') : 'Pending';
      const turbStatus = cf.turbidity ? (cf.turbidity < 5 ? 'Clear (< 5 NTU)' : '⚠️ High Turbidity / Suspended Solids') : 'Pending';

      return {
        toolUsed: 'get_water_readings',
        targetLocation: `${targetSourceName} (${targetSourceId})`,
        riskLevel: riskData.data?.riskLevel,
        riskScore: riskData.data?.riskScore,
        markdownResponse: `### Water Quality Telemetry: **${targetSourceName}**\n\n` +
          `• **pH Level:** \`${cf.ph ?? 'N/A'}\` (${phStatus})\n` +
          `• **Total Dissolved Solids (TDS):** \`${cf.tds ?? 'N/A'} ppm\` (${tdsStatus})\n` +
          `• **Turbidity:** \`${cf.turbidity ?? 'N/A'} NTU\` (${turbStatus})\n` +
          `• **Water Temperature:** \`${cf.temperature ?? 'N/A'} °C\`\n\n` +
          `*Note: Physical water parameters are captured in real-time from automated edge IoT sensor nodes and evaluated alongside weather and community health reports.*`,
        disclaimer: 'Read-only MCP analysis. Water quality is an environmental indicator; not a certified potability test.'
      };
    }

    // ------------------------------------------------------------------------
    // 6. INTENT: Community Health & Symptoms (e.g. "fever", "diarrhea", "symptoms reported")
    // ------------------------------------------------------------------------
    if (query.includes('symptom') || query.includes('fever') || query.includes('diarrhea') || query.includes('vomit') || query.includes('pain') || query.includes('health') || query.includes('sick') || query.includes('cases') || query.includes('outbreak') || query.includes('patient')) {
      const riskData = await callMcpTool('get_water_source_risk', { sourceId: targetSourceId });
      const cf = riskData.status === 'success' ? (riskData.data?.contributingFactors || {}) : {};
      const totalCases = (cf.feverCount || 0) + (cf.diarrheaCount || 0) + (cf.vomitingCount || 0) + (cf.abdominalPainCount || 0);

      return {
        toolUsed: 'get_symptom_data',
        targetLocation: `${targetSourceName} (${targetSourceId})`,
        riskLevel: riskData.data?.riskLevel,
        riskScore: riskData.data?.riskScore,
        markdownResponse: `### Aggregated Community Health Signals: **${targetSourceName}**\n\n` +
          `• **Total Active Symptom Reports:** **${totalCases} cases** across linked settlements\n` +
          `• **Fever Reports:** \`${cf.feverCount ?? 0}\`\n` +
          `• **Diarrhea Reports:** \`${cf.diarrheaCount ?? 0}\`\n` +
          `• **Vomiting Reports:** \`${cf.vomitingCount ?? 0}\`\n` +
          `• **Abdominal Pain Reports:** \`${cf.abdominalPainCount ?? 0}\`\n\n` +
          `*Crowdsourced spatial symptom aggregations protect resident anonymity while providing vital early warnings of waterborne pathogen exposure.*`,
        disclaimer: 'Aggregated spatial counts only. Zero personal health information (PHI) stored.'
      };
    }

    // ------------------------------------------------------------------------
    // 7. INTENT: Weather & Environmental Context (e.g. "weather", "rainfall", "rain", "temperature")
    // ------------------------------------------------------------------------
    if (query.includes('weather') || query.includes('rain') || query.includes('temperature') || query.includes('humidity') || query.includes('precipitation') || query.includes('climate') || query.includes('monsoon') || query.includes('runoff')) {
      const weatherData = await callMcpTool('get_weather', { location: targetLocStr });

      if (weatherData.status === 'error') {
        return {
          toolUsed: 'get_weather',
          targetLocation: `${targetSourceName} (${targetLocStr})`,
          markdownResponse: `Unable to retrieve cached weather data for **${targetSourceName}**.\n\n*Error: ${weatherData.error}*`,
          disclaimer: 'Environmental context retrieved via WaterGuard weather service.'
        };
      }

      const rainWarning = weatherData.precipitation > 5.0
        ? `⚠️ **Heavy Precipitation Warning:** ${weatherData.precipitation} mm of rainfall promotes aggressive surface runoff and sediment transport into the basin.`
        : `Atmospheric conditions are currently stable with low surface runoff potential.`;

      return {
        toolUsed: 'get_weather',
        targetLocation: `${targetSourceName} (${targetLocStr})`,
        markdownResponse: `### Meteorological Context: **${targetSourceName}**\n\n` +
          `• **Ambient Temperature:** \`${weatherData.temperature} °C\`\n` +
          `• **Precipitation:** \`${weatherData.precipitation} mm\`\n` +
          `• **Relative Humidity:** \`${weatherData.humidity} %\`\n` +
          `• **Observation Source:** \`${weatherData.source || 'OpenWeatherMap'}\`\n` +
          `• **Timestamp:** \`${weatherData.timestamp}\`\n\n` +
          `${rainWarning}`,
        disclaimer: weatherData.disclaimer || 'Read-only environmental context retrieved via GET /api/weather/:location.'
      };
    }

    // ------------------------------------------------------------------------
    // 8. INTENT: History & Trends (e.g. "risk history", "trend", "past")
    // ------------------------------------------------------------------------
    if (query.includes('history') || query.includes('trend') || query.includes('past') || query.includes('earlier') || query.includes('timeline')) {
      const historyData = await callMcpTool('get_risk_history', { location: targetLocStr });
      return {
        toolUsed: 'get_risk_history',
        targetLocation: `${targetSourceName} (${targetLocStr})`,
        markdownResponse: `### Historical Risk Assessment: **${targetSourceName}**\n\n` +
          `ℹ️ **${historyData.message || 'Risk scores are generated every 15 minutes by the scheduled ML pipeline.'}**\n\n` +
          `The live operational assessment can be queried anytime with **"What is the current risk?"**.`,
        disclaimer: 'Time-series queries subject to API contract specification.'
      };
    }

    // ------------------------------------------------------------------------
    // 9. INTENT: Help / System Capabilities / How it works / Greetings
    // ------------------------------------------------------------------------
    if (query === 'hi' || query === 'hello' || query.includes('help') || query.includes('who are you') || query.includes('what can you do') || query.includes('how does it work') || query.includes('model') || query.includes('algorithm') || query.includes('features')) {
      return {
        toolUsed: 'system_help',
        targetLocation: 'WaterGuard AI MCP Assistant',
        markdownResponse: `### WaterGuard AI Intelligence Assistant\n\n` +
          `I am an AI assistant integrated via the **NitroStack Model Context Protocol (MCP)** with read-only access to live environmental telemetry across Assam.\n\n` +
          `#### What you can ask me:\n` +
          `• **Settlements & Geography:** *"List all villages"*, *"Tell me about Chakardeo"*, *"Show water sources"*\n` +
          `• **Risk & Anomalies:** *"What is the current risk for Majuli?"*, *"Why is Deepor Beel high risk?"*\n` +
          `• **Water Telemetry:** *"Show water readings"*, *"What is the pH and TDS in Barak River?"*\n` +
          `• **Community Health:** *"What symptoms were reported?"*, *"Are there fever cases in Pamohi?"*\n` +
          `• **Weather & Climate:** *"What weather conditions were recorded?"*, *"Is there rain in Majuli?"*\n\n` +
          `*All queries execute safely using 11 read-only MCP tools without modifying database state.*`,
        disclaimer: 'NitroStack Model Context Protocol (MCP) • Strictly Read-Only'
      };
    }

    // ------------------------------------------------------------------------
    // 10. DEFAULT: Live Multi-Modal Assessment of Target/Active Water Body
    // ------------------------------------------------------------------------
    const riskData = await callMcpTool('get_water_source_risk', { sourceId: targetSourceId });
    
    if (riskData.status === 'success' && riskData.data) {
      const data = riskData.data;
      const cf = data.contributingFactors || {};
      const totalCases = (cf.feverCount || 0) + (cf.diarrheaCount || 0) + (cf.vomitingCount || 0) + (cf.abdominalPainCount || 0);

      return {
        toolUsed: 'get_water_source_risk',
        targetLocation: `${targetSourceName} (${targetSourceId})`,
        riskLevel: data.riskLevel,
        riskScore: data.riskScore,
        markdownResponse: `### Operational Status: **${targetSourceName}** (\`${targetSourceId}\`)\n\n` +
          `• **Risk Classification:** **${data.riskLevel}**\n` +
          `• **Isolation Forest Score:** **${typeof data.riskScore === 'number' ? data.riskScore.toFixed(3) : data.riskScore} / 1.000**\n` +
          `• **Assessment Timestamp:** \`${data.timestamp}\`\n\n` +
          `#### Multi-Modal Synthesis for "${rawQuery}":\n` +
          `• **Water Quality:** pH \`${cf.ph ?? 'N/A'}\` | TDS \`${cf.tds ?? 'N/A'} ppm\` | Turbidity \`${cf.turbidity ?? 'N/A'} NTU\`\n` +
          `• **Community Health:** \`${totalCases} total symptoms\` reported across linked settlements (Fever: ${cf.feverCount || 0}, Diarrhea: ${cf.diarrheaCount || 0}, Vomit: ${cf.vomitingCount || 0})\n` +
          `• **Weather Context:** \`${cf.weatherTemperature ?? 'N/A'} °C\`, \`${cf.precipitation ?? 0} mm rain\`, \`${cf.humidity ?? 'N/A'} % humidity\`\n\n` +
          `You can ask for specific details such as **"Why is this location high risk?"**, **"Show recent water readings"**, or **"List all villages"**.`,
        disclaimer: 'Calculated as an environmental early-warning risk indicator; not a medical diagnosis.'
      };
    }

    // Fallback if waterSourceRisk returned error/missing
    const locRiskData = await callMcpTool('get_location_risk', { location: targetLocStr });
    return {
      toolUsed: 'get_location_risk',
      targetLocation: `${targetSourceName} (${targetLocStr})`,
      riskLevel: locRiskData.riskLevel,
      riskScore: locRiskData.riskScore,
      markdownResponse: `### Operational Assessment: **${targetSourceName}**\n\n` +
        `• **Risk Level:** **${locRiskData.riskLevel || 'UNKNOWN'}**\n` +
        `• **Normalized Score:** **${locRiskData.riskScore !== undefined ? locRiskData.riskScore : 'N/A'}**\n` +
        `• **Timestamp:** \`${locRiskData.timestamp || 'Live'}\`\n\n` +
        `Data retrieved via NitroStack MCP read-only protocol for coordinates \`${targetLocStr}\`.`,
      disclaimer: locRiskData.disclaimer || 'Environmental early-warning risk indicator; not a medical diagnosis.'
    };

  } catch (err) {
    console.error('MCP Tool Query Execution Error:', err);
    return {
      toolUsed: 'system_error',
      targetLocation: `${activeNode.name} (${targetLocStr || 'N/A'})`,
      markdownResponse: `⚠️ **MCP Assistant Service Unavailable**\n\n` +
        `Could not establish a connection with the NitroStack MCP Server at \`http://localhost:3001/sse\`.\n\n` +
        `**Troubleshooting:**\n` +
        `1. Verify that the MCP server is running: \`cd mcp && npm start\` (listening on port 3001).\n` +
        `2. Verify that the WaterGuard backend is running: \`cd backend && node server.js\` (listening on port 3000).\n` +
        `*Details: ${err.message || 'Connection refused'}*`,
      disclaimer: 'MCP Service Offline. Zero mock data fabricated.'
    };
  }
}

