import React, { memo } from "react";
import { Sword, Shield, Zap, Heart, Skull, Sparkles, HelpCircle, Star } from "lucide-react";
import { Card as CardType, Player, Enemy, EnemyIntentType, FloatingText, Relic, Potion } from "./types";
import { useT } from "./i18n";

// ============ Card Component ============

export const CardComponent: React.FC<{
  card: CardType;
  onClick: () => void;
  disabled: boolean;
  playable: boolean;
  small?: boolean;
}> = memo(({ card, onClick, disabled, playable, small }) => {
  const { t, tCard } = useT();
  const cardInfo = tCard(card.id);
  const getBorderColor = () => {
    if (card.upgraded) return "border-green-400 shadow-green-500/50";
    switch (card.rarity) {
      case "LEGENDARY": return "border-yellow-400 shadow-yellow-500/50";
      case "RARE": return "border-blue-400 shadow-blue-500/50";
      default: return card.type === "ATTACK" ? "border-red-800" : "border-slate-600";
    }
  };

  const getBgColor = () => {
    if (card.type === "ATTACK") return "bg-gradient-to-br from-red-950 to-slate-900";
    if (card.type === "SKILL") return "bg-gradient-to-br from-blue-950 to-slate-900";
    return "bg-gradient-to-br from-purple-950 to-slate-900";
  };

  const Icon = card.type === "ATTACK" ? Sword : card.type === "SKILL" ? Shield : Zap;
  const w = small ? "w-32" : "w-40";
  const h = small ? "h-48" : "h-60";

  return (
    <div
      onClick={!disabled && playable ? onClick : undefined}
      className={`
        relative ${w} ${h} rounded-xl border-[3px] ${getBorderColor()} ${getBgColor()}
        flex flex-col p-3 select-none transition-all duration-200 shadow-xl overflow-hidden
        ${playable && !disabled ? "cursor-pointer card-hover hover:border-white hover:-translate-y-2 hover:shadow-2xl" : "opacity-60 grayscale-[0.8] cursor-not-allowed transform scale-95"}
      `}
    >
      {/* Cost Badge */}
      <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-slate-900 border-2 border-blue-500 text-blue-300 flex items-center justify-center font-bold shadow-lg z-10 text-lg font-fantasy">
        {card.cost === -1 ? "X" : card.cost}
      </div>

      {/* Upgraded Star */}
      {card.upgraded && (
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green-600 border-2 border-green-300 flex items-center justify-center z-10 shadow-lg">
          <Star size={14} className="text-white fill-current" />
        </div>
      )}

      {/* Name */}
      <div className={`text-center font-fantasy font-bold ${small ? "text-xs" : "text-sm"} mt-3 text-slate-100 mb-1 flex items-center justify-center uppercase tracking-wide text-shadow-sm`}>
        {card.upgraded ? cardInfo.name + "+" : cardInfo.name}
      </div>

      {/* Art Area */}
      <div className="flex-1 flex items-center justify-center my-1 bg-black/40 rounded-lg border border-white/5 relative overflow-hidden group shadow-inner">
        <Icon size={small ? 40 : 56} className="text-white/80 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] group-hover:scale-110 transition-transform duration-500" />
      </div>

      {/* Description */}
      <div className={`text-center ${small ? "text-[10px]" : "text-xs"} text-slate-200 font-medium leading-relaxed h-14 flex items-center justify-center px-1`}>
        {card.upgraded ? (card.upgradedDescription || cardInfo.desc) : cardInfo.desc}
      </div>

      {/* Footer */}
      <div className="mt-1 flex justify-between items-center text-[9px] text-slate-500 uppercase font-bold">
        <span>{t(`cardTypes.${card.type.toLowerCase()}`)}</span>
        <div className="flex gap-1">
          {card.exhaust && <span className="text-slate-400">{t("cardTypes.exhaust")}</span>}
          {card.upgraded && <span className="text-green-400">{t("cardTypes.upgraded")}</span>}
        </div>
      </div>
    </div>
  );
});

// ============ Entity Display ============

export const EntityDisplay: React.FC<{
  entity: Player | Enemy;
  isPlayer: boolean;
  intent?: EnemyIntentType;
  intentValue?: number;
  shake?: boolean;
  strength?: number;
}> = memo(({ entity, isPlayer, intent, intentValue, shake, strength }) => {
  const { t, tEnemyName } = useT();
  const hpPercent = Math.max(0, (entity.currentHp / entity.maxHp) * 100);

  return (
    <div className={`flex flex-col items-center w-48 relative transition-transform ${shake ? "animate-shake" : ""} ${!isPlayer ? "animate-float" : ""}`}>
      <div className="relative mb-4">
        <div className={`text-7xl filter drop-shadow-2xl transition-all ${!isPlayer ? "scale-x-[-1]" : ""}`}>
          {isPlayer ? "🛡️" : (entity as Enemy).imageEmoji}
        </div>

        {/* Block */}
        {entity.block > 0 && (
          <div className="absolute -bottom-2 -right-2 bg-blue-600 border-2 border-blue-300 text-white rounded-full min-w-[2.5rem] h-10 px-2 flex items-center justify-center font-bold shadow-lg z-10 animate-pulse">
            <Shield size={14} className="mr-1 fill-current" /> {entity.block}
          </div>
        )}

        {/* Status Effects */}
        <div className="absolute -left-8 top-0 flex flex-col gap-1">
          {entity.vulnerable > 0 && (
            <div className="bg-purple-900/80 border border-purple-500 text-purple-200 text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm" title={t("status.vulnerable")}>
              <Skull size={10} /> {entity.vulnerable}
            </div>
          )}
          {entity.weak > 0 && (
            <div className="bg-slate-700/80 border border-slate-500 text-slate-200 text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm" title={t("status.weak")}>
              💔 {entity.weak}
            </div>
          )}
          {strength !== undefined && strength > 0 && (
            <div className="bg-red-900/80 border border-red-500 text-red-200 text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm" title={t("status.strength")}>
              💪 {strength}
            </div>
          )}
        </div>

        {/* Intent (Enemy) */}
        {!isPlayer && intent && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-500 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg z-20 min-w-[60px] justify-center enemy-intent">
            {intent === "ATTACK" && <><Sword size={18} className="text-red-400" /><span className="text-lg font-bold text-white">{intentValue ?? (entity as Enemy).intentValue}</span></>}
            {intent === "DEFEND" && <><Shield size={18} className="text-blue-400" /></>}
            {intent === "BUFF" && <><Sparkles size={18} className="text-yellow-400" /></>}
            {intent === "SPECIAL" && <><Zap size={18} className="text-purple-400" /><span className="text-lg font-bold text-white">{intentValue}</span></>}
            {intent === "UNKNOWN" && <><HelpCircle size={18} className="text-slate-400" /></>}
          </div>
        )}
      </div>

      {/* Health Bar */}
      <div className="w-full bg-slate-900 h-5 rounded-full border-2 border-slate-700 overflow-hidden relative shadow-inner">
        <div
          className={`h-full transition-all duration-500 ease-out ${isPlayer ? "bg-gradient-to-r from-green-800 via-green-600 to-green-500" : "bg-gradient-to-r from-red-800 via-red-600 to-red-500"}`}
          style={{ width: `${hpPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white shadow-black drop-shadow-md tracking-wider">
          {entity.currentHp} / {entity.maxHp}
        </div>
      </div>

      {/* Name */}
      <div className="mt-2 font-fantasy text-xl font-bold text-slate-200 tracking-wide text-shadow">
        {isPlayer ? "Ironclad" : tEnemyName((entity as Enemy).name)}
        {(entity as Enemy).isBoss && <span className="text-yellow-400 ml-1 text-sm">⭐{t("status.boss")}</span>}
      </div>
    </div>
  );
});

// ============ Floating Texts ============

export const FloatingTexts: React.FC<{ texts: FloatingText[] }> = memo(({ texts }) => (
  <>
    {texts.map((ft) => (
      <div
        key={ft.id}
        className={`absolute z-50 pointer-events-none animate-damage-number ${ft.color} text-shadow-md ${ft.size || "text-2xl"}`}
        style={{ left: `${ft.x}%`, top: `${ft.y}%` }}
      >
        {ft.text}
      </div>
    ))}
  </>
));

// ============ HUD ============

export const HUD: React.FC<{
  player: Player;
  floor: number;
  deckCount: number;
  turn?: number;
}> = memo(({ player, floor, deckCount, turn }) => {
  const { t } = useT();
  return (
  <div className="h-16 bg-gradient-to-b from-slate-900/90 to-transparent flex items-center justify-between px-10 text-slate-200 z-10">
    <div className="flex items-center gap-6 font-bold text-sm">
      <div className="flex items-center gap-2 text-red-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-red-900/30">
        <Heart size={16} fill="currentColor" /> {player.currentHp}/{player.maxHp}
      </div>
      <div className="flex items-center gap-2 text-yellow-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-yellow-900/30">
        <Zap size={16} fill="currentColor" /> {player.energy}/{player.maxEnergy}
      </div>
      <div className="flex items-center gap-2 text-amber-300">
        <span className="text-yellow-500">$</span> {player.gold}
      </div>
      <div className="flex items-center gap-2 text-slate-400">
        🃏 {deckCount}
      </div>
    </div>
    <div className="flex items-center gap-6 font-fantasy tracking-[0.2em] text-slate-500 text-lg">
      {turn !== undefined && turn > 0 && <span>{t("battle.turn")} {turn}</span>}
      <span>{t("map.floor")} {floor}</span>
    </div>
  </div>
  );
});

// ============ Relic Display ============

export const RelicDisplay: React.FC<{ relics: Relic[]; potions: Potion[] }> = memo(({ relics, potions }) => {
  const { tRelic, tPotion } = useT();
  return (
  <div className="absolute top-24 left-4 flex flex-col gap-1 z-10">
    {relics.map((relic) => {
      const ri = tRelic(relic.id);
      return (
      <div key={relic.id} className="group relative" title={ri.desc}>
        <div className="w-10 h-10 bg-slate-900/80 border border-slate-600 rounded-lg flex items-center justify-center text-lg cursor-help hover:border-yellow-500 transition-colors">
          {relic.emoji}
        </div>
        <div className="absolute left-12 top-0 bg-slate-900 border border-slate-600 rounded-lg p-2 text-xs text-slate-200 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <div className="font-bold text-yellow-400">{ri.name}</div>
          <div>{ri.desc}</div>
        </div>
      </div>
      );
    })}
    {potions.map((potion, i) => {
      const pi = tPotion(potion.id);
      return (
      <div key={`potion-${i}`} className="group relative" title={pi.desc}>
        <div className="w-10 h-10 bg-purple-900/80 border border-purple-600 rounded-lg flex items-center justify-center text-lg cursor-help hover:border-purple-300 transition-colors">
          {potion.emoji}
        </div>
        <div className="absolute left-12 top-0 bg-slate-900 border border-purple-600 rounded-lg p-2 text-xs text-slate-200 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <div className="font-bold text-purple-400">{pi.name}</div>
          <div>{pi.desc}</div>
        </div>
      </div>
      );
    })}
  </div>
  );
});
