/**
 * AETHERGARD ONLINE — Shared Game Database
 * Imported by both the authoritative server and the client, so item stats,
 * skill numbers, NPC definitions and stat formulas can never drift apart.
 */
import { InventoryItem, ItemRarity, JobClass, MonsterType, Stats, WeaponType } from './types.js';

// ---------------------------------------------------------------------------
// World coordinates
// ---------------------------------------------------------------------------
// The server simulates in "2D pixel" units (x: 0..14400). The 3D client maps
// them with x3d = x * 0.03 - 50 and z3d = z * 0.03.
export const WORLD_SCALE = 0.03;
export const WORLD_OFFSET_X = 50;
export const WORLD_MAX_X = 14400;
export const WORLD_MAX_Z = 480; // ±14.4 units in 3D — the walkable corridor

export const toWorld3DX = (x: number) => x * WORLD_SCALE - WORLD_OFFSET_X;
export const toWorld3DZ = (z: number) => z * WORLD_SCALE;
export const fromWorld3DX = (x: number) => (x + WORLD_OFFSET_X) / WORLD_SCALE;
export const fromWorld3DZ = (z: number) => z / WORLD_SCALE;

/** Solaria town square — respawn point after death (server units) */
export const TOWN_RESPAWN = { x: fromWorld3DX(-2), z: 0 };

// ---------------------------------------------------------------------------
// Weapons
// ---------------------------------------------------------------------------
export interface WeaponProfile {
  thaiName: string;
  /** Basic attack reach in server units */
  range: number;
  /** Multiplier on attack delay; < 1 is faster */
  aspdMod: number;
  kind: 'melee' | 'ranged' | 'magic';
}

export const WEAPON_PROFILES: Record<WeaponType, WeaponProfile> = {
  fist:       { thaiName: 'มือเปล่า',   range: 90,  aspdMod: 0.9,  kind: 'melee' },
  dagger:     { thaiName: 'มีดสั้น',    range: 100, aspdMod: 0.8,  kind: 'melee' },
  sword:      { thaiName: 'ดาบมือเดียว', range: 115, aspdMod: 1.0,  kind: 'melee' },
  greatsword: { thaiName: 'ดาบสองมือ',  range: 135, aspdMod: 1.3,  kind: 'melee' },
  spear:      { thaiName: 'หอก',       range: 155, aspdMod: 1.1,  kind: 'melee' },
  axe:        { thaiName: 'ขวาน',      range: 120, aspdMod: 1.2,  kind: 'melee' },
  mace:       { thaiName: 'กระบอง',    range: 110, aspdMod: 1.05, kind: 'melee' },
  scythe:     { thaiName: 'เคียว',     range: 145, aspdMod: 1.15, kind: 'melee' },
  staff:      { thaiName: 'คทาเวท',    range: 300, aspdMod: 1.15, kind: 'magic' },
  rod:        { thaiName: 'คทาศักดิ์สิทธิ์', range: 260, aspdMod: 1.1, kind: 'magic' },
  bow:        { thaiName: 'ธนู',       range: 400, aspdMod: 1.0,  kind: 'ranged' }
};

export const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#e2e8f0',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24'
};

/** Resolve a weapon type for legacy items created before weaponType existed */
export function inferWeaponType(item?: InventoryItem | null): WeaponType {
  if (!item) return 'fist';
  if (item.weaponType) return item.weaponType;
  const key = `${item.id} ${item.name}`.toLowerCase();
  if (key.includes('scythe')) return 'scythe';
  if (key.includes('knife') || key.includes('dagger')) return 'dagger';
  if (key.includes('bow')) return 'bow';
  if (key.includes('staff') || key.includes('wand')) return 'staff';
  if (key.includes('axe')) return 'axe';
  return 'sword';
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------
type Slot = NonNullable<InventoryItem['slot']>;

export interface ItemDef {
  id: string;
  name: string;
  type: InventoryItem['type'];
  icon: string;
  price: number;
  description: string;
  rarity: ItemRarity;
  slot?: Slot;
  weaponType?: WeaponType;
  reqLevel?: number;
  jobs?: JobClass[];
  cardSlots?: number;
  effect?: InventoryItem['effect'];
}

const ALL_JOBS: JobClass[] = ['Novice', 'Swordman', 'Magician', 'Archer', 'Thief', 'Acolyte', 'Merchant'];

export const ITEM_DB: Record<string, ItemDef> = {
  // ----- Consumables -----
  red_potion:    { id: 'red_potion', name: 'Red Potion', type: 'usable', icon: '🧪', price: 50, rarity: 'common', description: 'ฟื้นฟู 150 HP ทันที', effect: { hp: 150 } },
  orange_potion: { id: 'orange_potion', name: 'Orange Potion', type: 'usable', icon: '🍊', price: 180, rarity: 'common', description: 'ฟื้นฟู 450 HP ทันที', effect: { hp: 450 } },
  white_potion:  { id: 'white_potion', name: 'White Potion', type: 'usable', icon: '🥛', price: 650, rarity: 'uncommon', description: 'ฟื้นฟู 1,400 HP ทันที', effect: { hp: 1400 } },
  blue_potion:   { id: 'blue_potion', name: 'Blue Potion', type: 'usable', icon: '💙', price: 300, rarity: 'uncommon', description: 'ฟื้นฟู 80 MP ทันที', effect: { mp: 80 } },
  mana_elixir:   { id: 'mana_elixir', name: 'Mana Elixir', type: 'usable', icon: '🔮', price: 1200, rarity: 'rare', description: 'ฟื้นฟู 350 MP ทันที', effect: { mp: 350 } },

  // ----- Daggers -----
  novice_knife: { id: 'novice_knife', name: 'Novice Knife', type: 'equip', slot: 'weapon', weaponType: 'dagger', icon: '🔪', price: 40, rarity: 'common', reqLevel: 1, jobs: ALL_JOBS, cardSlots: 3, description: 'มีดสั้นสำหรับผู้เริ่มต้น', effect: { atk: 12 } },
  cutter:       { id: 'cutter', name: 'Cutter', type: 'equip', slot: 'weapon', weaponType: 'dagger', icon: '🗡️', price: 900, rarity: 'common', reqLevel: 5, jobs: ['Novice', 'Swordman', 'Magician', 'Archer', 'Thief', 'Merchant'], cardSlots: 3, description: 'มีดสั้นคมกริบ โจมตีเร็ว', effect: { atk: 28 } },
  stiletto:     { id: 'stiletto', name: 'Stiletto', type: 'equip', slot: 'weapon', weaponType: 'dagger', icon: '🗡️', price: 6500, rarity: 'uncommon', reqLevel: 20, jobs: ['Thief'], cardSlots: 2, description: 'กริชเรียวแหลมของนักฆ่า เพิ่มโอกาสคริติคอล', effect: { atk: 58, crit: 5, agi: 2 } },
  gladius:      { id: 'gladius', name: 'Gladius', type: 'equip', slot: 'weapon', weaponType: 'dagger', icon: '⚔️', price: 21000, rarity: 'rare', reqLevel: 40, jobs: ['Thief'], cardSlots: 2, description: 'ดาบสั้นแห่งเงามืด', effect: { atk: 96, crit: 8, agi: 4 } },

  // ----- Swords -----
  iron_sword:  { id: 'iron_sword', name: 'Iron Sword', type: 'equip', slot: 'weapon', weaponType: 'sword', icon: '🗡️', price: 1200, rarity: 'common', reqLevel: 2, jobs: ['Novice', 'Swordman', 'Merchant', 'Thief'], cardSlots: 3, description: 'ดาบเหล็กมาตรฐานของทหารยาม', effect: { atk: 32 } },
  falchion:    { id: 'falchion', name: 'Falchion', type: 'equip', slot: 'weapon', weaponType: 'sword', icon: '🗡️', price: 7800, rarity: 'uncommon', reqLevel: 18, jobs: ['Swordman', 'Merchant'], cardSlots: 2, description: 'ดาบโค้งของอัศวิน สมดุลทั้งพลังและความเร็ว', effect: { atk: 68, str: 2 } },
  claymore:    { id: 'claymore', name: 'Claymore', type: 'equip', slot: 'weapon', weaponType: 'greatsword', icon: '⚔️', price: 24000, rarity: 'rare', reqLevel: 35, jobs: ['Swordman'], cardSlots: 1, description: 'ดาบสองมือขนาดมหึมา ฟันช้าแต่หนักหน่วง', effect: { atk: 145, str: 4 } },
  pike:        { id: 'pike', name: 'Pike', type: 'equip', slot: 'weapon', weaponType: 'spear', icon: '🔱', price: 5200, rarity: 'uncommon', reqLevel: 12, jobs: ['Swordman'], cardSlots: 2, description: 'หอกยาว ระยะโจมตีไกลกว่าดาบ', effect: { atk: 55 } },

  // ----- Staves & Rods -----
  wooden_rod:   { id: 'wooden_rod', name: 'Wooden Rod', type: 'equip', slot: 'weapon', weaponType: 'staff', icon: '🪄', price: 600, rarity: 'common', reqLevel: 1, jobs: ['Novice', 'Magician', 'Acolyte'], cardSlots: 3, description: 'คทาไม้สำหรับฝึกเวท ยิงลูกไฟเวทระยะไกล', effect: { atk: 10, matk: 25 } },
  arc_wand:     { id: 'arc_wand', name: 'Arc Wand', type: 'equip', slot: 'weapon', weaponType: 'staff', icon: '🪄', price: 8800, rarity: 'uncommon', reqLevel: 20, jobs: ['Magician'], cardSlots: 2, description: 'คทาอาร์คกักเก็บพลังเวทบริสุทธิ์', effect: { atk: 18, matk: 70, int: 3 } },
  crystal_staff:{ id: 'crystal_staff', name: 'Crystal Staff', type: 'equip', slot: 'weapon', weaponType: 'staff', icon: '🔮', price: 26000, rarity: 'rare', reqLevel: 40, jobs: ['Magician'], cardSlots: 1, description: 'คทาผลึกเวทแห่งหอคอยจอมเวท', effect: { atk: 25, matk: 130, int: 6 } },
  holy_rod:     { id: 'holy_rod', name: 'Holy Rod', type: 'equip', slot: 'weapon', weaponType: 'rod', icon: '✝️', price: 7400, rarity: 'uncommon', reqLevel: 15, jobs: ['Acolyte'], cardSlots: 2, description: 'คทาแห่งแสงศักดิ์สิทธิ์ เสริมพลังรักษา', effect: { atk: 30, matk: 55, int: 2, vit: 2 } },

  // ----- Maces & Axes -----
  club:         { id: 'club', name: 'Club', type: 'equip', slot: 'weapon', weaponType: 'mace', icon: '🏏', price: 500, rarity: 'common', reqLevel: 1, jobs: ['Novice', 'Merchant', 'Acolyte', 'Swordman'], cardSlots: 3, description: 'กระบองไม้เนื้อแข็ง', effect: { atk: 22 } },
  morning_star: { id: 'morning_star', name: 'Morning Star', type: 'equip', slot: 'weapon', weaponType: 'mace', icon: '🔨', price: 9600, rarity: 'uncommon', reqLevel: 22, jobs: ['Acolyte', 'Merchant'], cardSlots: 1, description: 'กระบองหนามดาวรุ่ง', effect: { atk: 78, matk: 15 } },
  battle_axe:   { id: 'battle_axe', name: 'Battle Axe', type: 'equip', slot: 'weapon', weaponType: 'axe', icon: '🪓', price: 8200, rarity: 'uncommon', reqLevel: 18, jobs: ['Merchant', 'Swordman'], cardSlots: 2, description: 'ขวานศึกหนักอึ้ง', effect: { atk: 82 } },
  buster:       { id: 'buster', name: 'Buster', type: 'equip', slot: 'weapon', weaponType: 'axe', icon: '🪓', price: 27000, rarity: 'rare', reqLevel: 40, jobs: ['Merchant'], cardSlots: 1, description: 'ขวานยักษ์ทำลายล้าง', effect: { atk: 150, str: 3 } },

  // ----- Bows -----
  hunter_bow:     { id: 'hunter_bow', name: 'Hunter Bow', type: 'equip', slot: 'weapon', weaponType: 'bow', icon: '🏹', price: 1000, rarity: 'common', reqLevel: 1, jobs: ['Novice', 'Archer', 'Thief'], cardSlots: 3, description: 'ธนูพรานป่า ยิงระยะไกล', effect: { atk: 26 } },
  composite_bow:  { id: 'composite_bow', name: 'Composite Bow', type: 'equip', slot: 'weapon', weaponType: 'bow', icon: '🏹', price: 8400, rarity: 'uncommon', reqLevel: 20, jobs: ['Archer'], cardSlots: 2, description: 'ธนูประกอบ แรงดึงสูง', effect: { atk: 70, dex: 2 } },
  gakkung:        { id: 'gakkung', name: 'Gakkung Bow', type: 'equip', slot: 'weapon', weaponType: 'bow', icon: '🏹', price: 25500, rarity: 'rare', reqLevel: 40, jobs: ['Archer'], cardSlots: 1, description: 'ธนูเขาสัตว์แห่งทุ่งราบตะวันออก', effect: { atk: 128, dex: 4 } },

  // ----- Armor / Head / Shoes / Accessory -----
  cotton_shirt:   { id: 'cotton_shirt', name: 'Cotton Shirt', type: 'equip', slot: 'armor', icon: '👕', price: 200, rarity: 'common', reqLevel: 1, jobs: ALL_JOBS, cardSlots: 1, description: 'เสื้อผ้าฝ้ายเบาสบาย', effect: { def: 6 } },
  adventure_suit: { id: 'adventure_suit', name: 'Adventurer Suit', type: 'equip', slot: 'armor', icon: '🧥', price: 2400, rarity: 'common', reqLevel: 10, jobs: ALL_JOBS, cardSlots: 1, description: 'ชุดนักผจญภัยทนทาน', effect: { def: 16, hp: 60 } },
  chain_mail:     { id: 'chain_mail', name: 'Chain Mail', type: 'equip', slot: 'armor', icon: '🦺', price: 11000, rarity: 'uncommon', reqLevel: 25, jobs: ['Swordman', 'Merchant', 'Acolyte'], cardSlots: 1, description: 'เกราะโซ่ถัก ป้องกันสูง', effect: { def: 38, vit: 2 } },
  mage_coat:      { id: 'mage_coat', name: 'Mage Coat', type: 'equip', slot: 'armor', icon: '🥻', price: 9500, rarity: 'uncommon', reqLevel: 20, jobs: ['Magician', 'Acolyte'], cardSlots: 1, description: 'เสื้อคลุมจอมเวท เพิ่ม INT', effect: { def: 14, int: 3, mp: 80 } },
  bandana:        { id: 'bandana', name: 'Bandana', type: 'equip', slot: 'head', icon: '🎀', price: 350, rarity: 'common', reqLevel: 1, jobs: ALL_JOBS, description: 'ผ้าโพกหัวสีสดใส', effect: { def: 2 } },
  iron_helm:      { id: 'iron_helm', name: 'Iron Helm', type: 'equip', slot: 'head', icon: '⛑️', price: 4800, rarity: 'uncommon', reqLevel: 15, jobs: ['Swordman', 'Merchant', 'Acolyte', 'Novice'], description: 'หมวกเหล็กแข็งแรง', effect: { def: 9 } },
  sandals:        { id: 'sandals', name: 'Sandals', type: 'equip', slot: 'shoes', icon: '🩴', price: 300, rarity: 'common', reqLevel: 1, jobs: ALL_JOBS, cardSlots: 1, description: 'รองเท้าแตะเบาสบาย', effect: { def: 2 } },
  wind_boots:     { id: 'wind_boots', name: 'Wind Boots', type: 'equip', slot: 'shoes', icon: '👢', price: 6200, rarity: 'uncommon', reqLevel: 18, jobs: ALL_JOBS, description: 'รองเท้าบูทแห่งสายลม AGI +3', effect: { def: 5, agi: 3 } },
  power_ring:     { id: 'power_ring', name: 'Power Ring', type: 'equip', slot: 'accessory', icon: '💍', price: 5500, rarity: 'uncommon', reqLevel: 10, jobs: ALL_JOBS, description: 'แหวนพลัง STR +3', effect: { str: 3 } },
  sage_clip:      { id: 'sage_clip', name: 'Sage Clip', type: 'equip', slot: 'accessory', icon: '📎', price: 5500, rarity: 'uncommon', reqLevel: 10, jobs: ALL_JOBS, description: 'เข็มกลัดปราชญ์ INT +2, MP +60', effect: { int: 2, mp: 60 } },
  solar_scythe:   { id: 'solar_scythe', name: 'Solar Scythe [MVP]', type: 'equip', slot: 'weapon', weaponType: 'scythe', icon: '⚡', price: 60000, rarity: 'legendary', reqLevel: 70, jobs: ['Swordman', 'Thief', 'Merchant', 'Acolyte'], cardSlots: 3, description: 'เคียวแห่งสุริยคราสอาบเพลิงสุริยะ อาวุธระดับตำนาน', effect: { atk: 75, crit: 12, str: 10 } },
  lucky_rosary:   { id: 'lucky_rosary', name: 'Lucky Rosary', type: 'equip', slot: 'accessory', icon: '📿', price: 5500, rarity: 'uncommon', reqLevel: 10, jobs: ALL_JOBS, description: 'ลูกประคำนำโชค LUK +3, Crit +2', effect: { luk: 3, crit: 2 } }
};

/** Build a fresh inventory entry from the item database */
export function makeItem(defId: string, quantity = 1): InventoryItem | null {
  const def = ITEM_DB[defId];
  if (!def) return null;
  return {
    id: `inv_${defId}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    defId,
    name: def.name,
    type: def.type,
    icon: def.icon,
    quantity,
    slot: def.slot,
    weaponType: def.weaponType,
    rarity: def.rarity,
    reqLevel: def.reqLevel,
    jobs: def.jobs ? [...def.jobs] : undefined,
    cardSlots: def.cardSlots,
    refine: def.type === 'equip' ? 0 : undefined,
    description: def.description,
    effect: def.effect ? { ...def.effect } : undefined
  };
}

/** What an NPC merchant pays for an item */
export function getSellPrice(item: InventoryItem): number {
  const def = item.defId ? ITEM_DB[item.defId] : undefined;
  if (def) return Math.max(1, Math.floor(def.price / 2) + (item.refine || 0) * 150);
  switch (item.type) {
    case 'card': return 400;
    case 'equip': return 250 + (item.refine || 0) * 150;
    case 'usable': return 15;
    default: return 20;
  }
}

/** Reason the item can't be equipped by this character, or null if it can */
export function getEquipBlocker(item: InventoryItem, job: JobClass, baseLevel: number): string | null {
  if (item.type !== 'equip' || !item.slot) return 'ไอเทมนี้สวมใส่ไม่ได้';
  if (item.reqLevel && baseLevel < item.reqLevel) return `ต้องการ Base Lv.${item.reqLevel}`;
  if (item.jobs && item.jobs.length > 0 && !item.jobs.includes(job)) return `อาชีพ ${job} ใช้ไอเทมนี้ไม่ได้`;
  return null;
}

// ---------------------------------------------------------------------------
// Derived combat stats
// ---------------------------------------------------------------------------
export interface DerivedStats {
  totalStats: Stats;
  atk: number;
  matk: number;
  def: number;
  mdef: number;
  hit: number;
  flee: number;
  crit: number;
  aspdMs: number;
  maxHp: number;
  maxMp: number;
  weaponType: WeaponType;
  attackRange: number;
  attackKind: WeaponProfile['kind'];
}

type EquipHolder = {
  baseLevel: number;
  job: JobClass;
  stats: Stats;
  equipped: { [slot: string]: InventoryItem | undefined };
  blessingUntil?: number;
};

const JOB_HP_MOD: Record<JobClass, number> = {
  Novice: 1.0, Swordman: 1.25, Magician: 0.85, Archer: 0.95, Thief: 1.0, Acolyte: 1.05, Merchant: 1.15
};
const JOB_MP_MOD: Record<JobClass, number> = {
  Novice: 1.0, Swordman: 0.8, Magician: 1.5, Archer: 1.0, Thief: 0.9, Acolyte: 1.35, Merchant: 0.9
};

export function computeDerived(p: EquipHolder, now = Date.now()): DerivedStats {
  const bonus = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0, atk: 0, matk: 0, def: 0, crit: 0, hp: 0, mp: 0 };
  let weaponAtk = 0;
  let weaponMatk = 0;
  const weapon = p.equipped.weapon;

  for (const [slot, item] of Object.entries(p.equipped)) {
    if (!item?.effect) continue;
    const e = item.effect;
    if (slot === 'weapon') {
      weaponAtk += e.atk || 0;
      weaponMatk += e.matk || 0;
    } else {
      bonus.atk += e.atk || 0;
      bonus.matk += e.matk || 0;
    }
    bonus.str += e.str || 0; bonus.agi += e.agi || 0; bonus.vit += e.vit || 0;
    bonus.int += e.int || 0; bonus.dex += e.dex || 0; bonus.luk += e.luk || 0;
    bonus.def += e.def || 0; bonus.crit += e.crit || 0;
    bonus.hp += e.hp || 0; bonus.mp += e.mp || 0;
  }

  const s: Stats = {
    str: p.stats.str + bonus.str,
    agi: p.stats.agi + bonus.agi,
    vit: p.stats.vit + bonus.vit,
    int: p.stats.int + bonus.int,
    dex: p.stats.dex + bonus.dex,
    luk: p.stats.luk + bonus.luk
  };

  const weaponType = weapon ? inferWeaponType(weapon) : 'fist';
  const profile = WEAPON_PROFILES[weaponType];
  const blessed = (p.blessingUntil || 0) > now ? 1.1 : 1.0;

  const statusAtk = weaponType === 'bow'
    ? s.dex * 1.5 + s.str / 4
    : s.str * 1.5 + s.dex / 4;

  const atk = Math.floor((statusAtk + s.luk / 5 + weaponAtk + bonus.atk) * blessed);
  const matk = Math.floor((s.int * 2 + (s.int * s.int) / 50 + weaponMatk + bonus.matk) * blessed);
  const def = Math.floor((s.vit * 0.8 + bonus.def) * blessed);
  const mdef = Math.floor(s.int * 0.5 + s.vit * 0.2);
  const hit = p.baseLevel + s.dex;
  const flee = p.baseLevel + s.agi;
  const crit = Math.min(85, Math.floor(s.luk * 0.4 + bonus.crit));
  const aspdMs = Math.max(220, Math.floor((650 - s.agi * 4 - s.dex * 0.5) * profile.aspdMod));
  const maxHp = Math.floor((100 + p.baseLevel * 18 + s.vit * 12) * JOB_HP_MOD[p.job] + bonus.hp);
  const maxMp = Math.floor((40 + p.baseLevel * 6 + s.int * 8) * JOB_MP_MOD[p.job] + bonus.mp);

  return {
    totalStats: s, atk, matk, def, mdef, hit, flee, crit, aspdMs, maxHp, maxMp,
    weaponType, attackRange: profile.range, attackKind: profile.kind
  };
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------
export type SkillKind =
  | 'basic'       // weapon attack on the current target
  | 'melee'       // single target in melee reach
  | 'ranged'      // single target projectile
  | 'self_aoe'    // burst centred on the caster
  | 'ground_aoe'  // burst centred on the target
  | 'heal'        // restore caster HP
  | 'blink'       // teleport behind target and strike
  | 'utility';

export type SkillElement = 'neutral' | 'fire' | 'ice' | 'wind' | 'holy' | 'shadow' | 'earth';

export interface SkillDef {
  id: string;
  name: string;
  thaiName: string;
  jobs: JobClass[] | 'all';
  kind: SkillKind;
  element: SkillElement;
  mpCost: number;
  cooldownMs: number;
  multiplier: number;
  /** Max distance to the target in server units */
  range: number;
  /** AOE radius in server units */
  radius: number;
  hits?: number;
  useMatk?: boolean;
  zenyCost?: number;
  healPct?: number;
  freezeMs?: number;
  stunChance?: number;
  guaranteedCrit?: boolean;
  description: string;
}

export const SKILL_MAX_LEVEL = 10;

export const SKILL_DB: Record<string, SkillDef> = {
  NORMAL: {
    id: 'NORMAL', name: 'Attack', thaiName: 'โจมตีปกติ', jobs: 'all', kind: 'basic', element: 'neutral',
    mpCost: 0, cooldownMs: 0, multiplier: 1.0, range: 0, radius: 0,
    description: 'โจมตีด้วยอาวุธที่สวมใส่ — ธนูและคทายิงได้ระยะไกล มีดโจมตีเร็ว ดาบสองมือแรงแต่ช้า'
  },
  BASH: {
    id: 'BASH', name: 'Bash', thaiName: 'ทุบอย่างแรง', jobs: 'all', kind: 'melee', element: 'neutral',
    mpCost: 12, cooldownMs: 1400, multiplier: 2.5, range: 130, radius: 0, stunChance: 0.2,
    description: 'ฟาดศัตรูตรงหน้า 250% มีโอกาส 20% ทำให้มึนงง 1.5 วินาที'
  },
  FIRST_AID: {
    id: 'FIRST_AID', name: 'First Aid', thaiName: 'ปฐมพยาบาล', jobs: ['Novice'], kind: 'heal', element: 'holy',
    mpCost: 3, cooldownMs: 6000, multiplier: 0, range: 0, radius: 0, healPct: 0.12,
    description: 'พันแผลปฐมพยาบาลตัวเอง ฟื้นฟู HP 12% (ทักษะติดตัวของ Novice)'
  },
  RADIANT_SLASH: {
    id: 'RADIANT_SLASH', name: 'Radiant Slash', thaiName: 'ดาบแสงทะลวง', jobs: ['Swordman'], kind: 'self_aoe', element: 'holy',
    mpCost: 20, cooldownMs: 4000, multiplier: 2.4, range: 0, radius: 210,
    description: 'หมุนตัวฟันคลื่นแสงรอบตัว 240% ใส่ศัตรูทุกตัวในรัศมี'
  },
  SOLAR_AEGIS: {
    id: 'SOLAR_AEGIS', name: 'Solar Aegis', thaiName: 'โล่สุริยะ', jobs: ['Swordman'], kind: 'heal', element: 'holy',
    mpCost: 25, cooldownMs: 15000, multiplier: 0, range: 0, radius: 0, healPct: 0.25,
    description: 'ฟื้นฟู HP 25% และรับพรสุริยะ ATK/DEF +10% เป็นเวลา 20 วินาที'
  },
  ASTRAL_METEOR: {
    id: 'ASTRAL_METEOR', name: 'Astral Meteor', thaiName: 'ฝนดาวตก', jobs: ['Magician'], kind: 'ground_aoe', element: 'fire',
    mpCost: 35, cooldownMs: 6000, multiplier: 3.4, range: 380, radius: 170, useMatk: true,
    description: 'เรียกอุกกาบาตถล่มเป้าหมาย 340% MATK ใส่ศัตรูรอบจุดตก'
  },
  FROST_NOVA: {
    id: 'FROST_NOVA', name: 'Frost Nova', thaiName: 'แช่แข็ง', jobs: ['Magician'], kind: 'self_aoe', element: 'ice',
    mpCost: 22, cooldownMs: 5000, multiplier: 1.9, range: 0, radius: 200, useMatk: true, freezeMs: 2500,
    description: 'ระเบิดน้ำแข็งรอบตัว 190% MATK และแช่แข็งศัตรู 2.5 วินาที'
  },
  GALE_ARROW: {
    id: 'GALE_ARROW', name: 'Gale Arrow', thaiName: 'ศรวายุ', jobs: ['Archer'], kind: 'ranged', element: 'wind',
    mpCost: 16, cooldownMs: 1500, multiplier: 2.6, range: 440, radius: 0,
    description: 'ยิงศรพายุทะลวงเป้าหมายระยะไกล 260%'
  },
  RAIN_OF_LIGHT: {
    id: 'RAIN_OF_LIGHT', name: 'Rain of Light', thaiName: 'ฝนธนูแสง', jobs: ['Archer'], kind: 'ground_aoe', element: 'holy',
    mpCost: 28, cooldownMs: 6000, multiplier: 3.0, range: 420, radius: 180,
    description: 'ยิงศรขึ้นฟ้ากลายเป็นฝนแสงถล่มพื้นที่ 300%'
  },
  SHADOW_BLINK: {
    id: 'SHADOW_BLINK', name: 'Shadow Blink', thaiName: 'วาร์ปเงา', jobs: ['Thief'], kind: 'blink', element: 'shadow',
    mpCost: 25, cooldownMs: 5000, multiplier: 3.2, range: 360, radius: 0, guaranteedCrit: true,
    description: 'หายตัวไปโผล่ด้านหลังเป้าหมายแล้วแทงคริติคอล 100% (320%)'
  },
  BLADE_DANCE: {
    id: 'BLADE_DANCE', name: 'Blade Dance', thaiName: 'ระบำใบมีด', jobs: ['Thief'], kind: 'self_aoe', element: 'shadow',
    mpCost: 26, cooldownMs: 5000, multiplier: 0.95, range: 0, radius: 170, hits: 3,
    description: 'หมุนใบมีดรอบตัว 3 ฮิต ฮิตละ 95%'
  },
  SANCTUARY: {
    id: 'SANCTUARY', name: 'Sanctuary', thaiName: 'อาณาเขตศักดิ์สิทธิ์', jobs: ['Acolyte'], kind: 'self_aoe', element: 'holy',
    mpCost: 30, cooldownMs: 10000, multiplier: 2.2, range: 0, radius: 230, useMatk: true, healPct: 0.2,
    description: 'กางอาณาเขตแสง รักษาตนเองและเพื่อนรอบตัว 20% HP และเผาศัตรู 220% MATK'
  },
  JUDGMENT_FIST: {
    id: 'JUDGMENT_FIST', name: 'Judgment Fist', thaiName: 'หมัดพิพากษา', jobs: ['Acolyte'], kind: 'melee', element: 'holy',
    mpCost: 20, cooldownMs: 2500, multiplier: 2.7, range: 140, radius: 0, stunChance: 1,
    description: 'ต่อยด้วยพลังศักดิ์สิทธิ์ 270% ทำให้เป้าหมายมึนงงแน่นอน'
  },
  COIN_BURST: {
    id: 'COIN_BURST', name: 'Coin Burst', thaiName: 'ระเบิดเหรียญ', jobs: ['Merchant'], kind: 'self_aoe', element: 'neutral',
    mpCost: 15, cooldownMs: 3000, multiplier: 3.5, range: 0, radius: 240, zenyCost: 50,
    description: 'โปรยเหรียญระเบิดรอบตัว 350% (ใช้ 50 Zeny ต่อครั้ง)'
  },
  GREED_VACUUM: {
    id: 'GREED_VACUUM', name: 'Greed Vacuum', thaiName: 'ดูดทรัพย์', jobs: ['Merchant'], kind: 'utility', element: 'neutral',
    mpCost: 10, cooldownMs: 8000, multiplier: 0, range: 0, radius: 650,
    description: 'ดูดไอเทมและเงินทั้งหมดในรัศมีกว้างเข้ากระเป๋า'
  }
};

/** Hotbar layout: Z = NORMAL, X = BASH, 4/5 = job skills (null = empty slot) */
export const JOB_SKILL_BAR: Record<JobClass, [string, string | null]> = {
  Novice:   ['FIRST_AID', null],
  Swordman: ['RADIANT_SLASH', 'SOLAR_AEGIS'],
  Magician: ['ASTRAL_METEOR', 'FROST_NOVA'],
  Archer:   ['GALE_ARROW', 'RAIN_OF_LIGHT'],
  Thief:    ['SHADOW_BLINK', 'BLADE_DANCE'],
  Acolyte:  ['SANCTUARY', 'JUDGMENT_FIST'],
  Merchant: ['COIN_BURST', 'GREED_VACUUM']
};

export function canUseSkill(skill: SkillDef, job: JobClass): boolean {
  return skill.jobs === 'all' || skill.jobs.includes(job);
}

export function getJobSkills(job: JobClass): SkillDef[] {
  return Object.values(SKILL_DB).filter(s => canUseSkill(s, job));
}

/** Damage multiplier from skill level: +12% per level above 1 */
export function skillLevelBonus(level: number): number {
  return 1 + (Math.max(1, level) - 1) * 0.12;
}

// ---------------------------------------------------------------------------
// Monster AI profiles
// ---------------------------------------------------------------------------
export interface MonsterAiProfile {
  aggressive: boolean;
  moveSpeed: number;       // server units per second
  aggroRange: number;
  attackRange: number;
  attackCooldownMs: number;
}

const PASSIVE_MOBS: MonsterType[] = ['Sunbun', 'Poring', 'Leafkin', 'Fabre', 'Spore'];
const BOSS_MOBS: MonsterType[] = ['BaphometJr', 'Solarion', 'LordBaphomet', 'Valkyrie'];

export function isBossMonster(type: MonsterType): boolean {
  return BOSS_MOBS.includes(type);
}

export function getMonsterAiProfile(type: MonsterType): MonsterAiProfile {
  if (BOSS_MOBS.includes(type)) {
    return { aggressive: true, moveSpeed: 150, aggroRange: 420, attackRange: 150, attackCooldownMs: 1300 };
  }
  if (PASSIVE_MOBS.includes(type)) {
    // Zone 1 critters only fight back when hit (Ragnarok-style passive mobs)
    return { aggressive: false, moveSpeed: 120, aggroRange: 0, attackRange: 95, attackCooldownMs: 1800 };
  }
  return { aggressive: true, moveSpeed: 135, aggroRange: 300, attackRange: 110, attackCooldownMs: 1600 };
}

// ---------------------------------------------------------------------------
// Quests (progress and rewards are tracked by the server)
// ---------------------------------------------------------------------------
export interface QuestDef {
  id: string;
  title: string;
  /** 'active' = one-time story quest, 'daily' = repeatable every 24h */
  category: 'active' | 'daily';
  description: string;
  /** Any of these monsters counts toward the goal */
  targets: MonsterType[];
  requiredKills: number;
  rewardExp: number;
  rewardJobExp: number;
  rewardZeny: number;
  rewardItems: Array<{ defId: string; qty: number }>;
}

export const DAILY_QUEST_RESET_MS = 24 * 60 * 60 * 1000;

export const QUEST_DB: QuestDef[] = [
  {
    id: 'q_sunbun', title: 'บททดสอบแห่งสุริยะ', category: 'active',
    description: 'กำจัด Sunbun หรือ Poring ที่วิ่งซุกซนรอบเมือง Solaria',
    targets: ['Sunbun', 'Poring'], requiredKills: 5,
    rewardExp: 150, rewardJobExp: 120, rewardZeny: 250, rewardItems: [{ defId: 'orange_potion', qty: 3 }]
  },
  {
    id: 'q_leafkin', title: 'ผู้พิทักษ์พฤกษา', category: 'active',
    description: 'ปราบ Leafkin หรือ Fabre ภูตใบไม้ที่ซุกซนบนต้นไม้มรกต',
    targets: ['Leafkin', 'Fabre'], requiredKills: 4,
    rewardExp: 350, rewardJobExp: 280, rewardZeny: 450, rewardItems: [{ defId: 'red_potion', qty: 5 }]
  },
  {
    id: 'q_aethercap', title: 'ละอองเวทมนตร์สีคราม', category: 'daily',
    description: 'กำจัด Aethercap หรือ Spore เห็ดเรืองแสงในป่าเอเธอร์',
    targets: ['Aethercap', 'Spore'], requiredKills: 3,
    rewardExp: 750, rewardJobExp: 600, rewardZeny: 900, rewardItems: [{ defId: 'blue_potion', qty: 3 }]
  },
  {
    id: 'q_gryphlet', title: 'ผู้สยบอินทรีทอง', category: 'daily',
    description: 'ประลองยุทธ์กับ Gryphlet ลูกกริฟฟอนขนนกทองคำ',
    targets: ['Gryphlet'], requiredKills: 2,
    rewardExp: 1400, rewardJobExp: 1100, rewardZeny: 1800, rewardItems: [{ defId: 'white_potion', qty: 2 }]
  },
  {
    id: 'q_solarion', title: 'ศึกอวสานสุริยคราส [MVP]', category: 'daily',
    description: 'บุกเข้าสู่ปราสาทคราสทมิฬและปราบเทพอสูร Solarion',
    targets: ['Solarion'], requiredKills: 1,
    rewardExp: 8000, rewardJobExp: 7000, rewardZeny: 15000, rewardItems: [{ defId: 'solar_scythe', qty: 1 }]
  }
];

/** Current state of a quest for a character, applying the daily reset */
export function getQuestState(def: QuestDef, progress: { kills: number; claimedAt?: number } | undefined, now = Date.now()) {
  if (!progress) return { kills: 0, completed: false, claimed: false };
  if (def.category === 'daily' && progress.claimedAt && now - progress.claimedAt >= DAILY_QUEST_RESET_MS) {
    return { kills: 0, completed: false, claimed: false };
  }
  const kills = Math.min(def.requiredKills, progress.kills);
  return { kills, completed: kills >= def.requiredKills, claimed: Boolean(progress.claimedAt) };
}

// ---------------------------------------------------------------------------
// NPCs & Shops
// ---------------------------------------------------------------------------
export type NpcAction =
  | 'LORE' | 'QUEST' | 'STARTER_GIFT'
  | 'OPEN_REFINE' | 'REFINE_INFO'
  | 'HEAL_FULL' | 'BLESSING' | 'SANCTUARY_LORE'
  | 'OPEN_SHOP' | 'FREE_POTIONS' | 'MARKET_NEWS'
  | 'OPEN_JOB' | 'OPEN_SKILLS' | 'WEAPON_TIPS'
  | 'WARP';

export interface NpcOption {
  label: string;
  action: NpcAction;
  icon: string;
  /** Extra argument, e.g. the zone id for WARP */
  param?: string;
}

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  badge: string;
  /** 3D world position */
  x: number;
  z: number;
  facing: number;
  modelId: string;
  robeColor: number;
  greeting: string;
  shopId?: string;
  options: NpcOption[];
}

/** NPC actions resolved by the server (the rest only open client windows) */
export const SERVER_NPC_ACTIONS: NpcAction[] = ['STARTER_GIFT', 'HEAL_FULL', 'BLESSING', 'FREE_POTIONS', 'WARP'];

/** Max distance (server units) between player and NPC for server-side actions */
export const NPC_INTERACT_RANGE = 260;

export const WARP_COSTS: Record<string, number> = {
  solaria_meadows: 0,
  aetherwoods: 300,
  mirage_dunes: 800,
  catacombs: 1500,
  magma_core: 2500,
  celestial_void: 4000
};

export const SHOPS: Record<string, { title: string; items: string[] }> = {
  shop_supplies: {
    title: '🎒 ร้านเสบียงของ Cindy',
    items: ['red_potion', 'orange_potion', 'white_potion', 'blue_potion', 'mana_elixir']
  },
  shop_arms: {
    title: '⚔️ คลังอาวุธของ Garrick',
    items: [
      'cutter', 'iron_sword', 'club', 'wooden_rod', 'hunter_bow', 'pike',
      'stiletto', 'falchion', 'battle_axe', 'arc_wand', 'holy_rod', 'composite_bow', 'morning_star',
      'claymore', 'gladius', 'crystal_staff', 'buster', 'gakkung'
    ]
  },
  shop_armor: {
    title: '🛡️ ร้านชุดเกราะของ Garrick',
    items: ['cotton_shirt', 'adventure_suit', 'mage_coat', 'chain_mail', 'bandana', 'iron_helm', 'sandals', 'wind_boots', 'power_ring', 'sage_clip', 'lucky_rosary']
  }
};

export const NPC_DEFS: NpcDef[] = [
  {
    id: 'npc_eldrin',
    name: 'ผู้เฒ่า Eldrin',
    role: 'ผู้นำหมู่บ้าน Solaria',
    badge: '👑 เควส & แนะนำ',
    x: -18, z: -3.8, facing: Math.PI * 0.15,
    modelId: 'npc_elder', robeColor: 0x2b2d42,
    greeting: 'ยินดีต้อนรับสู่อาณาจักร Aethergard หนุ่มสาวผู้กล้า! ข้าคือผู้เฒ่า Eldrin ผู้เฝ้ามองดินแดนแห่งนี้มานานนับร้อยปี เจ้าพร้อมจะออกผจญภัยหรือยัง?',
    options: [
      { label: 'ขอรับคำแนะนำสำหรับผู้เริ่มต้น', action: 'LORE', icon: '📜' },
      { label: 'เปิดสมุดบันทึกเควส (Quest Journal)', action: 'QUEST', icon: '📖' },
      { label: 'ขอพรเริ่มต้นการเดินทาง (+500 EXP, ครั้งเดียว)', action: 'STARTER_GIFT', icon: '🎁' }
    ]
  },
  {
    id: 'npc_bronn',
    name: 'ช่างตีเหล็ก Bronn',
    role: 'ช่างหลอมศิลาเทพ',
    badge: '🔨 ตีบวกอุปกรณ์',
    x: -6, z: 4.2, facing: -Math.PI * 0.8,
    modelId: 'npc_blacksmith', robeColor: 0x6a040f,
    greeting: 'มองหาความแข็งแกร่งงั้นเรอะ? ข้าชื่อ Bronn ไม่ว่าดาบหรือเกราะของเจ้าจะทื่อแค่ไหน เตาหลอมเวทมนตร์ของข้าจะตีบวกให้มันคมกริบ!',
    options: [
      { label: 'เปิดเตาหลอมตีบวกอุปกรณ์ [Refine System]', action: 'OPEN_REFINE', icon: '🔥' },
      { label: 'สอบถามอัตราความสำเร็จของการตีบวก', action: 'REFINE_INFO', icon: '📊' }
    ]
  },
  {
    id: 'npc_garrick',
    name: 'พ่อค้าอาวุธ Garrick',
    role: 'คลังอาวุธแห่ง Solaria',
    badge: '⚔️ อาวุธ & เกราะ',
    x: -12, z: 5.5, facing: -Math.PI * 0.9,
    modelId: 'npc_weaponsmith', robeColor: 0x374151,
    greeting: 'ดาบ ธนู คทา ขวาน — ของข้ามีครบทุกสายอาชีพ! อาวุธแต่ละแบบเล่นไม่เหมือนกันนะ ธนูกับคทายิงได้ไกล มีดโจมตีไว ส่วนดาบสองมือน่ะ... ช้าแต่หนักหน่วง',
    shopId: 'shop_arms',
    options: [
      { label: 'ซื้อ/ขาย อาวุธ', action: 'OPEN_SHOP', icon: '⚔️', param: 'shop_arms' },
      { label: 'ซื้อ/ขาย ชุดเกราะและเครื่องประดับ', action: 'OPEN_SHOP', icon: '🛡️', param: 'shop_armor' },
      { label: 'อาวุธแบบไหนเหมาะกับข้า?', action: 'WEAPON_TIPS', icon: '💡' }
    ]
  },
  {
    id: 'npc_lyanna',
    name: 'นักบวชหญิง Lyanna',
    role: 'นักบวชสูงสุดแห่งแสง',
    badge: '🕊️ ฟื้นฟู HP/MP 100%',
    x: 6, z: -4.2, facing: Math.PI * 0.2,
    modelId: 'npc_priestess', robeColor: 0x0077b6,
    greeting: 'ขอแสงสว่างแห่งดวงดาวจงปกป้องท่าน บาดเจ็บหรือเหนื่อยล้าจากการต่อสู้ใช่ไหม? ให้ข้าช่วยชำระล้างบาดแผลและฟื้นฟูพลังเวทให้ท่านเถิด...',
    options: [
      { label: 'ขอรับการรักษาเต็มพิกัด (Full Heal HP/MP 100%)', action: 'HEAL_FULL', icon: '💖' },
      { label: 'ขอรับพรออร่าศักดิ์สิทธิ์ (ATK/DEF +10% 3 นาที)', action: 'BLESSING', icon: '🌟' },
      { label: 'เรียนรู้เกี่ยวกับวิหารแห่งแสง', action: 'SANCTUARY_LORE', icon: '🏛️' }
    ]
  },
  {
    id: 'npc_cindy',
    name: 'แม่ค้าเร่ Cindy',
    role: 'พานิชย์สากล',
    badge: '🎒 ยา & เสบียง',
    x: 16, z: 4.2, facing: -Math.PI * 0.75,
    modelId: 'char_michelle', robeColor: 0xf77f00,
    greeting: 'เร่เข้ามาจ้า! น้ำยาฟื้นฟูชั้นดีจากต่างแดน ราคามิตรภาพสำหรับนักผจญภัยทุกคน! ของที่เก็บมาจากมอนสเตอร์ก็เอามาขายให้ป้าได้นะจ๊ะ',
    shopId: 'shop_supplies',
    options: [
      { label: 'ซื้อ/ขาย น้ำยาและเสบียง', action: 'OPEN_SHOP', icon: '🧪', param: 'shop_supplies' },
      { label: 'รับชุดน้ำยาเดินทางฟรี (Red x10, Blue x5, ครั้งเดียว)', action: 'FREE_POTIONS', icon: '🎁' },
      { label: 'ดูข่าวสารการค้าสากล', action: 'MARKET_NEWS', icon: '📈' }
    ]
  },
  {
    id: 'npc_kaelen',
    name: 'ครูฝึก Kaelen',
    role: 'ผู้ฝึกสอนสายอาชีพ',
    badge: '🎓 อาชีพ & สกิล',
    x: 10, z: 5.8, facing: -Math.PI * 0.85,
    modelId: 'npc_trainer', robeColor: 0x9d0208,
    greeting: 'ร่างกายแข็งแกร่งยังไม่พอ ต้องมีเทคนิคด้วย! เมื่อ Base Lv.10 และ Job Lv.10 ข้าจะเลื่อนขั้นอาชีพให้เจ้า และแต้มสกิลทุกแต้มควรใช้ให้คุ้มค่า',
    options: [
      { label: 'เปลี่ยนอาชีพ (Job Change)', action: 'OPEN_JOB', icon: '🎓' },
      { label: 'อัปเกรดสกิล (Skill Tree)', action: 'OPEN_SKILLS', icon: '📜' }
    ]
  },
  {
    id: 'npc_sera',
    name: 'ผู้พิทักษ์ประตูมิติ Sera',
    role: 'บริการวาร์ปข้ามโซน',
    badge: '🌀 วาร์ปโซน',
    x: -24, z: 4.5, facing: -Math.PI * 0.6,
    modelId: 'procedural', robeColor: 0x00b4d8,
    greeting: 'ประตูมิติพร้อมแล้ว ท่านนักเดินทาง จะไปที่ใดดี? ยิ่งไกลค่าเดินทางยิ่งสูงนะ',
    options: [
      { label: 'Solaria Meadows (ฟรี)', action: 'WARP', icon: '🌾', param: 'solaria_meadows' },
      { label: 'Aetherwoods Lv.15+ (300 Z)', action: 'WARP', icon: '🌲', param: 'aetherwoods' },
      { label: 'Mirage Dunes Lv.35+ (800 Z)', action: 'WARP', icon: '🏜️', param: 'mirage_dunes' },
      { label: 'Cursed Catacombs Lv.55+ (1,500 Z)', action: 'WARP', icon: '💀', param: 'catacombs' },
      { label: 'Magma Core Lv.75+ (2,500 Z)', action: 'WARP', icon: '🌋', param: 'magma_core' },
      { label: 'Celestial Void Lv.90+ (4,000 Z)', action: 'WARP', icon: '✨', param: 'celestial_void' }
    ]
  }
];

export function getNpcDef(id: string): NpcDef | undefined {
  return NPC_DEFS.find(n => n.id === id);
}
