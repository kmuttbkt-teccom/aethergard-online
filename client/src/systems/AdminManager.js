export class AdminManager {
    network;
    isGm = false;
    isGodMode = false;
    speedMultiplier = 1.0;
    constructor(network) {
        this.network = network;
    }
    setGmStatus(isGm) {
        this.isGm = isGm;
        const gmBtn = document.getElementById('btn-gm-panel');
        if (gmBtn) {
            gmBtn.style.display = isGm ? 'flex' : 'none';
        }
    }
    broadcast(message, style = 'gold') {
        if (!message.trim())
            return;
        this.network.sendAdminAction('BROADCAST', { message: message.trim(), style });
    }
    toggleGodMode() {
        this.isGodMode = !this.isGodMode;
        this.network.sendAdminAction('TOGGLE_GOD', {});
        return this.isGodMode;
    }
    setSpeed(multiplier) {
        this.speedMultiplier = Math.max(1.0, Math.min(5.0, multiplier));
        this.network.sendAdminAction('SET_SPEED', { speedMultiplier: this.speedMultiplier });
    }
    spawnMob(mobType, count = 1) {
        this.network.sendAdminAction('SPAWN_MOB', { mobType, count });
    }
    killAllMobs() {
        this.network.sendAdminAction('KILL_ALL', {});
    }
    healAllPlayers() {
        this.network.sendAdminAction('HEAL_ALL', {});
    }
    giveZeny(amount = 100000) {
        this.network.sendAdminAction('GIVE_ZENY', { amount });
    }
    giveItem(itemId) {
        this.network.sendAdminAction('GIVE_ITEM', { itemId });
    }
    kickPlayer(targetPlayerId) {
        if (!targetPlayerId)
            return;
        this.network.sendAdminAction('KICK_PLAYER', { targetPlayerId });
    }
}
