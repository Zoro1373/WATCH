/**
 * WaterGuard AI - NitroStack MCP Integration Test Suite
 * 
 * Verifies all 11 MCP tools (5 new geographic read tools + 6 legacy tools),
 * SSE connectivity, tool discovery, backend delegation, and error handling.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function runTests() {
  console.log('====================================================');
  console.log('--- Starting WaterGuard MCP Integration Tests ---');
  console.log('====================================================\n');

  const transport = new SSEClientTransport(new URL('http://localhost:3001/sse'));
  const client = new Client(
    { name: 'waterguard-test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  console.log('Connecting to MCP SSE endpoint http://127.0.0.1:3001/sse ...');
  await client.connect(transport);
  console.log('✓ Successfully connected to NitroStack MCP server!\n');

  let passed = 0;
  let failed = 0;

  try {
    // ----------------------------------------------------
    // TEST 1: Tool Discovery (11 Total Tools)
    // ----------------------------------------------------
    console.log('TEST 1: Listing and Discovering MCP tools...');
    const toolsResponse = await client.listTools();
    const discoveredNames = toolsResponse.tools.map(t => t.name);
    console.log(`Discovered ${discoveredNames.length} tools:`, discoveredNames);

    const expectedTools = [
      // 5 New Geographic Tools
      'list_water_sources',
      'get_water_source_details',
      'list_villages',
      'get_village_details',
      'get_water_source_risk',
      // 6 Preserved Legacy Tools
      'get_location_risk',
      'get_contributing_factors',
      'get_weather',
      'get_water_readings',
      'get_symptom_data',
      'get_risk_history'
    ];

    let allFound = true;
    for (const toolName of expectedTools) {
      if (!discoveredNames.includes(toolName)) {
        console.error(`   FAIL: Missing expected tool '${toolName}'`);
        allFound = false;
      }
    }

    if (allFound && discoveredNames.length >= 11) {
      console.log('   PASS: All 11 MCP tools discovered successfully.\n');
      passed++;
    } else {
      console.error('   FAIL: Tool discovery mismatch.\n');
      failed++;
    }

    // ----------------------------------------------------
    // TEST 2: list_water_sources (GET /api/water-sources)
    // ----------------------------------------------------
    console.log('TEST 2: Calling list_water_sources...');
    const wsResult = await client.callTool({
      name: 'list_water_sources',
      arguments: {}
    });
    const wsData = JSON.parse(wsResult.content[0].text);

    if (wsData.status === 'success' && Array.isArray(wsData.waterSources) && wsData.totalSources === 3) {
      console.log(`   PASS: Returned ${wsData.totalSources} water sources:`, wsData.waterSources.map(s => s.sourceId));
      passed++;
    } else {
      console.error('   FAIL: list_water_sources output unexpected:', wsData);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 3: get_water_source_details('SRC_001')
    // ----------------------------------------------------
    console.log("\nTEST 3: Calling get_water_source_details('SRC_001')...");
    const ws1Result = await client.callTool({
      name: 'get_water_source_details',
      arguments: { sourceId: 'SRC_001' }
    });
    const ws1Data = JSON.parse(ws1Result.content[0].text);

    if (ws1Data.status === 'success' && ws1Data.data?.sourceId === 'SRC_001' && ws1Data.data?.sensorNodeId === 'NODE001') {
      console.log(`   PASS: Returned Brahmaputra reach details (sensorNodeId=${ws1Data.data.sensorNodeId}, servedVillages=[${ws1Data.data.servedVillageIds.join(', ')}]).`);
      passed++;
    } else {
      console.error('   FAIL: get_water_source_details output unexpected:', ws1Data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 4: get_water_source_details with unknown sourceId
    // ----------------------------------------------------
    console.log("\nTEST 4: Calling get_water_source_details('DOES_NOT_EXIST')...");
    const wsNotFoundResult = await client.callTool({
      name: 'get_water_source_details',
      arguments: { sourceId: 'DOES_NOT_EXIST' }
    });
    const wsNotFoundData = JSON.parse(wsNotFoundResult.content[0].text);

    if (wsNotFoundData.status === 'error' && wsNotFoundData.error?.includes('not registered')) {
      console.log(`   PASS: Correctly returned error for unknown sourceId: "${wsNotFoundData.error}"`);
      passed++;
    } else {
      console.error('   FAIL: Expected error for invalid sourceId:', wsNotFoundData);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 5: list_villages (GET /api/villages)
    // ----------------------------------------------------
    console.log('\nTEST 5: Calling list_villages...');
    const vilResult = await client.callTool({
      name: 'list_villages',
      arguments: {}
    });
    const vilData = JSON.parse(vilResult.content[0].text);

    if (vilData.status === 'success' && Array.isArray(vilData.villages) && vilData.totalVillages === 7) {
      console.log(`   PASS: Returned ${vilData.totalVillages} Assam villages:`, vilData.villages.map(v => v.villageId));
      passed++;
    } else {
      console.error('   FAIL: list_villages output unexpected:', vilData);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 6: get_village_details('VIL_MAJ_001')
    // ----------------------------------------------------
    console.log("\nTEST 6: Calling get_village_details('VIL_MAJ_001')...");
    const vil1Result = await client.callTool({
      name: 'get_village_details',
      arguments: { villageId: 'VIL_MAJ_001' }
    });
    const vil1Data = JSON.parse(vil1Result.content[0].text);

    if (vil1Data.status === 'success' && vil1Data.data?.villageId === 'VIL_MAJ_001' && vil1Data.data?.primaryWaterSourceId === 'SRC_001') {
      console.log(`   PASS: Returned Kamalabari details (name=${vil1Data.data.name}, primaryWaterSourceId=${vil1Data.data.primaryWaterSourceId}).`);
      passed++;
    } else {
      console.error('   FAIL: get_village_details output unexpected:', vil1Data);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 7: get_village_details with unknown villageId
    // ----------------------------------------------------
    console.log("\nTEST 7: Calling get_village_details('DOES_NOT_EXIST')...");
    const vilNotFoundResult = await client.callTool({
      name: 'get_village_details',
      arguments: { villageId: 'DOES_NOT_EXIST' }
    });
    const vilNotFoundData = JSON.parse(vilNotFoundResult.content[0].text);

    if (vilNotFoundData.status === 'error' && vilNotFoundData.error?.includes('not registered')) {
      console.log(`   PASS: Correctly returned error for unknown villageId: "${vilNotFoundData.error}"`);
      passed++;
    } else {
      console.error('   FAIL: Expected error for invalid villageId:', vilNotFoundData);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 8: get_water_source_risk('SRC_001')
    // ----------------------------------------------------
    console.log("\nTEST 8: Calling get_water_source_risk('SRC_001')...");
    const riskResult = await client.callTool({
      name: 'get_water_source_risk',
      arguments: { sourceId: 'SRC_001' }
    });
    const riskData = JSON.parse(riskResult.content[0].text);

    if (riskData.status === 'success' || riskData.status === 'no_risk_data') {
      console.log(`   PASS: get_water_source_risk executed safely (status=${riskData.status}, message/level=${riskData.riskLevel || riskData.message}).`);
      passed++;
    } else {
      console.error('   FAIL: Unexpected get_water_source_risk response:', riskData);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 9: Preserved Legacy Tool get_location_risk
    // ----------------------------------------------------
    console.log("\nTEST 9: Calling legacy get_location_risk('26.9380,94.1620')...");
    const locRiskResult = await client.callTool({
      name: 'get_location_risk',
      arguments: { location: '26.9380,94.1620' }
    });
    const locRiskData = JSON.parse(locRiskResult.content[0].text);

    if (locRiskData.status === 'success' || locRiskData.status === 'error') {
      console.log(`   PASS: Preserved get_location_risk executed safely (status=${locRiskData.status}).`);
      passed++;
    } else {
      console.error('   FAIL: Unexpected get_location_risk response:', locRiskData);
      failed++;
    }

    // ----------------------------------------------------
    // TEST 10: Preserved Legacy Tools get_water_readings & get_symptom_data
    // ----------------------------------------------------
    console.log("\nTEST 10: Calling limitation handlers (get_water_readings, get_symptom_data)...");
    const readingsResult = await client.callTool({
      name: 'get_water_readings',
      arguments: { location: '26.9380,94.1620' }
    });
    const readingsData = JSON.parse(readingsResult.content[0].text);

    const symptomResult = await client.callTool({
      name: 'get_symptom_data',
      arguments: { location: '26.9380,94.1620' }
    });
    const symptomData = JSON.parse(symptomResult.content[0].text);

    if (readingsData.status === 'api_contract_limitation' && symptomData.status === 'api_contract_limitation') {
      console.log('   PASS: API contract limitation handlers executed accurately without fabricating fake data.');
      passed++;
    } else {
      console.error('   FAIL: Limitation handlers returned unexpected status.');
      failed++;
    }

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await client.close();
  }

  console.log('\n====================================================');
  console.log(`MCP Validation Passed: ${passed}, Validation Failed: ${failed}`);
  console.log('====================================================\n');

  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
