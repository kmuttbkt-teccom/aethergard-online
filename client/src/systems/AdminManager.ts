import { NetworkClient } from './Network.js';
import { MonsterType } from '../../../server/src/types.js';

export class AdminManager {
  private network: NetworkClient;
  public isGm: boolean = false;
  public isGodMode: boolean = false;
  public speedMultiplier: number = 1.0;

  constructor(network: NetworkClient) {
    this.network = network;
  }

  public setGmStatus(isGm: boolean) {
    this.isGm = isGm;
    const gmBtn = document.getElementById('btn-gm-panel');
    if (gmBtn) {
      gmBtn.style.display = isGm ? 'flex' : 'none';
    }
  }

  public broadcast(message: string, style: 'gold' | 'crimson' | 'emerald' = 'gold') {
    if (!message.trim()) return;
    this.network.sendAdminAction('BROADCAST', { message: message.trim(), style });
  }

  public toggleGodMode() {
    this.isGodMode = !this.isGodMode;
    this.network.sendAdminAction('TOGGLE_GOD', {});
    return this.isGodMode;
  }

  public setSpeed(multiplier: number) {
    this.speedMultiplier = Math.max(1.0, Math.min(5.0, multiplier));
    this.network.sendAdminAction('SET_SPEED', { speedMultiplier: this.speedMultiplier });
  }

  public spawnMob(mobType: MonsterType | string, count: number = 1) {
    this.network.sendAdminAction('SPAWN_MOB', { mobType, count });
  }

  public killAllMobs() {
    this.network.sendAdminAction('KILL_ALL', {});
  }

  public healAllPlayers() {
    this.network.sendAdminAction('HEAL_ALL', {});
  }

  public giveZeny(amount: number = 100000) {
    this.network.sendAdminAction('GIVE_ZENY', { amount });
  }

  public giveItem(itemId: string) {
    this.network.sendAdminAction('GIVE_ITEM', { itemId });
  }

  public kickPlayer(targetPlayerId: string) {
    if (!targetPlayerId) return;
    this.network.sendAdminAction('KICK_PLAYER', { targetPlayerId });
  }
}
