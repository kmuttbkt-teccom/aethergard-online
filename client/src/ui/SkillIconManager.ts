/**
 * AETHERGARD ONLINE — SkillIconManager
 * Renders stylized MMORPG fantasy vector icons with glowing elemental frames
 * for desktop Hotbars and mobile touch controls.
 */

import { JOB_SKILL_BAR, SKILL_DB } from '../../../server/src/GameData.js';
import { JobClass } from '../../../server/src/types.js';

export interface SkillIconDef {
  id: string;
  name: string;
  category: 'physical' | 'holy' | 'ice' | 'fire' | 'wind' | 'shadow' | 'item';
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  svgContent: string;
}

export class SkillIconManager {
  private static _instance: SkillIconManager | null = null;

  public static getInstance(): SkillIconManager {
    if (!this._instance) {
      this._instance = new SkillIconManager();
    }
    return this._instance;
  }

  public getSkillIcon(skillId: string): SkillIconDef {
    const id = skillId.toUpperCase();
    if (this.ICONS[id]) return this.ICONS[id];
    return this.ICONS['NORMAL'];
  }

  public renderSlotIcon(element: HTMLElement, skillId: string, count?: number) {
    const iconDef = this.getSkillIcon(skillId);
    element.innerHTML = `
      <div class="fantasy-skill-icon-wrapper" style="
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background: ${iconDef.bgGradient};
        border-radius: 6px;
        box-shadow: inset 0 0 8px rgba(0,0,0,0.6), 0 0 6px ${iconDef.glowColor};
        border: 1px solid ${iconDef.borderColor};
        overflow: hidden;
      ">
        <svg viewBox="0 0 64 64" class="skill-svg-glyph" style="width: 78%; height: 78%; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));">
          ${iconDef.svgContent}
        </svg>
        ${count !== undefined ? `<span class="slot-count">${count}</span>` : ''}
      </div>
    `;
  }

  public initQuickslots() {
    const zSlot = document.querySelector('#slot-z .slot-icon');
    if (zSlot) this.renderSlotIcon(zSlot as HTMLElement, 'NORMAL');

    const xSlot = document.querySelector('#slot-x .slot-icon');
    if (xSlot) this.renderSlotIcon(xSlot as HTMLElement, 'BASH');

    const slot4 = document.querySelector('#slot-4 .slot-icon');
    if (slot4) this.renderSlotIcon(slot4 as HTMLElement, 'RADIANT_SLASH');

    const slot5 = document.querySelector('#slot-5 .slot-icon');
    if (slot5) this.renderSlotIcon(slot5 as HTMLElement, 'SOLAR_AEGIS');

    const slot1 = document.querySelector('#slot-1 .slot-icon');
    if (slot1) this.renderSlotIcon(slot1 as HTMLElement, 'POTION_RED');

    const slot2 = document.querySelector('#slot-2 .slot-icon');
    if (slot2) this.renderSlotIcon(slot2 as HTMLElement, 'POTION_BLUE');

    const slot3 = document.querySelector('#slot-3 .slot-icon');
    if (slot3) this.renderSlotIcon(slot3 as HTMLElement, 'FLY_WING');

    // Upgrade mobile touch buttons if present
    this.upgradeMobileTouchButtons();
  }

  public updateJobSkills(job: string) {
    const slot4 = document.querySelector('#slot-4 .slot-icon') as HTMLElement;
    const slot5 = document.querySelector('#slot-5 .slot-icon') as HTMLElement;
    const btnSkill1 = document.getElementById('btn-skill1');
    const btnSkill2 = document.getElementById('btn-skill2');

    const [skill1, skill2] = JOB_SKILL_BAR[job as JobClass] || JOB_SKILL_BAR.Novice;

    if (slot4) this.renderSlotIcon(slot4, skill1);
    const slot5Root = document.getElementById('slot-5');
    if (slot5Root) slot5Root.style.visibility = skill2 ? 'visible' : 'hidden';
    if (slot5 && skill2) this.renderSlotIcon(slot5, skill2);

    const setTitle = (id: string, skillId: string | null, key: string) => {
      const el = document.getElementById(id);
      const def = skillId ? SKILL_DB[skillId] : undefined;
      if (el && def) el.title = `${def.name} (${def.thaiName}) [${key}] — ${def.mpCost} MP`;
    };
    setTitle('slot-4', skill1, '4');
    setTitle('slot-5', skill2, '5');

    // Mobile action buttons show the job's real skills
    const setMobileButton = (id: string, skillId: string | null) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.style.visibility = skillId ? 'visible' : 'hidden';
      if (!skillId) return;
      const icon = this.getSkillIcon(skillId);
      const def = SKILL_DB[skillId];
      btn.innerHTML = `<svg viewBox="0 0 64 64" style="width:24px;height:24px;">${icon.svgContent}</svg><small>${def ? def.name.split(' ')[0] : icon.name}</small>`;
    };
    setMobileButton('m-btn-skill4', skill1);
    setMobileButton('m-btn-skill5', skill2);

    if (btnSkill1) {
      const icon1 = this.getSkillIcon(skill1);
      btnSkill1.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;gap:3px;"><svg viewBox="0 0 64 64" style="width:20px;height:20px;">${icon1.svgContent}</svg><span>${icon1.name.slice(0, 4)}</span></span>`;
    }
    if (btnSkill2) {
      btnSkill2.style.visibility = skill2 ? 'visible' : 'hidden';
      if (skill2) {
        const icon2 = this.getSkillIcon(skill2);
        btnSkill2.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;gap:3px;"><svg viewBox="0 0 64 64" style="width:20px;height:20px;">${icon2.svgContent}</svg><span>${icon2.name.slice(0, 4)}</span></span>`;
      }
    }
  }

  private upgradeMobileTouchButtons() {
    const btnAtk = document.getElementById('btn-atk');
    if (btnAtk && !btnAtk.dataset.iconized) {
      btnAtk.dataset.iconized = 'true';
      const atkIcon = this.getSkillIcon('NORMAL');
      btnAtk.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <svg viewBox="0 0 64 64" style="width: 26px; height: 26px;">${atkIcon.svgContent}</svg>
          <span style="font-size: 11px; font-weight: bold; margin-top: -2px;">ATK</span>
        </div>
      `;
    }

    const btnBash = document.getElementById('btn-bash');
    if (btnBash && !btnBash.dataset.iconized) {
      btnBash.dataset.iconized = 'true';
      const bashIcon = this.getSkillIcon('BASH');
      btnBash.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <svg viewBox="0 0 64 64" style="width: 20px; height: 20px;">${bashIcon.svgContent}</svg>
          <span style="font-size: 9.5px; font-weight: bold;">Bash</span>
        </div>
      `;
    }
  }

  private ICONS: Record<string, SkillIconDef> = {
    FIRST_AID: {
      id: 'FIRST_AID',
      name: 'ปฐมพยาบาล',
      category: 'holy',
      bgGradient: 'radial-gradient(circle, #2d6a4f 0%, #081c15 100%)',
      borderColor: '#86efac',
      glowColor: 'rgba(134, 239, 172, 0.45)',
      svgContent: `
        <!-- Bandage roll with a green cross -->
        <rect x="14" y="20" width="36" height="26" rx="6" fill="#f8f9fa" stroke="#95d5b2" stroke-width="2"/>
        <rect x="28" y="24" width="8" height="18" rx="2" fill="#40916c"/>
        <rect x="23" y="29" width="18" height="8" rx="2" fill="#40916c"/>
        <path d="M50 30 Q58 34 54 44" fill="none" stroke="#f8f9fa" stroke-width="4" stroke-linecap="round"/>
      `
    },
    NORMAL: {
      id: 'NORMAL',
      name: 'ฟาดฟัน',
      category: 'physical',
      bgGradient: 'radial-gradient(circle, #3a506b 0%, #0b132b 100%)',
      borderColor: '#4cc9f0',
      glowColor: 'rgba(76, 201, 240, 0.4)',
      svgContent: `
        <!-- Silver-Azure Broadsword with Golden Hilt -->
        <defs>
          <linearGradient id="bladeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="#caf0f8"/>
            <stop offset="100%" stop-color="#48cae4"/>
          </linearGradient>
        </defs>
        <path d="M12 52 L44 20 L52 12 L50 22 L22 50 Z" fill="url(#bladeGrad)" stroke="#0077b6" stroke-width="1.5"/>
        <line x1="16" y1="48" x2="48" y2="16" stroke="#ffffff" stroke-width="1.2"/>
        <!-- Golden Crossguard & Pommel -->
        <rect x="10" y="46" width="16" height="4" rx="2" transform="rotate(-45 18 48)" fill="#ffd166" stroke="#b7791f" stroke-width="1"/>
        <line x1="14" y1="52" x2="8" y2="58" stroke="#8b5a2b" stroke-width="4" stroke-linecap="round"/>
        <circle cx="7" cy="59" r="3" fill="#ffd166"/>
        <!-- Slash Wind Sparkles -->
        <path d="M26 10 Q40 18 54 36" fill="none" stroke="#48cae4" stroke-width="2" stroke-dasharray="4,2"/>
        <polygon points="50,14 53,10 56,14 60,15 56,17 54,21 52,17 48,15" fill="#fff"/>
      `
    },
    BASH: {
      id: 'BASH',
      name: 'ทุบทะลวง',
      category: 'fire',
      bgGradient: 'radial-gradient(circle, #b7094c 0%, #2b090d 100%)',
      borderColor: '#ff4d6d',
      glowColor: 'rgba(255, 77, 109, 0.5)',
      svgContent: `
        <!-- Exploding War Hammer with Fire Burst -->
        <defs>
          <radialGradient id="fireGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffe6a7"/>
            <stop offset="50%" stop-color="#ff6b6b"/>
            <stop offset="100%" stop-color="#d90429"/>
          </radialGradient>
        </defs>
        <!-- Impact Shockwaves -->
        <polygon points="32,6 38,20 54,16 42,28 58,34 40,38 46,54 32,42 18,54 24,38 6,34 22,28 10,16 26,20" fill="url(#fireGlow)" opacity="0.6"/>
        <!-- Heavy Maul Head -->
        <rect x="22" y="16" width="28" height="16" rx="3" fill="#495057" stroke="#ced4da" stroke-width="1.8"/>
        <line x1="22" y1="24" x2="50" y2="24" stroke="#ff4d6d" stroke-width="2"/>
        <!-- Sturdy Shaft -->
        <line x1="36" y1="32" x2="16" y2="58" stroke="#8d5b4c" stroke-width="5" stroke-linecap="round"/>
        <rect x="24" y="44" width="8" height="3" fill="#ffb703" transform="rotate(-52 28 45)"/>
        <!-- Fiery Ember Particles -->
        <circle cx="48" cy="12" r="2.5" fill="#ffd166"/>
        <circle cx="56" cy="24" r="2" fill="#ff7b00"/>
        <circle cx="16" cy="18" r="2" fill="#ffd166"/>
      `
    },
    RADIANT_SLASH: {
      id: 'RADIANT_SLASH',
      name: 'สุริยันจรัสแสง',
      category: 'holy',
      bgGradient: 'radial-gradient(circle, #e09f3e 0%, #3d2600 100%)',
      borderColor: '#ffd166',
      glowColor: 'rgba(255, 209, 102, 0.5)',
      svgContent: `
        <!-- Radiant Sun Crest with Golden Twin Slashes -->
        <defs>
          <radialGradient id="sunburst" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="60%" stop-color="#ffd166"/>
            <stop offset="100%" stop-color="#b7791f"/>
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="22" fill="none" stroke="#ffd166" stroke-width="1.5" stroke-dasharray="3,3"/>
        <!-- Sun Rays -->
        <line x1="32" y1="4" x2="32" y2="12" stroke="#fff" stroke-width="2"/>
        <line x1="32" y1="52" x2="32" y2="60" stroke="#fff" stroke-width="2"/>
        <line x1="4" y1="32" x2="12" y2="32" stroke="#fff" stroke-width="2"/>
        <line x1="52" y1="32" x2="60" y2="32" stroke="#fff" stroke-width="2"/>
        <!-- Golden Crossblade -->
        <path d="M8 56 Q32 30 56 8" fill="none" stroke="url(#sunburst)" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M14 12 Q32 32 50 52" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        <circle cx="32" cy="32" r="6" fill="#fff" filter="drop-shadow(0 0 6px #ffd166)"/>
      `
    },
    SOLAR_AEGIS: {
      id: 'SOLAR_AEGIS',
      name: 'โล่สุริยา',
      category: 'holy',
      bgGradient: 'radial-gradient(circle, #936639 0%, #281d11 100%)',
      borderColor: '#ffe6a7',
      glowColor: 'rgba(255, 230, 167, 0.4)',
      svgContent: `
        <!-- Resplendent Golden Shield with Angel Wings -->
        <path d="M32 10 L48 16 C48 36 32 54 32 54 C32 54 16 36 16 16 Z" fill="#ffd166" stroke="#fff" stroke-width="2"/>
        <path d="M32 15 L44 20 C44 34 32 48 32 48 C32 48 20 34 20 20 Z" fill="#b7791f"/>
        <polygon points="32,20 35,29 44,29 37,34 40,43 32,38 24,43 27,34 20,29 29,29" fill="#ffffff"/>
      `
    },
    ASTRAL_METEOR: {
      id: 'ASTRAL_METEOR',
      name: 'อุกกาบาตดวงดาว',
      category: 'fire',
      bgGradient: 'radial-gradient(circle, #5a189a 0%, #10002b 100%)',
      borderColor: '#ff9e00',
      glowColor: 'rgba(255, 158, 0, 0.5)',
      svgContent: `
        <!-- Cosmic Meteor with Violet/Orange Tail -->
        <path d="M12 12 Q28 20 44 44" stroke="#ff5400" stroke-width="8" stroke-linecap="round" opacity="0.6"/>
        <path d="M18 16 Q30 24 46 46" stroke="#ffd166" stroke-width="4" stroke-linecap="round"/>
        <circle cx="48" cy="48" r="9" fill="#ff5400" stroke="#fff" stroke-width="2"/>
        <circle cx="48" cy="48" r="5" fill="#ffd166"/>
        <!-- Star Glints -->
        <polygon points="18,10 20,6 22,10 26,11 22,13 20,17 18,13 14,11" fill="#c77dff"/>
        <polygon points="34,16 35,13 37,16 40,17 37,18 35,21 34,18 31,17" fill="#4cc9f0"/>
      `
    },
    FROST_NOVA: {
      id: 'FROST_NOVA',
      name: 'ระเบิดเหมันต์',
      category: 'ice',
      bgGradient: 'radial-gradient(circle, #0077b6 0%, #03045e 100%)',
      borderColor: '#90e0ef',
      glowColor: 'rgba(144, 224, 239, 0.5)',
      svgContent: `
        <!-- Elaborate Ice Snowflake Crystal -->
        <line x1="32" y1="8" x2="32" y2="56" stroke="#caf0f8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="8" y1="32" x2="56" y2="32" stroke="#caf0f8" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="15" y1="15" x2="49" y2="49" stroke="#90e0ef" stroke-width="2" stroke-linecap="round"/>
        <line x1="15" y1="49" x2="49" y2="15" stroke="#90e0ef" stroke-width="2" stroke-linecap="round"/>
        <!-- Hexagon Ice Core -->
        <polygon points="32,24 39,28 39,36 32,40 25,36 25,28" fill="#ffffff" stroke="#0077b6" stroke-width="1.5"/>
        <circle cx="32" cy="32" r="3" fill="#00b4d8"/>
      `
    },
    GALE_ARROW: {
      id: 'GALE_ARROW',
      name: 'ศรพายุวายุ',
      category: 'wind',
      bgGradient: 'radial-gradient(circle, #2a9d8f 0%, #0d3b36 100%)',
      borderColor: '#7bed9f',
      glowColor: 'rgba(123, 237, 159, 0.5)',
      svgContent: `
        <!-- High-Velocity Wind Arrow with Feather Fletching -->
        <line x1="12" y1="52" x2="50" y2="14" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
        <!-- Arrowhead -->
        <polygon points="56,8 44,14 48,18 42,24 50,20" fill="#7bed9f" stroke="#065f46" stroke-width="1"/>
        <polygon points="56,8 46,12 52,18" fill="#fff"/>
        <!-- Fletching Wings -->
        <path d="M14 46 L10 54 L18 50 Z" fill="#2ec4b6"/>
        <!-- Wind Rings -->
        <ellipse cx="32" cy="32" rx="14" ry="5" transform="rotate(-45 32 32)" fill="none" stroke="#7bed9f" stroke-width="1.8" stroke-dasharray="4,3"/>
      `
    },
    RAIN_OF_LIGHT: {
      id: 'RAIN_OF_LIGHT',
      name: 'ห่าฝนแสงธรรม',
      category: 'holy',
      bgGradient: 'radial-gradient(circle, #f4a261 0%, #5c2c16 100%)',
      borderColor: '#ffd166',
      glowColor: 'rgba(255, 209, 102, 0.45)',
      svgContent: `
        <!-- Multiple Golden Light Beams Raining Down -->
        <line x1="20" y1="8" x2="16" y2="52" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="32" y1="6" x2="30" y2="58" stroke="#ffd166" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="44" y1="10" x2="42" y2="50" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Golden Impact Stars at bottom -->
        <circle cx="16" cy="52" r="3" fill="#ffd166"/>
        <circle cx="30" cy="58" r="4" fill="#ffffff"/>
        <circle cx="42" cy="50" r="3" fill="#ffd166"/>
      `
    },
    SHADOW_BLINK: {
      id: 'SHADOW_BLINK',
      name: 'เงาล่องหน',
      category: 'shadow',
      bgGradient: 'radial-gradient(circle, #4a154b 0%, #150020 100%)',
      borderColor: '#c77dff',
      glowColor: 'rgba(199, 125, 255, 0.5)',
      svgContent: `
        <!-- Shadow Kunai Disappearing into Void Mist -->
        <path d="M20 44 L44 20 L40 16 L16 40 Z" fill="#3a0ca3" stroke="#c77dff" stroke-width="1.5"/>
        <polygon points="44,20 54,10 40,16" fill="#c77dff"/>
        <circle cx="14" cy="46" r="3" fill="none" stroke="#e0aaff" stroke-width="2"/>
        <!-- Phantom Purple Smoke Trails -->
        <path d="M10 26 Q24 16 36 24 T54 28" fill="none" stroke="#7209b7" stroke-width="2.5" opacity="0.6"/>
        <path d="M16 36 Q30 46 44 38 T56 46" fill="none" stroke="#9d4edd" stroke-width="2" opacity="0.5"/>
      `
    },
    BLADE_DANCE: {
      id: 'BLADE_DANCE',
      name: 'ระบำคมมีด',
      category: 'shadow',
      bgGradient: 'radial-gradient(circle, #560bad 0%, #120129 100%)',
      borderColor: '#e0aaff',
      glowColor: 'rgba(224, 170, 255, 0.5)',
      svgContent: `
        <!-- Dual Crossed Amethyst Daggers with Petal Whirlwind -->
        <line x1="12" y1="12" x2="52" y2="52" stroke="#e0aaff" stroke-width="3" stroke-linecap="round"/>
        <line x1="52" y1="12" x2="12" y2="52" stroke="#e0aaff" stroke-width="3" stroke-linecap="round"/>
        <circle cx="32" cy="32" r="14" fill="none" stroke="#c77dff" stroke-width="1.5" stroke-dasharray="4,2"/>
        <circle cx="32" cy="32" r="4" fill="#ffffff"/>
      `
    },
    SANCTUARY: {
      id: 'SANCTUARY',
      name: 'แดนศักดิ์สิทธิ์',
      category: 'holy',
      bgGradient: 'radial-gradient(circle, #4895ef 0%, #03045e 100%)',
      borderColor: '#ffd166',
      glowColor: 'rgba(255, 209, 102, 0.5)',
      svgContent: `
        <!-- Angelic Wing Halo with Healing Cross -->
        <circle cx="32" cy="32" r="18" fill="none" stroke="#ffd166" stroke-width="2"/>
        <path d="M12 28 C18 18 28 22 32 30 C36 22 46 18 52 28 C42 36 36 44 32 50 C28 44 22 36 12 28 Z" fill="rgba(255,255,255,0.2)" stroke="#fff" stroke-width="1.5"/>
        <rect x="29" y="22" width="6" height="20" rx="1" fill="#ffd166"/>
        <rect x="22" y="27" width="20" height="6" rx="1" fill="#ffd166"/>
      `
    },
    JUDGMENT_FIST: {
      id: 'JUDGMENT_FIST',
      name: 'หมัดพิพากษา',
      category: 'holy',
      bgGradient: 'radial-gradient(circle, #f77f00 0%, #370617 100%)',
      borderColor: '#ffba08',
      glowColor: 'rgba(255, 186, 8, 0.5)',
      svgContent: `
        <!-- Divine Golden Fist Descending with Golden Aura -->
        <circle cx="32" cy="32" r="20" fill="none" stroke="#ffba08" stroke-width="1.5" stroke-dasharray="3,3"/>
        <rect x="22" y="20" width="20" height="22" rx="5" fill="#ffd166" stroke="#fff" stroke-width="1.8"/>
        <line x1="27" y1="20" x2="27" y2="30" stroke="#b7791f" stroke-width="1.5"/>
        <line x1="32" y1="20" x2="32" y2="30" stroke="#b7791f" stroke-width="1.5"/>
        <line x1="37" y1="20" x2="37" y2="30" stroke="#b7791f" stroke-width="1.5"/>
      `
    },
    COIN_BURST: {
      id: 'COIN_BURST',
      name: 'โปรยเหรียญสังหาร',
      category: 'physical',
      bgGradient: 'radial-gradient(circle, #b5838d 0%, #44222a 100%)',
      borderColor: '#ffd700',
      glowColor: 'rgba(255, 215, 0, 0.5)',
      svgContent: `
        <!-- Exploding Gold Coins & Pouch -->
        <circle cx="32" cy="24" r="8" fill="#ffd700" stroke="#b8860b" stroke-width="1.5"/>
        <text x="32" y="28" font-size="9" font-weight="bold" text-anchor="middle" fill="#784212">Z</text>
        <circle cx="20" cy="36" r="6" fill="#ffec99" stroke="#b8860b" stroke-width="1.2"/>
        <circle cx="44" cy="36" r="6" fill="#ffec99" stroke="#b8860b" stroke-width="1.2"/>
        <circle cx="32" cy="46" r="7" fill="#ffd700" stroke="#b8860b" stroke-width="1.5"/>
        <text x="32" y="50" font-size="8" font-weight="bold" text-anchor="middle" fill="#784212">Z</text>
      `
    },
    GREED_VACUUM: {
      id: 'GREED_VACUUM',
      name: 'พายุดูดทรัพย์',
      category: 'physical',
      bgGradient: 'radial-gradient(circle, #6d6875 0%, #1d1a24 100%)',
      borderColor: '#ffd166',
      glowColor: 'rgba(255, 209, 102, 0.4)',
      svgContent: `
        <!-- Swirling Golden Vortex -->
        <ellipse cx="32" cy="32" rx="20" ry="12" fill="none" stroke="#ffd166" stroke-width="2" stroke-dasharray="5,3"/>
        <ellipse cx="32" cy="32" rx="12" ry="7" fill="none" stroke="#ffffff" stroke-width="1.5"/>
        <circle cx="32" cy="32" r="4" fill="#ffd700"/>
      `
    },
    POTION_RED: {
      id: 'POTION_RED',
      name: 'Red Potion',
      category: 'item',
      bgGradient: 'radial-gradient(circle, #e63946 0%, #370617 100%)',
      borderColor: '#ff4d6d',
      glowColor: 'rgba(230, 57, 70, 0.6)',
      svgContent: `
        <!-- Glass Flask with Ruby Red Healing Elixir -->
        <rect x="28" y="10" width="8" height="6" rx="1" fill="#a8dadc" stroke="#457b9d" stroke-width="1"/>
        <rect x="26" y="8" width="12" height="3" rx="1" fill="#8d5b4c"/>
        <path d="M29 16 L22 28 C16 38 20 52 32 52 C44 52 48 38 42 28 L35 16 Z" fill="rgba(255,255,255,0.2)" stroke="#caf0f8" stroke-width="1.5"/>
        <!-- Red Liquid Inside -->
        <path d="M24 32 C18 40 22 50 32 50 C42 50 46 40 40 32 C36 35 28 35 24 32 Z" fill="#e63946"/>
        <circle cx="28" cy="42" r="2.5" fill="#fff" opacity="0.7"/>
        <circle cx="36" cy="44" r="1.5" fill="#fff" opacity="0.7"/>
      `
    },
    POTION_BLUE: {
      id: 'POTION_BLUE',
      name: 'Blue Potion',
      category: 'item',
      bgGradient: 'radial-gradient(circle, #0077b6 0%, #03045e 100%)',
      borderColor: '#48cae4',
      glowColor: 'rgba(72, 202, 228, 0.6)',
      svgContent: `
        <!-- Glass Flask with Sapphire Mana Elixir -->
        <rect x="28" y="10" width="8" height="6" rx="1" fill="#a8dadc" stroke="#457b9d" stroke-width="1"/>
        <rect x="26" y="8" width="12" height="3" rx="1" fill="#8d5b4c"/>
        <path d="M29 16 L22 28 C16 38 20 52 32 52 C44 52 48 38 42 28 L35 16 Z" fill="rgba(255,255,255,0.2)" stroke="#caf0f8" stroke-width="1.5"/>
        <!-- Blue Liquid Inside -->
        <path d="M24 32 C18 40 22 50 32 50 C42 50 46 40 40 32 C36 35 28 35 24 32 Z" fill="#0096c7"/>
        <circle cx="32" cy="42" r="2" fill="#fff" opacity="0.8"/>
      `
    },
    FLY_WING: {
      id: 'FLY_WING',
      name: 'Fly Wing',
      category: 'item',
      bgGradient: 'radial-gradient(circle, #d4a373 0%, #3e2723 100%)',
      borderColor: '#ffd166',
      glowColor: 'rgba(255, 209, 102, 0.5)',
      svgContent: `
        <!-- Golden Angelic Wing Feather with Teleport Glow -->
        <path d="M16 52 C14 40 18 24 36 12 C44 8 50 8 50 8 C50 8 48 16 44 26 C40 34 32 46 16 52 Z" fill="#ffd166" stroke="#fff" stroke-width="1.5"/>
        <line x1="20" y1="48" x2="44" y2="12" stroke="#b7791f" stroke-width="1.5"/>
        <!-- Teleport Magic Rune Rings -->
        <circle cx="34" cy="28" r="8" fill="none" stroke="#4cc9f0" stroke-width="1" stroke-dasharray="3,2"/>
        <polygon points="46,14 47,11 49,14 52,15 49,16 47,19 46,16 43,15" fill="#fff"/>
      `
    }
  };
}
