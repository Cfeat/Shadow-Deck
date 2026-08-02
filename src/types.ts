// --- Card Types ---

export type CardType = "ATTACK" | "SKILL" | "POWER";
export type CardRarity = "COMMON" | "RARE" | "LEGENDARY";

export interface Card {
  id: string;
  instanceId?: string;
  name: string;
  type: CardType;
  cost: number;
  value: number;
  description: string;
  rarity: CardRarity;
  exhaust?: boolean;
  upgraded?: boolean;
  /** Override value when upgraded (default: value * 1.4) */
  upgradeValue?: number;
  /** Override description when upgraded (default: numbers * 1.4) */
  upgradedDescription?: string;
  /** POWER cards: effect applied when played */
  powerEffect?: PowerEffect;
}

export interface PowerEffect {
  type: "STRENGTH" | "VULNERABLE" | "WEAK" | "BLOCK" | "DRAW" | "ENERGY" | "HEAL";
  value: number;
  target: "SELF" | "ENEMY";
}

// --- Entity Types ---

export interface Entity {
  maxHp: number;
  currentHp: number;
  block: number;
  vulnerable: number;
  weak: number;
}

export interface Player extends Entity {
  energy: number;
  maxEnergy: number;
  gold: number;
  strength: number;
}

export interface Enemy extends Entity {
  name: string;
  intent: EnemyIntentType;
  intentValue: number;
  imageEmoji: string;
  isBoss: boolean;
  minDmg: number;
  maxDmg: number;
  strength: number;
  /** Boss special move pattern */
  pattern?: EnemyPattern[];
  patternIndex?: number;
}

export type EnemyIntentType = "ATTACK" | "DEFEND" | "BUFF" | "UNKNOWN" | "SPECIAL";

export interface EnemyPattern {
  intent: EnemyIntentType;
  value: number;
  description?: string;
}

// --- Relic Types ---

export type RelicRarity = "COMMON" | "RARE" | "BOSS";
export type RelicTrigger = "ON_COMBAT_START" | "ON_COMBAT_END" | "ON_TURN_START" | "ON_DAMAGE_DEALT" | "ON_DAMAGE_TAKEN" | "ON_CARD_PLAY" | "PASSIVE";

export interface Relic {
  id: string;
  name: string;
  description: string;
  rarity: RelicRarity;
  trigger: RelicTrigger;
  effectValue: number;
  emoji: string;
}

// --- Potion Types ---

export type PotionTarget = "SELF" | "ENEMY";

export interface Potion {
  id: string;
  name: string;
  description: string;
  effectType: "HEAL" | "BLOCK" | "DAMAGE" | "ENERGY" | "STRENGTH" | "DRAW";
  effectValue: number;
  target: PotionTarget;
  emoji: string;
  rarity: "COMMON" | "UNCOMMON" | "RARE";
}

// --- Shop Types ---

export interface ShopItem {
  type: "CARD" | "POTION" | "RELIC" | "CARD_REMOVE";
  card?: Card;
  potion?: Potion;
  relic?: Relic;
  price: number;
  sold?: boolean;
}

// --- Map Types ---

export type NodeType = "BATTLE" | "EVENT" | "REST" | "SHOP" | "BOSS" | "TREASURE";

export interface MapNode {
  type: NodeType;
  label: string;
  icon: string;
  locked?: boolean;
}

// --- Game Types ---

export type GamePhase = "MENU" | "BLESSING" | "MAP" | "BATTLE" | "EVENT" | "REWARD" | "REST" | "SHOP" | "GAME_OVER" | "VICTORY";

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size?: string;
}

export interface BattleState {
  draw: Card[];
  hand: Card[];
  discard: Card[];
  exhaust: Card[];
}

export interface SaveGameState {
  phase: GamePhase;
  floor: number;
  player: Player;
  deck: Card[];
  relics: Relic[];
  potions: Potion[];
  battleState?: BattleState;
  enemy?: Enemy | null;
  turn?: number;
  barricadeActive?: boolean;
  omegaCount?: number;
  demonFormStrength?: number;
  ruptureActive?: boolean;
  nextAttackDouble?: boolean;
  towerFloors?: any[][];
  currentNodeId?: string;
}

export interface GameEventChoice {
  text: string;
  effectType: "HEAL" | "DAMAGE" | "GOLD" | "MAX_HP" | "REMOVE_CARD" | "GAIN_RELIC" | "UPGRADE_RANDOM" | "GAIN_POTION";
  value: number;
  description: string;
}

export interface GameEvent {
  title: string;
  description: string;
  effectType: "HEAL" | "DAMAGE" | "GOLD" | "CURSE" | "RELIC" | "CARD_TRANSFORM";
  value: number;
  buttonText: string;
  choices?: GameEventChoice[]; // If present, player chooses; otherwise auto-apply
}

// --- Constants ---

export const MAX_ENERGY = 3;
export const HAND_SIZE = 5;
export const MAX_HAND_SIZE = 10;
export const MAX_POTIONS = 3;
export const FINAL_BOSS_FLOOR = 15;
export const BOSS_INTERVAL = 5;
