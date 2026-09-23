export type JobClass = 
  | 'Novice' 
  | 'Swordman' 
  | 'Magician' 
  | 'Archer' 
  | 'Thief' 
  | 'Acolyte' 
  | 'Merchant';

export interface Stats {
  str: number;
  agi: number;
  vit: number;
  int: number;
  dex: number;
  luk: number;
}

export type WeaponType =
  | 'dagger'
  | 'sword'
  | 'greatsword'
  | 'spear'
  | 'axe'
  | 'mace'
  | 'staff'
  | 'rod'
  | 'bow'
  | 'scythe'
  | 'fist';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface InventoryItem {
  id: string;
  /** Key into ITEM_DB (GameData.ts) when the item comes from the database */
  defId?: string;
  name: string;
  type: 'equip' | 'usable' | 'etc' | 'card';
  icon: string;
  quantity: number;
  slot?: 'weapon' | 'head' | 'armor' | 'shoes' | 'accessory';
  cardSlots?: number;
  socketedCards?: string[];
  refine?: number;
  weaponType?: WeaponType;
  rarity?: ItemRarity;
  reqLevel?: number;
  jobs?: JobClass[];
  description: string;
  effect?: {
    hp?: number;
    mp?: number;
    atk?: number;
    matk?: number;
    def?: number;
    str?: number;
    agi?: number;
    vit?: number;
    int?: number;
    dex?: number;
    luk?: number;
    crit?: number;
  };
}

export interface Account {
  id: string;
  username: string;
  displayName: string;
  provider: 'guest' | 'local' | 'google' | 'facebook';
  role?: 'user' | 'gm' | 'admin';
  passwordHash?: string;
  guestSecretHash?: string;
  createdAt: string;
}

export interface CharacterModel {
  id: string;
  accountId: string;
  slot: number;
  name: string;
  job: JobClass;
  gender: 'male' | 'female';
  hairStyle: number;
  hairColor: string;
  baseLevel: number;
  jobLevel: number;
  baseExp: number;
  maxBaseExp: number;
  jobExp: number;
  maxJobExp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stats: Stats;
  statPoints: number;
  skillPoints: number;
  zeny: number;
  x: number;
  y: number;
  z?: number;
  facing: 'left' | 'right';
  equipped: {
    weapon?: InventoryItem;
    head?: InventoryItem;
    armor?: InventoryItem;
    shoes?: InventoryItem;
    accessory?: InventoryItem;
  };
  inventory: InventoryItem[];
  skillLevels?: { [skillId: string]: number };
  /** One-time NPC rewards already claimed, e.g. { starter_gift: true } */
  flags?: { [flag: string]: boolean };
  questProgress?: QuestProgressMap;
  activePet?: PetData | null;
  currentZone?: ZoneId;
  isGm?: boolean;
  isGodMode?: boolean;
  speedMultiplier?: number;
  createdAt: string;
  lastLoginAt: string;
}

export interface PlayerData {
  id: string;
  accountId?: string;
  characterId?: string;
  name: string;
  job: JobClass;
  gender?: 'male' | 'female';
  hairStyle?: number;
  hairColor?: string;
  role?: 'user' | 'gm' | 'admin';
  isGm?: boolean;
  isGodMode?: boolean;
  speedMultiplier?: number;
  baseLevel: number;
  jobLevel: number;
  baseExp: number;
  maxBaseExp: number;
  jobExp: number;
  maxJobExp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stats: Stats;
  statPoints: number;
  skillPoints: number;
  zeny: number;
  x: number;
  y: number;
  z?: number;
  vx: number;
  vy: number;
  vz?: number;
  rotY?: number;
  facing: 'left' | 'right';
  anim: 'idle' | 'walk' | 'jump' | 'attack' | 'dead';
  isGrounded: boolean;
  lastProcessedSeq: number;
  isDead?: boolean;
  /** '3d' once the client has sent a POS_SYNC_3D; combat then uses x/z distance */
  viewMode?: '2d' | '3d';
  flags?: { [flag: string]: boolean };
  questProgress?: QuestProgressMap;
  blessingUntil?: number;
  lastCombatAt?: number;
  equipped: {
    weapon?: InventoryItem;
    head?: InventoryItem;
    armor?: InventoryItem;
    shoes?: InventoryItem;
    accessory?: InventoryItem;
  };
  inventory: InventoryItem[];
  skillLevels?: { [skillId: string]: number };
  activePet?: PetData | null;
  currentZone?: ZoneId;
}

export interface InputPacket {
  seq: number;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  dt: number;
  z?: number;
  vz?: number;
  rotY?: number;
}

export interface ServerSnapshot {
  timestamp: number;
  lastAckSeq: number;
  x: number;
  y: number;
  z?: number;
  vx: number;
  vy: number;
  vz?: number;
  rotY?: number;
  isGrounded: boolean;
  facing: 'left' | 'right';
  anim: 'idle' | 'walk' | 'jump' | 'attack' | 'dead';
  players: Array<{
    id: string;
    name: string;
    job: JobClass;
    baseLevel: number;
    isGm?: boolean;
    x: number;
    y: number;
    z?: number;
    vx: number;
    vy: number;
    vz?: number;
    rotY?: number;
    facing: 'left' | 'right';
    anim: 'idle' | 'walk' | 'jump' | 'attack' | 'dead';
    hp?: number;
    maxHp?: number;
    gender?: 'male' | 'female';
    hairColor?: string;
    weaponType?: WeaponType;
    weaponRefine?: number;
    weaponRarity?: ItemRarity;
    weaponExcalibur?: boolean;
    isDead?: boolean;
  }>;
  monsters: Array<{
    id: string;
    type: MonsterType;
    name: string;
    level: number;
    x: number;
    y: number;
    z?: number;
    rotY?: number;
    hp: number;
    maxHp: number;
    facing: 'left' | 'right';
    isDead: boolean;
    state?: MonsterAiState;
    targetId?: string;
    frozen?: boolean;
  }>;
}

export type MonsterAiState = 'patrol' | 'chase' | 'attack' | 'return';

export type MonsterType = 
  // Zone 1: Solaria Meadows (Lv 1 - 15)
  | 'Sunbun'
  | 'Poring' 
  | 'Leafkin' 
  | 'Fabre' 
  | 'Spore' 
  // Zone 2: Whispering Aetherwoods (Lv 15 - 35)
  | 'Aethercap'
  | 'Gryphlet'
  | 'PecoPeco'
  | 'ForestBoar'
  | 'WildWolf'
  // Zone 3: Mirage Dunes & Ant Hell (Lv 35 - 55)
  | 'DesertScorpion'
  | 'SandGolem'
  | 'MummyPharaoh'
  | 'RedDemon'
  // Zone 4: Cursed Catacombs (Lv 55 - 75)
  | 'SkeletonSoldier'
  | 'WraithPhantom'
  | 'DarkGargoyle'
  // Zone 5: Magma Core (Lv 75 - 90)
  | 'FireSalamander'
  | 'LavaGolem'
  | 'NightmareSteed'
  // Zone 6: Celestial Void & MVPs (Lv 90 - 99+)
  | 'Archangel'
  | 'BaphometJr'
  | 'Solarion'
  | 'LordBaphomet'
  | 'Valkyrie';

export type ZoneId = 
  | 'solaria_meadows'
  | 'aetherwoods'
  | 'mirage_dunes'
  | 'catacombs'
  | 'magma_core'
  | 'celestial_void';

export interface ZoneDef {
  id: ZoneId;
  name: string;
  thaiName: string;
  levelRange: string;
  description: string;
  startX: number;
  endX: number;
  spawnPoint: { x: number; y: number };
  monsters: MonsterType[];
  themeColor: string;
}

export interface PetData {
  id: string;
  name: string;
  type: 'sunbun' | 'poring' | 'gryphon' | 'dragon';
  level: number;
  autoLoot: boolean;
  buff: {
    speedBoost?: number;
    atkBoost?: number;
    expBonus?: number;
  };
}

export interface QuestDef {
  id: string;
  title: string;
  category: 'active' | 'daily' | 'completed';
  description: string;
  targetMob: MonsterType;
  requiredKills: number;
  rewardExp: number;
  rewardJobExp: number;
  rewardZeny: number;
  rewardItem?: string;
}

/** Server-tracked quest state per character: kills so far and when it was claimed */
export type QuestProgressMap = { [questId: string]: { kills: number; claimedAt?: number } };

export interface UserQuestProgress {
  questId: string;
  currentKills: number;
  completed: boolean;
  claimed: boolean;
}

export interface MonsterData {
  id: string;
  type: MonsterType;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 'left' | 'right';
  hp: number;
  maxHp: number;
  level: number;
  exp: number;
  jobExp: number;
  atk: number;
  def: number;
  isDead: boolean;
  targetPlayerId?: string;
  patrolMinX: number;
  patrolMaxX: number;
  z?: number;
  rotY?: number;
  state?: MonsterAiState;
  aggressive?: boolean;
  moveSpeed?: number;
  aggroRange?: number;
  attackRange?: number;
  attackCooldownMs?: number;
  lastAttackAt?: number;
  frozenUntil?: number;
  homeZ?: number;
}

export interface DropItemData {
  id: string;
  name: string;
  type: 'zeny' | 'usable' | 'etc' | 'card' | 'equip';
  icon: string;
  amount: number;
  x: number;
  y: number;
  z?: number;
  vy: number;
  groundY: number;
  itemData?: Partial<InventoryItem>;
}

export interface ChatMessage {
  sender: string;
  text: string;
  channel: 'all' | 'system' | 'party' | 'whisper';
  time: string;
}

export interface DamageEvent {
  targetId: string;
  isPlayer: boolean;
  damage: number;
  isCrit: boolean;
  isMiss: boolean;
  x: number;
  y: number;
}

export interface ServerAnnouncement {
  id: string;
  message: string;
  sender: string;
  time: string;
  style?: 'gold' | 'crimson' | 'emerald' | 'cyan';
}

export interface AdminActionPacket {
  action: 'BROADCAST' | 'SPAWN_MOB' | 'KILL_ALL' | 'HEAL_ALL' | 'GIVE_ZENY' | 'GIVE_ITEM' | 'TOGGLE_GOD' | 'SET_SPEED' | 'KICK_PLAYER';
  data?: any;
}

export interface AiPatchRecord {
  id: string;
  timestamp: string;
  category: 'BUG_FIX' | 'BALANCE_TUNING' | 'META_EVOLUTION' | 'ANOMALY_HEALING' | 'SECURITY';
  description: string;
  target: string;
  reason: string;
  status: 'APPLIED' | 'ACTIVE';
}

export interface AiThought {
  time: string;
  source: 'GLOBAL_META' | 'ANOMALY_SENTINEL' | 'BALANCE_CALIBRATOR' | 'SECURITY_CORE';
  text: string;
}

export interface AiNeuralState {
  status: 'ONLINE' | 'ANALYZING' | 'EVOLVING' | 'PATCHING';
  version: string;
  learningProgress: number;
  cyclesCompleted: number;
  activeEvent: string | null;
  activeEventBuff: string | null;
  anomalyScore: number;
  recentThoughts: AiThought[];
  patches: AiPatchRecord[];
  globalMetaTrend: string;
}

export interface AiActionPacket {
  action: 'RUN_DIAGNOSTICS' | 'TRIGGER_EVOLUTION' | 'GET_STATE';
}

