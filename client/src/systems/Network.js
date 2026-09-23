export class NetworkClient {
    ws = null;
    callbacks;
    handlers = new Map();
    isConnected = false;
    /** Subscribe to a raw server message type; returns an unsubscribe function */
    on(type, handler) {
        if (!this.handlers.has(type))
            this.handlers.set(type, new Set());
        this.handlers.get(type).add(handler);
        return () => this.handlers.get(type)?.delete(handler);
    }
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
    constructor(callbacks) {
        this.callbacks = callbacks;
    }
    connect(token, characterId) {
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
                    if (this.callbacks.onError)
                        this.callbacks.onError(msg.message);
                    return;
                }
                this.handleMessage(msg);
            }
            catch (err) {
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
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }
    }
    handleMessage(msg) {
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
    sendInput(packet) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'INPUT',
                packet
            }));
        }
    }
    sendMove(player) {
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
    sendRefine(itemId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'REFINE_ITEM',
                itemId
            }));
        }
    }
    sendAttack(skill = 'NORMAL', targetId) {
        this.send({ type: 'ATTACK', skill, targetId });
    }
    /** 3D position in server units (x: 0..14400, z: +-480) */
    sendPosSync3D(x, z, rotY, anim, facing) {
        this.send({ type: 'POS_SYNC_3D', x: Math.round(x), z: Math.round(z), rotY: Math.round(rotY * 100) / 100, anim, facing });
    }
    sendPickupNearby() {
        this.send({ type: 'PICK_DROP' });
    }
    sendEquip(itemId) {
        this.send({ type: 'EQUIP_ITEM', itemId });
    }
    sendUnequip(slot) {
        this.send({ type: 'UNEQUIP_ITEM', slot });
    }
    sendNpcAction(npcId, action, param) {
        this.send({ type: 'NPC_ACTION', npcId, action, param });
    }
    sendShopBuy(npcId, shopId, itemId, qty) {
        this.send({ type: 'SHOP_BUY', npcId, shopId, itemId, qty });
    }
    sendShopSell(npcId, itemId, qty) {
        this.send({ type: 'SHOP_SELL', npcId, itemId, qty });
    }
    sendUpgradeSkill(skillId) {
        this.send({ type: 'UPGRADE_SKILL', skillId });
    }
    sendRespawn() {
        this.send({ type: 'RESPAWN' });
    }
    /** Tell the server which view drives our position (3D sync vs 2D physics) */
    sendViewMode(mode) {
        this.send({ type: 'VIEW_MODE', mode });
    }
    sendUseItem(itemId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'USE_ITEM',
                itemId
            }));
        }
    }
    sendAllocateStat(stat) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'ALLOCATE_STAT',
                stat
            }));
        }
    }
    sendJobChange(job) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'JOB_CHANGE',
                job
            }));
        }
    }
    sendPickDrop(dropId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'PICK_DROP',
                dropId
            }));
        }
    }
    sendChat(text, channel = 'all') {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'CHAT',
                text,
                channel
            }));
        }
    }
    /** Rewards are decided by the server from its quest database */
    sendClaimQuest(questId) {
        this.send({ type: 'CLAIM_QUEST', questId });
    }
    sendAdminAction(action, data = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'ADMIN_ACTION',
                action,
                data
            }));
        }
    }
    sendAiAction(action) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'AI_ACTION',
                action
            }));
        }
    }
}
