import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { 
  Sword, Shield, Heart, Zap, Sparkles, Skull, 
  Map as MapIcon, RotateCcw, Play, Hand, Search, 
  Flame, HelpCircle, Ban
} from "lucide-react";

// --- Configuration & Types ---

const MAX_ENERGY = 3;
const HAND_SIZE = 5;
const MAX_HAND_SIZE = 10;

type CardType = "ATTACK" | "SKILL" | "POWER";
type EnemyIntentType = "ATTACK" | "DEFEND" | "BUFF" | "UNKNOWN";
type GamePhase = "MENU" | "MAP" | "BATTLE" | "EVENT" | "REWARD" | "GAME_OVER" | "VICTORY";

interface Card {
  id: string;
  instanceId?: string; // unique ID for card in hand/deck
  name: string;
  type: CardType;
  cost: number;
  value: number; // Damage or Block amount
  description: string;
  rarity: "COMMON" | "RARE" | "LEGENDARY";
  exhaust?: boolean;
}

interface Entity {
  maxHp: number;
  currentHp: number;
  block: number;
  vulnerable: number; // Turns remaining
  weak: number; // Turns remaining (deal 25% less dmg)
}

interface Player extends Entity {
  energy: number;
  gold: number;
}

interface Enemy extends Entity {
  name: string;
  intent: EnemyIntentType;
  intentValue: number;
  imageEmoji: string;
}

interface GameEvent {
  title: string;
  description: string;
  effectType: "HEAL" | "DAMAGE" | "GOLD";
  value: number;
  buttonText: string;
}

interface FloatingText {
  id: string;
  text: string;
  x: number; // % position
  y: number; // % position
  color: string;
}

interface BattleState {
  draw: Card[];
  hand: Card[];
  discard: Card[];
  exhaust: Card[];
}

// --- Data ---

const STARTING_DECK: Card[] = [
  { id: "strike", name: "Strike", type: "ATTACK", cost: 1, value: 6, description: "Deal 6 DMG.", rarity: "COMMON" },
  { id: "strike", name: "Strike", type: "ATTACK", cost: 1, value: 6, description: "Deal 6 DMG.", rarity: "COMMON" },
  { id: "strike", name: "Strike", type: "ATTACK", cost: 1, value: 6, description: "Deal 6 DMG.", rarity: "COMMON" },
  { id: "strike", name: "Strike", type: "ATTACK", cost: 1, value: 6, description: "Deal 6 DMG.", rarity: "COMMON" },
  { id: "defend", name: "Defend", type: "SKILL", cost: 1, value: 5, description: "Gain 5 Block.", rarity: "COMMON" },
  { id: "defend", name: "Defend", type: "SKILL", cost: 1, value: 5, description: "Gain 5 Block.", rarity: "COMMON" },
  { id: "defend", name: "Defend", type: "SKILL", cost: 1, value: 5, description: "Gain 5 Block.", rarity: "COMMON" },
  { id: "defend", name: "Defend", type: "SKILL", cost: 1, value: 5, description: "Gain 5 Block.", rarity: "COMMON" },
  { id: "bash", name: "Bash", type: "ATTACK", cost: 2, value: 8, description: "Deal 8 DMG. Apply 2 Vulnerable.", rarity: "COMMON" },
];

const CARD_POOL: Card[] = [
  { id: "heavy-blade", name: "Heavy Blade", type: "ATTACK", cost: 2, value: 14, description: "Deal 14 DMG.", rarity: "COMMON" },
  { id: "iron-wave", name: "Iron Wave", type: "ATTACK", cost: 1, value: 5, description: "5 DMG. 5 Block.", rarity: "COMMON" },
  { id: "pommel", name: "Pommel Strike", type: "ATTACK", cost: 1, value: 9, description: "Deal 9 DMG. Draw 1.", rarity: "COMMON" },
  { id: "shrug", name: "Shrug It Off", type: "SKILL", cost: 1, value: 8, description: "8 Block. Draw 1.", rarity: "COMMON" },
  { id: "impervious", name: "Impervious", type: "SKILL", cost: 2, value: 30, description: "Gain 30 Block. Exhaust.", rarity: "RARE", exhaust: true },
  { id: "bludgeon", name: "Bludgeon", type: "ATTACK", cost: 3, value: 32, description: "Deal 32 DMG.", rarity: "RARE" },
  { id: "ritual", name: "Ritual Dagger", type: "ATTACK", cost: 0, value: 15, description: "Deal 15 DMG. Exhaust.", rarity: "LEGENDARY", exhaust: true },
  { id: "feed", name: "Feed", type: "ATTACK", cost: 1, value: 10, description: "Deal 10 DMG. Heal 3 if fatal. Exhaust.", rarity: "RARE", exhaust: true },
];

const ENEMIES = [
  { name: "Cultist", maxHp: 42, imageEmoji: "🧙", minDmg: 6, maxDmg: 8 },
  { name: "Jaw Worm", maxHp: 48, imageEmoji: "🐛", minDmg: 8, maxDmg: 12 },
  { name: "Slaver", maxHp: 55, imageEmoji: "👹", minDmg: 10, maxDmg: 14 },
  { name: "Dark Knight", maxHp: 80, imageEmoji: "💀", minDmg: 12, maxDmg: 16 },
  { name: "The Maw", maxHp: 120, imageEmoji: "🦷", minDmg: 15, maxDmg: 20 },
];

const EVENT_POOL: GameEvent[] = [
  {
    title: "Divine Fountain",
    description: "You stumble upon a glowing fountain. Drinking its water revitalizes your weary body.",
    effectType: "HEAL",
    value: 20,
    buttonText: "Refreshing!"
  },
  {
    title: "Hidden Trap",
    description: "You step on a loose stone and a dart flies out from the wall!",
    effectType: "DAMAGE",
    value: 8,
    buttonText: "Ouch!"
  },
  {
    title: "Lost Coin Purse",
    description: "You find a heavy leather purse dropped by a previous adventurer. It's filled with gold.",
    effectType: "GOLD",
    value: 50,
    buttonText: "Lucky!"
  },
  {
    title: "Bandit Ambush",
    description: "A bandit jumps you! You manage to escape, but he swipes some of your coins.",
    effectType: "GOLD",
    value: -20,
    buttonText: "Curses!"
  },
  {
    title: "Cursed Idol",
    description: "You touch a strange idol. A shockwave of dark energy courses through you.",
    effectType: "DAMAGE",
    value: 12,
    buttonText: "I feel weak..."
  },
  {
    title: "Old Cleric",
    description: "An old wanderer tends to your wounds.",
    effectType: "HEAL",
    value: 15,
    buttonText: "Thank you"
  }
];

// --- Utilities ---

const shuffle = (array: any[]) => {
  let currentIndex = array.length, randomIndex;
  const newArray = [...array];
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
  }
  return newArray;
};

const generateUUID = () => Math.random().toString(36).substring(2, 9);

// --- Components ---

const CardComponent: React.FC<{ card: Card, onClick: () => void, disabled: boolean, playable: boolean }> = ({ card, onClick, disabled, playable }) => {
  const getBorderColor = () => {
    switch (card.rarity) {
      case "LEGENDARY": return "border-yellow-400 shadow-yellow-500/50";
      case "RARE": return "border-blue-400 shadow-blue-500/50";
      default: return card.type === "ATTACK" ? "border-red-800" : "border-slate-600";
    }
  };

  const getBgColor = () => {
    if (card.type === "ATTACK") return "bg-gradient-to-br from-red-950 to-slate-900";
    if (card.type === "SKILL") return "bg-gradient-to-br from-blue-950 to-slate-900";
    return "bg-gradient-to-br from-yellow-950 to-slate-900";
  };

  const Icon = card.type === "ATTACK" ? Sword : (card.type === "SKILL" ? Shield : Zap);

  return (
    <div
      onClick={!disabled && playable ? onClick : undefined}
      className={`
        relative w-40 h-60 rounded-xl border-[3px] ${getBorderColor()} ${getBgColor()}
        flex flex-col p-3 select-none transition-all duration-200 shadow-xl overflow-hidden
        ${playable && !disabled ? "cursor-pointer card-hover hover:border-white" : "opacity-60 grayscale-[0.8] cursor-not-allowed transform scale-95"}
      `}
    >
      {/* Cost Badge */}
      <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-slate-900 border-2 border-blue-500 text-blue-300 flex items-center justify-center font-bold shadow-lg z-10 text-lg font-fantasy">
        {card.cost}
      </div>

      {/* Name */}
      <div className="text-center font-fantasy font-bold text-sm mt-3 text-slate-100 mb-1 flex items-center justify-center uppercase tracking-wide text-shadow-sm">
        {card.name}
      </div>

      {/* Art Area */}
      <div className="flex-1 flex items-center justify-center my-1 bg-black/40 rounded-lg border border-white/5 relative overflow-hidden group shadow-inner">
         <Icon size={56} className="text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] group-hover:scale-110 transition-transform duration-500" />
      </div>

      {/* Description */}
      <div className="text-center text-xs text-slate-200 font-medium leading-relaxed h-14 flex items-center justify-center px-1">
        {card.description}
      </div>
      
      {/* Footer */}
      <div className="mt-1 flex justify-between items-center text-[9px] text-slate-500 uppercase font-bold">
        <span>{card.type}</span>
        {card.exhaust && <span className="text-slate-400">Exhaust</span>}
      </div>
    </div>
  );
};

const EntityDisplay = ({ entity, isPlayer, intent, shake }: { entity: Player | Enemy, isPlayer: boolean, intent?: EnemyIntentType, shake?: boolean }) => {
  const hpPercent = Math.max(0, (entity.currentHp / entity.maxHp) * 100);
  
  return (
    <div className={`flex flex-col items-center w-48 relative transition-transform ${shake ? 'animate-shake' : ''} ${!isPlayer ? 'animate-float' : ''}`}>
      <div className="relative mb-4">
        {/* Avatar */}
        <div className={`text-7xl filter drop-shadow-2xl transition-all ${!isPlayer ? 'scale-x-[-1]' : ''}`}>
           {isPlayer ? '🛡️' : (entity as Enemy).imageEmoji}
        </div>

        {/* Block Badge */}
        {entity.block > 0 && (
          <div className="absolute -bottom-2 -right-2 bg-blue-600 border-2 border-blue-300 text-white rounded-full min-w-[2.5rem] h-10 px-2 flex items-center justify-center font-bold shadow-lg z-10 animate-pulse">
            <Shield size={14} className="mr-1 fill-current" /> {entity.block}
          </div>
        )}

        {/* Status Effects */}
        <div className="absolute -left-8 top-0 flex flex-col gap-1">
          {entity.vulnerable > 0 && (
            <div className="bg-purple-900/80 border border-purple-500 text-purple-200 text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm" title="Takes 50% more damage">
               <Skull size={10} /> {entity.vulnerable}
            </div>
          )}
        </div>

        {/* Intent Bubble (Enemy Only) */}
        {!isPlayer && intent && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-500 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg z-20 min-w-[60px] justify-center enemy-intent">
             {intent === "ATTACK" && <><Sword size={18} className="text-red-400" /><span className="text-lg font-bold text-white">{(entity as Enemy).intentValue}</span></>}
             {intent === "DEFEND" && <><Shield size={18} className="text-blue-400" /></>}
             {intent === "BUFF" && <><Sparkles size={18} className="text-yellow-400" /></>}
             {intent === "UNKNOWN" && <><HelpCircle size={18} className="text-slate-400" /></>}
          </div>
        )}
      </div>

      {/* Health Bar */}
      <div className="w-full bg-slate-900 h-5 rounded-full border-2 border-slate-700 overflow-hidden relative shadow-inner">
        <div 
          className="h-full bg-gradient-to-r from-red-800 via-red-600 to-red-500 transition-all duration-500 ease-out"
          style={{ width: `${hpPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white shadow-black drop-shadow-md tracking-wider">
          {entity.currentHp} / {entity.maxHp}
        </div>
      </div>
      
      {/* Name */}
      <div className="mt-2 font-fantasy text-xl font-bold text-slate-200 tracking-wide text-shadow">
        {isPlayer ? "Ironclad" : (entity as Enemy).name}
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  // Global State
  const [phase, setPhase] = useState<GamePhase>("MENU");
  const [floor, setFloor] = useState(1);
  const [messages, setMessages] = useState<string[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  
  // Player State
  const [deck, setDeck] = useState<Card[]>([]);
  const [player, setPlayer] = useState<Player>({
    maxHp: 80,
    currentHp: 80,
    block: 0,
    vulnerable: 0,
    weak: 0,
    energy: 3,
    gold: 0,
  });

  // Battle State (Unified)
  const [battleState, setBattleState] = useState<BattleState>({
    draw: [],
    hand: [],
    discard: [],
    exhaust: []
  });
  
  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [turn, setTurn] = useState(0); 
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeEnemy, setShakeEnemy] = useState(false);
  
  // Timers Refs for cleanup
  const battleTimers = useRef<NodeJS.Timeout[]>([]);

  // Event State
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);

  const playerRef = useRef(player);
  useEffect(() => { playerRef.current = player; }, [player]);

  // Cleanup timers on unmount or phase change
  useEffect(() => {
    return () => clearBattleTimers();
  }, []);

  const clearBattleTimers = () => {
    battleTimers.current.forEach(t => clearTimeout(t));
    battleTimers.current = [];
  };

  const safeTimeout = (fn: () => void, delay: number) => {
    const t = setTimeout(() => {
       fn();
       // Remove from ref if needed, but array growth is negligible per battle
    }, delay);
    battleTimers.current.push(t);
  };

  // --- Visual Helpers ---

  const addFloatingText = (text: string, x: number, y: number, color: string = "text-white") => {
    const id = generateUUID();
    setFloatingTexts(prev => [...prev, { id, text, x, y, color }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 1000);
  };

  const triggerShake = (target: "PLAYER" | "ENEMY") => {
    if (target === "PLAYER") {
      setShakePlayer(true);
      setTimeout(() => setShakePlayer(false), 300);
    } else {
      setShakeEnemy(true);
      setTimeout(() => setShakeEnemy(false), 300);
    }
  };

  // --- Core Game Logic ---

  const initGame = () => {
    const starterCards = STARTING_DECK.map(c => ({ ...c, instanceId: generateUUID() }));
    setDeck(starterCards);
    setPlayer({
      maxHp: 80,
      currentHp: 80,
      block: 0,
      vulnerable: 0,
      weak: 0,
      energy: 3,
      gold: 0,
    });
    setFloor(1);
    setPhase("MAP");
    setMessages([]);
    log("Welcome to the spire.");
  };

  const startBattle = () => {
    clearBattleTimers();
    
    // Pick Enemy
    const enemyData = ENEMIES[Math.min(Math.floor((floor - 1) / 3), ENEMIES.length - 1)];
    const hpVariance = Math.floor(Math.random() * 6) - 3;
    const newEnemy: Enemy = {
      ...enemyData,
      maxHp: enemyData.maxHp + hpVariance,
      currentHp: enemyData.maxHp + hpVariance,
      block: 0,
      vulnerable: 0,
      weak: 0,
      intent: "UNKNOWN",
      intentValue: 0,
    };
    
    // Init Battle Decks with NEW INSTANCE IDs to prevent collisions/stale state
    const battleDeck = deck.map(c => ({ ...c, instanceId: generateUUID() }));
    const shuffledDraw = shuffle(battleDeck);

    // Atomic State Update
    setBattleState({
        draw: shuffledDraw,
        hand: [],
        discard: [],
        exhaust: []
    });
    
    setEnemy(pickEnemyIntent(newEnemy, 1));
    setTurn(1); 
    setIsPlayerTurn(true);
    setPhase("BATTLE");
    // Explicitly reset Energy here, ensures new battle starts fresh
    setPlayer(p => ({ ...p, block: 0, energy: MAX_ENERGY, vulnerable: 0, weak: 0 }));
  };

  // Turn Start Logic (Draws cards)
  useEffect(() => {
    if (phase === "BATTLE" && turn > 0) {
        setIsPlayerTurn(true);
        // Ensure energy is refreshed at start of turn 2+ (Turn 1 handled in startBattle, but safe to redo)
        if (turn > 1) {
            setPlayer(p => ({ ...p, energy: MAX_ENERGY, block: 0 }));
        }
        drawCards(HAND_SIZE);
    }
  }, [turn, phase]);

  const pickEnemyIntent = (enemyState: Enemy, turnCount: number): Enemy => {
    const r = Math.random();
    let type: EnemyIntentType = "ATTACK";
    let val = 0;

    // Logic: Mostly attack, sometimes defend or buff
    if (r < 0.65) {
      type = "ATTACK";
      const baseDmg = Math.floor(Math.random() * (5 + floor)) + 6;
      val = baseDmg;
    } else if (r < 0.9) {
      type = "DEFEND";
      val = 6 + Math.floor(floor * 1.5);
    } else {
      type = "BUFF";
      val = 0; 
    }

    return { ...enemyState, intent: type, intentValue: val };
  };

  // Robust Draw Function using BattleState
  const drawCards = (count: number) => {
    setBattleState(prev => {
        let newDraw = [...prev.draw];
        let newDiscard = [...prev.discard];
        let newHand = [...prev.hand];
        
        // Safety check for hand size
        if (newHand.length >= MAX_HAND_SIZE) {
            addFloatingText("Hand Full!", 50, 80, "text-red-400");
            return prev;
        }

        let cardsToDraw = count;
        
        while (cardsToDraw > 0 && newHand.length < MAX_HAND_SIZE) {
            if (newDraw.length === 0) {
                if (newDiscard.length === 0) break; // No cards left
                newDraw = shuffle(newDiscard);
                newDiscard = [];
                // We can't log easily inside setState without side effects, so we skip log or use useEffect to detect change
            }
            
            const card = newDraw.pop();
            if (card) {
                newHand.push(card);
                cardsToDraw--;
            }
        }

        return {
            draw: newDraw,
            hand: newHand,
            discard: newDiscard,
            exhaust: prev.exhaust
        };
    });
  };

  const playCard = (card: Card) => {
    if (!isPlayerTurn) return;
    if (player.energy < card.cost) {
      addFloatingText("No Energy!", 30, 70, "text-red-500");
      return;
    }

    // Pay Cost
    setPlayer(p => ({ ...p, energy: Math.max(0, p.energy - card.cost) }));

    // Move Card (Atomic Update)
    setBattleState(prev => {
        const newHand = prev.hand.filter(c => c.instanceId !== card.instanceId);
        // Check if exhaust
        if (card.exhaust) {
            addFloatingText("Exhausted", 10, 80, "text-slate-400");
            return { ...prev, hand: newHand, exhaust: [...prev.exhaust, card] };
        } else {
            return { ...prev, hand: newHand, discard: [...prev.discard, card] };
        }
    });

    // Execute Effect
    if (card.type === "ATTACK" && enemy) {
      let damage = card.value;
      
      if (enemy.vulnerable > 0) {
        damage = Math.floor(damage * 1.5);
      }

      let actualDamage = Math.max(0, damage - enemy.block);
      let blockDamage = Math.min(enemy.block, damage);
      
      if (blockDamage > 0) addFloatingText(`Blocked ${blockDamage}`, 70, 45, "text-blue-300");
      if (actualDamage > 0) {
        addFloatingText(`-${actualDamage}`, 70, 40, "text-red-500 font-bold text-3xl");
        triggerShake("ENEMY");
      }

      let newVulnerable = enemy.vulnerable;
      if (card.id === "bash") newVulnerable += 2;

      let healedAmount = 0;
      if (card.id === "feed" && enemy.currentHp - actualDamage <= 0) {
        healedAmount = 3;
      }

      const updatedEnemy = {
        ...enemy,
        block: enemy.block - blockDamage,
        currentHp: Math.max(0, enemy.currentHp - actualDamage),
        vulnerable: newVulnerable
      };

      setEnemy(updatedEnemy);
      
      if (healedAmount > 0) {
        setPlayer(p => ({ ...p, maxHp: p.maxHp + healedAmount, currentHp: p.currentHp + healedAmount }));
        addFloatingText(`+${healedAmount} Max HP`, 30, 40, "text-green-400");
      }

      if (updatedEnemy.currentHp <= 0) {
        setIsPlayerTurn(false);
        clearBattleTimers();
        safeTimeout(handleVictory, 800);
      }

    } else if (card.type === "SKILL") {
      let blockGain = card.value;
      
      if (blockGain > 0) {
        setPlayer(p => ({ ...p, block: p.block + blockGain }));
        addFloatingText(`+${blockGain} Block`, 30, 45, "text-blue-400 font-bold");
      }

      if (card.description.includes("Draw")) {
         // Tiny delay to ensure state updates from playCard allow draw
         safeTimeout(() => drawCards(1), 50);
      }
    }
  };

  const endTurn = () => {
    if (!isPlayerTurn) return;
    setIsPlayerTurn(false);

    // Discard Hand
    setBattleState(prev => ({
        ...prev,
        hand: [],
        discard: [...prev.discard, ...prev.hand]
    }));

    // Enemy Turn Logic
    if (enemy && enemy.currentHp > 0) {
      safeTimeout(() => {
        
        // Enemy Action
        if (enemy.intent === "ATTACK") {
          let damage = enemy.intentValue;
          
          if (player.vulnerable > 0) {
            damage = Math.floor(damage * 1.5);
          }

          const blockBlocked = Math.min(player.block, damage);
          const hpDamage = Math.max(0, damage - blockBlocked);

          if (blockBlocked > 0) addFloatingText(`Blocked ${blockBlocked}`, 30, 45, "text-blue-300");
          if (hpDamage > 0) {
             setPlayer(p => {
               const newHp = Math.max(0, p.currentHp - hpDamage);
               if (newHp <= 0) safeTimeout(() => setPhase("GAME_OVER"), 1000);
               return { ...p, currentHp: newHp };
             });
             addFloatingText(`-${hpDamage}`, 30, 40, "text-red-600 font-bold text-4xl");
             triggerShake("PLAYER");
          } else {
             addFloatingText("Blocked!", 30, 40, "text-blue-200");
          }
        } else if (enemy.intent === "DEFEND") {
          const blockAmt = enemy.intentValue;
          setEnemy(e => e ? ({ ...e, block: e.block + blockAmt }) : null);
          addFloatingText(`+${blockAmt} Block`, 70, 45, "text-blue-300");
        } else if (enemy.intent === "BUFF") {
           addFloatingText("Strengthen!", 70, 30, "text-yellow-400");
        }

        // Cleanup & Setup Next Turn
        safeTimeout(() => {
          if (playerRef.current.currentHp > 0) {
            // Player Status Tick
            setPlayer(p => ({ 
              ...p, 
              // energy: MAX_ENERGY, // Moved to start of turn useEffect
              // block: 0, 
              vulnerable: Math.max(0, p.vulnerable - 1) 
            }));

            // Enemy Status Tick
            setEnemy(e => e ? ({
              ...pickEnemyIntent(e, turn + 1),
              block: 0,
              vulnerable: Math.max(0, e.vulnerable - 1)
            }) : null);

            setTurn(t => t + 1); // This triggers the useEffect to draw
          }
        }, 1200);

      }, 600);
    }
  };

  const handleVictory = () => {
    clearBattleTimers();
    setPhase("REWARD");
    setTurn(0); // Reset turn for next battle
    setIsPlayerTurn(false);
    const goldReward = Math.floor(Math.random() * 20) + 15;
    setPlayer(p => ({ ...p, gold: p.gold + goldReward }));
    setFloor(f => f + 1);
    addFloatingText(`+${goldReward} Gold`, 50, 50, "text-yellow-400 text-2xl");
  };

  const handleRewardPick = (card: Card) => {
    // Add to deck with a fresh ID (though startBattle also regens)
    setDeck(prev => [...prev, { ...card, instanceId: generateUUID() }]);
    setPhase("MAP");
  };

  const log = (msg: string) => {
    setMessages(prev => [msg, ...prev].slice(0, 3));
  };

  // --- Random Events (No Gemini) ---

  const triggerEvent = () => {
    setPhase("EVENT");
    setIsLoadingEvent(true);
    setCurrentEvent(null);

    // Simulate travel/loading time for effect
    setTimeout(() => {
      const randomEvent = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
      setCurrentEvent(randomEvent);
      setIsLoadingEvent(false);

      // Apply Effect immediately
      if (randomEvent.effectType === "HEAL") {
        setPlayer(p => ({ ...p, currentHp: Math.min(p.maxHp, p.currentHp + randomEvent.value) }));
        addFloatingText(`+${randomEvent.value} HP`, 50, 50, "text-green-400");
      } else if (randomEvent.effectType === "DAMAGE") {
        setPlayer(p => ({ ...p, currentHp: Math.max(1, p.currentHp - randomEvent.value) }));
        addFloatingText(`-${randomEvent.value} HP`, 50, 50, "text-red-500");
        triggerShake("PLAYER");
      } else if (randomEvent.effectType === "GOLD") {
        setPlayer(p => ({ ...p, gold: Math.max(0, p.gold + randomEvent.value) }));
        const color = randomEvent.value >= 0 ? "text-yellow-400" : "text-red-400";
        const sign = randomEvent.value >= 0 ? "+" : "";
        addFloatingText(`${sign}${randomEvent.value} Gold`, 50, 50, color);
      }
    }, 1000);
  };

  const handleEventContinue = () => {
    setFloor(f => f + 1);
    setPhase("MAP");
  };

  // --- Rendering ---

  if (phase === "MENU") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-100 backdrop-blur-sm bg-black/40 z-50">
        <h1 className="text-9xl font-fantasy font-black mb-2 text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-slate-900 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
          SHADOW DECK
        </h1>
        <p className="text-2xl text-slate-400 mb-16 font-light tracking-[0.5em] uppercase">Ascend the Spire</p>
        <button 
          onClick={initGame}
          className="group relative px-16 py-5 bg-slate-900 border border-slate-700 hover:border-red-600 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-red-900/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <span className="relative font-fantasy text-3xl tracking-widest flex items-center gap-4 group-hover:text-red-100 transition-colors">
            <Play size={28} className="fill-current" /> PLAY
          </span>
        </button>
      </div>
    );
  }

  if (phase === "GAME_OVER" || phase === "VICTORY") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-100 bg-black/90 z-50">
        <h1 className={`text-7xl font-fantasy mb-8 ${phase === "VICTORY" ? "text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" : "text-red-700 drop-shadow-[0_0_20px_rgba(185,28,28,0.5)]"}`}>
          {phase === "VICTORY" ? "VICTORY UNLOCKED" : "YOU DIED"}
        </h1>
        <div className="bg-slate-900 p-8 rounded border border-slate-800 text-center mb-8 min-w-[300px]">
           <p className="text-slate-400 uppercase tracking-widest text-sm mb-2">Floor Reached</p>
           <p className="text-6xl font-black text-white">{floor}</p>
        </div>
        <button 
          onClick={() => setPhase("MENU")}
          className="px-10 py-4 border border-slate-600 hover:bg-slate-800 rounded font-fantasy tracking-wider hover:border-white transition-all"
        >
          RETURN TO MENU
        </button>
      </div>
    );
  }

  if (phase === "MAP") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-100 bg-black/60 backdrop-blur-md">
        <div className="bg-slate-950/90 p-12 rounded-lg border border-slate-800 shadow-2xl max-w-2xl w-full text-center relative overflow-hidden">
          {/* Decorative Bg */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-500 to-transparent opacity-20"></div>

          <h2 className="text-4xl font-fantasy mb-12 text-slate-200 tracking-widest">
            FLOOR <span className="text-red-500">{floor}</span>
          </h2>
          
          <div className="grid grid-cols-2 gap-8 mb-12">
            <button 
              onClick={startBattle}
              className="h-56 rounded bg-gradient-to-t from-slate-900 to-slate-800 border border-slate-700 hover:border-red-500 hover:from-red-950/30 flex flex-col items-center justify-center gap-6 group transition-all duration-300"
            >
              <div className="p-5 rounded-full bg-black/40 group-hover:scale-110 transition-transform border border-slate-700 group-hover:border-red-500/50">
                 <Sword size={48} className="text-slate-400 group-hover:text-red-500 transition-colors" />
              </div>
              <span className="font-fantasy text-2xl text-slate-300 group-hover:text-red-100">BATTLE</span>
            </button>

            <button 
              onClick={triggerEvent}
              className="h-56 rounded bg-gradient-to-t from-slate-900 to-slate-800 border border-slate-700 hover:border-purple-500 hover:from-purple-950/30 flex flex-col items-center justify-center gap-6 group transition-all duration-300"
            >
              <div className="p-5 rounded-full bg-black/40 group-hover:scale-110 transition-transform border border-slate-700 group-hover:border-purple-500/50">
                 <Search size={48} className="text-slate-400 group-hover:text-purple-500 transition-colors" />
              </div>
              <span className="font-fantasy text-2xl text-slate-300 group-hover:text-purple-100">EVENT</span>
            </button>
          </div>

          <div className="flex justify-center gap-8 text-sm font-mono text-slate-500 border-t border-slate-800 pt-6">
             <span className="flex items-center gap-2"><Heart size={16} /> {player.currentHp}/{player.maxHp}</span>
             <span className="flex items-center gap-2"><span className="text-yellow-500">$</span> {player.gold}</span>
             <span className="flex items-center gap-2"><RotateCcw size={16} /> {deck.length} Cards</span>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "EVENT") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-100 bg-black/80 backdrop-blur-md p-8">
        {isLoadingEvent ? (
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="relative">
                <Sparkles size={64} className="text-purple-400 animate-spin-slow" />
                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20"></div>
            </div>
            <p className="font-fantasy text-2xl tracking-widest text-purple-200">DIVINING...</p>
          </div>
        ) : currentEvent && (
          <div className="max-w-xl w-full bg-slate-900 border border-slate-700 p-10 rounded shadow-2xl relative text-center flex flex-col items-center">
             <div className="mb-6 p-4 rounded-full bg-slate-800 border border-slate-600">
               {currentEvent.effectType === "HEAL" && <Heart size={48} className="text-green-400" />}
               {currentEvent.effectType === "DAMAGE" && <Skull size={48} className="text-red-400" />}
               {currentEvent.effectType === "GOLD" && <span className="text-4xl">💰</span>}
             </div>

             <h2 className="text-4xl font-fantasy mb-6 text-purple-200">{currentEvent.title}</h2>
             <p className="text-xl text-slate-300 leading-relaxed mb-8 font-serif italic">
               "{currentEvent.description}"
             </p>
             
             <div className="mb-8 font-bold text-lg">
                {currentEvent.effectType === "HEAL" && <span className="text-green-400">Restored {currentEvent.value} HP</span>}
                {currentEvent.effectType === "DAMAGE" && <span className="text-red-400">Took {currentEvent.value} Damage</span>}
                {currentEvent.effectType === "GOLD" && (
                    <span className={currentEvent.value > 0 ? "text-yellow-400" : "text-red-400"}>
                        {currentEvent.value > 0 ? "Gained" : "Lost"} {Math.abs(currentEvent.value)} Gold
                    </span>
                )}
             </div>

             <button 
               onClick={handleEventContinue}
               className="px-12 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-purple-400 rounded transition-all font-fantasy tracking-widest text-lg group"
             >
               <span className="group-hover:text-purple-200 transition-colors">{currentEvent.buttonText}</span>
             </button>
          </div>
        )}
      </div>
    );
  }

  if (phase === "REWARD") {
    const rewards = CARD_POOL.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black/90 backdrop-blur-xl z-50 absolute inset-0">
        <h2 className="text-5xl font-fantasy text-yellow-500 mb-12 drop-shadow-lg tracking-widest">CHOOSE REWARD</h2>
        <div className="flex gap-10 mb-16 perspective-[1000px]">
           {rewards.map((card, i) => (
             <div key={i} className="hover:scale-110 transition-transform duration-300">
                <CardComponent 
                    card={card} 
                    playable={true} 
                    disabled={false} 
                    onClick={() => handleRewardPick(card)} 
                />
             </div>
           ))}
        </div>
        <button onClick={() => setPhase("MAP")} className="text-slate-500 hover:text-white text-lg tracking-widest hover:underline">SKIP REWARD</button>
      </div>
    );
  }

  // --- Battle Scene ---
  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      
      {/* Floating Combat Text Layer */}
      {floatingTexts.map(ft => (
        <div 
            key={ft.id}
            className={`absolute z-50 pointer-events-none animate-damage-number ${ft.color} text-shadow-md`}
            style={{ left: `${ft.x}%`, top: `${ft.y}%` }}
        >
            {ft.text}
        </div>
      ))}

      {/* Top HUD */}
      <div className="h-20 bg-gradient-to-b from-slate-900/90 to-transparent flex items-center justify-between px-10 text-slate-200 z-10">
        <div className="flex items-center gap-8 font-bold text-lg">
           <div className="flex items-center gap-2 text-red-400 bg-slate-900/50 px-3 py-1 rounded-full border border-red-900/30">
             <Heart size={20} fill="currentColor" /> {player.currentHp}/{player.maxHp}
           </div>
           <div className="flex items-center gap-2 text-yellow-400 bg-slate-900/50 px-3 py-1 rounded-full border border-yellow-900/30">
             <Zap size={20} fill="currentColor" /> {player.energy}/{MAX_ENERGY}
           </div>
           <div className="flex items-center gap-2 text-amber-300 ml-4">
             <span className="text-yellow-500">$</span> {player.gold}
           </div>
        </div>
        <div className="font-fantasy tracking-[0.2em] text-slate-500 text-xl">FLOOR {floor}</div>
      </div>

      {/* Battle Arena */}
      <div className="flex-1 relative flex items-center justify-center gap-48 pb-32">
         {/* Player */}
         <EntityDisplay entity={player} isPlayer={true} shake={shakePlayer} />
         
         {/* VS */}
         <div className="text-slate-800 opacity-20 text-[12rem] font-black italic absolute select-none pointer-events-none transform -skew-x-12">VS</div>

         {/* Enemy */}
         {enemy && <EntityDisplay entity={enemy} isPlayer={false} intent={enemy.intent} shake={shakeEnemy} />}
      </div>

      {/* Hand / Controls Area */}
      <div className="absolute bottom-0 w-full h-[22rem] bg-gradient-to-t from-black via-slate-950/95 to-transparent flex flex-col items-center justify-end pb-6 z-20">
        
        {/* Piles */}
        <div className="absolute bottom-6 left-10 text-slate-500 font-bold flex flex-col items-center gap-2 group cursor-help">
          <div className="relative transition-transform group-hover:-translate-y-2">
            <div className="w-16 h-20 bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center text-xl shadow-lg">
               {battleState.draw.length}
            </div>
            {[1,2].map(i => <div key={i} className={`absolute inset-0 border border-slate-700 bg-slate-800 rounded -z-10 rotate-${i*3}`} style={{ transform: `rotate(${i*4}deg)` }}></div>)}
          </div>
          <span className="text-[10px] uppercase tracking-widest">Draw</span>
        </div>

        <div className="absolute bottom-6 right-10 text-slate-500 font-bold flex flex-col items-center gap-2 group cursor-help">
           <div className="relative transition-transform group-hover:-translate-y-2">
             <div className="w-16 h-20 bg-slate-800 border-2 border-slate-600 rounded flex items-center justify-center text-xl shadow-lg">
                {battleState.discard.length}
             </div>
             {[1,2].map(i => <div key={i} className={`absolute inset-0 border border-slate-700 bg-slate-800 rounded -z-10 rotate-${i*-3}`} style={{ transform: `rotate(${i*-4}deg)` }}></div>)}
           </div>
           <span className="text-[10px] uppercase tracking-widest">Discard</span>
        </div>

        {/* Hand */}
        <div className="flex items-end justify-center mb-10 h-64 w-full max-w-4xl mx-auto perspective-[1000px]">
           {battleState.hand.map((card, index) => {
             // Improved fan logic
             const total = battleState.hand.length;
             const center = (total - 1) / 2;
             const rotation = (index - center) * 4;
             const translateY = Math.abs(index - center) * 6;
             const translateX = (index - center) * -20;
             
             return (
               <div 
                key={card.instanceId} 
                style={{ 
                  transform: `rotate(${rotation}deg) translateY(${translateY}px) translateX(${translateX}px)`,
                  zIndex: index + 10,
                  transformOrigin: "bottom center"
                }}
                className={`transition-all duration-300 ${isPlayerTurn ? "hover:!translate-y-[-50px] hover:!rotate-0 hover:!z-50 hover:scale-110" : ""}`}
               >
                 <CardComponent 
                   card={card} 
                   playable={isPlayerTurn && player.energy >= card.cost} 
                   disabled={!isPlayerTurn} 
                   onClick={() => playCard(card)} 
                 />
               </div>
             );
           })}
        </div>

        {/* End Turn */}
        <button 
          onClick={endTurn}
          disabled={!isPlayerTurn}
          className={`
             absolute right-36 bottom-12 px-8 py-3 font-bold uppercase tracking-widest rounded shadow-[0_0_15px_rgba(220,38,38,0.5)] border transition-all active:scale-95 active:shadow-none
             ${isPlayerTurn 
               ? "bg-red-900 hover:bg-red-700 text-red-100 border-red-500" 
               : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed grayscale"}
          `}
        >
          {isPlayerTurn ? "End Turn" : "Enemy Turn"}
        </button>

        {/* Combat Log */}
        <div className="absolute top-[-150px] left-10 w-64 pointer-events-none">
           {messages.map((msg, i) => (
             <div key={i} className="mb-2 text-sm text-slate-300 text-shadow bg-black/40 px-2 py-1 rounded inline-block animate-float-up">
               {msg}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);