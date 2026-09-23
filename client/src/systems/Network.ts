import { PlayerData, MonsterData, DropItemData, DamageEvent, ChatMessage, Stats, JobClass, InputPacket, ServerSnapshot, ServerAnnouncement, AdminActionPacket, AiNeuralState } from '../../../server/src/types.js';

export interface NetworkCallbacks {
  onInit: (selfId: string, player: PlayerData, players: PlayerData[], monsters: MonsterData[], drops: DropItemData[]) => void;
  onPlayerJoined: (player: PlayerData) => void;
  onPlayerLeft: (id: string) => void;
  onPlayerMoved: (msg: { id: string; x: number; y: number; vx: number; vy: number; facing: 'left' | 'right'; anim: 'idle' | 'walk' | 'jump'; isGrounded: boolean }) => void;
  onPlayerAttacked: (id: string, skill: string, facing: 'left' | 'right') => void;
  onPlayerUpdated: (player: PlayerData, leveledUp?: boolean) => void;
  onDamage: (damageEvent: DamageEvent, mobHp?: number, mobMaxHp?: number) => void;
  onMobDied: (mobId: string, drops: DropItemData[], mobType?: any, mobName?: string) => void;
  onMobSpawned?: (monster: MonsterData) => void;
  onDropRemoved: (dropId: string, pickerId: string) => void;
  onChat: (chat: ChatMessage) => void;
  onSnapshot?: (snapshot: ServerSnapshot) => void;
  onRefineResult?: (result: any) => void;
  onQuestClaimed?: (questId: string, exp: number, jobExp: number, zeny: number) => void;
  onAnnouncement?: (announcement: ServerAnnouncement) => void;
  onAiUpdate?: (state: AiNeuralState) => void;
  onError?: (msg: string) => void;
}

export type ServerMessageHandler = (msg: any) => void;

export class NetworkClient {
  private ws: WebSocket | null = null;
  private callbacks: NetworkCallbacks;
  private handlers: Map<string, Set<ServerMessageHandler>> = new Map();
  public isConnected: boolean = false;

  /** Subscribe to a raw server message type; returns an unsubscribe function */
  public on(type: string, handler: ServerMessageHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  private send(data: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(token: string, characterId: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isViteDev = window.location.port === '3000';
    const targetHost = isViteDev ? `${window.location.hostname || 'localhost'}:4000` : (window.location.host || 'localhost:4000');
    const url = `${protocol}//${targetHost}/?token=${encodeURIComponent(token)}&characterId=${encodeURIComponent(characterId)}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('✅ Connected to Authoritative Server (Snapshot Sync + Colyseus Protocol)!');
      this.isConnected = true;
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'ERROR') {
          console.error('Server error:', msg.message);
          if (this.callbacks.onError) this.callbacks.onError(msg.message);
          return;
        }
        this.handleMessage(msg);
      } catch (err) {
        console.error('Error parsing network message:', err);
      }
    };

    this.ws.onclose = () => {
      console.log('❌ Disconnected from game server');
      this.isConnected = false;
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  private handleMessage(msg: any) {
    this.handlers.get(msg.type)?.forEach(handler => handler(msg));
    switch (msg.type) {
      case 'SNAPSHOT':
        if (this.callbacks.onSnapshot) {
          this.callbacks.onSnapshot(msg.snapshot);
        }
        break;
      case 'REFINE_RESULT':
        if (this.callbacks.onRefineResult) {
          this.callbacks.onRefineResult(msg.result);
        }
        break;
      case 'INIT_STATE':
        this.callbacks.onInit(msg.selfId, msg.player, msg.players, msg.monsters, msg.drops);
        break;
      case 'PLAYER_JOINED':
        this.callbacks.onPlayerJoined(msg.player);
        break;
      case 'PLAYER_LEFT':
        this.callbacks.onPlayerLeft(msg.id);
        break;
      case 'PLAYER_MOVED':
        this.callbacks.onPlayerMoved(msg);
        break;
      case 'PLAYER_ATTACKED':
        this.callbacks.onPlayerAttacked(msg.id, msg.skill, msg.facing);
        break;
      case 'PLAYER_UPDATED':
        this.callbacks.onPlayerUpdated(msg.player, msg.leveledUp);
        break;
      case 'DAMAGE':
        this.callbacks.onDamage(msg.damageEvent, msg.mobHp, msg.mobMaxHp);
        break;
      case 'MOB_DIED':
        this.callbacks.onMobDied(msg.mobId, msg.drops, msg.mobType, msg.mobName);
        break;
      case 'QUEST_CLAIMED':
        if (this.callbacks.onQuestClaimed) {
          this.callbacks.onQuestClaimed(msg.questId, msg.rewardExp, msg.rewardJobExp, msg.rewardZeny);
        }
        break;
      case 'DROP_REMOVED':
        this.callbacks.onDropRemoved(msg.dropId, msg.pickerId);
        break;
      case 'CHAT':
        this.callbacks.onChat(msg.chat);
        break;
      case 'SERVER_ANNOUNCEMENT':
        if (this.callbacks.onAnnouncement) {
          this.callbacks.onAnnouncement(msg.announcement);
        }
        break;
      case 'MOB_SPAWNED':
        if (this.callbacks.onMobSpawned) {
          this.callbacks.onMobSpawned(msg.monster);
        }
        break;
      case 'AI_UPDATE':
        if (this.callbacks.onAiUpdate) {
          this.callbacks.onAiUpdate(msg.state);
        }
        break;
    }
  }

  /**
   * Send client input packet with incrementing sequence number for server reconciliation
   */
  public sendInput(packet: InputPacket) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'INPUT',
        packet
      }));
    }
  }

  public sendMove(player: PlayerData) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'MOVE',
        x: Math.round(player.x),
        y: Math.round(player.y),
        vx: Math.round(player.vx),
        vy: Math.round(player.vy),
        facing: player.facing,
        anim: player.anim,
        isGrounded: player.isGrounded
      }));
    }
  }

  public sendRefine(itemId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'REFINE_ITEM',
        itemId
      }));
    }
  }

  public sendAttack(skill: string = 'NORMAL', targetId?: string) {
    this.send({ type: 'ATTACK', skill, targetId });
  }

  /** 3D position in server units (x: 0..14400, z: +-480) */
  public sendPosSync3D(x: number, z: number, rotY: number, anim: 'idle' | 'walk' | 'jump', facing: 'left' | 'right') {
    this.send({ type: 'POS_SYNC_3D', x: Math.round(x), z: Math.round(z), rotY: Math.round(rotY * 100) / 100, anim, facing });
  }

  public sendPickupNearby() {
    this.send({ type: 'PICK_DROP' });
  }

  public sendEquip(itemId: string) {
    this.send({ type: 'EQUIP_ITEM', itemId });
  }

  public sendUnequip(slot: string) {
    this.send({ type: 'UNEQUIP_ITEM', slot });
  }

  public sendNpcAction(npcId: string, action: string, param?: string) {
    this.send({ type: 'NPC_ACTION', npcId, action, param });
  }

  public sendShopBuy(npcId: string, shopId: string, itemId: string, qty: number) {
    this.send({ type: 'SHOP_BUY', npcId, shopId, itemId, qty });
  }

  public sendShopSell(npcId: string, itemId: string, qty: number) {
    this.send({ type: 'SHOP_SELL', npcId, itemId, qty });
  }

  public sendUpgradeSkill(skillId: string) {
    this.send({ type: 'UPGRADE_SKILL', skillId });
  }

  public sendRespawn() {
    this.send({ type: 'RESPAWN' });
  }

  /** Tell the server which view drives our position (3D sync vs 2D physics) */
  public sendViewMode(mode: '2d' | '3d') {
    this.send({ type: 'VIEW_MODE', mode });
  }

  public sendUseItem(itemId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'USE_ITEM',
        itemId
      }));
    }
  }

  public sendAllocateStat(stat: keyof Stats) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'ALLOCATE_STAT',
        stat
      }));
    }
  }

  public sendJobChange(job: JobClass) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'JOB_CHANGE',
        job
      }));
    }
  }

  public sendPickDrop(dropId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'PICK_DROP',
        dropId
      }));
    }
  }

  public sendChat(text: string, channel: 'all' | 'party' | 'whisper' = 'all') {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'CHAT',
        text,
        channel
      }));
    }
  }

  /** Rewards are decided by the server from its quest database */
  public sendClaimQuest(questId: string) {
    this.send({ type: 'CLAIM_QUEST', questId });
  }

  public sendAdminAction(action: AdminActionPacket['action'], data: any = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'ADMIN_ACTION',
        action,
        data
      }));
    }
  }

  public sendAiAction(action: 'RUN_DIAGNOSTICS' | 'TRIGGER_EVOLUTION' | 'GET_STATE') {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'AI_ACTION',
        action
      }));
    }
  }

  public sendRedeemGiftCode(code: string) {
    this.send({
      type: 'REDEEM_GIFT_CODE',
      code
    });
  }
}

