import { WebSocket } from 'ws';

async function testAiEngine() {
  console.log('--- TESTING AETHER-CORE AUTONOMOUS AI ENGINE ---');
  // 1. Guest Auth
  const authRes = await fetch('http://localhost:4000/api/auth/guest', { method: 'POST' });
  const authData = await authRes.json();
  console.log('✅ Guest Auth Token obtained:', authData.token.substring(0, 15) + '...');

  // 2. Character creation
  const charRes = await fetch('http://localhost:4000/api/characters', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + authData.token
    },
    body: JSON.stringify({
      slot: 0,
      name: 'AiTester',
      gender: 'male',
      hairStyle: 1,
      hairColor: '#4cc9f0'
    })
  });
  const charData = await charRes.json();
  console.log('✅ Character Created:', charData.character?.name);

  const ws = new WebSocket(`ws://localhost:4000?token=${authData.token}&characterId=${charData.character.id}`);

  let receivedAiUpdate = false;
  let receivedBroadcast = false;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout waiting for AI events')), 8000);

    ws.on('open', () => {
      console.log('✅ Connected to WebSocket');
      // Trigger Diagnostics
      ws.send(JSON.stringify({
        type: 'AI_ACTION',
        action: 'RUN_DIAGNOSTICS'
      }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'AI_UPDATE') {
        console.log('✅ Received AI_UPDATE:');
        console.log(`   - Status: ${msg.state.status}`);
        console.log(`   - Version: ${msg.state.version}`);
        console.log(`   - Active Event: ${msg.state.activeEvent}`);
        console.log(`   - Anomaly Score: ${msg.state.anomalyScore}`);
        console.log(`   - Recent Thoughts Count: ${msg.state.recentThoughts.length}`);
        console.log(`   - Total Patches Count: ${msg.state.patches.length}`);
        receivedAiUpdate = true;
      }

      if (msg.type === 'SERVER_ANNOUNCEMENT' && msg.announcement.sender === 'AETHER-AI CORE') {
        console.log('✅ Received Live AI Announcement:');
        console.log(`   - [${msg.announcement.sender}]: ${msg.announcement.message} (Style: ${msg.announcement.style})`);
        receivedBroadcast = true;
      }

      if (receivedAiUpdate && receivedBroadcast) {
        clearTimeout(timer);
        ws.close();
        resolve();
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  console.log('🎉 ALL AUTONOMOUS AI TESTS PASSED PERFECTLY!');
}

testAiEngine().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
