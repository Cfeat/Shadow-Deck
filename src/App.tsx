import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sword, Shield, Heart, Zap, Sparkles, Skull, Search,
  Flame, Play, RotateCcw, Star, ShoppingCart, Moon, Hand,
  User, Save, FolderOpen, Trophy, LogOut,
} from "lucide-react";
import { CardComponent, EntityDisplay, FloatingTexts, HUD, RelicDisplay } from "./components";
import {
  Card, CardType, Player, Enemy, GamePhase, BattleState, FloatingText,
  GameEvent, GameEventChoice, Relic, Potion, RelicTrigger, EnemyIntentType, SaveGameState,
  MAX_ENERGY, HAND_SIZE, MAX_HAND_SIZE, MAX_POTIONS,
  FINAL_BOSS_FLOOR, BOSS_INTERVAL,
} from "./types";
import { shuffle, generateUUID, randInt, pickRandom } from "./utils";
import {
  STARTING_DECK, CARD_POOL, ENEMY_TEMPLATES, BOSS_TEMPLATES,
  FINAL_BOSS_TEMPLATE, EVENT_POOL, RELIC_POOL, POTION_POOL,
  upgradeCard as upgradeCardData,
} from "./data";
import AuthModal from "./auth";
import SaveLoadModal from "./save";
import { setToken, getToken, verifyToken, getLeaderboard, submitScore, putSave, LeaderboardEntry } from "./api";
import { generateTower, TowerNode, findNode, getAccessibleNodes, NodeType } from "./mapGen";
import TowerMap from "./TowerMap";
import { useT } from "./i18n";

// ============ App ============

const App: React.FC = () => {
  const { t, lang, setLang } = useT();

  // --- Game State ---
  const [towerFloors, setTowerFloors] = useState<TowerNode[][]>([]);
  const [currentNodeId, setCurrentNodeId] = useState("");
  const [phase, setPhase] = useState<GamePhase>("MENU");
  const [floor, setFloor] = useState(1);
  const [messages, setMessages] = useState<string[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // Player
  const [deck, setDeck] = useState<Card[]>([]);
  const [relics, setRelics] = useState<Relic[]>([]);
  const [potions, setPotions] = useState<Potion[]>([]);
  const [player, setPlayer] = useState<Player>({
    maxHp: 80, currentHp: 80, block: 0, vulnerable: 0, weak: 0,
    energy: MAX_ENERGY, maxEnergy: MAX_ENERGY, gold: 99,
    strength: 0,
  });

  // Battle
  const [battleState, setBattleState] = useState<BattleState>({ draw: [], hand: [], discard: [], exhaust: [] });
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [turn, setTurn] = useState(0);
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeEnemy, setShakeEnemy] = useState(false);
  const [nextAttackDouble, setNextAttackDouble] = useState(false);
  const [barricadeActive, setBarricadeActive] = useState(false);
  const [omegaCount, setOmegaCount] = useState(0); // stackable Omega: deals 50 * count at end of turn
  const [demonFormStrength, setDemonFormStrength] = useState(0); // 0 = inactive, 2/3 = strength per turn
  const [ruptureActive, setRuptureActive] = useState(false);
  const [tempStrength, setTempStrength] = useState(0); // Temporary Strength (Flex, etc.) — lost at end of turn

  // Event / Shop / Rest
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);

  // Timers
  const battleTimers = useRef<NodeJS.Timeout[]>([]);
  const scoreSubmittedRef = useRef(false);
  const playerRef = useRef(player);
  const enemyRef = useRef(enemy);
  const ruptureActiveRef = useRef(false);
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { enemyRef.current = enemy; }, [enemy]);
  useEffect(() => { ruptureActiveRef.current = ruptureActive; }, [ruptureActive]);

  // Auth & Save
  const [username, setUsername] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [saveMode, setSaveMode] = useState<"save" | "load">("save");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [saveMessage, setSaveMessage] = useState("");
  const [rewardCards, setRewardCards] = useState<Card[]>([]);
  const [shopState, setShopState] = useState<{ cards: Card[]; potions: Potion[]; relic: Relic } | null>(null);
  const [showDeck, setShowDeck] = useState(false);
  const [showBlessing, setShowBlessing] = useState(false);

  // Cleanup
  useEffect(() => () => clearBattleTimers(), []);

  const clearBattleTimers = () => {
    battleTimers.current.forEach(t => clearTimeout(t));
    battleTimers.current = [];
  };
  const safeTimeout = (fn: () => void, delay: number) => {
    const t = setTimeout(fn, delay);
    battleTimers.current.push(t);
  };

  // --- Helpers ---
  const addFloatingText = useCallback((text: string, x: number, y: number, color = "text-white", size?: string) => {
    const id = generateUUID();
    setFloatingTexts(prev => [...prev, { id, text, x, y, color, size }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(ft => ft.id !== id)), 1200);
  }, []);

  const triggerShake = (target: "PLAYER" | "ENEMY") => {
    if (target === "PLAYER") { setShakePlayer(true); setTimeout(() => setShakePlayer(false), 400); }
    else { setShakeEnemy(true); setTimeout(() => setShakeEnemy(false), 400); }
  };

  const log = (msg: string) => setMessages(prev => [msg, ...prev].slice(0, 4));

  // --- Relic Helpers ---
  const hasRelic = (id: string) => relics.some(r => r.id === id);

  const triggerRelics = (trigger: RelicTrigger) => {
    for (const relic of relics) {
      if (relic.trigger !== trigger) continue;
      switch (relic.id) {
        case "burning-blood":
          if (trigger === "ON_COMBAT_END") {
            setPlayer(p => ({ ...p, currentHp: Math.min(p.maxHp, p.currentHp + relic.effectValue) }));
            addFloatingText(`+${relic.effectValue} HP`, 30, 50, "text-green-400");
          }
          break;
        case "black-blood":
          if (trigger === "ON_COMBAT_END") {
            setPlayer(p => ({ ...p, currentHp: Math.min(p.maxHp, p.currentHp + relic.effectValue) }));
            addFloatingText(`+${relic.effectValue} HP`, 30, 50, "text-green-400");
          }
          break;
        case "vajra":
        case "smooth-stone":
          if (trigger === "ON_COMBAT_START") {
            setPlayer(p => ({ ...p, strength: p.strength + relic.effectValue }));
          }
          break;
        case "anchor":
          if (trigger === "ON_COMBAT_START") {
            setPlayer(p => ({ ...p, block: p.block + relic.effectValue }));
          }
          break;
        case "preserved-insect":
          if (trigger === "ON_COMBAT_START" && enemy) {
            const reducedHp = Math.floor(enemy.maxHp * (1 - relic.effectValue / 100));
            setEnemy(e => e ? { ...e, currentHp: reducedHp, maxHp: reducedHp } : null);
          }
          break;
        case "philosopher-stone":
        case "cursed-key":
          if (trigger === "ON_TURN_START") {
            setPlayer(p => ({ ...p, maxEnergy: MAX_ENERGY + 1, energy: MAX_ENERGY + 1 }));
          }
          break;
      }
    }
  };

  // --- Init ---
  const initGame = () => {
    scoreSubmittedRef.current = false;
    victoryTriggeredRef.current = false;
    const starterCards = STARTING_DECK.map(c => ({ ...c, instanceId: generateUUID() }));
    setDeck(starterCards);
    setRelics([]);
    setPotions([]);
    setPlayer({
      maxHp: 80, currentHp: 80, block: 0, vulnerable: 0, weak: 0,
      energy: MAX_ENERGY, maxEnergy: MAX_ENERGY, gold: 99, strength: 0,
    });
    // Generate tower map
    const tower = generateTower();
    setTowerFloors(tower);
    setCurrentNodeId(tower[0][0].id);
    setFloor(1);
    setPhase("MAP");
    setMessages([]);
    log("The Spire awaits...");
  };

  // ── Save / Load ──

  const serializeGameState = useCallback((): SaveGameState => ({
    phase,
    floor,
    player: playerRef.current,
    deck,
    relics,
    potions,
    towerFloors,
    currentNodeId,
    ...(phase === "BATTLE" ? {
      battleState,
      enemy: enemyRef.current,
      turn,
      isPlayerTurn,
      barricadeActive,
      omegaCount,
      demonFormStrength,
      ruptureActive,
      nextAttackDouble,
    } : {}),
  }), [phase, floor, deck, relics, potions, towerFloors, currentNodeId, battleState, turn, isPlayerTurn, barricadeActive, omegaCount, demonFormStrength, ruptureActive, nextAttackDouble]);

  const restoreGameState = useCallback((state: SaveGameState) => {
    clearBattleTimers();
    setDeck(state.deck.map(c => ({ ...c, instanceId: c.instanceId || generateUUID() })));
    setRelics(state.relics || []);
    setPotions(state.potions || []);
    setPlayer(state.player);
    setFloor(state.floor);
    setTurn(state.turn || 0);
    setBarricadeActive(state.barricadeActive || false);
    setOmegaCount(state.omegaCount || 0);
    setDemonFormStrength(state.demonFormStrength || 0);
    setRuptureActive(state.ruptureActive || false);
    setNextAttackDouble(state.nextAttackDouble || false);
    if (state.towerFloors) setTowerFloors(state.towerFloors);
    if (state.currentNodeId) setCurrentNodeId(state.currentNodeId);
    setMessages([]);
    setFloatingTexts([]);

    if (state.battleState) {
      setBattleState(state.battleState);
      if (state.enemy) setEnemy(state.enemy);
      setPhase("BATTLE");
      setIsPlayerTurn(state.isPlayerTurn ?? true);
    } else {
      setBattleState({ draw: [], hand: [], discard: [], exhaust: [] });
      setEnemy(null);
      setPhase("MAP");
    }

    log("Game loaded.");
  }, []);

  const doSave = useCallback(async (slot: number) => {
    if (!username) return;
    try {
      const state = serializeGameState();
      await putSave(slot, state, state.floor, state.player.currentHp, state.player.gold);
      setSaveMessage(`Saved! (Slot ${slot + 1})`);
      setTimeout(() => setSaveMessage(""), 2000);
    } catch (e: any) {
      setSaveMessage(`Save failed: ${e.message}`);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  }, [username, serializeGameState]);

  const doAutoSave = useCallback(async () => {
    if (!username) return;
    try {
      const state = serializeGameState();
      await putSave(0, state, state.floor, state.player.currentHp, state.player.gold);
    } catch {
      // Silent auto-save failure
    }
  }, [username, serializeGameState]);

  // Auto-save on floor change (when in MAP phase after progression)
  const prevFloorRef = useRef(floor);
  useEffect(() => {
    if (phase === "MAP" && floor !== prevFloorRef.current && username) {
      prevFloorRef.current = floor;
      doAutoSave();
    }
  }, [phase, floor, username, doAutoSave]);

  // Check for existing token on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      verifyToken().then(data => {
        setUsername(data.user.username);
      }).catch(() => {
        setToken(null);
      });
    }
  }, []);

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
    setPhase("MENU");
    clearBattleTimers();
  };

  // --- Battle Setup ---
  const handleNodeSelect = (node: TowerNode) => {
    // Mark node reached
    setTowerFloors(prev => prev.map(floor =>
      floor.map(n => n.id === node.id ? { ...n, reached: true } : n)
    ));
    setCurrentNodeId(node.id);
    setFloor(node.floor);

    switch (node.type) {
      case "BATTLE":
      case "ELITE":
      case "BOSS":
        startBattleForNode(node);
        break;
      case "EVENT":
        triggerEvent();
        break;
      case "REST":
        handleRest();
        break;
      case "SHOP":
        handleShop();
        break;
      case "TREASURE":
        handleTreasure(node.id);
        break;
    }
  };

  const handleTreasure = (nodeId: string) => {
    const relic = pickRandom(RELIC_POOL, 1)[0];
    setRelics(prev => [...prev, relic]);
    addFloatingText(`+ ${relic.name}`, 50, 50, "text-yellow-400", "text-xl");
    log(`Found ${relic.name}!`);
    // Mark complete and go back to map
    setTowerFloors(prev => prev.map(floor =>
      floor.map(n => n.id === nodeId ? { ...n, completed: true } : n)
    ));
    setPhase("MAP");
  };

  const startBattleForNode = (node: TowerNode) => {
    clearBattleTimers();
    setBarricadeActive(false);
    setOmegaCount(0);
    setDemonFormStrength(0);
    setRuptureActive(false);
    setNextAttackDouble(false);
    setTempStrength(0);
    victoryTriggeredRef.current = false;

    // Pick enemy
    let template;
    const isFinal = node.floor === FINAL_BOSS_FLOOR;
    const isBoss = node.type === "BOSS";
    const isElite = node.type === "ELITE";

    if (isFinal) {
      template = FINAL_BOSS_TEMPLATE;
    } else if (isBoss) {
      template = BOSS_TEMPLATES[Math.min(Math.floor((floor - 1) / BOSS_INTERVAL), BOSS_TEMPLATES.length - 1)];
    } else {
      // Tier-based enemy selection (5 enemies per tier: indices 0-4, 5-9, 10-14)
      const tier = Math.min(Math.floor((node.floor - 1) / 5), 2);
      const tierEnemies = ENEMY_TEMPLATES.filter((_, i) => Math.floor(i / 5) === tier);
      template = tierEnemies.length > 0 ? pickRandom(tierEnemies, 1)[0] : ENEMY_TEMPLATES[0];
    }

    // Elite enemies: +40% HP, +30% damage
    const eliteMult = isElite ? 1.4 : 1;
    const hpVariance = randInt(-4, 4);
    const eliteHpBoost = isElite ? 15 : 0;
    const newEnemy: Enemy = {
      name: (isElite ? "⚡ " : "") + template.name,
      maxHp: Math.floor(template.maxHp * eliteMult) + hpVariance + eliteHpBoost,
      currentHp: Math.floor(template.maxHp * eliteMult) + hpVariance + eliteHpBoost,
      block: 0, vulnerable: 0, weak: 0,
      intent: "UNKNOWN", intentValue: 0,
      imageEmoji: template.imageEmoji,
      isBoss: template.isBoss || isElite,
      minDmg: Math.floor(template.minDmg * eliteMult),
      maxDmg: Math.floor(template.maxDmg * eliteMult),
      strength: 0,
      pattern: template.pattern ? [...template.pattern] : undefined,
      patternIndex: 0,
    };

    const battleDeck = deck.map(c => ({ ...c, instanceId: generateUUID() }));
    const shuffledDraw = shuffle(battleDeck);

    setBattleState({ draw: shuffledDraw, hand: [], discard: [], exhaust: [] });
    setEnemy(pickEnemyIntent(newEnemy, 1));
    setTurn(1);
    setIsPlayerTurn(true);
    setPhase("BATTLE");

    // Reset player for battle
    const energyBonus = hasRelic("philosopher-stone") || hasRelic("cursed-key") ? 1 : 0;
    setPlayer(p => ({
      ...p, block: 0, energy: MAX_ENERGY + energyBonus, maxEnergy: MAX_ENERGY + energyBonus,
      vulnerable: 0, weak: 0, strength: 0,
    }));

    // Trigger ON_COMBAT_START relics (delayed for state to settle)
    safeTimeout(() => triggerRelics("ON_COMBAT_START"), 100);

    if (template.isBoss) {
      log(`⚔️ ${template.name} appears!`);
    }
  };

  // --- Safeguard: detect enemy death ---
  const victoryTriggeredRef = useRef(false);
  useEffect(() => {
    if (phase === "BATTLE" && enemy && enemy.currentHp <= 0 && !victoryTriggeredRef.current) {
      handleVictory();
    }
    if (phase !== "BATTLE") {
      victoryTriggeredRef.current = false;
    }
  }, [phase, enemy]);

  // --- Turn Start ---
  useEffect(() => {
    if (phase === "BATTLE" && turn > 0) {
      setIsPlayerTurn(true);
      const energyBonus = hasRelic("philosopher-stone") || hasRelic("cursed-key") ? 1 : 0;

      // STS: debuffs tick at START of owner's turn
      // STS: Block resets at START of turn (unless Barricade)
      // STS: Temporary Strength is lost at START of turn
      setPlayer(p => ({
        ...p,
        energy: MAX_ENERGY + energyBonus,
        maxEnergy: MAX_ENERGY + energyBonus,
        vulnerable: Math.max(0, p.vulnerable - 1),
        weak: Math.max(0, p.weak - 1),
        block: (!barricadeActive && turn > 1) ? 0 : p.block,
      }));
      setTempStrength(0);

      // Happy Flower
      if (hasRelic("happy-flower") && turn % 3 === 0) {
        setPlayer(p => ({ ...p, energy: Math.min(p.maxEnergy, p.energy + 1) }));
        addFloatingText("+1 Energy", 30, 60, "text-yellow-400");
      }

      // Demon Form: gain Strength each turn
      if (demonFormStrength > 0) {
        setPlayer(p => ({ ...p, strength: p.strength + demonFormStrength }));
        addFloatingText(`+${demonFormStrength} STR`, 30, 35, "text-red-400", "text-xl");
      }

      drawCards(HAND_SIZE);
      triggerRelics("ON_TURN_START");
    }
  }, [turn, phase]);

  // --- Enemy Intent ---
  const pickEnemyIntent = (enemyState: Enemy, turnCount: number): Enemy => {
    let type: EnemyIntentType = "ATTACK";
    let val = 0;

    if (enemyState.pattern && enemyState.pattern.length > 0) {
      // Boss pattern
      const idx = (enemyState.patternIndex ?? 0) % enemyState.pattern.length;
      const p = enemyState.pattern[idx];
      type = p.intent;
      val = p.value;
      if (type === "ATTACK" || type === "SPECIAL") {
        val = p.value + randInt(-2, 2);
      }
      return { ...enemyState, intent: type, intentValue: val, patternIndex: idx + 1 };
    }

    // Regular enemy AI
    const r = Math.random();
    if (r < 0.65) {
      type = "ATTACK";
      const baseDmg = randInt(enemyState.minDmg, enemyState.maxDmg);
      val = baseDmg + Math.floor(floor / 3);
    } else if (r < 0.9) {
      type = "DEFEND";
      val = 6 + Math.floor(floor * 1.5);
    } else {
      type = "BUFF";
      val = 0;
    }

    return { ...enemyState, intent: type, intentValue: val };
  };

  // --- Draw Cards ---
  const drawCards = (count: number) => {
    setBattleState(prev => {
      let newDraw = [...prev.draw];
      let newDiscard = [...prev.discard];
      let newHand = [...prev.hand];

      if (newHand.length >= MAX_HAND_SIZE) {
        addFloatingText("Hand Full!", 50, 80, "text-red-400");
        return prev;
      }

      let cardsToDraw = count;
      while (cardsToDraw > 0 && newHand.length < MAX_HAND_SIZE) {
        if (newDraw.length === 0) {
          if (newDiscard.length === 0) break;
          newDraw = shuffle(newDiscard);
          newDiscard = [];
          addFloatingText("🔄 Reshuffled", 50, 50, "text-slate-400", "text-sm");
        }
        const card = newDraw.pop();
        if (card) { newHand.push(card); cardsToDraw--; }
      }

      return { draw: newDraw, hand: newHand, discard: newDiscard, exhaust: prev.exhaust };
    });
  };

  // --- Play Card ---
  const playCard = (card: Card) => {
    if (!isPlayerTurn) return;

    // X-cost (Whirlwind)
    let actualCost = card.cost;
    if (card.cost === -1) {
      actualCost = player.energy; // Spend all energy
    }

    if (player.energy < actualCost && card.cost !== -1) {
      addFloatingText("Not enough energy!", 30, 70, "text-red-500");
      return;
    }
    if (card.cost === -1 && actualCost <= 0 && player.energy <= 0) {
      addFloatingText("No energy to spend!", 30, 70, "text-red-500");
      return;
    }

    // Pay cost
    const energySpent = card.cost === -1 ? player.energy : actualCost;
    setPlayer(p => ({ ...p, energy: Math.max(0, p.energy - energySpent) }));

    // Move card from hand
    setBattleState(prev => {
      const newHand = prev.hand.filter(c => c.instanceId !== card.instanceId);
      if (card.exhaust) {
        return { ...prev, hand: newHand, exhaust: [...prev.exhaust, card] };
      }
      return { ...prev, hand: newHand, discard: [...prev.discard, card] };
    });

    // Determine number of hits (multi-hit cards + double tap)
    let numHits = 1;
    if (card.id === "twin-strike") numHits = 2;
    if (card.id === "sword-boomerang") numHits = card.upgraded ? 4 : 3;
    if (nextAttackDouble && card.type === "ATTACK") {
      numHits *= 2;
      setNextAttackDouble(false);
      addFloatingText("DOUBLE!", 50, 30, "text-yellow-400", "text-3xl");
    }

    executeCardEffect(card, energySpent, numHits);
  };

  const executeCardEffect = (card: Card, energySpent: number, numHits: number = 1) => {
    const currentEnemy = enemyRef.current;
    const currentPlayer = playerRef.current;

    // ATTACK
    if ((card.type === "ATTACK") && currentEnemy) {
      // Calculate per-hit damage
      let perHitDamage = card.value;
      if (card.id === "whirlwind") perHitDamage = card.value * energySpent;
      if (card.id === "perfected-strike") {
        const strikeCount = deck.filter(c => c.id.includes("strike")).length;
        perHitDamage = card.value + strikeCount * (card.upgraded ? 3 : 2);
      }
      // STS: Strength (including temp) applied per hit
      const totalStr = currentPlayer.strength + tempStrength;
      // Heavy Blade: Strength multiplier (3x, 5x upgraded)
      if (card.id === "heavy-blade") {
        perHitDamage += totalStr * (card.upgraded ? 5 : 3);
      } else {
        perHitDamage += totalStr;
      }

      // Hemokinesis: self-damage (once, not per hit)
      if (card.id === "hemokinesis") {
        setPlayer(p => ({
          ...p,
          currentHp: Math.max(1, p.currentHp - 2),
          strength: p.strength + (ruptureActiveRef.current ? 1 : 0),
        }));
        addFloatingText("-2 HP", 20, 50, "text-red-500");
        if (ruptureActiveRef.current) addFloatingText("+1 STR", 30, 35, "text-red-400", "text-sm");
      }

      // Iron Wave: also grants Block (value = damage = block, per STS)
      if (card.id === "iron-wave") {
        const blockAmt = card.value;
        setPlayer(p => ({ ...p, block: p.block + blockAmt }));
        addFloatingText(`+${blockAmt} Block`, 30, 45, "text-blue-400 font-bold", "text-xl");
      }

      // Clothesline: applies Weak
      if (card.id === "clothesline") {
        const weakAmt = card.upgraded ? 2 : 1;
        setEnemy(e => e ? { ...e, weak: e.weak + weakAmt } : null);
        addFloatingText(`Weak +${weakAmt}`, 70, 35, "text-slate-400", "text-lg");
      }

      // Pommel Strike: draw 1 card (2 upgraded)
      if (card.id === "pommel") {
        safeTimeout(() => drawCards(card.upgraded ? 2 : 1), 50);
      }

      // Accumulate total damage across all hits
      let totalDamage = perHitDamage * numHits;

      // Weak penalty (applied to total)
      if (currentPlayer.weak > 0) {
        totalDamage = Math.floor(totalDamage * 0.75);
        addFloatingText("Weakened", 30, 55, "text-slate-400", "text-sm");
      }

      // Vulnerable bonus (applied to total)
      if (currentEnemy.vulnerable > 0) {
        totalDamage = Math.floor(totalDamage * 1.5);
      }

      const blockBlocked = Math.min(currentEnemy.block, totalDamage);
      const hpDamage = Math.max(0, totalDamage - blockBlocked);

      if (blockBlocked > 0) addFloatingText(`Blocked ${blockBlocked}`, 70, 45, "text-blue-300", "text-lg");
      if (hpDamage > 0) {
        addFloatingText(`-${hpDamage}`, 70, 40, "text-red-500 font-bold", "text-3xl");
        triggerShake("ENEMY");
      }

      // Feed: increase Max HP if fatal (STS mechanic)
      let feedMaxHpGain = 0;
      if (card.id === "feed" && currentEnemy.currentHp - hpDamage <= 0) {
        feedMaxHpGain = card.upgraded ? 4 : 3;
      }
      // Reaper healing
      let reaperHeal = 0;
      if (card.id === "reaper" && hpDamage > 0) {
        reaperHeal = hpDamage;
      }

      // Apply damage
      let enemyDied = false;
      setEnemy(e => {
        if (!e) return null;
        let newVuln = e.vulnerable;
        if (card.id === "bash") newVuln += (card.upgraded ? 3 : 2);
        const newHp = Math.max(0, e.currentHp - hpDamage);
        if (newHp <= 0) enemyDied = true;
        return {
          ...e,
          block: e.block - blockBlocked,
          currentHp: newHp,
          vulnerable: newVuln,
        };
      });

      // Feed: increase Max HP permanently (STS mechanic)
      if (feedMaxHpGain > 0) {
        setPlayer(p => ({
          ...p,
          maxHp: p.maxHp + feedMaxHpGain,
          currentHp: Math.min(p.maxHp + feedMaxHpGain, p.currentHp + feedMaxHpGain),
        }));
        addFloatingText(`+${feedMaxHpGain} Max HP`, 30, 40, "text-green-400", "text-xl");
      }
      // Reaper: heal for unblocked damage dealt
      if (reaperHeal > 0) {
        setPlayer(p => ({ ...p, currentHp: Math.min(p.maxHp, p.currentHp + reaperHeal) }));
        addFloatingText(`+${reaperHeal} HP`, 30, 40, "text-green-400", "text-xl");
      }

      if (enemyDied) {
        setIsPlayerTurn(false);
        clearBattleTimers();
        safeTimeout(handleVictory, 800);
      }
    }

    // SKILL
    if (card.type === "SKILL") {
      // Entrench: double current Block (STS mechanic)
      if (card.id === "shrug-big") {
        setPlayer(p => ({ ...p, block: p.block * 2 }));
        addFloatingText(`Block ×2!`, 30, 45, "text-blue-400 font-bold", "text-xl");
      }
      // Flex: grants temporary Strength (lost at start of next turn, per STS)
      else if (card.id === "flex-plus") {
        setTempStrength(s => s + card.value);
        addFloatingText(`+${card.value} STR (Temp)`, 30, 35, "text-red-400", "text-xl");
      } else {
        let blockGain = card.value;
        if (blockGain > 0) {
          setPlayer(p => ({ ...p, block: p.block + blockGain }));
          addFloatingText(`+${blockGain} Block`, 30, 45, "text-blue-400 font-bold", "text-xl");
        }
      }

      // Draw effects
      if (card.id === "shrug") {
        safeTimeout(() => drawCards(1), 50);
      }
      if (card.id === "battle-trance") {
        safeTimeout(() => drawCards(3), 50);
      }
      if (card.id === "offering") {
        safeTimeout(() => drawCards(card.upgraded ? 5 : 3), 50);
        setPlayer(p => ({
          ...p,
          currentHp: Math.max(1, p.currentHp - 6),
          energy: p.energy + 2,
          strength: p.strength + (ruptureActiveRef.current ? 1 : 0),
        }));
        addFloatingText("-6 HP", 20, 50, "text-red-500");
        if (ruptureActiveRef.current) addFloatingText("+1 STR", 30, 35, "text-red-400", "text-sm");
        addFloatingText("+2 ⚡", 20, 40, "text-yellow-400");
      }
      if (card.id === "bloodletting") {
        setPlayer(p => ({
          ...p,
          currentHp: Math.max(1, p.currentHp - 3),
          energy: p.energy + card.value,
          strength: p.strength + (ruptureActiveRef.current ? 1 : 0),
        }));
        addFloatingText("-3 HP", 20, 50, "text-red-500");
        if (ruptureActiveRef.current) addFloatingText("+1 STR", 30, 35, "text-red-400", "text-sm");
        addFloatingText(`+${card.value} ⚡`, 20, 40, "text-yellow-400");
      }
      if (card.id === "seeing-red") {
        setPlayer(p => ({ ...p, energy: p.energy + card.value }));
        addFloatingText(`+${card.value} ⚡`, 20, 40, "text-yellow-400");
      }
      if (card.id === "double-tap") {
        setNextAttackDouble(true);
        addFloatingText("Next Attack ×2", 50, 30, "text-yellow-400");
      }
      if (card.id === "apotheosis") {
        // Make all cards in hand cost 0 this turn
        setBattleState(prev => ({
          ...prev,
          hand: prev.hand.map(c => ({ ...c, cost: 0 })),
        }));
        addFloatingText("All cards cost 0!", 50, 30, "text-yellow-400", "text-xl");
      }
      if (card.id === "deus-ex-machina") {
        // +1 to account for this card still being in battleState.hand (stale closure)
        drawCards(MAX_HAND_SIZE - battleState.hand.length + 1);
      }
    }

    // POWER
    if (card.type === "POWER") {
      // Generic power effect (if defined)
      if (card.powerEffect) {
        const pe = card.powerEffect;
        switch (pe.type) {
          case "STRENGTH":
            if (pe.target === "SELF") {
              setPlayer(p => ({ ...p, strength: p.strength + pe.value }));
              addFloatingText(`+${pe.value} STR`, 30, 35, "text-red-400", "text-xl");
            }
            // Battle Cry: draw 1 card
            if (card.id === "battle-cry") {
              safeTimeout(() => drawCards(1), 50);
            }
            break;
          case "VULNERABLE":
            if (pe.target === "ENEMY" && currentEnemy) {
              setEnemy(e => e ? { ...e, vulnerable: e.vulnerable + pe.value } : null);
              addFloatingText(`Vuln +${pe.value}`, 70, 35, "text-purple-400", "text-lg");
            }
            // Shockwave applies both Vulnerable and Weak
            if (card.id === "shockwave" && currentEnemy) {
              const weakAmt = card.upgraded ? 3 : 2;
              setEnemy(e => e ? { ...e, weak: e.weak + weakAmt } : null);
              addFloatingText(`Weak +${weakAmt}`, 70, 35, "text-slate-400", "text-lg");
            }
            break;
          case "WEAK":
            if (pe.target === "ENEMY" && currentEnemy) {
              setEnemy(e => e ? { ...e, weak: e.weak + pe.value } : null);
              addFloatingText(`Weak +${pe.value}`, 70, 35, "text-slate-400", "text-lg");
            }
            break;
          case "BLOCK":
            if (card.id === "barricade") {
              setBarricadeActive(true);
              addFloatingText("Barricade!", 50, 30, "text-blue-400", "text-xl");
            }
            break;
          case "ENERGY":
            setPlayer(p => ({ ...p, energy: p.energy + pe.value }));
            break;
          case "HEAL":
            setPlayer(p => ({ ...p, currentHp: Math.min(p.maxHp, p.currentHp + pe.value) }));
            break;
          case "DRAW":
            drawCards(pe.value);
            break;
        }
      }
      // Card-specific POWER effects (may or may not have powerEffect)
      if (card.id === "omega") {
        setOmegaCount(c => c + 1);
        addFloatingText("OMEGA!", 50, 30, "text-purple-400", "text-2xl");
      }
      if (card.id === "demon-form") {
        // Stacking: each Demon Form adds its strength value per turn
        setDemonFormStrength(s => s + (card.powerEffect?.value || 2));
        addFloatingText("Demon Form!", 50, 30, "text-red-500", "text-xl");
      }
      if (card.id === "rupture") {
        // Rupture is purely persistent — no immediate Strength from powerEffect
        setRuptureActive(true);
        addFloatingText("Rupture!", 50, 30, "text-red-400", "text-xl");
      }
    }
  };

  // --- End Turn ---
  const endTurn = () => {
    if (!isPlayerTurn) return;
    setIsPlayerTurn(false);

    // Omega effect (stacks: 50 damage per Omega played)
    if (omegaCount > 0 && enemy) {
      const omegaDamage = 50 * omegaCount;
      safeTimeout(() => {
        addFloatingText(`-${omegaDamage}`, 70, 30, "text-purple-400 font-bold", "text-4xl");
        triggerShake("ENEMY");
        setEnemy(e => {
          if (!e) return null;
          const newHp = Math.max(0, e.currentHp - omegaDamage);
          if (newHp <= 0) {
            safeTimeout(handleVictory, 600);
          }
          return { ...e, currentHp: newHp };
        });
      }, 200);
    }

    // Discard hand
    setBattleState(prev => ({
      ...prev,
      discard: [...prev.discard, ...prev.hand],
      hand: [],
    }));

    if (enemyRef.current && enemyRef.current.currentHp > 0) {
      safeTimeout(() => {
        const curEnemy = enemyRef.current;
        if (!curEnemy || curEnemy.currentHp <= 0) return;

        // STS: enemy debuffs tick at START of enemy's turn
        // STS: enemy block NEVER auto-expires — only broken by damage
        if (curEnemy.vulnerable > 0 || curEnemy.weak > 0) {
          setEnemy(e => e ? {
            ...e,
            vulnerable: Math.max(0, e.vulnerable - 1),
            weak: Math.max(0, e.weak - 1),
          } : null);
        }

        // Philosopher's Stone: enemies deal +2 damage
        const bonusDmg = hasRelic("philosopher-stone") ? 2 : 0;

        if (curEnemy.intent === "ATTACK" || curEnemy.intent === "SPECIAL") {
          let damage = curEnemy.intentValue + bonusDmg;
          // Enemy strength bonus
          if (curEnemy.strength) damage += curEnemy.strength;

          // Player vulnerable
          if (playerRef.current.vulnerable > 0) {
            damage = Math.floor(damage * 1.5);
          }

          // Enemy weak
          if (curEnemy.weak > 0) {
            damage = Math.floor(damage * 0.75);
          }

          const blockBlocked = Math.min(playerRef.current.block, damage);
          const hpDamage = Math.max(0, damage - blockBlocked);

          if (blockBlocked > 0) addFloatingText(`Blocked ${blockBlocked}`, 30, 45, "text-blue-300");
          if (hpDamage > 0) {
            setPlayer(p => {
              const newHp = Math.max(0, p.currentHp - hpDamage);
              if (newHp <= 0) safeTimeout(() => setPhase("GAME_OVER"), 1200);
              return { ...p, block: p.block - blockBlocked, currentHp: newHp };
            });
            addFloatingText(`-${hpDamage}`, 30, 40, "text-red-600 font-bold", "text-4xl");
            triggerShake("PLAYER");
          } else {
            setPlayer(p => ({ ...p, block: p.block - blockBlocked }));
            addFloatingText("Blocked!", 30, 40, "text-blue-200");
          }
        } else if (curEnemy.intent === "DEFEND") {
          const blockAmt = curEnemy.intentValue;
          setEnemy(e => e ? { ...e, block: e.block + blockAmt } : null);
          addFloatingText(`+${blockAmt} Block`, 70, 45, "text-blue-300");
        } else if (curEnemy.intent === "BUFF") {
          addFloatingText("Strengthen!", 70, 30, "text-yellow-400");
          setEnemy(e => e ? { ...e, strength: (e.strength || 0) + 3 } : null);
        }

        // Next turn
        safeTimeout(() => {
          if (playerRef.current.currentHp <= 0) return;
          setEnemy(e => {
            if (!e) return null;
            return pickEnemyIntent(e, turn + 1);
          });
          setTurn(t => t + 1);
        }, 1200);
      }, 600);
    }
  };

  // --- Use Potion ---
  const usePotion = (index: number) => {
    if (index >= potions.length) return;
    const potion = potions[index];
    setPotions(prev => prev.filter((_, i) => i !== index));

    switch (potion.effectType) {
      case "HEAL":
        setPlayer(p => ({ ...p, currentHp: Math.min(p.maxHp, p.currentHp + potion.effectValue) }));
        addFloatingText(`+${potion.effectValue} HP`, 30, 50, "text-green-400", "text-2xl");
        break;
      case "BLOCK":
        setPlayer(p => ({ ...p, block: p.block + potion.effectValue }));
        addFloatingText(`+${potion.effectValue} Block`, 30, 50, "text-blue-400", "text-2xl");
        break;
      case "DAMAGE":
        setEnemy(e => {
          if (!e) return null;
          const newHp = Math.max(0, e.currentHp - potion.effectValue);
          if (newHp <= 0) safeTimeout(handleVictory, 800);
          return { ...e, currentHp: newHp };
        });
        addFloatingText(`-${potion.effectValue}`, 70, 40, "text-red-500 font-bold", "text-3xl");
        triggerShake("ENEMY");
        break;
      case "ENERGY":
        setPlayer(p => ({ ...p, energy: Math.min(p.maxEnergy, p.energy + potion.effectValue) }));
        addFloatingText(`+${potion.effectValue} ⚡`, 30, 50, "text-yellow-400", "text-xl");
        break;
      case "STRENGTH":
        setPlayer(p => ({ ...p, strength: p.strength + potion.effectValue }));
        addFloatingText(`+${potion.effectValue} STR`, 30, 50, "text-red-400", "text-xl");
        break;
      case "DRAW":
        drawCards(potion.effectValue);
        break;
    }
  };

  // --- Victory ---
  const handleVictory = () => {
    if (victoryTriggeredRef.current) return;
    victoryTriggeredRef.current = true;
    clearBattleTimers();
    const isFinal = floor === FINAL_BOSS_FLOOR;
    setTurn(0);
    setIsPlayerTurn(false);
    setNextAttackDouble(false);
    setBarricadeActive(false);
    setOmegaCount(0);
    setDemonFormStrength(0);
    setRuptureActive(false);
    setTempStrength(0);

    triggerRelics("ON_COMBAT_END");

    // Passive heal: recover 20% of missing HP after combat
    const missingHp = playerRef.current.maxHp - playerRef.current.currentHp;
    if (missingHp > 0) {
      const healAmt = Math.max(1, Math.floor(missingHp * 0.2));
      setPlayer(p => ({ ...p, currentHp: Math.min(p.maxHp, p.currentHp + healAmt) }));
      addFloatingText(`+${healAmt} HP`, 30, 50, "text-green-400", "text-xl");
    }

    // Mark current node as completed
    setTowerFloors(prev => prev.map(floor =>
      floor.map(n => n.id === currentNodeId ? { ...n, completed: true } : n)
    ));

    // Check node type for reward scaling
    const curNode = findNode(towerFloors, currentNodeId);
    const isBossFloor = curNode?.type === "BOSS";
    const isEliteFloor = curNode?.type === "ELITE";

    if (isFinal) {
      safeTimeout(() => setPhase("VICTORY"), 500);
      return;
    }

    // Reward cards: weighted by rarity based on floor depth
    const rewardPool = CARD_POOL.filter(c => {
      if (isBossFloor || isEliteFloor) return c.rarity !== "COMMON"; // Boss/Elite: rare+ only
      if (floor >= 12) return true;
      if (floor >= 8) return c.rarity !== "LEGENDARY";
      if (floor >= 4) return c.rarity === "COMMON" || c.rarity === "RARE";
      return c.rarity === "COMMON";
    });
    setRewardCards(pickRandom(rewardPool.length >= 3 ? rewardPool : CARD_POOL, 3));
    setPhase("REWARD");
    const baseGold = isBossFloor ? 40 : isEliteFloor ? 30 : 15;
    const goldReward = randInt(baseGold + floor * 2, baseGold + 20 + floor * 3);
    setPlayer(p => ({ ...p, gold: p.gold + goldReward }));
    addFloatingText(`+${goldReward} Gold`, 50, 50, "text-yellow-400", "text-2xl");

    // Potion drop: 40% from regular, 100% from elite
    const potionChance = isEliteFloor ? 1.0 : isBossFloor ? 0 : 0.4;
    if (potions.length < MAX_POTIONS && Math.random() < potionChance) {
      const p = pickRandom(POTION_POOL, 1)[0];
      setPotions(prev => prev.length < MAX_POTIONS ? [...prev, p] : prev);
      addFloatingText(`+ ${p.name}`, 50, 55, "text-purple-400", "text-lg");
    }

    log("Victory!");
  };

  // --- Reward ---
  const handleRewardPick = (card: Card) => {
    let newCard: Card = { ...card, instanceId: generateUUID() };
    // Egg relics auto-upgrade
    if ((hasRelic("molten-egg") && card.type === "ATTACK") ||
        (hasRelic("toxic-egg") && card.type === "SKILL") ||
        (hasRelic("frozen-egg") && card.type === "POWER")) {
      newCard = upgradeCardData(newCard);
    }
    setDeck(prev => [...prev, newCard]);
    setPhase("MAP");
  };

  const handleRewardSkip = () => {
    if (hasRelic("singing-bowl")) {
      setPlayer(p => ({ ...p, maxHp: p.maxHp + 2, currentHp: p.currentHp + 2 }));
      addFloatingText("+2 Max HP", 50, 50, "text-green-400");
    }
    setPhase("MAP");
  };

  // --- Events ---
  const triggerEvent = () => {
    setPhase("EVENT");
    setIsLoadingEvent(true);
    setCurrentEvent(null);
    // Select event, but don't auto-apply for choice-based ones
    setTimeout(() => {
      const ev = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
      setCurrentEvent(ev);
      setIsLoadingEvent(false);
      // Auto-apply only for non-choice events
      if (!ev.choices) {
        applyEventEffect(ev.effectType, ev.value);
      }
    }, 1000);
  };

  const applyEventEffect = (effectType: string, value: number) => {
    if (effectType === "HEAL") {
      setPlayer(p => ({ ...p, currentHp: Math.min(p.maxHp, p.currentHp + value) }));
      if (value > 0) addFloatingText(`+${value} HP`, 50, 50, "text-green-400");
    } else if (effectType === "DAMAGE") {
      setPlayer(p => ({ ...p, currentHp: Math.max(1, p.currentHp - value) }));
      if (value > 0) { addFloatingText(`-${value} HP`, 50, 50, "text-red-500"); triggerShake("PLAYER"); }
    } else if (effectType === "GOLD") {
      setPlayer(p => ({ ...p, gold: Math.max(0, p.gold + value) }));
      addFloatingText(`${value >= 0 ? "+" : ""}${value} Gold`, 50, 50, value >= 0 ? "text-yellow-400" : "text-red-400");
    } else if (effectType === "MAX_HP") {
      setPlayer(p => ({ ...p, maxHp: Math.max(30, p.maxHp + value), currentHp: Math.min(p.maxHp + value, p.currentHp) }));
      addFloatingText(`${value >= 0 ? "+" : ""}${value} Max HP`, 50, 50, value >= 0 ? "text-green-400" : "text-red-400");
    } else if (effectType === "REMOVE_CARD" && value > 0) {
      setDeck(prev => prev.length > 0 ? prev.filter((_, i) => i !== 0) : prev);
      addFloatingText("Card Removed!", 50, 50, "text-slate-400");
    } else if (effectType === "GAIN_RELIC") {
      const r = pickRandom(RELIC_POOL, 1)[0];
      setRelics(prev => [...prev, r]);
      addFloatingText(`+ ${r.name}!`, 50, 50, "text-yellow-400", "text-xl");
    } else if (effectType === "UPGRADE_RANDOM") {
      const upgradable = deck.filter(c => !c.upgraded);
      if (upgradable.length > 0) {
        const toUpgrade = upgradable[Math.floor(Math.random() * upgradable.length)];
        setDeck(prev => prev.map(c => c.instanceId === toUpgrade.instanceId ? upgradeCardData(c) : c));
        addFloatingText(`${toUpgrade.name} Upgraded!`, 50, 50, "text-green-400", "text-xl");
      }
    } else if (effectType === "GAIN_POTION") {
      if (potions.length < MAX_POTIONS) {
        const p = pickRandom(POTION_POOL, 1)[0];
        setPotions(prev => [...prev, p]);
        addFloatingText(`+ ${p.name}!`, 50, 50, "text-purple-400", "text-lg");
      }
    }
  };

  const handleEventChoice = (choice: GameEventChoice) => {
    if (!currentEvent) return;
    // Mushroom Grove: 50% chance of bad outcome
    if (currentEvent.title === "Mushroom Grove" && choice.text === "Eat Mushroom") {
      if (Math.random() < 0.5) {
        applyEventEffect("DAMAGE", 6);
      } else {
        applyEventEffect("HEAL", choice.value);
      }
    } else if (currentEvent.title === "Golden Idol" && choice.text === "Take Idol") {
      applyEventEffect("GOLD", choice.value);
      applyEventEffect("DAMAGE", 10);
    } else {
      applyEventEffect(choice.effectType, choice.value);
    }
    setTowerFloors(prev => prev.map(floor =>
      floor.map(n => n.id === currentNodeId ? { ...n, completed: true } : n)
    ));
    setPhase("MAP");
  };

  const handleEventContinue = () => {
    setTowerFloors(prev => prev.map(floor =>
      floor.map(n => n.id === currentNodeId ? { ...n, completed: true } : n)
    ));
    setPhase("MAP");
  };

  // --- Rest ---
  const handleRest = () => {
    setPhase("REST");
  };

  const doRest = () => {
    const healAmt = Math.floor(player.maxHp * 0.3);
    setPlayer(p => ({ ...p, currentHp: Math.min(p.maxHp, p.currentHp + healAmt) }));
    addFloatingText(`+${healAmt} HP`, 50, 50, "text-green-400", "text-2xl");
    log("Rested and recovered.");
    setTowerFloors(prev => prev.map(floor =>
      floor.map(n => n.id === currentNodeId ? { ...n, completed: true } : n)
    ));
    setPhase("MAP");
  };

  const doUpgrade = (cardIndex: number) => {
    const upgraded = upgradeCardData(deck[cardIndex]);
    setDeck(prev => prev.map((c, i) => i === cardIndex ? upgraded : c));
    addFloatingText(`${upgraded.name} Upgraded!`, 50, 50, "text-green-400", "text-xl");
    log(`${upgraded.name} has been upgraded.`);
    setTowerFloors(prev => prev.map(floor =>
      floor.map(n => n.id === currentNodeId ? { ...n, completed: true } : n)
    ));
    setPhase("MAP");
  };

  const skipRest = () => {
    setTowerFloors(prev => prev.map(floor =>
      floor.map(n => n.id === currentNodeId ? { ...n, completed: true } : n)
    ));
    setPhase("MAP");
  };

  // --- Shop ---
  const handleShop = () => {
    setShopState({
      cards: pickRandom(CARD_POOL, 3),
      potions: pickRandom(POTION_POOL, 2),
      relic: pickRandom(RELIC_POOL, 1)[0],
    });
    setPhase("SHOP");
  };

  const buyCard = (card: Card, price: number) => {
    if (player.gold < price) { addFloatingText("Not enough gold!", 50, 50, "text-red-400"); return; }
    setPlayer(p => ({ ...p, gold: p.gold - price }));
    let newCard: Card = { ...card, instanceId: generateUUID() };
    if ((hasRelic("molten-egg") && card.type === "ATTACK") ||
        (hasRelic("toxic-egg") && card.type === "SKILL") ||
        (hasRelic("frozen-egg") && card.type === "POWER")) {
      newCard = upgradeCardData(newCard);
    }
    setDeck(prev => [...prev, newCard]);
    addFloatingText("Purchased!", 50, 50, "text-yellow-400");
    log(`Bought ${card.name}.`);
  };

  const buyPotion = (potion: Potion, price: number) => {
    if (player.gold < price) { addFloatingText("Not enough gold!", 50, 50, "text-red-400"); return; }
    if (potions.length >= MAX_POTIONS) { addFloatingText("Potion belt full!", 50, 50, "text-red-400"); return; }
    setPlayer(p => ({ ...p, gold: p.gold - price }));
    setPotions(prev => [...prev, potion]);
    addFloatingText("Purchased!", 50, 50, "text-yellow-400");
  };

  const buyRelic = (relic: Relic, price: number) => {
    if (player.gold < price) { addFloatingText("Not enough gold!", 50, 50, "text-red-400"); return; }
    setPlayer(p => ({ ...p, gold: p.gold - price }));
    setRelics(prev => [...prev, relic]);
    addFloatingText("Purchased!", 50, 50, "text-yellow-400");
  };

  const removeCard = (cardIndex: number, price: number) => {
    if (player.gold < price) { addFloatingText("Not enough gold!", 50, 50, "text-red-400"); return; }
    setPlayer(p => ({ ...p, gold: p.gold - price }));
    setDeck(prev => prev.filter((_, i) => i !== cardIndex));
    addFloatingText("Card removed", 50, 50, "text-slate-400");
  };

  const leaveShop = () => {
    setShopState(null);
    setTowerFloors(prev => prev.map(floor =>
      floor.map(n => n.id === currentNodeId ? { ...n, completed: true } : n)
    ));
    setPhase("MAP");
  };

  // --- Render Scenes ---
  if (phase === "MENU") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-100 backdrop-blur-sm bg-black/40 z-50 relative">
        {/* Welcome / Auth info */}
        {username && (
          <div className="absolute top-6 right-6 flex items-center gap-4 text-slate-400 text-sm">
            <span className="flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-700">
              <User size={14} /> {username}
            </span>
            <button onClick={handleLogout} className="text-slate-600 hover:text-red-400 transition-colors" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        )}

        <h1 className="text-8xl font-fantasy font-black mb-2 text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-slate-800 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
          {t("menu.title")}
        </h1>
        <p className="text-xl text-slate-400 mb-16 font-light tracking-[0.5em] uppercase">{t("menu.subtitle")}</p>

        <button onClick={() => setPhase("BLESSING")}
          className="group relative px-16 py-5 bg-slate-900 border border-slate-700 hover:border-red-600 transition-all duration-300 overflow-hidden rounded mb-4">
          <div className="absolute inset-0 bg-red-900/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <span className="relative font-fantasy text-3xl tracking-widest flex items-center gap-4 group-hover:text-red-100 transition-colors">
            <Play size={28} className="fill-current" /> {t("menu.play")}
          </span>
        </button>

        {!username ? (
          <button onClick={() => setShowAuth(true)}
            className="px-10 py-3 bg-slate-800 border border-slate-600 hover:border-slate-400 rounded font-fantasy tracking-wider text-slate-400 hover:text-white transition-all mb-3">
            <User size={18} className="inline mr-2" /> {t("menu.signIn")}
          </button>
        ) : (
          <div className="flex gap-4 mb-3">
            <button onClick={() => { setSaveMode("load"); setShowSaveLoad(true); }}
              className="px-8 py-3 bg-slate-800 border border-slate-600 hover:border-green-500 rounded font-fantasy tracking-wider text-slate-400 hover:text-green-200 transition-all flex items-center gap-2">
              <FolderOpen size={18} /> {t("menu.continue")}
            </button>
            <button onClick={() => { setSaveMode("save"); setShowSaveLoad(true); }}
              className="px-8 py-3 bg-slate-800 border border-slate-600 hover:border-blue-500 rounded font-fantasy tracking-wider text-slate-400 hover:text-blue-200 transition-all flex items-center gap-2">
              <Save size={18} /> {t("menu.save")}
            </button>
          </div>
        )}

        <button onClick={async () => {
          try {
            const data = await getLeaderboard();
            setLeaderboard(data.entries);
            setShowLeaderboard(true);
          } catch {
            setLeaderboard([]);
            setShowLeaderboard(true);
          }
        }}
          className="px-8 py-2.5 bg-slate-800/50 border border-slate-700 hover:border-yellow-600 rounded font-fantasy tracking-wider text-slate-500 hover:text-yellow-400 transition-all text-sm flex items-center gap-2">
          <Trophy size={16} /> {t("menu.leaderboard")}
        </button>

        {/* Language Selector */}
        <div className="mt-8 flex items-center gap-3">
          <span className="text-slate-600 text-xs">{t("language.select")}:</span>
          {(["en", "zh", "ja"] as const).map(l => (
            <button key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 text-xs rounded border transition-colors ${
                lang === l
                  ? "border-red-500 text-red-400 bg-red-950/30"
                  : "border-slate-700 text-slate-500 hover:border-slate-500"
              }`}
            >
              {t(`language.${l}`)}
            </button>
          ))}
        </div>

        <div className="mt-8 text-xs text-slate-600 tracking-widest">
          A Roguelike Card Game
        </div>

        {/* Modals */}
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={(name) => { setUsername(name); setShowAuth(false); }} />}
        {showSaveLoad && (
          <SaveLoadModal
            mode={saveMode}
            onClose={() => setShowSaveLoad(false)}
            onLoad={restoreGameState}
            getCurrentState={serializeGameState}
          />
        )}
        {showLeaderboard && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 w-full max-w-lg shadow-2xl relative max-h-[80vh] overflow-y-auto">
              <button onClick={() => setShowLeaderboard(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                <span className="text-2xl">✕</span>
              </button>
              <h2 className="text-3xl font-fantasy text-center mb-6 text-yellow-200 flex items-center justify-center gap-3">
                <Trophy size={28} className="text-yellow-400" /> {t("leaderboard.title")}
              </h2>
              {leaderboard.length === 0 ? (
                <p className="text-center text-slate-500 py-8">{t("leaderboard.empty")}</p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 text-xs uppercase tracking-widest border-b border-slate-800">
                      <th className="pb-2">#</th><th className="pb-2">{t("leaderboard.player")}</th><th className="pb-2">{t("leaderboard.score")}</th><th className="pb-2">{t("leaderboard.floor")}</th><th className="pb-2">{t("leaderboard.result")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((e, i) => (
                      <tr key={i} className="border-b border-slate-800/50 text-slate-300">
                        <td className="py-2 text-slate-500">{i + 1}</td>
                        <td className="py-2">{e.username}</td>
                        <td className="py-2 text-yellow-400">{e.score}</td>
                        <td className="py-2">{e.floor}</td>
                        <td className="py-2">{e.victory ? <span className="text-yellow-400">{t("leaderboard.victory")}</span> : <span className="text-slate-500">{t("leaderboard.defeated")}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "BLESSING") {
    const choose = (fn?: () => void) => {
      initGame();
      if (fn) setTimeout(fn, 0); // apply after initGame state settles
    };
    const bKey = (k: string) => t(`blessingItems.${k}.title`);
    const bDesc = (k: string) => t(`blessingItems.${k}.desc`);
    const blessings = [
      { icon: "💰", key: "rich", action: () => choose(() => setPlayer(p => ({ ...p, gold: p.gold + 100 }))) },
      { icon: "❤️", key: "tough", action: () => choose(() => setPlayer(p => ({ ...p, maxHp: p.maxHp + 10, currentHp: p.currentHp + 10 }))) },
      { icon: "🏺", key: "relic", action: () => choose(() => { const r = pickRandom(RELIC_POOL, 1)[0]; setRelics(prev => [...prev, r]); }) },
      { icon: "🗑️", key: "remove", action: () => choose(() => setDeck(prev => prev.slice(0, -2))) },
      { icon: "💀", key: "gamble", action: () => choose(() => setPlayer(p => ({ ...p, currentHp: Math.max(1, p.currentHp - 15), gold: p.gold + 200 }))) },
    ];
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-100 bg-black/80 backdrop-blur-md p-8">
        <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 p-10 rounded shadow-2xl text-center animate-fade-in">
          <div className="text-5xl mb-4">🐋</div>
          <h2 className="text-4xl font-fantasy mb-2 text-blue-200">{t("blessing.title")}</h2>
          <p className="text-slate-400 mb-8">{t("blessing.desc")}</p>
          <div className="grid grid-cols-1 gap-4">
            {blessings.map((b, i) => (
              <button key={i} onClick={b.action}
                className="flex items-center gap-4 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 rounded-lg transition-all text-left group">
                <div className="text-3xl w-12 text-center">{b.icon}</div>
                <div>
                  <div className="font-fantasy text-lg text-slate-200 group-hover:text-blue-200">{bKey(b.key)}</div>
                  <div className="text-sm text-slate-400">{bDesc(b.key)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "GAME_OVER") {
    const score = floor * 100 + deck.length * 2 + player.gold;
    // Submit score on death (guard against re-render double-submission)
    if (!scoreSubmittedRef.current) {
      scoreSubmittedRef.current = true;
      if (username) {
        submitScore(score, floor, false, deck.length, relics.length).catch(() => {});
      }
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-100 bg-black/90 z-50">
        <h1 className="text-7xl font-fantasy mb-4 text-red-700 drop-shadow-[0_0_20px_rgba(185,28,28,0.5)]">{t("gameOver.title")}</h1>
        <Skull size={80} className="text-red-600 mb-8" />
        <div className="bg-slate-900 p-8 rounded border border-slate-800 text-center mb-8 min-w-[300px]">
          <p className="text-slate-400 uppercase tracking-widest text-sm mb-2">{t("gameOver.floorReached")}</p>
          <p className="text-6xl font-black text-white">{floor}</p>
          <p className="text-slate-500 mt-4 text-sm">{t("gameOver.cards")}: {deck.length} | {t("gameOver.gold")}: {player.gold}</p>
          <p className="text-yellow-400 mt-2 text-sm font-mono">{t("gameOver.score")}: {score}</p>
        </div>
        <button onClick={() => setPhase("MENU")}
          className="px-10 py-4 border border-slate-600 hover:bg-slate-800 rounded font-fantasy tracking-wider hover:border-white transition-all">
          {t("menu.returnToMenu")}
        </button>
      </div>
    );
  }

  if (phase === "VICTORY") {
    const score = floor * 200 + deck.length * 5 + player.gold * 2 + player.currentHp * 3;
    // Submit score on victory (guard against re-render double-submission)
    if (!scoreSubmittedRef.current) {
      scoreSubmittedRef.current = true;
      if (username) {
        submitScore(score, floor, true, deck.length, relics.length).catch(() => {});
      }
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-100 bg-black/90 z-50">
        <h1 className="text-7xl font-fantasy mb-4 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">{t("victory.title")}</h1>
        <Flame size={80} className="text-yellow-500 mb-8" />
        <div className="bg-slate-900 p-8 rounded border border-yellow-800 text-center mb-8 min-w-[300px]">
          <p className="text-slate-400 uppercase tracking-widest text-sm mb-2">{t("victory.subtitle")}</p>
          <p className="text-4xl font-black text-yellow-400 mt-4">{t("victory.congratulations")}</p>
          <p className="text-slate-500 mt-4 text-sm">{t("victory.deck")}: {deck.length} | {t("victory.relics")}: {relics.length}</p>
          <p className="text-yellow-400 mt-2 text-sm font-mono">{t("victory.score")}: {score}</p>
        </div>
        <button onClick={() => setPhase("MENU")}
          className="px-10 py-4 border border-yellow-600 hover:bg-yellow-900/30 rounded font-fantasy tracking-wider hover:border-yellow-400 transition-all text-yellow-400">
          {t("menu.newRun")}
        </button>
      </div>
    );
  }

  if (phase === "MAP") {
    return (
      <div className="relative h-full">
        <FloatingTexts texts={floatingTexts} />
        <TowerMap
          floors={towerFloors}
          currentFloor={floor}
          currentNodeId={currentNodeId}
          onSelectNode={handleNodeSelect}
          onViewDeck={() => setShowDeck(true)}
          deckCount={deck.length}
          currentHp={player.currentHp}
          maxHp={player.maxHp}
          gold={player.gold}
          relicsCount={relics.length}
        />
        {/* Bottom bar */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-slate-500 z-10">
          <span>{username ? `👤 ${username}` : t("map.notSignedIn")}</span>
          <div className="flex gap-3">
            {username && (
              <button onClick={() => doSave(0)} className="hover:text-blue-400 transition-colors flex items-center gap-1">
                <Save size={12} /> {t("menu.quickSave")}
              </button>
            )}
            {username && (
              <button onClick={() => { setSaveMode("load"); setShowSaveLoad(true); }}
                className="hover:text-green-400 transition-colors flex items-center gap-1">
                <FolderOpen size={12} /> {t("menu.load")}
              </button>
            )}
            <button onClick={() => { setPhase("MENU"); clearBattleTimers(); }}
              className="hover:text-red-400 transition-colors">
              {t("menu.quitToMenu")}
            </button>
          </div>
        </div>
        {saveMessage && <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-xs text-green-400 animate-pulse">{saveMessage}</div>}
        {showSaveLoad && (
          <SaveLoadModal mode={saveMode} onClose={() => setShowSaveLoad(false)}
            onLoad={restoreGameState} getCurrentState={serializeGameState} />
        )}
      </div>
    );
  }

  if (phase === "EVENT") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-100 bg-black/80 backdrop-blur-md p-8">
        <FloatingTexts texts={floatingTexts} />
        {isLoadingEvent ? (
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="relative">
              <Sparkles size={64} className="text-purple-400 animate-spin-slow" />
              <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20"></div>
            </div>
            <p className="font-fantasy text-2xl tracking-widest text-purple-200">{t("event.searching")}</p>
          </div>
        ) : currentEvent && (
          <div className="max-w-xl w-full bg-slate-900 border border-slate-700 p-10 rounded shadow-2xl relative text-center flex flex-col items-center animate-fade-in">
            <div className="mb-6 p-4 rounded-full bg-slate-800 border border-slate-600">
              {currentEvent.effectType === "HEAL" && <Heart size={48} className="text-green-400" />}
              {currentEvent.effectType === "DAMAGE" && <Skull size={48} className="text-red-400" />}
              {currentEvent.effectType === "GOLD" && <span className="text-4xl">💰</span>}
            </div>
            <h2 className="text-4xl font-fantasy mb-6 text-purple-200">
              {t(`events.${EVENT_POOL.indexOf(currentEvent)}.title`)}
            </h2>
            <p className="text-xl text-slate-300 leading-relaxed mb-8 font-serif italic">
              "{t(`events.${EVENT_POOL.indexOf(currentEvent)}.desc`)}"
            </p>
            {/* Choice-based events */}
            {currentEvent.choices ? (
              <div className="flex flex-col gap-4 mb-6 w-full">
                {currentEvent.choices.map((choice, i) => (
                  <button key={i} onClick={() => handleEventChoice(choice)}
                    className="px-6 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-purple-400 rounded transition-all text-left group">
                    <div className="font-fantasy text-lg text-purple-200 group-hover:text-purple-100">{choice.text}</div>
                    <div className="text-sm text-slate-400 mt-1">{choice.description}</div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="mb-8 font-bold text-lg">
                  {currentEvent.effectType === "HEAL" && <span className="text-green-400">Restored {currentEvent.value} HP</span>}
                  {currentEvent.effectType === "DAMAGE" && <span className="text-red-400">Took {currentEvent.value} Damage</span>}
                  {currentEvent.effectType === "GOLD" && (
                    <span className={currentEvent.value > 0 ? "text-yellow-400" : "text-red-400"}>
                      {currentEvent.value > 0 ? "Gained" : "Lost"} {Math.abs(currentEvent.value)} Gold
                    </span>
                  )}
                </div>
                <button onClick={handleEventContinue}
                  className="px-12 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-purple-400 rounded transition-all font-fantasy tracking-widest text-lg group">
                  <span className="group-hover:text-purple-200 transition-colors">{currentEvent.buttonText}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  if (phase === "REWARD") {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black/90 backdrop-blur-xl z-50 absolute inset-0">
        <FloatingTexts texts={floatingTexts} />
        <h2 className="text-5xl font-fantasy text-yellow-500 mb-12 drop-shadow-lg tracking-widest">{t("reward.title")}</h2>
        <div className="flex gap-10 mb-16">
          {rewardCards.map((card, i) => (
            <div key={i} className="hover:scale-110 transition-transform duration-300">
              <CardComponent card={card} playable={true} disabled={false} onClick={() => handleRewardPick(card)} />
            </div>
          ))}
        </div>
        <button onClick={handleRewardSkip} className="text-slate-500 hover:text-white text-lg tracking-widest hover:underline transition-colors">
          {t("reward.skip")} {hasRelic("singing-bowl") && <span className="text-green-400">{t("reward.skipBowl")}</span>}
        </button>
      </div>
    );
  }

  if (phase === "REST") {
    const upgradable = deck.filter(c => !c.upgraded);
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-100 bg-black/80 backdrop-blur-md p-8">
        <FloatingTexts texts={floatingTexts} />
        <div className="max-w-3xl w-full bg-slate-900 border border-slate-700 p-10 rounded shadow-2xl text-center">
          <div className="text-6xl mb-6">🏕️</div>
          <h2 className="text-4xl font-fantasy mb-4 text-green-200">{t("rest.title")}</h2>
          <p className="text-slate-400 mb-10">{t("rest.choose")}</p>

          <div className="grid grid-cols-2 gap-6 mb-10">
            <button onClick={doRest}
              className="p-6 rounded bg-gradient-to-t from-slate-800 to-slate-700 border border-slate-600 hover:border-green-500 group transition-all">
              <Moon size={36} className="mx-auto mb-3 text-green-400" />
              <div className="font-fantasy text-lg text-slate-200 group-hover:text-green-200">{t("rest.rest")}</div>
              <div className="text-sm text-slate-400 mt-2">{t("rest.restDesc").replace("{0}", String(Math.floor(player.maxHp * 0.3)))}</div>
            </button>

            <div className="p-6 rounded bg-gradient-to-t from-slate-800 to-slate-700 border border-slate-600">
              <Star size={36} className="mx-auto mb-3 text-yellow-400" />
              <div className="font-fantasy text-lg text-slate-200 mb-3">{t("rest.upgrade")}</div>
              {upgradable.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {upgradable.slice(0, 6).map((card, i) => {
                    const realIdx = deck.indexOf(card);
                    return (
                      <button key={i} onClick={() => doUpgrade(realIdx)}
                        className="text-left px-3 py-2 bg-slate-800 rounded hover:bg-slate-700 border border-slate-700 hover:border-yellow-500 transition-all text-xs text-slate-300 flex justify-between items-center">
                        <span>{card.name} <span className="text-slate-500">({card.type})</span></span>
                        <span className="text-green-400">→ {upgradeCardData(card).name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">{t("rest.allUpgraded")}</p>
              )}
            </div>
          </div>

          <button onClick={skipRest} className="text-slate-500 hover:text-white text-sm tracking-widest hover:underline transition-colors">
            {t("rest.leave")}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "SHOP") {
    if (!shopState) {
      return (
        <div className="flex items-center justify-center h-full text-slate-100 bg-black/80">
          <div className="animate-pulse text-slate-500 text-xl">Loading shop...</div>
        </div>
      );
    }
    const { cards: shopCards, potions: shopPotions, relic: shopRelic } = shopState;
    const cardPrices = shopCards.map(c => c.rarity === "LEGENDARY" ? 200 : c.rarity === "RARE" ? 100 : 50);
    const potionPrices = shopPotions.map(p => p.rarity === "RARE" ? 100 : p.rarity === "UNCOMMON" ? 75 : 50);
    const relicPrice = shopRelic.rarity === "BOSS" ? 250 : shopRelic.rarity === "RARE" ? 200 : 150;

    return (
      <div className="flex flex-col items-center justify-center min-h-full text-slate-100 bg-black/80 backdrop-blur-md p-8">
        <FloatingTexts texts={floatingTexts} />
        <div className="max-w-5xl w-full bg-slate-900 border border-slate-700 p-8 rounded shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🏪</div>
            <h2 className="text-4xl font-fantasy text-yellow-200">{t("shop.title")}</h2>
            <p className="text-yellow-400 mt-2 font-mono text-lg">{t("shop.gold")}: ${player.gold}</p>
          </div>

          {/* Cards */}
          <div className="mb-8">
            <h3 className="text-lg font-fantasy text-slate-300 mb-4 border-b border-slate-800 pb-2">{t("shop.cardsForSale")}</h3>
            <div className="flex gap-6 justify-center flex-wrap">
              {shopCards.map((card, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <CardComponent card={card} playable={true} disabled={false} small
                    onClick={() => buyCard(card, cardPrices[i])} />
                  <button onClick={() => buyCard(card, cardPrices[i])}
                    className="px-4 py-1.5 bg-yellow-900/50 border border-yellow-700 hover:bg-yellow-800 rounded text-yellow-400 text-sm font-bold transition-colors">
                    <ShoppingCart size={14} className="inline mr-1" />${cardPrices[i]}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Potions */}
          <div className="mb-8">
            <h3 className="text-lg font-fantasy text-slate-300 mb-4 border-b border-slate-800 pb-2">{t("shop.potions")}</h3>
            <div className="flex gap-6 justify-center">
              {shopPotions.map((potion, i) => (
                <div key={i} className="flex flex-col items-center gap-2 bg-slate-800 p-4 rounded-lg border border-slate-700">
                  <div className="text-3xl">{potion.emoji}</div>
                  <div className="font-bold text-sm text-slate-200">{potion.name}</div>
                  <div className="text-xs text-slate-400">{potion.description}</div>
                  <button onClick={() => buyPotion(potion, potionPrices[i])}
                    className="px-4 py-1.5 bg-purple-900/50 border border-purple-700 hover:bg-purple-800 rounded text-purple-400 text-sm font-bold transition-colors">
                    ${potionPrices[i]}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Relic */}
          <div className="mb-8">
            <h3 className="text-lg font-fantasy text-slate-300 mb-4 border-b border-slate-800 pb-2">{t("shop.relic")}</h3>
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-2 bg-slate-800 p-4 rounded-lg border border-yellow-800/50 w-48">
                <div className="text-3xl">{shopRelic.emoji}</div>
                <div className="font-bold text-sm text-yellow-200">{shopRelic.name}</div>
                <div className="text-xs text-slate-400 text-center">{shopRelic.description}</div>
                <button onClick={() => buyRelic(shopRelic, relicPrice)}
                  className="px-4 py-1.5 bg-yellow-900/50 border border-yellow-700 hover:bg-yellow-800 rounded text-yellow-400 text-sm font-bold transition-colors">
                  ${relicPrice}
                </button>
              </div>
            </div>
          </div>

          {/* Card Removal */}
          <div className="mb-8">
            <h3 className="text-lg font-fantasy text-slate-300 mb-4 border-b border-slate-800 pb-2">{t("shop.removeCard")} ($75)</h3>
            <div className="flex gap-3 justify-center flex-wrap">
              {deck.slice(0, 8).map((card, i) => (
                <button key={i} onClick={() => removeCard(i, 75)}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 hover:border-red-500 rounded text-sm text-slate-400 hover:text-red-300 transition-colors flex items-center gap-2">
                  <span>{card.name}</span>
                  <span className="text-red-600">✕</span>
                </button>
              ))}
              {deck.length > 8 && <span className="text-slate-600 text-sm self-center">+{deck.length - 8} more...</span>}
            </div>
          </div>

          <div className="text-center">
            <button onClick={leaveShop}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded font-fantasy tracking-widest transition-colors">
              {t("shop.leave")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  {/* --- Deck Viewer Modal --- */}
  {showDeck && (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl relative">
        <button onClick={() => setShowDeck(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <span className="text-2xl">✕</span>
        </button>
        <h2 className="text-3xl font-fantasy text-center mb-2 text-slate-100">{t("map.viewDeck")}</h2>
        <p className="text-center text-slate-500 text-sm mb-6">{deck.length} {t("map.cards")}</p>
        <div className="grid grid-cols-1 gap-3">
          {/* Group by type */}
          {(["ATTACK", "SKILL", "POWER"] as CardType[]).map(type => {
            const typeCards = deck.filter(c => c.type === type);
            if (typeCards.length === 0) return null;
            const colors: Record<string, string> = { ATTACK: "text-red-400", SKILL: "text-blue-400", POWER: "text-purple-400" };
            return (
              <div key={type}>
                <h3 className={`text-sm font-bold ${colors[type]} mb-2 uppercase tracking-widest`}>
                  {type} ({typeCards.length})
                </h3>
                {typeCards.map((card, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded px-4 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${card.upgraded ? "text-green-400" : "text-slate-200"}`}>
                        {card.name}
                      </span>
                      {card.upgraded && <span className="text-green-500 text-xs">+</span>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>Cost: {card.cost === -1 ? "X" : card.cost}</span>
                      <span className="text-slate-500">{card.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div className="mt-6 text-center">
          <button onClick={() => setShowDeck(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded font-fantasy tracking-wider text-slate-400 hover:text-white transition-colors">
            {t("map.closeDeck")}
          </button>
        </div>
      </div>
    </div>
  )}

  // --- Battle Scene ---
  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      <FloatingTexts texts={floatingTexts} />
      <RelicDisplay relics={relics} potions={potions} />

      {/* HUD */}
      <HUD player={player} floor={floor} deckCount={deck.length} turn={phase === "BATTLE" ? turn : undefined} />

      {/* Messages */}
      <div className="absolute top-20 left-60 w-64 pointer-events-none z-10">
        {messages.map((msg, i) => (
          <div key={i} className="mb-2 text-sm text-slate-300 text-shadow bg-black/40 px-2 py-1 rounded inline-block animate-float-up">
            {msg}
          </div>
        ))}
      </div>

      {/* Battle Arena */}
      <div className="flex-1 relative flex items-center justify-center gap-48 pb-32">
        <EntityDisplay entity={player} isPlayer={true} shake={shakePlayer} strength={player.strength + tempStrength} />
        <div className="text-slate-800 opacity-20 text-[10rem] font-black italic absolute select-none pointer-events-none transform -skew-x-12">VS</div>
        {enemy && (
          <EntityDisplay
            entity={enemy}
            isPlayer={false}
            intent={enemy.intent}
            intentValue={enemy.intentValue}
            shake={shakeEnemy}
          />
        )}
      </div>

      {/* Hand Area */}
      <div className="absolute bottom-0 w-full h-[24rem] bg-gradient-to-t from-black via-slate-950/95 to-transparent flex flex-col items-center justify-end pb-4 z-20">
        {/* Draw Pile */}
        <div className="absolute bottom-4 left-10 text-slate-500 font-bold flex flex-col items-center gap-2 group cursor-help">
          <div className="relative transition-transform group-hover:-translate-y-2">
            <div className="w-16 h-20 bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center text-xl shadow-lg">
              {battleState.draw.length}
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-widest">{t("battle.draw")}</span>
        </div>

        {/* Discard Pile */}
        <div className="absolute bottom-4 right-32 text-slate-500 font-bold flex flex-col items-center gap-2 group cursor-help">
          <div className="relative transition-transform group-hover:-translate-y-2">
            <div className="w-16 h-20 bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center text-xl shadow-lg">
              {battleState.discard.length}
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-widest">{t("battle.discard")}</span>
        </div>

        {/* Exhaust Pile */}
        {battleState.exhaust.length > 0 && (
          <div className="absolute bottom-4 right-10 text-slate-600 font-bold flex flex-col items-center gap-2 group cursor-help">
            <div className="relative transition-transform group-hover:-translate-y-2">
              <div className="w-16 h-20 bg-slate-900 border-2 border-slate-700 rounded flex items-center justify-center text-xl shadow-lg">
                {battleState.exhaust.length}
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-widest">{t("battle.exhaust")}</span>
          </div>
        )}

        {/* Potions (usable in battle) */}
        <div className="absolute bottom-4 left-32 flex gap-2">
          {potions.map((potion, i) => (
            <button key={i} onClick={() => usePotion(i)}
              disabled={!isPlayerTurn}
              className="w-12 h-12 bg-purple-900/80 border border-purple-600 rounded-lg flex items-center justify-center text-lg hover:border-purple-300 hover:scale-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title={`${potion.name}: ${potion.description}`}>
              {potion.emoji}
            </button>
          ))}
        </div>

        {/* Hand */}
        <div className="flex items-end justify-center mb-10 h-64 w-full max-w-5xl mx-auto">
          {battleState.hand.map((card, index) => {
            const total = battleState.hand.length;
            const center = (total - 1) / 2;
            const rotation = (index - center) * 4;
            const translateY = Math.abs(index - center) * 6;
            const translateX = (index - center) * -20;
            return (
              <div key={card.instanceId}
                style={{
                  transform: `rotate(${rotation}deg) translateY(${translateY}px) translateX(${translateX}px)`,
                  zIndex: index + 10,
                  transformOrigin: "bottom center",
                }}
                className={`transition-all duration-300 ${isPlayerTurn ? "hover:!translate-y-[-50px] hover:!rotate-0 hover:!z-50 hover:scale-110" : ""}`}>
                <CardComponent
                  card={card}
                  playable={isPlayerTurn && player.energy >= (card.cost === -1 ? 1 : card.cost)}
                  disabled={!isPlayerTurn}
                  onClick={() => playCard(card)}
                />
              </div>
            );
          })}
        </div>

        {/* End Turn Button */}
        <button onClick={endTurn} disabled={!isPlayerTurn}
          className={`absolute right-4 lg:right-36 bottom-10 z-[60] px-8 py-3 font-bold uppercase tracking-widest rounded shadow-[0_0_15px_rgba(220,38,38,0.5)] border transition-all active:scale-95 ${
            isPlayerTurn
              ? "bg-red-900 hover:bg-red-700 text-red-100 border-red-500"
              : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
          }`}>
          {isPlayerTurn ? t("battle.endTurn") : t("battle.enemyTurn")}
        </button>

        {/* Barricade/Status indicators */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
          {barricadeActive && (
            <div className="bg-blue-900/80 border border-blue-500 text-blue-200 text-xs px-3 py-1 rounded-full">
              {t("battle.barricade")}
            </div>
          )}
          {omegaCount > 0 && (
            <div className="bg-purple-900/80 border border-purple-500 text-purple-200 text-xs px-3 py-1 rounded-full">
              {t("battle.omega")} (×{omegaCount})
            </div>
          )}
          {demonFormStrength > 0 && (
            <div className="bg-red-900/80 border border-red-500 text-red-200 text-xs px-3 py-1 rounded-full">
              {t("battle.demonForm")} (+{demonFormStrength}/turn)
            </div>
          )}
          {ruptureActive && (
            <div className="bg-orange-900/80 border border-orange-500 text-orange-200 text-xs px-3 py-1 rounded-full">
              {t("battle.rupture")}
            </div>
          )}
          {nextAttackDouble && (
            <div className="bg-yellow-900/80 border border-yellow-500 text-yellow-200 text-xs px-3 py-1 rounded-full">
              {t("battle.doubleNext")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
