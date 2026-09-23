import { WebSocket } from 'ws';

async function runTest() {
  console.log('🚀 Starting Aethergard Online 3D Mode & All Skills Test...');

  // 1. Guest Login
  const loginRes = await fetch('http://localhost:4000/api/auth/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'Tester3D' })
  });
  const loginData = await loginRes.json();
  console.log('✅ Guest login successful. Token acquired.');

  // 2. Fetch Characters
  const charRes = await fetch('http://localhost:4000/api/characters', {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  const charData = await charRes.json();
  let character = charData.characters?.[0];

  if (!character) {
    const randomName = `Tester3D_${Math.floor(Math.random() * 8999 + 1000)}`;
    const createRes = await fetch('http://localhost:4000/api/characters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({ name: randomName, slot: 0, gender: 'male', hairStyle: 1, hairColor: '#ffd166' })
    });
    const created = await createRes.json();
    character = created.character;
    console.log('✅ Character created:', character.name);
  } else {
    console.log('✅ Found character:', character.name, 'Job:', character.job);
  }

  // 3. Connect WebSocket to 3D Server
  const wsUrl = `ws://localhost:4000/?token=${loginData.token}&characterId=${character.id}`;
  const ws = new WebSocket(wsUrl);

  await new Promise((resolve, reject) => {
    ws.on('open', () => {
      console.log('✅ WebSocket Connected to Game Gateway in 3D Mode.');
      resolve();
    });
    ws.on('error', reject);
  });

  const receivedSkills = new Set();
  let monster;
  let monsterId;

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === 'INIT_STATE') {
      console.log(`✅ INIT_STATE: SelfId=${msg.selfId}, MonstersCount=${msg.monsters?.length}, DropsCount=${msg.drops?.length}`);
      if (msg.monsters?.length > 0) {
        monster = msg.monsters[0];
        monsterId = monster.id;
        console.log(`🎯 Found monster: ${monster.name} (ID: ${monsterId}) at x=${monster.x}, z=${monster.z || 0}`);
      }
    } else if (msg.type === 'SNAPSHOT') {
      const living = msg.snapshot.monsters?.filter(m => !m.isDead && m.hp > 0);
      if (living && living.length > 0) {
        monster = living[0];
        monsterId = monster.id;
      }
    } else if (msg.type === 'MOB_DIED') {
      if (msg.mobId === monsterId) {
        monsterId = undefined;
        monster = undefined;
      }
    } else if (msg.type === 'PLAYER_ATTACKED') {
      receivedSkills.add(msg.skill);
      console.log(`✨ Skill Cast Confirmed by Server: [${msg.skill}] (Target: ${msg.targetId || 'Ground AOE'}, Tx: ${msg.tx}, Tz: ${msg.tz})`);
    } else if (msg.type === 'DAMAGE') {
      console.log(`💥 Damage Dealt: ${msg.damageEvent.damage} (Crit: ${msg.damageEvent.isCrit}) to ${msg.damageEvent.targetId}`);
    } else if (msg.type === 'SKILL_FAILED') {
      console.warn(`⚠️ Skill Failed: ${msg.skillId} - Reason: ${msg.reason}`);
    }
  });

  // Wait for init
  await new Promise(r => setTimeout(r, 600));

  // 4. Send 3D View Mode & 3D Position Sync
  ws.send(JSON.stringify({ type: 'VIEW_MODE', mode: '3d' }));
  const targetX = monster ? monster.x - 30 : 600;
  const targetZ = monster ? (monster.z || 0) : 15;
  ws.send(JSON.stringify({
    type: 'POS_SYNC_3D',
    x: targetX,
    z: targetZ,
    rotY: 1.57,
    anim: 'walk',
    facing: 'right'
  }));
  console.log(`✅ Sent VIEW_MODE: 3d and POS_SYNC_3D near target (x=${targetX}, z=${targetZ}).`);

  // Helper to test skill with job change
  async function testJobSkills(job, skills) {
    console.log(`\n--- Testing Job [${job}] ---`);
    // Change Job
    ws.send(JSON.stringify({ type: 'JOB_CHANGE', job }));
    await new Promise(r => setTimeout(r, 350));

    for (const skill of skills) {
      if (!monster || monster.isDead || monster.hp <= 0) {
        await new Promise(r => setTimeout(r, 250));
      }
      if (monster) {
        ws.send(JSON.stringify({
          type: 'POS_SYNC_3D',
          x: monster.x - 20,
          z: monster.z || 0,
          rotY: 1.57,
          anim: 'walk',
          facing: 'right'
        }));
      }
      ws.send(JSON.stringify({
        type: 'ATTACK',
        skill,
        targetId: monsterId
      }));
      await new Promise(r => setTimeout(r, 600));
    }
  }

  // 5. Test Skills Across All Jobs (All 15 Skills)
  await testJobSkills('Novice', ['NORMAL', 'BASH', 'FIRST_AID']);
  await testJobSkills('Swordman', ['RADIANT_SLASH', 'SOLAR_AEGIS']);
  await testJobSkills('Magician', ['ASTRAL_METEOR', 'FROST_NOVA']);
  await testJobSkills('Archer', ['GALE_ARROW', 'RAIN_OF_LIGHT']);
  await testJobSkills('Thief', ['SHADOW_BLINK', 'BLADE_DANCE']);
  await testJobSkills('Acolyte', ['SANCTUARY', 'JUDGMENT_FIST']);
  await testJobSkills('Merchant', ['COIN_BURST', 'GREED_VACUUM']);

  await new Promise(r => setTimeout(r, 1000));

  console.log('\n=============================================');
  console.log(`🎉 Tested ${receivedSkills.size} Unique 3D Skills Successfully:`);
  console.log(Array.from(receivedSkills).map(s => `  • ${s}`).join('\n'));
  console.log('=============================================');

  ws.close();
  process.exit(0);
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
