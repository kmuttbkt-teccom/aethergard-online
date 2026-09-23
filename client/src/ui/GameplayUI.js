import { ITEM_DB, SHOPS, SKILL_DB, SKILL_MAX_LEVEL, JOB_SKILL_BAR, RARITY_COLORS, WEAPON_PROFILES, getEquipBlocker, getSellPrice, getJobSkills, inferWeaponType, computeDerived, skillLevelBonus } from '../../../server/src/GameData.js';
import { SkillIconManager } from './SkillIconManager.js';
import { sound } from '../engine/Sound.js';
const EQUIP_SLOTS = [
    { slot: 'weapon', label: 'อาวุธ', icon: '⚔️' },
    { slot: 'head', label: 'หมวก', icon: '⛑️' },
    { slot: 'armor', label: 'ชุดเกราะ', icon: '🧥' },
    { slot: 'shoes', label: 'รองเท้า', icon: '👢' },
    { slot: 'accessory', label: 'เครื่องประดับ', icon: '💍' }
];
const escapeHtml = (text) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function describeEffect(effect) {
    if (!effect)
        return '';
    const labels = {
        atk: 'ATK', matk: 'MATK', def: 'DEF', hp: 'HP', mp: 'MP', crit: 'CRIT',
        str: 'STR', agi: 'AGI', vit: 'VIT', int: 'INT', dex: 'DEX', luk: 'LUK'
    };
    return Object.entries(effect)
        .filter(([, v]) => v)
        .map(([k, v]) => `${labels[k] || k} +${v}`)
        .join(' · ');
}
export class GameplayUI {
    actions;
    player = null;
    shop = null;
    cooldowns = new Map();
    cooldownFrame = 0;
    constructor(actions) {
        this.actions = actions;
        this.injectStyles();
        this.buildShopWindow();
        this.buildDeathOverlay();
        this.buildTargetFrame();
        this.buildToastLayer();
        this.buildCooldownOverlays();
    }
    // ===========================================================================
    // Player refresh
    // ===========================================================================
    updatePlayer(player) {
        this.player = player;
        this.renderEquipment(player);
        this.renderInventory(player);
        this.renderSkillTree(player);
        if (this.shop)
            this.renderShop();
    }
    /** Skill id bound to each hotbar slot for the current job */
    getHotbarSkills(job) {
        const [s4, s5] = JOB_SKILL_BAR[job] || JOB_SKILL_BAR.Novice;
        return { 'slot-z': 'NORMAL', 'slot-x': 'BASH', 'slot-4': s4, 'slot-5': s5 };
    }
    /**
     * Update hotbar icons & labels dynamically when switching weapons in real-time
     */
    updateWeaponSkillBar(skills, weaponName, dripColor) {
        // 1. Update PC Quickslots: Z, X, 4, 5
        const slotMap = {
            'quickslot-z': skills[0],
            'quickslot-x': skills[1],
            'quickslot-4': skills[2],
            'quickslot-5': skills[3]
        };
        for (const [id, skillId] of Object.entries(slotMap)) {
            const el = document.getElementById(id);
            if (el) {
                SkillIconManager.getInstance().renderSlotIcon(el, skillId);
                const skill = SKILL_DB[skillId];
                if (skill) {
                    el.title = `${skill.name} (${skill.thaiName}) [${id.replace('quickslot-', '').toUpperCase()}]`;
                }
            }
        }
        // 2. Update Mobile Action Buttons
        const btnBash = document.getElementById('m-btn-bash');
        if (btnBash) {
            const sk = SKILL_DB[skills[1]];
            btnBash.title = sk ? `${sk.name} [X]` : 'Bash [X]';
            const small = btnBash.querySelector('small');
            if (small && sk)
                small.textContent = sk.name.slice(0, 8);
        }
        const btnSkill4 = document.getElementById('m-btn-skill4');
        if (btnSkill4) {
            const sk = SKILL_DB[skills[2]];
            btnSkill4.title = sk ? `${sk.name} [4]` : 'Skill 1 [4]';
            const small = btnSkill4.querySelector('small');
            if (small && sk)
                small.textContent = sk.name.slice(0, 8);
        }
        const btnSkill5 = document.getElementById('m-btn-skill5');
        if (btnSkill5) {
            const sk = SKILL_DB[skills[3]];
            btnSkill5.title = sk ? `${sk.name} [5]` : 'Skill 2 [5]';
            const small = btnSkill5.querySelector('small');
            if (small && sk)
                small.textContent = sk.name.slice(0, 8);
        }
        // 3. Update HUD Weapon Badge
        let badge = document.getElementById('hud-weapon-badge');
        if (!badge) {
            const hud = document.querySelector('.char-hud');
            if (hud) {
                badge = document.createElement('div');
                badge.id = 'hud-weapon-badge';
                badge.className = 'hud-weapon-badge';
                hud.appendChild(badge);
            }
        }
        if (badge) {
            badge.textContent = `⚔️ ${weaponName}`;
            badge.style.borderColor = dripColor;
            badge.style.boxShadow = `0 0 10px ${dripColor}`;
        }
    }
    // ===========================================================================
    // Equipment & inventory
    // ===========================================================================
    renderEquipment(player) {
        const inv = document.getElementById('inventory-win');
        const body = inv?.querySelector('.ro-window-body');
        if (!body)
            return;
        let panel = document.getElementById('equip-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'equip-panel';
            panel.className = 'equip-panel';
            body.insertBefore(panel, body.firstChild);
            const zeny = document.createElement('div');
            zeny.id = 'inv-zeny';
            zeny.className = 'inv-zeny';
            body.insertBefore(zeny, panel.nextSibling);
        }
        panel.innerHTML = EQUIP_SLOTS.map(({ slot, label, icon }) => {
            const item = player.equipped[slot];
            const color = item ? RARITY_COLORS[item.rarity || 'common'] : '#475569';
            const refine = item?.refine ? `<span class="eq-refine">+${item.refine}</span>` : '';
            return `
        <div class="eq-slot ${item ? 'filled' : ''}" data-slot="${slot}" style="border-color:${color}" title="${item ? escapeHtml(`${item.name}\n${describeEffect(item.effect)}\nคลิกเพื่อถอด`) : label}">
          <span class="eq-icon">${item ? item.icon : `<span style="opacity:.35">${icon}</span>`}</span>
          ${refine}
          <span class="eq-label">${item ? escapeHtml(item.name) : label}</span>
        </div>`;
        }).join('');
        panel.querySelectorAll('.eq-slot.filled').forEach(el => {
            el.addEventListener('click', () => {
                sound.playCoin();
                this.actions.unequip(el.dataset.slot || '');
            });
        });
        const derived = computeDerived(player);
        const weaponType = inferWeaponType(player.equipped.weapon);
        const zenyEl = document.getElementById('inv-zeny');
        if (zenyEl) {
            zenyEl.innerHTML = `
        <span>💰 ${player.zeny.toLocaleString()} Z</span>
        <span>⚔️ ATK ${derived.atk} · 🔮 MATK ${derived.matk} · 🛡️ DEF ${derived.def}</span>
        <span class="inv-weapon-kind">${WEAPON_PROFILES[weaponType].thaiName} · ระยะ ${Math.round(derived.attackRange * 0.03 * 10) / 10}m</span>`;
        }
    }
    renderInventory(player) {
        const grid = document.getElementById('inv-items-grid');
        if (!grid)
            return;
        grid.innerHTML = '';
        player.inventory.forEach(item => {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            const rarityColor = RARITY_COLORS[item.rarity || 'common'];
            const blocker = item.type === 'equip' ? getEquipBlocker(item, player.job, player.baseLevel) : null;
            if (item.type === 'equip')
                slot.style.borderColor = rarityColor;
            if (blocker)
                slot.classList.add('blocked');
            slot.innerHTML = `
        <span style="font-size: 20px;">${item.icon}</span>
        ${item.refine ? `<span class="inv-refine">+${item.refine}</span>` : ''}
        <span style="position: absolute; bottom: 2px; right: 4px; font-size: 10px; font-weight: bold; color: #ffd166;">
          ${item.quantity > 1 ? item.quantity : ''}
        </span>
      `;
            const lines = [item.name, item.description];
            const stats = describeEffect(item.effect);
            if (stats)
                lines.push(stats);
            if (item.weaponType)
                lines.push(`ประเภท: ${WEAPON_PROFILES[item.weaponType].thaiName}`);
            if (item.reqLevel)
                lines.push(`ต้องการ Lv.${item.reqLevel}`);
            if (blocker)
                lines.push(`⛔ ${blocker}`);
            else if (item.type === 'equip')
                lines.push('🖱️ คลิกเพื่อสวมใส่');
            else if (item.type === 'usable')
                lines.push('🖱️ คลิกเพื่อใช้งาน');
            slot.title = lines.join('\n');
            slot.addEventListener('click', () => {
                if (item.type === 'usable') {
                    sound.playPotion();
                    this.actions.useItem(item.id);
                }
                else if (item.type === 'equip') {
                    if (blocker) {
                        this.toast(`⛔ ${blocker}`, 'error');
                        return;
                    }
                    sound.playCoin();
                    this.actions.equip(item.id);
                }
            });
            grid.appendChild(slot);
        });
    }
    // ===========================================================================
    // Shop
    // ===========================================================================
    buildShopWindow() {
        if (document.getElementById('shop-win'))
            return;
        const win = document.createElement('div');
        win.id = 'shop-win';
        win.className = 'ro-window interactive parchment-win shop-win';
        win.innerHTML = `
      <div class="ro-window-header parchment-header">
        <span id="shop-title">🛒 ร้านค้า</span>
        <button class="ro-close-btn" id="shop-close">✕</button>
      </div>
      <div class="ro-window-body">
        <div class="shop-tabs">
          <button class="shop-tab active" data-tab="buy">ซื้อ</button>
          <button class="shop-tab" data-tab="sell">ขาย</button>
          <span id="shop-zeny" class="shop-zeny"></span>
        </div>
        <div id="shop-list" class="shop-list"></div>
      </div>`;
        (document.getElementById('ui-overlay') || document.body).appendChild(win);
        win.querySelector('#shop-close')?.addEventListener('click', () => this.closeShop());
        win.querySelectorAll('.shop-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.shop)
                    return;
                this.shop.tab = btn.dataset.tab === 'sell' ? 'sell' : 'buy';
                this.renderShop();
            });
        });
    }
    openShop(npcId, shopId) {
        if (!SHOPS[shopId])
            return;
        this.shop = { npcId, shopId, tab: 'buy' };
        document.getElementById('shop-win')?.classList.add('active');
        document.getElementById('inventory-win')?.classList.add('active');
        this.renderShop();
    }
    closeShop() {
        this.shop = null;
        document.getElementById('shop-win')?.classList.remove('active');
    }
    get isShopOpen() {
        return this.shop !== null;
    }
    renderShop() {
        const list = document.getElementById('shop-list');
        const player = this.player;
        if (!list || !this.shop || !player)
            return;
        const { shopId, npcId, tab } = this.shop;
        const shop = SHOPS[shopId];
        const merchant = player.job === 'Merchant';
        const title = document.getElementById('shop-title');
        if (title)
            title.textContent = shop.title;
        const zeny = document.getElementById('shop-zeny');
        if (zeny)
            zeny.textContent = `💰 ${player.zeny.toLocaleString()} Z${merchant ? ' · ส่วนลดพ่อค้า 10%' : ''}`;
        document.querySelectorAll('.shop-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        if (tab === 'buy') {
            list.innerHTML = shop.items.map(id => ITEM_DB[id]).filter((d) => Boolean(d)).map(def => {
                const price = Math.ceil(def.price * (merchant ? 0.9 : 1));
                const blocker = def.type === 'equip' ? getEquipBlocker({ ...def, id: def.id, quantity: 1 }, player.job, player.baseLevel) : null;
                const affordable = player.zeny >= price;
                const meta = [
                    def.weaponType ? WEAPON_PROFILES[def.weaponType].thaiName : '',
                    def.reqLevel && def.reqLevel > 1 ? `Lv.${def.reqLevel}+` : '',
                    def.jobs && def.jobs.length < 7 ? def.jobs.join('/') : ''
                ].filter(Boolean).join(' · ');
                return `
          <div class="shop-row ${blocker ? 'blocked' : ''}">
            <span class="shop-icon" style="border-color:${RARITY_COLORS[def.rarity]}">${def.icon}</span>
            <div class="shop-info">
              <div class="shop-name" style="color:${RARITY_COLORS[def.rarity]}">${escapeHtml(def.name)}</div>
              <div class="shop-stats">${describeEffect(def.effect)}</div>
              <div class="shop-meta">${escapeHtml(meta || def.description)}${blocker ? ` <span class="shop-warn">(${escapeHtml(blocker)})</span>` : ''}</div>
            </div>
            <div class="shop-actions">
              <span class="shop-price ${affordable ? '' : 'poor'}">${price.toLocaleString()} Z</span>
              ${def.type === 'equip' ? '' : `<input type="number" class="shop-qty" min="1" max="99" value="1" data-item="${def.id}">`}
              <button class="shop-buy" data-item="${def.id}" ${affordable ? '' : 'disabled'}>ซื้อ</button>
            </div>
          </div>`;
            }).join('');
            list.querySelectorAll('.shop-buy').forEach(btn => {
                btn.addEventListener('click', () => {
                    const itemId = btn.dataset.item || '';
                    const qtyInput = list.querySelector(`.shop-qty[data-item="${itemId}"]`);
                    const qty = Math.max(1, Math.min(99, Number(qtyInput?.value || 1)));
                    this.actions.buy(npcId, shopId, itemId, qty);
                });
            });
        }
        else {
            const sellable = player.inventory;
            if (sellable.length === 0) {
                list.innerHTML = '<div class="shop-empty">กระเป๋าว่างเปล่า — ไปล่ามอนสเตอร์แล้วนำของมาขายนะ!</div>';
                return;
            }
            list.innerHTML = sellable.map(item => {
                const unit = Math.floor(getSellPrice(item) * (merchant ? 1.1 : 1));
                return `
          <div class="shop-row">
            <span class="shop-icon" style="border-color:${RARITY_COLORS[item.rarity || 'common']}">${item.icon}</span>
            <div class="shop-info">
              <div class="shop-name">${escapeHtml(item.name)}${item.refine ? ` +${item.refine}` : ''} ${item.quantity > 1 ? `<span class="shop-meta">x${item.quantity}</span>` : ''}</div>
              <div class="shop-stats">${describeEffect(item.effect)}</div>
            </div>
            <div class="shop-actions">
              <span class="shop-price">${unit.toLocaleString()} Z</span>
              ${item.quantity > 1 ? `<input type="number" class="shop-qty" min="1" max="${item.quantity}" value="${item.quantity}" data-item="${item.id}">` : ''}
              <button class="shop-sell" data-item="${item.id}">ขาย</button>
            </div>
          </div>`;
            }).join('');
            list.querySelectorAll('.shop-sell').forEach(btn => {
                btn.addEventListener('click', () => {
                    const itemId = btn.dataset.item || '';
                    const qtyInput = list.querySelector(`.shop-qty[data-item="${itemId}"]`);
                    this.actions.sell(npcId, itemId, Math.max(1, Number(qtyInput?.value || 1)));
                });
            });
        }
    }
    // ===========================================================================
    // Skill tree
    // ===========================================================================
    renderSkillTree(player) {
        const body = document.querySelector('#skills-win .ro-window-body');
        if (!body)
            return;
        const derived = computeDerived(player);
        const hotkeys = {};
        Object.entries(this.getHotbarSkills(player.job)).forEach(([slot, skill]) => {
            if (skill)
                hotkeys[skill] = slot.replace('slot-', '').toUpperCase();
        });
        const rows = getJobSkills(player.job).map(skill => {
            const level = player.skillLevels?.[skill.id] || 1;
            const icon = SkillIconManager.getInstance().getSkillIcon(skill.id);
            const canUpgrade = skill.id !== 'NORMAL' && player.skillPoints > 0 && level < SKILL_MAX_LEVEL;
            const cd = skill.kind === 'basic' ? `${(derived.aspdMs / 1000).toFixed(2)}s (ASPD)` : `${(skill.cooldownMs / 1000).toFixed(1)}s`;
            const power = skill.multiplier > 0 && skill.kind !== 'basic'
                ? `${Math.round(skill.multiplier * skillLevelBonus(level) * 100)}%${skill.hits ? ` ×${skill.hits}` : ''}`
                : skill.healPct ? `ฮีล ${Math.round(skill.healPct * (1 + (level - 1) * 0.05) * 100)}%` : '';
            return `
        <div class="skill-card">
          <div class="skill-icon" style="background:${icon.bgGradient};border-color:${icon.borderColor}">
            <svg viewBox="0 0 64 64">${icon.svgContent}</svg>
          </div>
          <div class="skill-body">
            <div class="skill-title">
              <span>${escapeHtml(skill.name)} <small>${escapeHtml(skill.thaiName)}</small></span>
              ${hotkeys[skill.id] ? `<kbd>${hotkeys[skill.id]}</kbd>` : ''}
            </div>
            <div class="skill-desc">${escapeHtml(skill.description)}</div>
            <div class="skill-meta">
              ${skill.id === 'NORMAL' ? '' : `<span>Lv.${level}/${SKILL_MAX_LEVEL}</span>`}
              ${skill.mpCost ? `<span>💧 ${skill.mpCost} MP</span>` : ''}
              <span>⏱ ${cd}</span>
              ${power ? `<span>💥 ${power}</span>` : ''}
            </div>
          </div>
          ${skill.id === 'NORMAL' ? '' : `<button class="skill-up" data-skill="${skill.id}" ${canUpgrade ? '' : 'disabled'} title="ใช้ 1 แต้มสกิล">+</button>`}
        </div>`;
        }).join('');
        body.innerHTML = `
      <div class="skill-points">แต้มสกิลคงเหลือ: <strong>${player.skillPoints}</strong> <small>(ได้รับเมื่อ Job Level เพิ่ม)</small></div>
      ${rows}
      ${player.job === 'Novice' ? '<div class="skill-hint">🎓 เมื่อถึง Base Lv.10 / Job Lv.10 คุยกับครูฝึก Kaelen เพื่อเปลี่ยนอาชีพและปลดล็อกสกิลใหม่</div>' : ''}`;
        body.querySelectorAll('.skill-up').forEach(btn => {
            btn.addEventListener('click', () => this.actions.upgradeSkill(btn.dataset.skill || ''));
        });
    }
    // ===========================================================================
    // Hotbar cooldown sweeps
    // ===========================================================================
    buildCooldownOverlays() {
        ['slot-z', 'slot-x', 'slot-4', 'slot-5'].forEach(id => {
            const slot = document.getElementById(id);
            if (slot && !slot.querySelector('.cd-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'cd-overlay';
                overlay.innerHTML = '<span class="cd-text"></span>';
                slot.appendChild(overlay);
            }
        });
    }
    startCooldown(skillId, ms) {
        if (ms < 300)
            return; // basic attacks are too quick to be worth a sweep
        const now = performance.now();
        this.cooldowns.set(skillId, { start: now, end: now + ms });
        if (!this.cooldownFrame)
            this.cooldownFrame = requestAnimationFrame(this.tickCooldowns);
    }
    getCooldownRemaining(skillId) {
        const cd = this.cooldowns.get(skillId);
        return cd ? Math.max(0, cd.end - performance.now()) : 0;
    }
    tickCooldowns = () => {
        const now = performance.now();
        const job = this.player?.job || 'Novice';
        const bindings = this.getHotbarSkills(job);
        Object.entries(bindings).forEach(([slotId, skillId]) => {
            const overlay = document.getElementById(slotId)?.querySelector('.cd-overlay');
            if (!overlay)
                return;
            const cd = skillId ? this.cooldowns.get(skillId) : undefined;
            if (!cd || now >= cd.end) {
                overlay.style.display = 'none';
                return;
            }
            const remaining = cd.end - now;
            const pct = (remaining / (cd.end - cd.start)) * 100;
            overlay.style.display = 'flex';
            overlay.style.background = `conic-gradient(rgba(2,6,23,0.78) ${pct}%, transparent ${pct}%)`;
            const text = overlay.querySelector('.cd-text');
            if (text)
                text.textContent = remaining > 1000 ? `${Math.ceil(remaining / 1000)}` : (remaining / 1000).toFixed(1);
        });
        for (const [id, cd] of this.cooldowns) {
            if (now >= cd.end)
                this.cooldowns.delete(id);
        }
        this.cooldownFrame = this.cooldowns.size > 0 ? requestAnimationFrame(this.tickCooldowns) : 0;
        if (!this.cooldownFrame) {
            document.querySelectorAll('.cd-overlay').forEach(o => { o.style.display = 'none'; });
        }
    };
    // ===========================================================================
    // Target frame
    // ===========================================================================
    buildTargetFrame() {
        if (document.getElementById('target-frame'))
            return;
        const frame = document.createElement('div');
        frame.id = 'target-frame';
        frame.className = 'target-frame';
        frame.innerHTML = `
      <div class="tf-name"><span id="tf-name"></span><span id="tf-level" class="tf-level"></span></div>
      <div class="tf-bar"><div id="tf-fill" class="tf-fill"></div><span id="tf-hp" class="tf-hp"></span></div>`;
        document.body.appendChild(frame);
    }
    setTarget(target) {
        const frame = document.getElementById('target-frame');
        if (!frame)
            return;
        if (!target) {
            frame.classList.remove('visible');
            return;
        }
        frame.classList.add('visible');
        frame.classList.toggle('boss', Boolean(target.boss));
        const pct = Math.max(0, Math.min(100, (target.hp / target.maxHp) * 100));
        document.getElementById('tf-name').textContent = target.name;
        document.getElementById('tf-level').textContent = `Lv.${target.level}`;
        document.getElementById('tf-fill').style.width = `${pct}%`;
        document.getElementById('tf-hp').textContent = `${target.hp.toLocaleString()} / ${target.maxHp.toLocaleString()}`;
    }
    // ===========================================================================
    // Death overlay
    // ===========================================================================
    buildDeathOverlay() {
        if (document.getElementById('death-overlay'))
            return;
        const overlay = document.createElement('div');
        overlay.id = 'death-overlay';
        overlay.className = 'death-overlay';
        overlay.innerHTML = `
      <div class="death-card">
        <div class="death-title">💀 คุณเสียชีวิตแล้ว</div>
        <div id="death-detail" class="death-detail"></div>
        <button id="death-respawn" class="death-btn" disabled>ฟื้นคืนชีพที่เมือง</button>
      </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#death-respawn')?.addEventListener('click', () => this.actions.respawn());
    }
    showDeath(killerName, expLost) {
        const overlay = document.getElementById('death-overlay');
        const detail = document.getElementById('death-detail');
        const btn = document.getElementById('death-respawn');
        if (!overlay || !detail || !btn)
            return;
        detail.innerHTML = `ถูก <strong>${escapeHtml(killerName)}</strong> สังหาร${expLost > 0 ? `<br><small>เสีย ${expLost.toLocaleString()} Base EXP</small>` : ''}`;
        overlay.classList.add('visible');
        let wait = 3;
        btn.disabled = true;
        btn.textContent = `ฟื้นคืนชีพที่เมือง (${wait})`;
        const timer = setInterval(() => {
            wait--;
            if (wait <= 0) {
                clearInterval(timer);
                btn.disabled = false;
                btn.textContent = 'ฟื้นคืนชีพที่เมือง';
            }
            else {
                btn.textContent = `ฟื้นคืนชีพที่เมือง (${wait})`;
            }
        }, 1000);
    }
    hideDeath() {
        document.getElementById('death-overlay')?.classList.remove('visible');
    }
    // ===========================================================================
    // Toasts
    // ===========================================================================
    buildToastLayer() {
        if (document.getElementById('toast-layer'))
            return;
        const layer = document.createElement('div');
        layer.id = 'toast-layer';
        layer.className = 'toast-layer';
        document.body.appendChild(layer);
    }
    toast(text, kind = 'info') {
        const layer = document.getElementById('toast-layer');
        if (!layer)
            return;
        const el = document.createElement('div');
        el.className = `toast toast-${kind}`;
        el.textContent = text;
        layer.appendChild(el);
        while (layer.children.length > 4)
            layer.firstChild?.remove();
        setTimeout(() => el.classList.add('out'), 2200);
        setTimeout(() => el.remove(), 2600);
    }
    // ===========================================================================
    // Styles
    // ===========================================================================
    injectStyles() {
        if (document.getElementById('gameplay-ui-styles'))
            return;
        const style = document.createElement('style');
        style.id = 'gameplay-ui-styles';
        style.textContent = `
      .equip-panel { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; }
      .eq-slot { position: relative; height: 62px; background: #0b1426; border: 1.5px solid #475569; border-radius: 6px;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 2px; }
      .eq-slot.filled { cursor: pointer; box-shadow: inset 0 0 10px rgba(255,209,102,0.08); }
      .eq-slot.filled:hover { background: #1e293b; }
      .eq-icon { font-size: 20px; line-height: 1; }
      .eq-label { font-size: 9px; color: #cbd5e1; text-align: center; line-height: 1.1; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .eq-refine, .inv-refine { position: absolute; top: 2px; right: 3px; font-size: 9px; font-weight: 800; color: #4cc9f0; }
      .inv-refine { left: 3px; right: auto; }
      .inv-zeny { display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: #e2e8f0; background: #09121d; border: 1px solid #334155; border-radius: 6px; padding: 6px 8px; }
      .inv-weapon-kind { color: #94a3b8; }
      .inv-slot.blocked { opacity: 0.55; }
      #inventory-win { width: 340px !important; }

      .shop-win { top: 90px; right: 380px; width: 400px; max-height: 70vh; }
      .shop-tabs { display: flex; gap: 6px; align-items: center; }
      .shop-tab { background: #1e293b; color: #cbd5e1; border: 1px solid #475569; border-radius: 6px; padding: 4px 14px; cursor: pointer; font-family: inherit; }
      .shop-tab.active { background: #c9a45c; color: #0f172a; border-color: #c9a45c; font-weight: 700; }
      .shop-zeny { margin-left: auto; font-size: 12px; color: #ffd166; font-weight: 700; }
      .shop-list { display: flex; flex-direction: column; gap: 5px; overflow-y: auto; max-height: calc(70vh - 90px); padding-right: 2px; }
      .shop-row { display: flex; gap: 8px; align-items: center; background: #0b1426; border: 1px solid #334155; border-radius: 6px; padding: 6px; }
      .shop-row.blocked { opacity: 0.6; }
      .shop-icon { width: 34px; height: 34px; flex: none; display: flex; align-items: center; justify-content: center; font-size: 19px; border: 1.5px solid; border-radius: 6px; background: #111c33; }
      .shop-info { flex: 1; min-width: 0; }
      .shop-name { font-size: 12.5px; font-weight: 700; color: #f1f5f9; }
      .shop-stats { font-size: 11px; color: #86efac; }
      .shop-meta { font-size: 10.5px; color: #94a3b8; }
      .shop-warn { color: #f87171; }
      .shop-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
      .shop-price { font-size: 11.5px; font-weight: 700; color: #ffd166; }
      .shop-price.poor { color: #f87171; }
      .shop-qty { width: 48px; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 4px; font-size: 11px; padding: 1px 3px; }
      .shop-buy, .shop-sell { background: #38b000; color: #fff; border: none; border-radius: 4px; padding: 3px 12px; cursor: pointer; font-weight: 700; font-family: inherit; font-size: 11.5px; }
      .shop-sell { background: #e76f51; }
      .shop-buy:disabled { background: #475569; cursor: not-allowed; }
      .shop-empty { text-align: center; color: #94a3b8; padding: 20px; font-size: 12px; }

      #skills-win { width: 400px !important; }
      #skills-win .ro-window-body { max-height: 65vh; overflow-y: auto; }
      .skill-points { font-size: 12.5px; color: #e2e8f0; }
      .skill-points strong { color: #38b000; font-size: 15px; }
      .skill-points small { color: #94a3b8; }
      .skill-card { display: flex; gap: 8px; align-items: flex-start; background: #0c1a30; border: 1px solid #c9a45c55; border-radius: 6px; padding: 7px; }
      .skill-icon { width: 38px; height: 38px; flex: none; border: 1.5px solid; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
      .skill-icon svg { width: 80%; height: 80%; }
      .skill-body { flex: 1; min-width: 0; }
      .skill-title { display: flex; justify-content: space-between; align-items: center; color: #ffd166; font-weight: 700; font-size: 12.5px; }
      .skill-title small { color: #94a3b8; font-weight: 400; }
      .skill-title kbd { background: #1e293b; border: 1px solid #64748b; border-radius: 4px; padding: 0 6px; font-size: 10px; color: #f8fafc; }
      .skill-desc { font-size: 11px; color: #cbd5e1; margin: 2px 0 3px; line-height: 1.35; }
      .skill-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 10.5px; color: #93c5fd; }
      .skill-up { flex: none; width: 26px; height: 26px; background: #38b000; color: #fff; border: none; border-radius: 5px; font-weight: 800; cursor: pointer; align-self: center; }
      .skill-up:disabled { background: #334155; color: #64748b; cursor: not-allowed; }
      .skill-hint { font-size: 11px; color: #fcd34d; background: #1f2937; border-radius: 6px; padding: 6px 8px; }

      .cd-overlay { position: absolute; inset: 0; border-radius: 5px; display: none; align-items: center; justify-content: center; z-index: 6; pointer-events: none; }
      .cd-text { font-size: 13px; font-weight: 800; color: #fff; text-shadow: 0 1px 3px #000; }

      .target-frame { position: fixed; top: 64px; left: 50%; transform: translateX(-50%); width: 280px; z-index: 95;
        background: rgba(15,23,42,0.9); border: 1.5px solid #778da9; border-radius: 8px; padding: 6px 10px; display: none; pointer-events: none; }
      .target-frame.visible { display: block; }
      .target-frame.boss { border-color: #f59e0b; box-shadow: 0 0 18px rgba(245,158,11,0.35); }
      .tf-name { display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: #fecaca; margin-bottom: 4px; }
      .tf-level { color: #94a3b8; font-weight: 600; }
      .tf-bar { position: relative; height: 12px; background: #1e293b; border-radius: 6px; overflow: hidden; }
      .tf-fill { height: 100%; background: linear-gradient(90deg, #dc2626, #f87171); transition: width 0.15s; }
      .tf-hp { position: absolute; inset: 0; font-size: 9.5px; color: #fff; text-align: center; line-height: 12px; text-shadow: 0 1px 2px #000; }

      .death-overlay { position: fixed; inset: 0; z-index: 20000; display: none; align-items: center; justify-content: center;
        background: radial-gradient(circle, rgba(30,0,0,0.45), rgba(0,0,0,0.8)); }
      .death-overlay.visible { display: flex; }
      .death-card { text-align: center; background: rgba(15,23,42,0.95); border: 2px solid #b91c1c; border-radius: 12px; padding: 22px 34px; color: #f1f5f9; }
      .death-title { font-size: 22px; font-weight: 800; color: #fca5a5; margin-bottom: 6px; }
      .death-detail { font-size: 13px; color: #cbd5e1; margin-bottom: 14px; }
      .death-btn { background: #c9a45c; color: #0f172a; border: none; border-radius: 8px; padding: 9px 22px; font-weight: 800; cursor: pointer; font-family: inherit; }
      .death-btn:disabled { background: #475569; color: #94a3b8; cursor: wait; }

      .toast-layer { position: fixed; top: 110px; left: 50%; transform: translateX(-50%); z-index: 15000; display: flex; flex-direction: column; gap: 6px; align-items: center; pointer-events: none; }
      .toast { background: rgba(15,23,42,0.94); border: 1px solid #475569; color: #f1f5f9; padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; transition: opacity 0.35s, transform 0.35s; }
      .toast-error { border-color: #ef4444; color: #fecaca; }
      .toast-success { border-color: #22c55e; color: #bbf7d0; }
      .toast.out { opacity: 0; transform: translateY(-8px); }

      @media (max-width: 720px) {
        .shop-win { right: 8px; left: 8px; width: auto; top: 70px; }
        .target-frame { width: 220px; top: 56px; }
      }
    `;
        document.head.appendChild(style);
    }
}
