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
  { name: 'get_location_risk', description: 'Retrieve latest risk score and risk level for a geographic point.' },
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
  const node = selectedNode || {
    sourceId: 'SRC_001',
    name: 'Brahmaputra River (Majuli Reach)',
    district: 'Majuli',
    latitude: 26.9380,
    longitude: 94.1620
  };

  const locStr = `${Number(node.latitude).toFixed(4)},${Number(node.longitude).toFixed(4)}`;
  const query = queryText.toLowerCase();

  try {
    // 1. "Why is this location high risk?" or contributing factors
    if (query.includes('why') || query.includes('contributing') || query.includes('factor') || query.includes('cause')) {
      const factorsData = await callMcpTool('get_contributing_factors', { location: locStr });
      
      if (factorsData.status === 'error') {
        return {
          toolUsed: 'get_contributing_factors',
          targetLocation: `${node.name} (${locStr})`,
          markdownResponse: `Unable to retrieve contributing factors for **${node.name}**.\n\n*Error: ${factorsData.error}*`,
          disclaimer: factorsData.disclaimer || 'Environmental early-warning risk indicator; not a medical diagnosis.'
        };
      }

      const factors = factorsData.contributingFactors || {};
      const factorEntries = Object.entries(factors);

      let factorsList = 'No specific abnormal contributing factors recorded.';
      if (factorEntries.length > 0) {
        factorsList = factorEntries
          .map(([key, val]) => `• **${key.replace(/([A-Z])/g, ' $1').toUpperCase()}**: \`${val}\``)
          .join('\n');
      }

      return {
        toolUsed: 'get_contributing_factors',
        targetLocation: `${node.name} (${locStr})`,
        riskLevel: factorsData.riskLevel,
        riskScore: factorsData.riskScore,
        markdownResponse: `Based on the latest **Isolation Forest** risk inference retrieved from the backend for **${node.name}**:\n\n` +
          `• **Operational Risk Level:** **${factorsData.riskLevel || 'UNKNOWN'}**\n` +
          `• **Normalized Risk Score:** **${typeof factorsData.riskScore === 'number' ? factorsData.riskScore.toFixed(3) : factorsData.riskScore} / 1.000**\n\n` +
          `### Retrieved Contributing Anomaly Signals:\n` +
          `${factorsList}\n\n` +
          `*Note: Contributing factors are observational features associated with the ML model's anomaly score. They do not imply direct clinical causality.*`,
        disclaimer: factorsData.disclaimer || 'Calculated as an environmental early-warning risk indicator; not a medical diagnosis.'
      };
    }

    // 2. "Show recent water readings"
    if (query.includes('water') || query.includes('reading') || query.includes('sensor') || query.includes('ph') || query.includes('turbidity') || query.includes('tds')) {
      const waterData = await callMcpTool('get_water_readings', { location: locStr });

      if (waterData.status === 'api_contract_limitation') {
        // Also fetch location risk to show what water parameters are currently stored in contributing factors
        let snapshotNote = '';
        try {
          const riskData = await callMcpTool('get_location_risk', { location: locStr });
          if (riskData.contributingFactors) {
            const cf = riskData.contributingFactors;
            snapshotNote = `\n\n**Latest Water Metrics in Stored Assessment:**\n` +
              (cf.ph !== undefined ? `• **pH:** \`${cf.ph}\`\n` : '') +
              (cf.tds !== undefined ? `• **TDS:** \`${cf.tds} ppm\`\n` : '') +
              (cf.turbidity !== undefined ? `• **Turbidity:** \`${cf.turbidity} NTU\`\n` : '') +
              (cf.temperature !== undefined ? `• **Water Temp:** \`${cf.temperature} °C\`\n` : '');
          }
        } catch {
          // ignore
        }

        return {
          toolUsed: 'get_water_readings',
          targetLocation: `${node.name} (${locStr})`,
          markdownResponse: `### Water Telemetry Query for ${node.name}:\n\n` +
            `ℹ️ **${waterData.message}**` +
            snapshotNote,
          disclaimer: 'Read-only MCP analysis. Water quality is an environmental indicator.'
        };
      }

      return {
        toolUsed: 'get_water_readings',
        targetLocation: `${node.name} (${locStr})`,
        markdownResponse: JSON.stringify(waterData, null, 2),
        disclaimer: 'Read-only MCP analysis.'
      };
    }

    // 3. "What symptoms were reported?"
    if (query.includes('symptom') || query.includes('fever') || query.includes('diarrhea') || query.includes('vomit') || query.includes('pain') || query.includes('health')) {
      const symptomData = await callMcpTool('get_symptom_data', { location: locStr });

      if (symptomData.status === 'api_contract_limitation') {
        let symptomSnapshot = '';
        try {
          const riskData = await callMcpTool('get_location_risk', { location: locStr });
          if (riskData.contributingFactors) {
            const cf = riskData.contributingFactors;
            symptomSnapshot = `\n\n**Latest Symptom Counts in Stored Assessment:**\n` +
              (cf.feverCount !== undefined ? `• **Fever Reports:** \`${cf.feverCount}\`\n` : '') +
              (cf.diarrheaCount !== undefined ? `• **Diarrhea Reports:** \`${cf.diarrheaCount}\`\n` : '') +
              (cf.vomitingCount !== undefined ? `• **Vomiting Reports:** \`${cf.vomitingCount}\`\n` : '') +
              (cf.abdominalPainCount !== undefined ? `• **Abdominal Pain Reports:** \`${cf.abdominalPainCount}\`\n` : '');
          }
        } catch {
          // ignore
        }

        return {
          toolUsed: 'get_symptom_data',
          targetLocation: `${node.name} (${locStr})`,
          markdownResponse: `### Community Health Signals Query for ${node.name}:\n\n` +
            `ℹ️ **${symptomData.message}**` +
            symptomSnapshot,
          disclaimer: 'Crowdsourced spatial aggregations only. Zero personal health information (PHI) stored.'
        };
      }

      return {
        toolUsed: 'get_symptom_data',
        targetLocation: `${node.name} (${locStr})`,
        markdownResponse: JSON.stringify(symptomData, null, 2),
        disclaimer: 'Aggregated spatial counts only.'
      };
    }

    // 4. "What weather conditions were recorded?"
    if (query.includes('weather') || query.includes('rain') || query.includes('temperature') || query.includes('humidity') || query.includes('precipitation')) {
      const weatherData = await callMcpTool('get_weather', { location: locStr });

      if (weatherData.status === 'error') {
        return {
          toolUsed: 'get_weather',
          targetLocation: `${node.name} (${locStr})`,
          markdownResponse: `Unable to retrieve weather data for **${node.name}**.\n\n*Error: ${weatherData.error}*`,
          disclaimer: 'Environmental context retrieved via WaterGuard weather service.'
        };
      }

      return {
        toolUsed: 'get_weather',
        targetLocation: `${node.name} (${locStr})`,
        markdownResponse: `### Cached Weather Context for ${node.name}:\n\n` +
          `• **Ambient Temperature:** \`${weatherData.temperature} °C\`\n` +
          `• **Precipitation:** \`${weatherData.precipitation} mm\`\n` +
          `• **Relative Humidity:** \`${weatherData.humidity} %\`\n` +
          `• **Cache Source:** \`${weatherData.source || 'OpenWeatherMap'}\`\n` +
          `• **Observation Timestamp:** \`${weatherData.timestamp}\`\n\n` +
          (weatherData.precipitation > 5.0 
            ? `⚠️ **Surface Run-Off Notice:** High precipitation promotes topsoil erosion into community catchments, increasing particulate matter and turbidity.` 
            : `Atmospheric conditions are stable with baseline surface runoff potential.`),
        disclaimer: weatherData.disclaimer || 'Read-only environmental context retrieved via GET /api/weather/:location.'
      };
    }

    // 5. "Show recent risk history"
    if (query.includes('history') || query.includes('trend') || query.includes('past')) {
      const historyData = await callMcpTool('get_risk_history', { location: locStr });
      return {
        toolUsed: 'get_risk_history',
        targetLocation: `${node.name} (${locStr})`,
        markdownResponse: `### Risk Score History for ${node.name}:\n\n` +
          `ℹ️ **${historyData.message}**\n\n` +
          `The active operational risk status can be queried using **"What is the current risk?"**.`,
        disclaimer: 'Time-series queries subject to API contract specification.'
      };
    }

    // 6. Default: Current Risk Assessment
    const riskData = await callMcpTool('get_location_risk', { location: locStr });

    if (riskData.status === 'error') {
      return {
        toolUsed: 'get_location_risk',
        targetLocation: `${node.name} (${locStr})`,
        markdownResponse: `No active risk record found for **${node.name}** (${locStr}).\n\n*${riskData.error}*`,
        disclaimer: 'Calculated as an environmental early-warning risk indicator; not a medical diagnosis.'
      };
    }

    return {
      toolUsed: 'get_location_risk',
      targetLocation: `${node.name} (${locStr})`,
      riskLevel: riskData.riskLevel,
      riskScore: riskData.riskScore,
      markdownResponse: `### Current Operational Risk Assessment: **${node.name}**\n\n` +
        `• **Risk Classification:** **${riskData.riskLevel}**\n` +
        `• **Normalized Risk Indicator:** **${typeof riskData.riskScore === 'number' ? riskData.riskScore.toFixed(3) : riskData.riskScore} / 1.000**\n` +
        `• **Assessment Timestamp:** \`${riskData.timestamp}\`\n` +
        `• **Monitored Coordinates:** Latitude \`${node.latitude}\`, Longitude \`${node.longitude}\`\n\n` +
        `The early-warning risk indicator synthesizes water quality metrics, community symptom clusters, and environmental weather data processed by the unsupervised Isolation Forest engine.`,
      disclaimer: riskData.disclaimer || 'Calculated as an environmental early-warning risk indicator; not a medical diagnosis.'
    };

  } catch (err) {
    console.error('MCP Tool Query Execution Error:', err);
    return {
      toolUsed: 'system_error',
      targetLocation: `${node.name} (${locStr})`,
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
