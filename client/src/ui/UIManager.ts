import { PlayerData, Stats, JobClass, InventoryItem, ChatMessage, MonsterData, ServerAnnouncement, AiNeuralState, AiPatchRecord, AiThought } from '../../../server/src/types.js';
import { sound } from '../engine/Sound.js';
import { QuestManager, Quest } from '../systems/QuestManager.js';
import { BotEngine } from '../systems/BotEngine.js';
import { NetworkClient } from '../systems/Network.js';
import { AdminManager } from '../systems/AdminManager.js';
import { SkillIconManager } from './SkillIconManager.js';
import { ModelAssetManager } from '../three/ModelAssetManager.js';
import { GameplayUI } from './GameplayUI.js';
import { escapeHtml } from './escape.js';
import { computeDerived } from '../../../server/src/GameData.js';
import { HeroRosterManager, HERO_ROSTER_DB, HeroDef } from '../systems/HeroRoster.js';

export interface UIEventListeners {
  onAllocateStat: (stat: keyof Stats) => void;
  onUseItem: (itemId: string) => void;
  onRefineItem: (itemId: string) => void;
  onJobChange: (job: JobClass) => void;
  onSendChat: (text: string) => void;
  onToggleSound: () => boolean;
}

export class UIManager {
  private listeners: UIEventListeners;
  private activeChatTab: string = 'all';
  private currentWeaponId: string | null = null;

  // Lumivara Systems
  private questManager: QuestManager | null = null;
  private botEngine: BotEngine | null = null;
  private network: NetworkClient | null = null;
  public adminManager: AdminManager | null = null;
  public aiState: AiNeuralState | null = null;
  private worldScene: any = null;
  private activeQuestTab: 'active' | 'daily' | 'completed' = 'active';
  private announcementTimeout: any = null;
  public gameplay: GameplayUI;

  constructor(listeners: UIEventListeners) {
    this.listeners = listeners;

    // Created first so its windows get draggable headers below
    this.gameplay = new GameplayUI({
      useItem: (itemId) => this.listeners.onUseItem(itemId),
      equip: (itemId) => this.network?.sendEquip(itemId),
      unequip: (slot) => this.network?.sendUnequip(slot),
      upgradeSkill: (skillId) => this.network?.sendUpgradeSkill(skillId),
      buy: (npcId, shopId, itemId, qty) => this.network?.sendShopBuy(npcId, shopId, itemId, qty),
      sell: (npcId, itemId, qty) => this.network?.sendShopSell(npcId, itemId, qty),
      respawn: () => this.network?.sendRespawn()
    });

    this.setupWindowDragging();
    this.setupEventListeners();
    this.setupHeroModals();
    this.setupBootScreen();
    SkillIconManager.getInstance().initQuickslots();
  }

  public setSystems(qm: QuestManager, bot: BotEngine, net: NetworkClient, scene: any) {
    this.questManager = qm;
    this.botEngine = bot;
    this.network = net;
    this.worldScene = scene;

    this.adminManager = new AdminManager(net);
    this.setupQuestAndBotControls();
    this.setupAdminControls();
    this.setupAiControls();
    this.setup3DModelStudio();
    this.renderQuestJournal(qm);
    this.setupGiftCodeNetworkListener();
  }


  public enableGm(isGm: boolean) {
    if (this.adminManager) {
      this.adminManager.setGmStatus(isGm);
    }
    const gmTopBtn = document.getElementById('btn-gm-panel');
    const gmBtmBtn = document.getElementById('btn-gm-panel-bottom');
    const gmDrawerBtn = document.getElementById('m-drawer-btn-gm');
    if (gmTopBtn) gmTopBtn.style.display = isGm ? 'flex' : 'none';
    if (gmBtmBtn) gmBtmBtn.style.display = isGm ? 'flex' : 'none';
    if (gmDrawerBtn) gmDrawerBtn.style.display = isGm ? 'flex' : 'none';

    const badge = document.getElementById('account-type-badge');
    if (badge && isGm) {
      badge.textContent = '👑 GM / ADMIN';
      badge.style.background = 'linear-gradient(90deg, #ffd700, #ff9e00)';
      badge.style.color = '#111';
      badge.style.fontWeight = '800';
    }
  }

  public showAnnouncement(announcement: ServerAnnouncement) {
    const banner = document.getElementById('server-broadcast-banner');
    const textEl = document.getElementById('broadcast-message-text');
    if (!banner || !textEl) return;

    textEl.textContent = `${announcement.sender ? `[${announcement.sender}]: ` : ''}${announcement.message}`;
    banner.classList.remove('hidden', 'crimson', 'emerald', 'gold');
    if (announcement.style) {
      banner.classList.add(announcement.style);
    }

    if (this.announcementTimeout) {
      clearTimeout(this.announcementTimeout);
    }

    this.announcementTimeout = setTimeout(() => {
      banner.classList.add('hidden');
    }, 7000);
  }

  private setupBootScreen() {
    const btnEnter = document.getElementById('btn-boot-enter');
    btnEnter?.addEventListener('click', () => {
      sound.playLevelUp();
      const bootScreen = document.getElementById('screen-boot');
      if (bootScreen) bootScreen.classList.add('hidden');
      const loginScreen = document.getElementById('screen-login');
      if (loginScreen) loginScreen.classList.remove('hidden');
    });
  }

  public updateMapBanner(text: string) {
    const bannerEl = document.getElementById('map-banner-text');
    if (bannerEl) bannerEl.textContent = text;
  }

  public updateBotStatus(running: boolean) {
    const statusText = document.getElementById('bot-status-text');
    const toggleBtn = document.getElementById('btn-bot-toggle-run');
    const tbLabel = document.getElementById('tb-bot-label');
    const tbBtn = document.getElementById('tb-btn-bot');

    if (running) {
      if (statusText) {
        statusText.textContent = '🟢 กำลังทำงาน (Running)';
        statusText.style.color = '#38b000';
      }
      if (toggleBtn) toggleBtn.textContent = 'ปิดทำงาน (OFF)';
      if (tbLabel) tbLabel.textContent = 'Bot: ON';
      if (tbBtn) tbBtn.style.background = 'rgba(56, 176, 0, 0.35)';
    } else {
      if (statusText) {
        statusText.textContent = '🔴 หยุดทำงาน (Stopped)';
        statusText.style.color = '#ef233c';
      }
      if (toggleBtn) toggleBtn.textContent = 'เปิดทำงาน (ON)';
      if (tbLabel) tbLabel.textContent = 'Bot: OFF';
      if (tbBtn) tbBtn.style.background = 'rgba(217, 4, 41, 0.25)';
    }
  }

  public renderQuestJournal(qm?: QuestManager) {
    const manager = qm || this.questManager;
    if (!manager) return;

    const listContainer = document.getElementById('quest-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    const quests = manager.getQuestsByCategory(this.activeQuestTab);

    // Update claimable badge
    const badge = document.getElementById('tb-quest-badge');
    const claimableCount = manager.getClaimableQuestCount();
    if (badge) {
      if (claimableCount > 0) {
        badge.classList.remove('hidden');
        badge.textContent = `${claimableCount}`;
      } else {
        badge.classList.add('hidden');
      }
    }

    if (quests.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; color: #94a3b8; padding: 20px; font-size: 13px;">
          ${this.activeQuestTab === 'completed' ? '✨ ยังไม่มีเควสที่ส่งรางวัลแล้ว' : '📜 ไม่มีเควสในหมวดหมู่นี้'}
        </div>
      `;
      return;
    }

    quests.forEach(q => {
      const card = document.createElement('div');
      card.className = 'quest-card';

      const progressRatio = Math.min(1, q.currentKills / q.requiredKills);
      const percent = Math.floor(progressRatio * 100);

      card.innerHTML = `
        <div class="quest-card-header">
          <span class="quest-card-title">${q.title}</span>
          <span style="font-size: 11px; color: ${q.completed ? '#70e000' : '#ffd166'}; font-weight: bold;">
            ${q.claimed ? '✅ สำเร็จแล้ว' : (q.completed ? '★ ส่งรางวัลได้!' : `${q.currentKills}/${q.requiredKills}`)}
          </span>
        </div>
        <div class="quest-card-desc">${q.description}</div>

        <div class="quest-progress-track">
          <div class="quest-progress-fill" style="width: ${percent}%;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <div style="font-size: 11px; color: #c9a45c;">
            🎁 +${q.rewardExp} EXP | +${q.rewardZeny} Zeny ${q.rewardItem ? `| ${q.rewardItem}` : ''}
          </div>
          ${!q.claimed ? `
            <button class="quest-claim-btn" ${!q.completed ? 'disabled' : ''} data-qid="${q.id}">
              ${q.completed ? 'รับรางวัล' : 'ยังไม่เสร็จ'}
            </button>
          ` : ''}
        </div>
      `;

      const claimBtn = card.querySelector('.quest-claim-btn');
      if (claimBtn && q.completed && !q.claimed) {
        claimBtn.addEventListener('click', () => {
          if (this.network) {
            manager.claimQuest(q.id, this.network);
            this.renderQuestJournal(manager);
          }
        });
      }

      listContainer.appendChild(card);
    });
  }

  private setupQuestAndBotControls() {
    // Quest Tabs
    const tabBtns = document.querySelectorAll('.quest-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        const target = e.target as HTMLElement;
        target.classList.add('active');
        this.activeQuestTab = (target.getAttribute('data-qtab') || 'active') as any;
        this.renderQuestJournal();
      });
    });

    // Bot Toggle Run Button
    const botToggleBtn = document.getElementById('btn-bot-toggle-run');
    botToggleBtn?.addEventListener('click', () => {
      if (this.botEngine) {
        this.botEngine.toggle();
      }
    });

    // Bot Settings Checkboxes
    const chkAttack = document.getElementById('bot-chk-attack') as HTMLInputElement;
    const chkSkill = document.getElementById('bot-chk-skill') as HTMLInputElement;
    const chkPotion = document.getElementById('bot-chk-potion') as HTMLInputElement;
    const chkLoot = document.getElementById('bot-chk-loot') as HTMLInputElement;

    chkAttack?.addEventListener('change', () => { if (this.botEngine) this.botEngine.settings.autoAttack = chkAttack.checked; });
    chkSkill?.addEventListener('change', () => { if (this.botEngine) this.botEngine.settings.autoSkill = chkSkill.checked; });
    chkPotion?.addEventListener('change', () => { if (this.botEngine) this.botEngine.settings.autoPotion = chkPotion.checked; });
    chkLoot?.addEventListener('change', () => { if (this.botEngine) this.botEngine.settings.autoLoot = chkLoot.checked; });
  }

  public renderMiniMap(self: PlayerData, players: PlayerData[], monsters: MonsterData[], mapW: number, mapH: number) {
    const canvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#071018';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / mapW;
    const scaleY = canvas.height / mapH;

    // Monsters (Red dots)
    ctx.fillStyle = '#ef233c';
    monsters.forEach(m => {
      ctx.fillRect(m.x * scaleX - 1, m.y * scaleY - 1, 2, 2);
    });

    // Remote Players (Cyan dots)
    ctx.fillStyle = '#4cc9f0';
    players.forEach(p => {
      ctx.fillRect(p.x * scaleX - 1.5, p.y * scaleY - 1.5, 3, 3);
    });

    // Self Player (Gold dot)
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(self.x * scaleX - 2, self.y * scaleY - 2, 4, 4);
  }

  public updatePlayerHUD(player: PlayerData) {
    // Name & Job
    const nameEl = document.getElementById('hud-player-name');
    if (nameEl) nameEl.textContent = `${player.name}`;

    const jobBadge = document.getElementById('hud-job-badge');
    if (jobBadge) jobBadge.textContent = `${player.job} (Lv.${player.baseLevel})`;

    const zenyEl = document.getElementById('hud-zeny');
    if (zenyEl) zenyEl.textContent = `${player.zeny.toLocaleString()} Z`;

    // HP Bar
    const hpRatio = Math.max(0, Math.min(1, player.hp / player.maxHp));
    const hpFill = document.getElementById('hud-hp-fill');
    const hpText = document.getElementById('hud-hp-text');
    if (hpFill) hpFill.style.width = `${hpRatio * 100}%`;
    if (hpText) hpText.textContent = `HP: ${player.hp} / ${player.maxHp}`;

    // MP Bar
    const mpRatio = Math.max(0, Math.min(1, player.mp / player.maxMp));
    const mpFill = document.getElementById('hud-mp-fill');
    const mpText = document.getElementById('hud-mp-text');
    if (mpFill) mpFill.style.width = `${mpRatio * 100}%`;
    if (mpText) mpText.textContent = `MP: ${player.mp} / ${player.maxMp}`;

    // Base EXP Bar
    const baseRatio = Math.max(0, Math.min(1, player.baseExp / player.maxBaseExp));
    const baseFill = document.getElementById('hud-base-exp-fill');
    const baseText = document.getElementById('hud-base-exp-text');
    if (baseFill) baseFill.style.width = `${baseRatio * 100}%`;
    if (baseText) baseText.textContent = `Base EXP: ${(baseRatio * 100).toFixed(1)}%`;

    // Job EXP Bar
    const jobRatio = Math.max(0, Math.min(1, player.jobExp / player.maxJobExp));
    const jobFill = document.getElementById('hud-job-exp-fill');
    const jobText = document.getElementById('hud-job-exp-text');
    if (jobFill) jobFill.style.width = `${jobRatio * 100}%`;
    if (jobText) jobText.textContent = `Job EXP: ${(jobRatio * 100).toFixed(1)}% (J.Lv.${player.jobLevel})`;

    // Update Windows
    this.updateStatusWindow(player);
    this.gameplay.updatePlayer(player);
    this.updateRefineWindow(player);
    this.updateQuickslotCounts(player);
    SkillIconManager.getInstance().updateJobSkills(player.job);
  }

  private updateRefineWindow(player: PlayerData) {
    const weapon = player.equipped.weapon || player.inventory.find(i => i.type === 'equip');
    const nameEl = document.getElementById('refine-target-name');
    const levelEl = document.getElementById('refine-target-level');
    const costEl = document.getElementById('refine-target-cost');
    const btn = document.getElementById('btn-do-refine') as HTMLButtonElement;

    if (weapon) {
      this.currentWeaponId = weapon.id;
      const curRefine = (weapon as any).refine || 0;
      const cost = (curRefine + 1) * 250;

      if (nameEl) nameEl.textContent = weapon.name;
      if (levelEl) levelEl.textContent = `+${curRefine} (ATK +${weapon.effect?.atk || 0})`;
      if (costEl) costEl.textContent = `${cost.toLocaleString()} Zeny`;
      if (btn) {
        btn.disabled = player.zeny < cost;
        btn.style.opacity = player.zeny >= cost ? '1' : '0.4';
      }
    } else {
      this.currentWeaponId = null;
      if (nameEl) nameEl.textContent = 'ไม่มีอาวุธที่สวมใส่';
      if (levelEl) levelEl.textContent = '-';
      if (costEl) costEl.textContent = '-';
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.4';
      }
    }
  }

  private updateStatusWindow(player: PlayerData) {
    const ptsEl = document.getElementById('stat-points-val');
    if (ptsEl) ptsEl.textContent = `${player.statPoints}`;

    const stats: (keyof Stats)[] = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
    stats.forEach(s => {
      const valEl = document.getElementById(`stat-${s}-val`);
      if (valEl) valEl.textContent = `${player.stats[s]}`;

      const btn = document.getElementById(`stat-${s}-btn`) as HTMLButtonElement;
      if (btn) {
        btn.disabled = player.statPoints <= 0;
        btn.style.opacity = player.statPoints > 0 ? '1' : '0.4';
      }
    });

    const d = computeDerived(player);
    const weaponAtk = player.equipped.weapon?.effect?.atk || 0;

    const secAtk = document.getElementById('stat-calc-atk');
    if (secAtk) secAtk.textContent = `${d.atk} (+${weaponAtk}) · MATK ${d.matk}`;

    const secDef = document.getElementById('stat-calc-def');
    if (secDef) secDef.textContent = `${d.def} · FLEE ${d.flee}`;

    // Attacks per second, shown RO-style as an ASPD-like number
    const secAspd = document.getElementById('stat-calc-aspd');
    if (secAspd) secAspd.textContent = `${(1000 / d.aspdMs).toFixed(2)}/s`;

    const secCrit = document.getElementById('stat-calc-crit');
    if (secCrit) secCrit.textContent = `${d.crit}%`;
  }

  private updateInventoryWindow(player: PlayerData) {
    const grid = document.getElementById('inv-items-grid');
    if (!grid) return;

    grid.innerHTML = '';
    player.inventory.forEach(item => {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      slot.innerHTML = `
        <span style="font-size: 20px;">${item.icon}</span>
        <span style="position: absolute; bottom: 2px; right: 4px; font-size: 10px; font-weight: bold; color: #ffd166;">
          ${item.quantity > 1 ? item.quantity : ''}
        </span>
      `;
      slot.title = `${item.name}\n${item.description}`;

      slot.addEventListener('click', () => {
        if (item.type === 'usable') {
          sound.playPotion();
          this.listeners.onUseItem(item.id);
        }
      });

      grid.appendChild(slot);
    });
  }

  private updateQuickslotCounts(player: PlayerData) {
    const red = player.inventory.find(i => i.id.includes('red_potion') || i.name.includes('Red Potion'));
    const blue = player.inventory.find(i => i.id.includes('blue_potion') || i.name.includes('Blue Potion'));
    const wing = player.inventory.find(i => i.id.includes('fly_wing') || i.name.includes('Fly Wing'));

    const s1 = document.getElementById('slot-1-count');
    const s2 = document.getElementById('slot-2-count');
    const s3 = document.getElementById('slot-3-count');

    if (s1) s1.textContent = red ? `${red.quantity}` : '0';
    if (s2) s2.textContent = blue ? `${blue.quantity}` : '0';
    if (s3) s3.textContent = wing ? `${wing.quantity}` : '0';

    const mp1 = document.getElementById('m-potion1-count');
    const mp2 = document.getElementById('m-potion2-count');
    if (mp1) mp1.textContent = red ? `${red.quantity}` : '0';
    if (mp2) mp2.textContent = blue ? `${blue.quantity}` : '0';
  }

  public appendChat(chat: ChatMessage) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const line = document.createElement('div');
    line.className = `chat-line ${['all', 'system', 'party', 'whisper'].includes(chat.channel) ? chat.channel : 'all'}`;
    line.innerHTML = `
      <span class="chat-time">[${escapeHtml(chat.time)}]</span>
      <span class="chat-sender">${escapeHtml(chat.sender)}:</span>
      <span class="chat-text">${escapeHtml(chat.text)}</span>
    `;
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
  }

  public addChatMessage(sender: string, text: string, channel: 'all' | 'system' | 'party' = 'system') {
    const time = new Date().toLocaleTimeString('th-TH', { hour12: false });
    this.appendChat({ sender, text, channel, time });
  }

  public updatePlayerStats(player: PlayerData) {
    this.updatePlayerHUD(player);
  }

  public toggleWindow(id: string, force?: boolean) {
    const win = document.getElementById(id);
    if (win) {
      if (force !== undefined) {
        if (force) win.classList.add('active');
        else win.classList.remove('active');
      } else {
        win.classList.toggle('active');
      }
    }
  }

  private setupEventListeners() {
    // Window toggles
    document.getElementById('btn-status')?.addEventListener('click', () => this.toggleWindow('status-win'));
    document.getElementById('btn-inv')?.addEventListener('click', () => this.toggleWindow('inventory-win'));
    document.getElementById('btn-skills')?.addEventListener('click', () => this.toggleWindow('skills-win'));
    document.getElementById('btn-quest')?.addEventListener('click', () => this.toggleWindow('quest-win'));
    document.getElementById('btn-bot')?.addEventListener('click', () => this.toggleWindow('bot-win'));
    document.getElementById('btn-job')?.addEventListener('click', () => this.toggleWindow('job-win'));
    document.getElementById('btn-help')?.addEventListener('click', () => this.toggleWindow('help-win'));
    document.getElementById('btn-refine')?.addEventListener('click', () => this.toggleWindow('refine-win'));

    // Toolbar triggers
    document.getElementById('tb-btn-status')?.addEventListener('click', () => this.toggleWindow('status-win'));
    document.getElementById('tb-btn-inv')?.addEventListener('click', () => this.toggleWindow('inventory-win'));
    document.getElementById('tb-btn-skills')?.addEventListener('click', () => this.toggleWindow('skills-win'));
    document.getElementById('tb-btn-quest')?.addEventListener('click', () => this.toggleWindow('quest-win'));
    document.getElementById('tb-btn-refine')?.addEventListener('click', () => this.toggleWindow('refine-win'));
    document.getElementById('tb-btn-job')?.addEventListener('click', () => this.toggleWindow('job-win'));
    document.getElementById('tb-btn-bot')?.addEventListener('click', () => {
      if (this.botEngine) this.botEngine.toggle();
    });

    // Refine action
    document.getElementById('btn-do-refine')?.addEventListener('click', () => {
      if (this.currentWeaponId) {
        this.listeners.onRefineItem(this.currentWeaponId);
      }
    });

    document.getElementById('btn-sound')?.addEventListener('click', () => {
      const isMuted = this.listeners.onToggleSound();
      const btn = document.getElementById('btn-sound');
      if (btn) btn.textContent = isMuted ? '🔇 เสียง: ปิด' : '🔊 เสียง: เปิด';
    });

    document.querySelectorAll('.ro-close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = (e.target as HTMLElement).getAttribute('data-close');
        if (targetId) {
          document.getElementById(targetId)?.classList.remove('active');
        }
      });
    });

    const stats: (keyof Stats)[] = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
    stats.forEach(s => {
      document.getElementById(`stat-${s}-btn`)?.addEventListener('click', () => {
        this.listeners.onAllocateStat(s);
      });
    });

    document.querySelectorAll('.job-pick-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const job = (e.target as HTMLElement).getAttribute('data-job') as JobClass;
        if (job) {
          this.listeners.onJobChange(job);
          document.getElementById('job-win')?.classList.remove('active');
        }
      });
    });

    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = chatInput.value.trim();
        if (val) {
          this.listeners.onSendChat(val);
          chatInput.value = '';
        }
        chatInput.blur();
      }
    });

    document.getElementById('btn-gm-panel')?.addEventListener('click', () => this.toggleWindow('admin-panel-win'));
    document.getElementById('btn-gm-panel-bottom')?.addEventListener('click', () => this.toggleWindow('admin-panel-win'));

    // Mobile Menu Drawer Triggers
    document.getElementById('tb-btn-menu-drawer')?.addEventListener('click', () => {
      document.getElementById('modal-mobile-menu')?.classList.toggle('hidden');
    });
    document.getElementById('btn-close-mobile-menu')?.addEventListener('click', () => {
      document.getElementById('modal-mobile-menu')?.classList.add('hidden');
    });
    document.querySelectorAll('.m-drawer-item').forEach(item => {
      item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        if (target) {
          this.toggleWindow(target);
          document.getElementById('modal-mobile-menu')?.classList.add('hidden');
        }
      });
    });
    document.getElementById('m-drawer-btn-3d')?.addEventListener('click', () => {
      document.getElementById('tb-btn-view-mode')?.click();
      document.getElementById('modal-mobile-menu')?.classList.add('hidden');
    });
    document.getElementById('m-drawer-btn-sound')?.addEventListener('click', () => {
      document.getElementById('btn-sound')?.click();
    });
    document.getElementById('m-drawer-btn-logout')?.addEventListener('click', () => {
      document.getElementById('btn-back-char-select')?.click();
    });
    document.getElementById('m-drawer-btn-pwa')?.addEventListener('click', () => {
      if ((window as any).__pwaPrompt) {
        (window as any).__pwaPrompt();
      } else {
        alert('📲 สามารถติดตั้งเกมลงหน้าจอมือถือได้โดยกด "เพิ่มลงในหน้าจอหลัก" (Add to Home Screen) ในเมนูเบราว์เซอร์ครับ');
      }
    });

    // Desktop Toolbar: Mobile Touch Mode Toggle Button
    const btnMobileToggle = document.getElementById('tb-btn-mobile-toggle');
    btnMobileToggle?.addEventListener('click', () => {
      const isTouch = document.body.classList.toggle('touch-mode-active');
      btnMobileToggle.classList.toggle('active', isTouch);
      const small = btnMobileToggle.querySelector('small');
      if (small) small.textContent = isTouch ? 'Touch: ON' : 'Touch';
    });

    // Mobile Utility Bar Buttons
    document.getElementById('m-btn-fullscreen')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    document.getElementById('m-btn-toggle-ctrls')?.addEventListener('click', () => {
      document.getElementById('mobile-controls-overlay')?.classList.toggle('minimized');
    });

    document.getElementById('m-btn-chat-toggle')?.addEventListener('click', () => {
      document.querySelector('.chat-window')?.classList.toggle('chat-minimized');
    });

    document.getElementById('m-btn-menu-drawer')?.addEventListener('click', () => {
      document.getElementById('modal-mobile-menu')?.classList.toggle('hidden');
    });
  }

  private setupHeroModals() {
    const roster = HeroRosterManager.getInstance();

    const modalSummon = document.getElementById('modal-hero-summon');
    const modalParty = document.getElementById('modal-hero-party');

    const openSummon = () => {
      this.updateSummonCurrency();
      modalSummon?.classList.remove('hidden');
    };
    const closeSummon = () => {
      modalSummon?.classList.add('hidden');
    };

    const openParty = () => {
      this.renderPartyModal();
      modalParty?.classList.remove('hidden');
    };
    const closeParty = () => {
      modalParty?.classList.add('hidden');
    };

    // Open & Close Buttons
    document.getElementById('btn-summon-modal')?.addEventListener('click', openSummon);
    document.getElementById('btn-close-summon')?.addEventListener('click', closeSummon);

    document.getElementById('btn-party-modal')?.addEventListener('click', openParty);
    document.getElementById('btn-close-party')?.addEventListener('click', closeParty);

    document.getElementById('btn-open-summon-from-party')?.addEventListener('click', () => {
      closeParty();
      openSummon();
    });

    // Mobile drawer items
    document.getElementById('m-drawer-btn-party')?.addEventListener('click', () => {
      document.getElementById('modal-mobile-menu')?.classList.add('hidden');
      openParty();
    });
    document.getElementById('m-drawer-btn-summon')?.addEventListener('click', () => {
      document.getElementById('modal-mobile-menu')?.classList.add('hidden');
      openSummon();
    });
    document.getElementById('m-drawer-btn-weapon')?.addEventListener('click', () => {
      document.getElementById('modal-mobile-menu')?.classList.add('hidden');
      if (this.worldScene?.threeWorld) {
        this.worldScene.threeWorld.switchWeapon();
      }
    });

    // Real-Time Weapon Swap (PC menu button)
    document.getElementById('btn-weapon-swap')?.addEventListener('click', () => {
      if (this.worldScene?.threeWorld) {
        this.worldScene.threeWorld.switchWeapon();
      }
    });

    // Free Gems button
    document.getElementById('btn-free-gems')?.addEventListener('click', () => {
      roster.addCurrency(1000);
      this.updateSummonCurrency();
      sound.playCoin();
      this.gameplay.toast('🎁 ได้รับ 1,000 เพชรฟรีสำหรับอัญเชิญฮีโร่!', 'success');
    });

    // Summon 1x & 10x
    document.getElementById('btn-do-summon-1')?.addEventListener('click', () => {
      this.executeSummon(false);
    });
    document.getElementById('btn-do-summon-10')?.addEventListener('click', () => {
      this.executeSummon(true);
    });

    // Deploy Party button
    document.getElementById('btn-deploy-party')?.addEventListener('click', () => {
      if (this.worldScene?.threeWorld) {
        this.worldScene.threeWorld.refreshCompanions();
      }
      sound.playLevelUp();
      this.gameplay.toast('⚔️ ยืนยันทีมลงสู่โลก 3D สำเร็จ! ฮีโร่ติดตามพร้อมรบเคียงข้างคุณ', 'success');
      closeParty();
    });

    // =========================================================================
    // PIXEL SLAYER SAGA — Tower of Slayers Modal
    // =========================================================================
    const modalTower = document.getElementById('modal-tower-slayers');
    let selectedFloor = 1;
    const floorData: Record<number, { icon: string; name: string; title: string; stats: string; gems: string; zeny: string; mvp: string }> = {
      1:  { icon: '👛', name: 'Treasure Mimic', title: 'กล่องสมบัติปีศาจ ผู้เฝ้าทางเข้าหอคอย', stats: 'HP: 35,000 • ATK: 120 • ธาตุ: ดาร์ก', gems: '100 เพชร', zeny: '10,000 Zeny', mvp: 'Mimic Gold Key [MVP]' },
      5:  { icon: '💀', name: 'Cursed Bone Knight', title: 'อัศวินกระดูกต้องสาปไม่ตาย', stats: 'HP: 85,000 • ATK: 220 • ธาตุ: เงา', gems: '250 เพชร', zeny: '40,000 Zeny', mvp: 'Bone Knight Shield [MVP]' },
      10: { icon: '🪨', name: 'Colossal Stone Titan', title: 'ไททันหินผู้รักษาหอคอย', stats: 'HP: 150,000 • ATK: 310 • ธาตุ: ดิน', gems: '500 เพชร', zeny: '100,000 Zeny', mvp: 'Titan Colossus Plate [MVP]' },
      20: { icon: '🐲', name: 'Ancient Pyroclast Dragon', title: 'มังกรเพลิงดึกดำบรรพ์ ผู้เฝ้าปากปล่องภูเขาไฟนรก', stats: 'HP: 180,000 • ATK: 380 • ธาตุ: เพลิง', gems: '1,000 เพชร', zeny: '200,000 Zeny', mvp: 'Dragon Slayer Flame Blade [MVP]' }
    };

    const updateTowerPreview = (floor: number) => {
      const d = floorData[floor] || floorData[1];
      const iconEl = document.getElementById('tower-preview-icon');
      const nameEl = document.getElementById('tower-preview-name');
      const titleEl = document.getElementById('tower-preview-title');
      const statsEl = document.getElementById('tower-preview-stats');
      const rewardEl = document.getElementById('tower-rewards-list');
      if (iconEl) iconEl.textContent = d.icon;
      if (nameEl) nameEl.textContent = d.name;
      if (titleEl) titleEl.textContent = d.title;
      if (statsEl) statsEl.textContent = d.stats;
      if (rewardEl) rewardEl.innerHTML = `
        <span class="reward-pill gems">💎 ${d.gems}</span>
        <span class="reward-pill zeny">💰 ${d.zeny}</span>
        <span class="reward-pill mvp">⚔️ ${d.mvp}</span>
      `;
    };

    const openTower = () => {
      updateTowerPreview(selectedFloor);
      modalTower?.classList.remove('hidden');
    };
    const closeTower = () => { modalTower?.classList.add('hidden'); };

    document.getElementById('btn-tower-modal')?.addEventListener('click', openTower);
    document.getElementById('m-drawer-btn-tower')?.addEventListener('click', () => {
      document.getElementById('modal-mobile-menu')?.classList.add('hidden');
      openTower();
    });
    document.getElementById('btn-close-tower')?.addEventListener('click', closeTower);

    // Floor selection
    document.querySelectorAll('.tower-floor-item').forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.tower-floor-item').forEach(i => i.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        selectedFloor = parseInt((e.currentTarget as HTMLElement).getAttribute('data-floor') || '1', 10);
        updateTowerPreview(selectedFloor);
      });
    });

    // Enter/Exit Tower buttons
    document.getElementById('btn-enter-slayer-tower')?.addEventListener('click', () => {
      closeTower();
      if (this.worldScene?.threeWorld) {
        this.worldScene.threeWorld.enterDungeon(selectedFloor);
      }
      const enterBtn = document.getElementById('btn-enter-slayer-tower');
      const exitBtn = document.getElementById('btn-exit-slayer-tower');
      if (enterBtn) enterBtn.style.display = 'none';
      if (exitBtn) exitBtn.style.display = 'flex';
    });

    document.getElementById('btn-exit-slayer-tower')?.addEventListener('click', () => {
      if (this.worldScene?.threeWorld) {
        this.worldScene.threeWorld.exitDungeon();
      }
      const enterBtn = document.getElementById('btn-enter-slayer-tower');
      const exitBtn = document.getElementById('btn-exit-slayer-tower');
      if (enterBtn) enterBtn.style.display = 'flex';
      if (exitBtn) exitBtn.style.display = 'none';
    });

    // =========================================================================
    // PIXEL SLAYER SAGA — Gift Code Altar Modal
    // =========================================================================
    const modalGift = document.getElementById('modal-gift-code');
    const openGift = () => {
      const statusEl = document.getElementById('gift-result-status');
      if (statusEl) statusEl.textContent = '';
      modalGift?.classList.remove('hidden');
    };
    const closeGift = () => { modalGift?.classList.add('hidden'); };

    document.getElementById('btn-gift-modal')?.addEventListener('click', openGift);
    document.getElementById('m-drawer-btn-gift')?.addEventListener('click', () => {
      document.getElementById('modal-mobile-menu')?.classList.add('hidden');
      openGift();
    });
    document.getElementById('btn-close-gift')?.addEventListener('click', closeGift);

    // Quick pill tap
    document.querySelectorAll('.gift-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        const code = (e.currentTarget as HTMLElement).getAttribute('data-code') || '';
        const input = document.getElementById('gift-code-input') as HTMLInputElement;
        if (input) input.value = code;
      });
    });

    // Redeem button
    document.getElementById('btn-redeem-gift')?.addEventListener('click', () => {
      const input = document.getElementById('gift-code-input') as HTMLInputElement;
      const statusEl = document.getElementById('gift-result-status');
      const code = input?.value?.trim().toUpperCase();

      if (!code) {
        if (statusEl) { statusEl.textContent = '⚠️ กรุณากรอกโค้ดก่อนครับ'; statusEl.style.color = '#fbbf24'; }
        return;
      }

      if (!this.network) {
        if (statusEl) { statusEl.textContent = '❌ ยังไม่ได้เชื่อมต่อเซิร์ฟเวอร์'; statusEl.style.color = '#f87171'; }
        return;
      }

      this.network.sendRedeemGiftCode(code);
      if (statusEl) { statusEl.textContent = '⏳ กำลังตรวจสอบโค้ด...'; statusEl.style.color = '#67e8f9'; }
      if (input) input.value = '';
    });

    // (GIFT_CODE_RESULT is handled by setupGiftCodeNetworkListener() called after network is ready)

    // =========================================================================
    // AFK Slayer Raid Toggle
    // =========================================================================
    document.getElementById('btn-afk-slayer')?.addEventListener('click', () => {
      if (this.worldScene?.threeWorld) {
        this.worldScene.threeWorld.toggleAfkRaid();
      }
    });
    document.getElementById('m-drawer-btn-afk')?.addEventListener('click', () => {
      document.getElementById('modal-mobile-menu')?.classList.add('hidden');
      document.getElementById('btn-afk-slayer')?.click();
    });
  }

  private setupGiftCodeNetworkListener() {
    if (!this.network) return;
    this.network.on('GIFT_CODE_RESULT', (msg) => {
      const statusEl = document.getElementById('gift-result-status');
      if (msg.success) {
        if (statusEl) { statusEl.textContent = `✅ แลกรับ [${msg.name}] สำเร็จ! +${msg.gems} Gems, +${msg.zeny?.toLocaleString()} Zeny`; statusEl.style.color = '#6ee7b7'; }
        sound.playLevelUp();
        this.gameplay.toast(`🎁 แลกรับ [${msg.code}] สำเร็จ! ได้รับ ${msg.gems} เพชรและรางวัล!`, 'success');
        setTimeout(() => { document.getElementById('modal-gift-code')?.classList.add('hidden'); }, 2000);
      } else {
        if (statusEl) { statusEl.textContent = `❌ ${msg.reason || 'โค้ดไม่ถูกต้องหรือถูกใช้ไปแล้ว'}`; statusEl.style.color = '#f87171'; }
      }
    });
  }



  public updateSummonCurrency() {
    const curVal = document.getElementById('summon-currency-val');

    if (curVal) {
      curVal.textContent = HeroRosterManager.getInstance().getCurrency().toLocaleString();
    }
  }

  /** Show/update the top-center Boss Raid HP bar */
  public updateBossRaidBar(show: boolean, name: string, hp: number, maxHp: number, bossType: string = '') {
    const bar = document.getElementById('boss-raid-bar');
    if (!bar) return;

    if (!show) {
      bar.classList.add('hidden');
      return;
    }

    bar.classList.remove('hidden');

    const nameEl = document.getElementById('boss-raid-name');
    const phaseEl = document.getElementById('boss-raid-phase');
    const fillEl = document.getElementById('boss-raid-hp-fill');
    const pctEl = document.getElementById('boss-raid-hp-pct');
    const iconEl = document.getElementById('boss-raid-icon');

    const pct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
    const phase = hp <= maxHp * 0.5 ? '⚠️ ENRAGED' : (hp <= maxHp * 0.3 ? '💀 FRENZY' : 'STAGE 1');

    // Boss icon by type
    const iconMap: Record<string, string> = {
      AncientPyroclastDragon: '🐲',
      DemonLordMalakor: '👹',
      ColossalTitan: '🪨',
      TreasureMimic: '👛',
      BoneKnight: '💀',
      ShadowWyrmling: '🐍'
    };

    if (iconEl) iconEl.textContent = iconMap[bossType] || '👾';
    if (nameEl) nameEl.textContent = name;
    if (phaseEl) { phaseEl.textContent = phase; phaseEl.style.background = pct < 50 ? 'linear-gradient(90deg,#dc2626,#7f1d1d)' : 'linear-gradient(90deg,#b91c1c,#7f1d1d)'; }
    if (fillEl) {
      fillEl.style.width = `${pct}%`;
      fillEl.style.background = pct > 50
        ? 'linear-gradient(90deg,#ef4444,#f97316,#eab308)'
        : (pct > 25 ? 'linear-gradient(90deg,#dc2626,#ea580c)' : 'linear-gradient(90deg,#991b1b,#dc2626)');
    }
    if (pctEl) pctEl.textContent = `${Math.round(pct)}% (${hp.toLocaleString()} / ${maxHp.toLocaleString()})`;
  }

  private executeSummon(is10x: boolean) {
    const roster = HeroRosterManager.getInstance();
    const res = roster.summon(is10x);
    if (!res.success) {
      this.gameplay.toast(res.error || 'เพชรอัญเชิญไม่พอ!', 'error');
      return;
    }

    this.updateSummonCurrency();
    sound.playLevelUp();

    const resultsArea = document.getElementById('summon-results-area');
    if (!resultsArea) return;
    resultsArea.innerHTML = '';

    res.results.forEach((item, index) => {
      const hero = item.hero;
      const card = document.createElement('div');
      const rarityClass = hero.rarity === 6 ? 'ur' : hero.rarity === 5 ? 'ssr' : '';
      card.className = `summon-card-item ${rarityClass}`;
      card.style.animationDelay = `${index * 0.08}s`;

      card.innerHTML = `
        <img src="${hero.cardUrl}" class="summon-card-img" alt="${hero.name}" />
        <div class="summon-card-name">${hero.name}</div>
        <div class="summon-card-stars">${'★'.repeat(hero.rarity)}</div>
        ${item.isNew ? '<div class="card-new-badge">NEW</div>' : ''}
      `;

      resultsArea.appendChild(card);
    });

    const highestRarity = Math.max(...res.results.map(r => r.hero.rarity));
    if (highestRarity >= 6) {
      this.gameplay.toast('🌟 ปาฏิหาริย์แห่งเอเธอร์! คุณได้รับฮีโร่ระดับสูงสุด 6★ UR!', 'success');
    } else if (highestRarity === 5) {
      this.gameplay.toast('✨ อัญเชิญสำเร็จ! คุณได้รับฮีโร่ระดับ 5★ SSR!', 'success');
    }
  }

  public renderPartyModal() {
    const roster = HeroRosterManager.getInstance();
    const party = roster.getParty(); // ['player', slot1, slot2, slot3]

    // 1. Update Slots 1, 2, 3
    for (let slot = 1; slot <= 3; slot++) {
      const heroId = party[slot];
      const slotCard = document.getElementById(`party-slot-${slot}`);
      const avatarEl = document.getElementById(`slot-avatar-${slot}`);
      const nameEl = document.getElementById(`slot-name-${slot}`);
      const roleEl = document.getElementById(`slot-role-${slot}`);

      if (heroId && HERO_ROSTER_DB[heroId]) {
        const h = HERO_ROSTER_DB[heroId];
        if (avatarEl) {
          avatarEl.innerHTML = `<img src="${h.iconUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
        }
        if (nameEl) {
          nameEl.innerHTML = `<span style="color: ${h.rarity >= 5 ? '#ffd166' : '#fff'};">${h.name}</span> <small style="color: #ffd700;">★${h.rarity}</small>`;
        }
        if (roleEl) {
          roleEl.textContent = `${h.role} • ${h.element.toUpperCase()}`;
        }
        slotCard?.classList.add('occupied');
      } else {
        if (avatarEl) avatarEl.innerHTML = '<span style="font-size: 20px; color: #64748b;">+</span>';
        if (nameEl) nameEl.textContent = 'ว่าง (แตะด้านล่าง)';
        if (roleEl) roleEl.textContent = '-';
        slotCard?.classList.remove('occupied');
      }
    }

    // 2. Remove buttons on slots
    document.querySelectorAll('.btn-remove-slot').forEach(btn => {
      const newBtn = btn.cloneNode(true) as HTMLElement;
      btn.parentNode?.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slotIdx = parseInt(newBtn.getAttribute('data-slot') || '0', 10);
        if (slotIdx >= 1 && slotIdx <= 3) {
          roster.setPartySlot(slotIdx as 1 | 2 | 3, null);
          this.renderPartyModal();
          if (this.worldScene?.threeWorld) {
            this.worldScene.threeWorld.refreshCompanions();
          }
        }
      });
    });

    // 3. Synergy banner
    const synergy = roster.getPartySynergy();
    const synergyDesc = document.getElementById('synergy-desc');
    if (synergyDesc) {
      synergyDesc.innerHTML = `<strong>${synergy.title}</strong><br>${synergy.desc}`;
    }

    // 4. Roster grid of unlocked heroes
    const grid = document.getElementById('party-roster-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const unlocked = roster.getUnlockedHeroes();
    if (unlocked.length === 0) {
      grid.innerHTML = '<div style="color: #94a3b8; font-size: 12px; padding: 12px; grid-column: 1 / -1; text-align: center;">ยังไม่มีฮีโร่ในครอบครอง ลองกดอัญเชิญดูสิ!</div>';
      return;
    }

    unlocked.forEach(hero => {
      const isEquipped = party.includes(hero.id);
      const card = document.createElement('div');
      card.className = `roster-hero-card ${isEquipped ? 'in-party' : ''}`;
      card.innerHTML = `
        <img src="${hero.iconUrl}" class="roster-hero-img" alt="${hero.name}" />
        <div class="roster-hero-name">${hero.name}</div>
        <div class="roster-hero-stars">${'★'.repeat(hero.rarity)}</div>
      `;

      card.addEventListener('click', () => {
        if (isEquipped) {
          // If already equipped, find slot and remove
          for (let s = 1; s <= 3; s++) {
            if (party[s] === hero.id) {
              roster.setPartySlot(s as 1 | 2 | 3, null);
              break;
            }
          }
        } else {
          // Find first open slot (1, 2, or 3)
          let targetSlot: 1 | 2 | 3 | null = null;
          for (let s = 1; s <= 3; s++) {
            if (!party[s]) {
              targetSlot = s as 1 | 2 | 3;
              break;
            }
          }
          if (targetSlot) {
            roster.setPartySlot(targetSlot, hero.id);
          } else {
            // Replace slot 3 if all slots full
            roster.setPartySlot(3, hero.id);
          }
        }

        sound.playSlash();
        this.renderPartyModal();
        if (this.worldScene?.threeWorld) {
          this.worldScene.threeWorld.refreshCompanions();
        }
      });

      grid.appendChild(card);
    });
  }

  private setupAdminControls() {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).getAttribute('data-tab');
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        if (target) document.getElementById(target)?.classList.add('active');
      });
    });

    document.getElementById('gm-toggle-god')?.addEventListener('click', () => {
      const god = this.adminManager?.toggleGodMode();
      const status = document.getElementById('gm-god-status');
      if (status) {
        status.textContent = god ? 'ON (อมตะ)' : 'OFF';
        status.style.color = god ? '#38b000' : '#e76f51';
      }
    });

    document.querySelectorAll('.gm-speed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const spd = parseFloat((e.currentTarget as HTMLElement).getAttribute('data-speed') || '1.0');
        this.adminManager?.setSpeed(spd);
        const valEl = document.getElementById('gm-speed-val');
        if (valEl) valEl.textContent = `${spd.toFixed(1)}x`;
      });
    });

    document.getElementById('gm-heal-all-btn')?.addEventListener('click', () => {
      this.adminManager?.healAllPlayers();
      sound.playLevelUp();
    });

    document.getElementById('gm-kill-all-btn')?.addEventListener('click', () => {
      this.adminManager?.killAllMobs();
      sound.playHit(true);
    });

    document.getElementById('gm-broadcast-send-btn')?.addEventListener('click', () => {
      const input = document.getElementById('gm-broadcast-input') as HTMLInputElement;
      const styleSelect = document.getElementById('gm-broadcast-style') as HTMLSelectElement;
      const msg = input?.value?.trim();
      if (msg) {
        this.adminManager?.broadcast(msg, (styleSelect?.value || 'gold') as any);
        input.value = '';
      }
    });

    document.getElementById('gm-spawn-mob-btn')?.addEventListener('click', () => {
      const select = document.getElementById('gm-spawn-select') as HTMLSelectElement;
      const countInput = document.getElementById('gm-spawn-count') as HTMLInputElement;
      const mobType = select?.value || 'Solarion';
      const count = parseInt(countInput?.value || '1', 10) || 1;
      this.adminManager?.spawnMob(mobType, count);
    });

    document.querySelectorAll('.gm-zeny-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const amount = parseInt((e.currentTarget as HTMLElement).getAttribute('data-zeny') || '100000', 10);
        this.adminManager?.giveZeny(amount);
        sound.playCoin();
      });
    });

    document.querySelectorAll('.gm-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemKey = (e.currentTarget as HTMLElement).getAttribute('data-item') || 'excalibur';
        this.adminManager?.giveItem(itemKey);
        sound.playLevelUp();
      });
    });
  }

  public setupAiControls() {
    // Toolbar button and bottom button
    document.getElementById('tb-btn-ai')?.addEventListener('click', () => this.toggleWindow('ai-core-win'));
    document.getElementById('btn-ai-panel-bottom')?.addEventListener('click', () => this.toggleWindow('ai-core-win'));

    // Tab switching for AI window
    document.querySelectorAll('.ai-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).getAttribute('data-tab');
        document.querySelectorAll('.ai-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.ai-tab-content').forEach(c => c.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        if (target) document.getElementById(target)?.classList.add('active');
      });
    });

    // Run Diagnostics
    document.getElementById('btn-ai-diagnostics')?.addEventListener('click', () => {
      this.network?.sendAiAction('RUN_DIAGNOSTICS');
      sound.playLevelUp();
      const statusBadge = document.getElementById('ai-status-badge');
      if (statusBadge) {
        statusBadge.textContent = 'ANALYZING';
        statusBadge.style.background = '#ffd166';
        setTimeout(() => {
          statusBadge.textContent = 'ONLINE';
          statusBadge.style.background = '#00f5d4';
        }, 1500);
      }
    });

    // Trigger Evolution
    document.getElementById('btn-ai-evolve')?.addEventListener('click', () => {
      this.network?.sendAiAction('TRIGGER_EVOLUTION');
      sound.playSlash();
      const statusBadge = document.getElementById('ai-status-badge');
      if (statusBadge) {
        statusBadge.textContent = 'EVOLVING';
        statusBadge.style.background = '#f72585';
        setTimeout(() => {
          statusBadge.textContent = 'ONLINE';
          statusBadge.style.background = '#00f5d4';
        }, 2000);
      }
    });
  }

  private setup3DModelStudio() {
    const assetManager = ModelAssetManager.getInstance();
    const grid = document.getElementById('ai-model-catalog-grid');
    if (!grid) return;

    let activeFilter = 'all';

    const renderCatalog = () => {
      const items = assetManager.catalog.filter(item => activeFilter === 'all' || item.category === activeFilter);
      grid.innerHTML = items.map(item => `
        <div class="ai-model-card" style="
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.2s;
        ">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 20px; background: #1e293b; padding: 4px; border-radius: 6px;">${item.thumbnailIcon}</span>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 11px; font-weight: bold; color: #ffd166; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
              <div style="font-size: 9.5px; color: #94a3b8;">${item.category.toUpperCase()} • ${item.defaultHeight}m</div>
            </div>
          </div>
          <div style="font-size: 9.5px; color: #cbd5e1; line-height: 1.3; margin-bottom: 8px; height: 26px; overflow: hidden;">
            ${item.description}
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="btn-apply-model" data-id="${item.id}" style="
              flex: 1;
              padding: 4px 6px;
              font-size: 10px;
              background: linear-gradient(180deg, #3b82f6, #1d4ed8);
              border: 1px solid #60a5fa;
              border-radius: 4px;
              color: #fff;
              font-weight: bold;
              cursor: pointer;
            ">
              ${item.category === 'weapon' ? '⚔️ สวมใส่อาวุธ 3D' : (item.category === 'monster' ? '👾 แปลงร่าง 3D' : '✨ สวมใส่สกิน 3D')}
            </button>
          </div>
        </div>
      `).join('');

      grid.querySelectorAll('.btn-apply-model').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const modelId = (e.currentTarget as HTMLElement).getAttribute('data-id') || '';
          if (this.worldScene?.threeWorld) {
            if (modelId.startsWith('weapon_')) {
              this.worldScene.threeWorld.setPlayerWeaponSkin(modelId);
            } else {
              this.worldScene.threeWorld.setPlayerCustomModel(modelId);
            }
          } else {
            this.addChatMessage('ระบบ', `⚠️ กรุณาสลับเป็นโหมด 3D ก่อนเพื่อดูสกินโมเดล 3D`, 'system');
          }
        });
      });
    };

    renderCatalog();

    // Filter Buttons
    document.querySelectorAll('.ai-cat-filter').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.ai-cat-filter').forEach(b => b.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        activeFilter = (e.currentTarget as HTMLElement).getAttribute('data-filter') || 'all';
        renderCatalog();
      });
    });

    // Custom Model URL Import button
    const btnImport = document.getElementById('btn-import-custom-model');
    const inputUrl = document.getElementById('ai-model-custom-url') as HTMLInputElement;
    btnImport?.addEventListener('click', () => {
      const url = inputUrl?.value.trim();
      if (!url) {
        alert('กรุณากรอก URL ลิงก์โมเดล 3D (ไฟล์ .glb หรือ .gltf)');
        return;
      }
      const entry = assetManager.registerCustomModel('โมเดลนำเข้าอิสระ', url, 'character');
      renderCatalog();
      if (this.worldScene?.threeWorld) {
        this.worldScene.threeWorld.setPlayerCustomModel(entry.url);
      }
      this.addChatMessage('AI-CORE', `🤖 สังเคราะห์และแปลงสภาพโมเดล 3D จาก [${url}] สำเร็จ!`, 'system');
    });
  }

  public updateAiCore(state: AiNeuralState) {
    this.aiState = state;

    // Status Badge
    const statusBadge = document.getElementById('ai-status-badge');
    if (statusBadge) {
      statusBadge.textContent = state.status;
      statusBadge.style.background = state.status === 'ONLINE' ? '#00f5d4' : (state.status === 'ANALYZING' ? '#ffd166' : '#f72585');
    }

    // Version text
    const versionEl = document.getElementById('ai-version-text');
    if (versionEl) versionEl.textContent = state.version;

    // Cycles
    const cyclesEl = document.getElementById('ai-cycles-val');
    if (cyclesEl) cyclesEl.textContent = String(state.cyclesCompleted);

    // Progress
    const progressText = document.getElementById('ai-learning-progress-text');
    if (progressText) progressText.textContent = `${Math.round(state.learningProgress)}%`;

    const progressFill = document.getElementById('ai-learning-progress-fill');
    if (progressFill) progressFill.style.width = `${Math.min(100, Math.max(0, state.learningProgress))}%`;

    // Anomaly score
    const anomalyEl = document.getElementById('ai-anomaly-val');
    if (anomalyEl) {
      const score = state.anomalyScore.toFixed(2);
      anomalyEl.textContent = `${score} (${state.anomalyScore < 0.1 ? 'ปกติ/ปลอดภัย' : 'เฝ้าระวัง'})`;
      anomalyEl.style.color = state.anomalyScore < 0.1 ? '#38b000' : '#ffd166';
    }

    // Active event
    const eventEl = document.getElementById('ai-active-event-name');
    if (eventEl) {
      eventEl.textContent = state.activeEvent ? `${state.activeEvent}` : 'ไม่มีอีเวนต์ที่เปิดอยู่';
    }

    // Render Thoughts
    const thoughtContainer = document.getElementById('ai-thought-stream');
    if (thoughtContainer && state.recentThoughts) {
      thoughtContainer.innerHTML = state.recentThoughts.map(t => `
        <div class="ai-thought-item">
          <span class="ai-thought-time">${escapeHtml(t.time)}</span>
          <span class="ai-thought-source">${escapeHtml(t.source)}</span>
          <span>${escapeHtml(t.text)}</span>
        </div>
      `).join('');
    }

    // Render Patches
    const patchesContainer = document.getElementById('ai-patches-list');
    if (patchesContainer && state.patches) {
      patchesContainer.innerHTML = state.patches.map(p => `
        <div class="ai-patch-card">
          <div class="ai-patch-header">
            <span class="ai-patch-id">⚡ ${escapeHtml(p.id)} [${escapeHtml(p.timestamp)}]</span>
            <span class="ai-patch-cat">${escapeHtml(p.category)}</span>
          </div>
          <div class="ai-patch-desc"><b>เป้าหมาย:</b> ${escapeHtml(p.target)} - ${escapeHtml(p.description)}</div>
          <div class="ai-patch-reason">💡 <b>เหตุผล AI:</b> ${escapeHtml(p.reason)}</div>
        </div>
      `).join('');
    }
  }

  private setupWindowDragging() {
    const windows = document.querySelectorAll('.ro-window');
    windows.forEach(win => {
      const header = win.querySelector('.ro-window-header') as HTMLElement;
      if (!header) return;

      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initialLeft = 0;
      let initialTop = 0;

      header.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = win.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        document.querySelectorAll('.ro-window').forEach(w => (w as HTMLElement).style.zIndex = '100');
        (win as HTMLElement).style.zIndex = '101';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        (win as HTMLElement).style.left = `${initialLeft + dx}px`;
        (win as HTMLElement).style.top = `${initialTop + dy}px`;
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });
    });
  }
}
