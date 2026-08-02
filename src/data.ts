import { Card, CardType, Enemy, EnemyPattern, GameEvent, Relic, Potion, MapNode } from "./types";

// ============ CARDS ============

export const STARTING_DECK: Card[] = [
  { id: "strike", name: "Strike", type: "ATTACK", cost: 1, value: 6, description: "Deal 6 DMG.", rarity: "COMMON" },
  { id: "strike", name: "Strike", type: "ATTACK", cost: 1, value: 6, description: "Deal 6 DMG.", rarity: "COMMON" },
  { id: "strike", name: "Strike", type: "ATTACK", cost: 1, value: 6, description: "Deal 6 DMG.", rarity: "COMMON" },
  { id: "strike", name: "Strike", type: "ATTACK", cost: 1, value: 6, description: "Deal 6 DMG.", rarity: "COMMON" },
  { id: "defend", name: "Defend", type: "SKILL", cost: 1, value: 5, description: "Gain 5 Block.", rarity: "COMMON" },
  { id: "defend", name: "Defend", type: "SKILL", cost: 1, value: 5, description: "Gain 5 Block.", rarity: "COMMON" },
  { id: "defend", name: "Defend", type: "SKILL", cost: 1, value: 5, description: "Gain 5 Block.", rarity: "COMMON" },
  { id: "defend", name: "Defend", type: "SKILL", cost: 1, value: 5, description: "Gain 5 Block.", rarity: "COMMON" },
  { id: "bash", name: "Bash", type: "ATTACK", cost: 2, value: 8, description: "Deal 8 DMG. Apply 2 Vulnerable.", rarity: "COMMON", upgradedDescription: "Deal 11 DMG. Apply 3 Vulnerable." },
];

export const CARD_POOL: Card[] = [
  // === COMMON ATTACKS ===
  { id: "heavy-blade", name: "Heavy Blade", type: "ATTACK", cost: 2, value: 14, description: "Deal 14 DMG. Strength ×3.", rarity: "COMMON", upgradedDescription: "Deal 19 DMG. Strength ×5." },
  { id: "iron-wave", name: "Iron Wave", type: "ATTACK", cost: 1, value: 5, description: "Deal 5 DMG. Gain 5 Block.", rarity: "COMMON", upgradedDescription: "Deal 7 DMG. Gain 7 Block." },
  { id: "pommel", name: "Pommel Strike", type: "ATTACK", cost: 1, value: 9, description: "Deal 9 DMG. Draw 1 card.", rarity: "COMMON", upgradedDescription: "Deal 12 DMG. Draw 2 cards." },
  { id: "twin-strike", name: "Twin Strike", type: "ATTACK", cost: 1, value: 5, description: "Deal 5 DMG twice.", rarity: "COMMON" },
  { id: "cleave", name: "Cleave", type: "ATTACK", cost: 1, value: 8, description: "Deal 8 DMG.", rarity: "COMMON" },
  { id: "clothesline", name: "Clothesline", type: "ATTACK", cost: 2, value: 12, description: "Deal 12 DMG. Apply 1 Weak.", rarity: "COMMON", upgradedDescription: "Deal 16 DMG. Apply 2 Weak." },
  { id: "sword-boomerang", name: "Sword Boomerang", type: "ATTACK", cost: 1, value: 3, description: "Deal 3 DMG 3 times.", rarity: "COMMON", upgradeValue: 4, upgradedDescription: "Deal 4 DMG 4 times." },
  { id: "anger", name: "Anger", type: "ATTACK", cost: 0, value: 6, description: "Deal 6 DMG.", rarity: "COMMON" },
  { id: "headbutt", name: "Headbutt", type: "ATTACK", cost: 1, value: 9, description: "Deal 9 DMG.", rarity: "COMMON" },
  { id: "wild-strike", name: "Wild Strike", type: "ATTACK", cost: 1, value: 12, description: "Deal 12 DMG.", rarity: "COMMON" },

  // === COMMON SKILLS ===
  { id: "shrug", name: "Shrug It Off", type: "SKILL", cost: 1, value: 8, description: "Gain 8 Block. Draw 1.", rarity: "COMMON" },
  { id: "iron-wave-skill", name: "Armaments", type: "SKILL", cost: 1, value: 5, description: "Gain 5 Block.", rarity: "COMMON" },
  { id: "true-grit", name: "True Grit", type: "SKILL", cost: 1, value: 7, description: "Gain 7 Block. Exhaust.", rarity: "COMMON", exhaust: true },
  { id: "flex-plus", name: "Flex", type: "SKILL", cost: 0, value: 2, description: "Gain 2 Strength. Exhaust.", rarity: "COMMON", exhaust: true, upgradeValue: 4, upgradedDescription: "Gain 4 Strength. Exhaust." },
  { id: "shrug-big", name: "Entrench", type: "SKILL", cost: 2, value: 0, description: "Double your Block.", rarity: "COMMON" },
  { id: "battle-trance", name: "Battle Trance", type: "SKILL", cost: 0, value: 3, description: "Draw 3 cards. You cannot draw more this turn.", rarity: "COMMON", upgradedDescription: "Draw 4 cards. You cannot draw more this turn." },
  { id: "bloodletting", name: "Bloodletting", type: "SKILL", cost: 0, value: 2, description: "Gain 2 Energy. Lose 3 HP.", rarity: "COMMON", upgradeValue: 3, upgradedDescription: "Gain 3 Energy. Lose 3 HP." },

  // === COMMON POWERS ===
  { id: "inflame", name: "Inflame", type: "POWER", cost: 1, value: 2, description: "Gain 2 Strength.", rarity: "COMMON", powerEffect: { type: "STRENGTH", value: 2, target: "SELF" } },
  { id: "shockwave", name: "Shockwave", type: "POWER", cost: 1, value: 2, description: "Apply 2 Vulnerable & 2 Weak to enemy.", rarity: "COMMON", powerEffect: { type: "VULNERABLE", value: 2, target: "ENEMY" }, upgradedDescription: "Apply 3 Vulnerable & 3 Weak to enemy." },
  { id: "battle-cry", name: "Battle Cry", type: "POWER", cost: 0, value: 1, description: "Gain 1 Strength. Draw 1.", rarity: "COMMON", powerEffect: { type: "STRENGTH", value: 1, target: "SELF" } },

  // === RARE ATTACKS ===
  { id: "bludgeon", name: "Bludgeon", type: "ATTACK", cost: 3, value: 32, description: "Deal 32 DMG.", rarity: "RARE" },
  { id: "feed", name: "Feed", type: "ATTACK", cost: 1, value: 10, description: "Deal 10 DMG. If fatal, raise Max HP by 3. Exhaust.", rarity: "RARE", exhaust: true, upgradedDescription: "Deal 14 DMG. If fatal, raise Max HP by 4. Exhaust." },
  { id: "immolate", name: "Immolate", type: "ATTACK", cost: 2, value: 21, description: "Deal 21 DMG.", rarity: "RARE" },
  { id: "whirlwind", name: "Whirlwind", type: "ATTACK", cost: -1, value: 8, description: "Deal 8 DMG. Costs ALL energy.", rarity: "RARE" },
  { id: "hemokinesis", name: "Hemokinesis", type: "ATTACK", cost: 1, value: 15, description: "Deal 15 DMG. Lose 2 HP.", rarity: "RARE" },
  { id: "perfected-strike", name: "Perfected Strike", type: "ATTACK", cost: 2, value: 6, description: "Deal 6 DMG. +2 DMG per Strike in deck.", rarity: "RARE", upgradedDescription: "Deal 8 DMG. +3 DMG per Strike in deck." },
  { id: "reaper", name: "Reaper", type: "ATTACK", cost: 2, value: 4, description: "Deal 4 DMG. Heal unblocked DMG.", rarity: "RARE" },

  // === RARE SKILLS ===
  { id: "impervious", name: "Impervious", type: "SKILL", cost: 2, value: 30, description: "Gain 30 Block. Exhaust.", rarity: "RARE", exhaust: true },
  { id: "offering", name: "Offering", type: "SKILL", cost: 0, value: 2, description: "Lose 6 HP. Gain 2 Energy. Draw 3.", rarity: "RARE", upgradedDescription: "Lose 6 HP. Gain 2 Energy. Draw 5." },
  { id: "double-tap", name: "Double Tap", type: "SKILL", cost: 1, value: 0, description: "Next ATTACK played twice.", rarity: "RARE" },
  { id: "ghostly-armor", name: "Ghostly Armor", type: "SKILL", cost: 1, value: 10, description: "Gain 10 Block.", rarity: "RARE" },
  { id: "seeing-red", name: "Seeing Red", type: "SKILL", cost: 0, value: 2, description: "Gain 2 Energy. Exhaust.", rarity: "RARE", exhaust: true, upgradeValue: 3, upgradedDescription: "Gain 3 Energy. Exhaust." },

  // === RARE POWERS ===
  { id: "demon-form", name: "Demon Form", type: "POWER", cost: 3, value: 2, description: "At turn start, gain 2 Strength.", rarity: "RARE", powerEffect: { type: "STRENGTH", value: 2, target: "SELF" }, upgradedDescription: "At turn start, gain 3 Strength." },
  { id: "barricade", name: "Barricade", type: "POWER", cost: 2, value: 0, description: "Block no longer expires.", rarity: "RARE", powerEffect: { type: "BLOCK", value: 0, target: "SELF" } },
  { id: "rupture", name: "Rupture", type: "POWER", cost: 1, value: 0, description: "When you lose HP from a card, gain 1 Strength.", rarity: "RARE" },

  // === LEGENDARY CARDS ===
  { id: "ritual", name: "Ritual Dagger", type: "ATTACK", cost: 0, value: 15, description: "Deal 15 DMG. Exhaust.", rarity: "LEGENDARY", exhaust: true },
  { id: "apotheosis", name: "Apotheosis", type: "SKILL", cost: 2, value: 0, description: "All cards cost 0 this turn. Exhaust.", rarity: "LEGENDARY", exhaust: true },
  { id: "inferno", name: "Inferno", type: "ATTACK", cost: 3, value: 50, description: "Deal 50 DMG. Exhaust.", rarity: "LEGENDARY", exhaust: true },
  { id: "deus-ex-machina", name: "Deus Ex Machina", type: "SKILL", cost: 0, value: 20, description: "Gain 20 Block. Draw to max hand. Exhaust.", rarity: "LEGENDARY", exhaust: true },
  { id: "omega", name: "Omega", type: "POWER", cost: 3, value: 50, description: "At turn end, deal 50 DMG to enemy.", rarity: "LEGENDARY", powerEffect: { type: "STRENGTH", value: 0, target: "ENEMY" } },
];

// Upgrade values for cards
export function upgradeCard(card: Card): Card {
  const upgraded = { ...card, upgraded: true, name: card.name + "+" };
  // Value upgrade: use explicit override or default formula
  if (card.upgradeValue !== undefined) {
    upgraded.value = card.upgradeValue;
  } else if (card.type === "ATTACK" || card.type === "SKILL") {
    upgraded.value = Math.floor(card.value * 1.4);
  }
  if (card.cost > 0) {
    upgraded.cost = Math.max(0, card.cost - 1);
  }
  if (card.powerEffect) {
    upgraded.powerEffect = { ...card.powerEffect, value: card.powerEffect.value + 1 };
  }
  // Description: use explicit override or default regex replacement
  if (card.upgradedDescription) {
    upgraded.description = card.upgradedDescription;
  } else {
    upgraded.description = card.description.replace(/\d+/g, (match) => {
      const num = parseInt(match);
      return String(Math.floor(num * 1.4));
    });
  }
  return upgraded;
}

// ============ ENEMIES ============

export interface EnemyTemplate {
  name: string;
  maxHp: number;
  minDmg: number;
  maxDmg: number;
  imageEmoji: string;
  isBoss: boolean;
  pattern?: EnemyPattern[];
}

export const ENEMY_TEMPLATES: EnemyTemplate[] = [
  // Tier 1 (Floors 1-4)
  { name: "Cultist", maxHp: 44, minDmg: 6, maxDmg: 8, imageEmoji: "🧙", isBoss: false },
  { name: "Jaw Worm", maxHp: 50, minDmg: 8, maxDmg: 12, imageEmoji: "🐛", isBoss: false },
  { name: "Looter", maxHp: 40, minDmg: 8, maxDmg: 10, imageEmoji: "🦝", isBoss: false },
  { name: "Acid Slime", maxHp: 38, minDmg: 7, maxDmg: 9, imageEmoji: "🟢", isBoss: false },
  { name: "Spike Slime", maxHp: 42, minDmg: 9, maxDmg: 11, imageEmoji: "🔵", isBoss: false },

  // Tier 2 (Floors 5-9)
  { name: "Slaver", maxHp: 56, minDmg: 10, maxDmg: 14, imageEmoji: "👹", isBoss: false },
  { name: "Dark Knight", maxHp: 65, minDmg: 12, maxDmg: 16, imageEmoji: "💀", isBoss: false },
  { name: "Sentinel", maxHp: 52, minDmg: 9, maxDmg: 13, imageEmoji: "🗿", isBoss: false },
  { name: "Chosen", maxHp: 60, minDmg: 11, maxDmg: 15, imageEmoji: "🧝", isBoss: false },
  { name: "Snecko", maxHp: 58, minDmg: 8, maxDmg: 18, imageEmoji: "🐍", isBoss: false },

  // Tier 3 (Floors 10-14)
  { name: "The Maw", maxHp: 80, minDmg: 15, maxDmg: 20, imageEmoji: "🦷", isBoss: false },
  { name: "Nemesis", maxHp: 90, minDmg: 14, maxDmg: 22, imageEmoji: "👻", isBoss: false },
  { name: "Giant Head", maxHp: 100, minDmg: 13, maxDmg: 18, imageEmoji: "🗿", isBoss: false },
  { name: "Orb Walker", maxHp: 85, minDmg: 16, maxDmg: 21, imageEmoji: "🔮", isBoss: false },
  { name: "Spire Growth", maxHp: 95, minDmg: 18, maxDmg: 24, imageEmoji: "🌿", isBoss: false },
];

export const BOSS_TEMPLATES: EnemyTemplate[] = [
  {
    name: "Slime Boss",
    maxHp: 75,
    minDmg: 12,
    maxDmg: 18,
    imageEmoji: "🟢",
    isBoss: true,
    pattern: [
      { intent: "ATTACK", value: 15, description: "Slam" },
      { intent: "ATTACK", value: 12, description: "Tackle" },
      { intent: "BUFF", value: 0, description: "Split" },
    ],
  },
  {
    name: "The Guardian",
    maxHp: 90,
    minDmg: 10,
    maxDmg: 16,
    imageEmoji: "🤖",
    isBoss: true,
    pattern: [
      { intent: "ATTACK", value: 14, description: "Laser" },
      { intent: "DEFEND", value: 12, description: "Defensive Mode" },
      { intent: "ATTACK", value: 20, description: "Hyper Beam" },
    ],
  },
  {
    name: "Hexaghost",
    maxHp: 110,
    minDmg: 14,
    maxDmg: 22,
    imageEmoji: "🔥",
    isBoss: true,
    pattern: [
      { intent: "ATTACK", value: 16, description: "Sear" },
      { intent: "ATTACK", value: 8, description: "Flame Wheel" },
      { intent: "BUFF", value: 0, description: "Inferno" },
      { intent: "ATTACK", value: 24, description: "Inferno" },
    ],
  },
];

export const FINAL_BOSS_TEMPLATE: EnemyTemplate = {
  name: "The Heart",
  maxHp: 200,
  minDmg: 20,
  maxDmg: 30,
  imageEmoji: "❤️",
  isBoss: true,
  pattern: [
    { intent: "ATTACK", value: 25, description: "Beat of Death" },
    { intent: "BUFF", value: 0, description: "Invincible" },
    { intent: "ATTACK", value: 18, description: "Blood Shots" },
    { intent: "ATTACK", value: 35, description: "Echo" },
    { intent: "DEFEND", value: 20, description: "Fortify" },
  ],
};

// ============ EVENTS ============

export const EVENT_POOL: GameEvent[] = [
  // === Choice-based events (STS-like risk/reward) ===
  {
    title: "Mysterious Altar", description: "An ancient altar pulses with dark energy. A voice whispers: 'Offer your blood for power.'",
    effectType: "DAMAGE", value: 0, buttonText: "Continue",
    choices: [
      { text: "Offer Blood", effectType: "DAMAGE", value: 8, description: "Lose 8 HP. Obtain a random relic." },
      { text: "Leave", effectType: "HEAL", value: 0, description: "Nothing happens." },
    ],
  },
  {
    title: "Golden Idol", description: "A solid gold idol sits on a pedestal. It looks extremely valuable, but the floor seems unstable.",
    effectType: "GOLD", value: 0, buttonText: "Continue",
    choices: [
      { text: "Take Idol", effectType: "GOLD", value: 100, description: "Gain 100 Gold. Take 10 damage from the trap." },
      { text: "Leave It", effectType: "HEAL", value: 0, description: "Safely walk away." },
    ],
  },
  {
    title: "Cursed Tome", description: "A glowing book floats in midair. Reading it could grant immense knowledge, but at what cost?",
    effectType: "HEAL", value: 0, buttonText: "Continue",
    choices: [
      { text: "Read It", effectType: "MAX_HP", value: -5, description: "Lose 5 Max HP. Upgrade a random card." },
      { text: "Close It", effectType: "HEAL", value: 0, description: "Walk away unharmed." },
    ],
  },
  {
    title: "Wandering Merchant", description: "A hooded figure offers a mysterious deal: 'Your strength for my wares.'",
    effectType: "GOLD", value: 0, buttonText: "Continue",
    choices: [
      { text: "Trade", effectType: "REMOVE_CARD", value: 1, description: "Remove a card. Lose 5 Max HP." },
      { text: "Decline", effectType: "HEAL", value: 0, description: "Walk away." },
    ],
  },
  {
    title: "Mushroom Grove", description: "Glowing mushrooms emit soothing spores. Eating one might heal you, or it might be poisonous.",
    effectType: "HEAL", value: 0, buttonText: "Continue",
    choices: [
      { text: "Eat Mushroom", effectType: "HEAL", value: 15, description: "50%: Heal 15 HP. 50%: Take 6 damage." },
      { text: "Leave", effectType: "HEAL", value: 0, description: "Don't risk it." },
    ],
  },
  {
    title: "Scrap Ooze", description: "A quivering ooze made of scrap metal. It seems to be protecting something shiny.",
    effectType: "DAMAGE", value: 0, buttonText: "Continue",
    choices: [
      { text: "Reach In", effectType: "GAIN_RELIC", value: 1, description: "Take 5 damage. Gain a random relic." },
      { text: "Back Away", effectType: "HEAL", value: 0, description: "Leave it alone." },
    ],
  },
  // === Simple auto-apply events (keep some for variety) ===
  { title: "Divine Fountain", description: "You stumble upon a glowing fountain. Its water revitalizes you.", effectType: "HEAL", value: 20, buttonText: "Drink" },
  { title: "Lost Coin Purse", description: "A heavy purse left by a previous adventurer.", effectType: "GOLD", value: 75, buttonText: "Lucky!" },
  { title: "Bandit Ambush", description: "A bandit swipes some coins before escaping into the shadows.", effectType: "GOLD", value: -25, buttonText: "Curses!" },
  { title: "Old Cleric", description: "A wanderer tends to your wounds with ancient magic.", effectType: "HEAL", value: 18, buttonText: "Thank you" },
];

// ============ RELICS ============

export const RELIC_POOL: Relic[] = [
  { id: "burning-blood", name: "Burning Blood", description: "At the end of combat, heal 6 HP.", rarity: "COMMON", trigger: "ON_COMBAT_END", effectValue: 6, emoji: "🩸" },
  { id: "vajra", name: "Vajra", description: "At the start of combat, gain 1 Strength.", rarity: "COMMON", trigger: "ON_COMBAT_START", effectValue: 1, emoji: "⚡" },
  { id: "smooth-stone", name: "Oddly Smooth Stone", description: "At the start of combat, gain 1 Strength.", rarity: "COMMON", trigger: "ON_COMBAT_START", effectValue: 1, emoji: "🪨" },
  { id: "happy-flower", name: "Happy Flower", description: "Every 3 turns, gain 1 Energy.", rarity: "COMMON", trigger: "ON_TURN_START", effectValue: 1, emoji: "🌻" },
  { id: "preserved-insect", name: "Preserved Insect", description: "Enemies start with 25% less HP.", rarity: "COMMON", trigger: "ON_COMBAT_START", effectValue: 25, emoji: "🪲" },
  { id: "anchor", name: "Anchor", description: "Start each combat with 10 Block.", rarity: "COMMON", trigger: "ON_COMBAT_START", effectValue: 10, emoji: "⚓" },
  { id: "molten-egg", name: "Molten Egg", description: "Attack cards you obtain are upgraded.", rarity: "RARE", trigger: "PASSIVE", effectValue: 0, emoji: "🥚" },
  { id: "toxic-egg", name: "Toxic Egg", description: "Skill cards you obtain are upgraded.", rarity: "RARE", trigger: "PASSIVE", effectValue: 0, emoji: "🥚" },
  { id: "frozen-egg", name: "Frozen Egg", description: "Power cards you obtain are upgraded.", rarity: "RARE", trigger: "PASSIVE", effectValue: 0, emoji: "🥚" },
  { id: "singing-bowl", name: "Singing Bowl", description: "When you skip a card reward, gain +2 Max HP.", rarity: "RARE", trigger: "PASSIVE", effectValue: 2, emoji: "🥣" },
  { id: "philosopher-stone", name: "Philosopher's Stone", description: "Gain 1 Energy at the start of each turn. Enemies deal +2 damage.", rarity: "BOSS", trigger: "ON_TURN_START", effectValue: 1, emoji: "💎" },
  { id: "black-blood", name: "Black Blood", description: "At the end of combat, heal 12 HP.", rarity: "BOSS", trigger: "ON_COMBAT_END", effectValue: 12, emoji: "🖤" },
  { id: "cursed-key", name: "Cursed Key", description: "Gain 1 Energy at the start of each turn. Obtain 1 curse (Parasite).", rarity: "BOSS", trigger: "ON_TURN_START", effectValue: 1, emoji: "🗝️" },
];

// ============ POTIONS ============

export const POTION_POOL: Potion[] = [
  { id: "block-potion", name: "Block Potion", description: "Gain 12 Block.", effectType: "BLOCK", effectValue: 12, target: "SELF", emoji: "🧪", rarity: "COMMON" },
  { id: "explosive-potion", name: "Explosive Potion", description: "Deal 20 DMG to enemy.", effectType: "DAMAGE", effectValue: 20, target: "ENEMY", emoji: "💣", rarity: "COMMON" },
  { id: "energy-potion", name: "Energy Potion", description: "Gain 2 Energy.", effectType: "ENERGY", effectValue: 2, target: "SELF", emoji: "⚡", rarity: "COMMON" },
  { id: "strength-potion", name: "Strength Potion", description: "Gain 2 Strength.", effectType: "STRENGTH", effectValue: 2, target: "SELF", emoji: "💪", rarity: "UNCOMMON" },
  { id: "regen-potion", name: "Regen Potion", description: "Heal 15 HP.", effectType: "HEAL", effectValue: 15, target: "SELF", emoji: "❤️", rarity: "UNCOMMON" },
  { id: "draw-potion", name: "Swift Potion", description: "Draw 3 cards.", effectType: "DRAW", effectValue: 3, target: "SELF", emoji: "💨", rarity: "UNCOMMON" },
  { id: "fairy-bottle", name: "Fairy in a Bottle", description: "Heal 30 HP.", effectType: "HEAL", effectValue: 30, target: "SELF", emoji: "🧚", rarity: "RARE" },
  { id: "ghost-jar", name: "Ghost in a Jar", description: "Gain 20 Block.", effectType: "BLOCK", effectValue: 20, target: "SELF", emoji: "👻", rarity: "RARE" },
];

// ============ MAP NODES ============

export function generateMapNodes(floor: number): MapNode[] {
  const isBossFloor = floor % 5 === 0;
  const isFinalBoss = floor === 15;

  if (isFinalBoss) {
    return [{ type: "BOSS", label: "The Heart", icon: "❤️", locked: false }];
  }

  if (isBossFloor) {
    return [{ type: "BOSS", label: "Boss", icon: "💀", locked: false }];
  }

  const nodes: MapNode[] = [
    { type: "BATTLE", label: "Battle", icon: "⚔️", locked: false },
    { type: "EVENT", label: "Event", icon: "❓", locked: false },
  ];

  // Add rest every 4th floor
  if (floor % 4 === 0 && floor > 0) {
    nodes.push({ type: "REST", label: "Rest", icon: "🏕️", locked: false });
  }

  // Add shop every 3rd floor
  if (floor % 3 === 0 && floor > 0) {
    nodes.push({ type: "SHOP", label: "Shop", icon: "🏪", locked: false });
  }

  return nodes;
}
