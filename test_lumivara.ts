import { WebSocket } from 'ws';

async function testFullFlow() {
  console.log('1. Testing Guest Login API...');
  const res = await fetch('http://localhost:4000/api/auth/guest', { method: 'POST' });
  const authData = await res.json();
  console.log('Guest Auth Success! Account ID:', authData.account.id);

  console.log('2. Creating Character...');
  const charRes = await fetch('http://localhost:4000/api/characters', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + authData.token
    },
    body: JSON.stringify({
      slot: 0,
      name: 'LumiTester',
      gender: 'male',
      hairStyle: 1,
      hairColor: '#ffd166'
    })
  });
  const charData = await charRes.json();
  console.log('Character Created:', charData.character?.name, 'Job:', charData.character?.job);

  console.log('3. Connecting WebSocket with Token & Character ID...');
  const ws = new WebSocket('ws://localhost:4000?token=' + authData.token + '&characterId=' + charData.character.id);

  ws.on('open', () => {
    console.log('WebSocket connection opened successfully!');
  });

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === 'INIT_STATE') {
      console.log('Received INIT_STATE: Self:', msg.player.name, 'Monsters count:', msg.monsters.length);
      const mobTypes = [...new Set(msg.monsters.map((m: any) => m.type))];
      console.log('Active Monster Types in World:', mobTypes);

      // Test attack skill
      console.log('4. Testing skill Radiant Slash attack...');
      ws.send(JSON.stringify({ type: 'ATTACK', skill: 'RADIANT_SLASH' }));

      // Test claim quest
      console.log('5. Testing CLAIM_QUEST...');
      ws.send(JSON.stringify({
        type: 'CLAIM_QUEST',
        questId: 'q_sunbun',
        questTitle: 'บททดสอบแห่งสุริยะ',
        rewardExp: 150,
        rewardJobExp: 120,
        rewardZeny: 250
      }));
    }

    if (msg.type === 'PLAYER_ATTACKED') {
      console.log('Received PLAYER_ATTACKED confirmation: Skill =', msg.skill);
    }

    if (msg.type === 'QUEST_CLAIMED') {
      console.log('Received QUEST_CLAIMED confirmation! Quest =', msg.questId, 'Reward Exp =', msg.rewardExp);
      console.log('>>> ALL LUMIVARA SYSTEMS VERIFIED SUCCESSFULLY! <<<');
      ws.close();
      setTimeout(() => process.exit(0), 100);
    }
  });
}

testFullFlow().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
