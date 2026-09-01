import React, { useEffect, useMemo, useRef } from "react";
import {
  CircleHelp,
  Coins,
  Crown,
  Flame,
  Gem,
  Heart,
  Layers3,
  MapPinned,
  ShieldAlert,
  ShoppingBag,
  Swords,
} from "lucide-react";
import { TowerNode, NodeType, getAccessibleNodes } from "./mapGen";
import { useT } from "./i18n";

interface TowerMapProps {
  floors: TowerNode[][];
  currentFloor: number;
  currentNodeId: string;
  onSelectNode: (node: TowerNode) => void;
  onViewDeck: () => void;
  deckCount: number;
  currentHp: number;
  maxHp: number;
  gold: number;
  relicsCount: number;
}

const FLOOR_HEIGHT = 112;
const MAP_PADDING = 64;
const MAP_X_MIN = 12;
const MAP_X_RANGE = 76;

const NODE_STYLES: Record<NodeType, string> = {
  BATTLE: "border-rose-700/80 bg-rose-950 text-rose-200",
  ELITE: "border-orange-500/80 bg-orange-950 text-orange-200",
  REST: "border-emerald-600/80 bg-emerald-950 text-emerald-200",
  SHOP: "border-yellow-600/80 bg-yellow-950 text-yellow-100",
  EVENT: "border-cyan-600/80 bg-cyan-950 text-cyan-100",
  TREASURE: "border-amber-400/80 bg-amber-950 text-amber-100",
  BOSS: "border-red-400 bg-red-950 text-red-100",
};

const NODE_ICONS: Record<NodeType, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  BATTLE: Swords,
  ELITE: ShieldAlert,
  REST: Flame,
  SHOP: ShoppingBag,
  EVENT: CircleHelp,
  TREASURE: Gem,
  BOSS: Crown,
};

const getNodeX = (node: TowerNode) => MAP_X_MIN + node.x * MAP_X_RANGE;
const getNodeY = (node: TowerNode, totalFloors: number) =>
  MAP_PADDING + (totalFloors - node.floor) * FLOOR_HEIGHT;

const TowerMap: React.FC<TowerMapProps> = ({
  floors,
  currentFloor,
  currentNodeId,
  onSelectNode,
  onViewDeck,
  deckCount,
  currentHp,
  maxHp,
  gold,
  relicsCount,
}) => {
  const { t } = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalFloors = floors.length;
  const mapHeight = Math.max(480, MAP_PADDING * 2 + (totalFloors - 1) * FLOOR_HEIGHT);
  const allNodes = useMemo(() => floors.flat(), [floors]);
  const nodeMap = useMemo(
    () => new Map(allNodes.map((node) => [node.id, node])),
    [allNodes],
  );
  const currentNode = nodeMap.get(currentNodeId);

  const accessibleIds = useMemo(() => {
    const ids = new Set<string>();
    if (currentNode && !currentNode.completed) {
      ids.add(currentNode.id);
      return ids;
    }
    getAccessibleNodes(floors, currentFloor, currentNodeId).forEach((node) => ids.add(node.id));
    return ids;
  }, [currentFloor, currentNode, currentNodeId, floors]);

  const connections = useMemo(() => allNodes.flatMap((source) =>
    source.connections.flatMap((targetId) => {
      const target = nodeMap.get(targetId);
      if (!target) return [];
      const available = source.id === currentNodeId && source.completed;
      const traversed = source.completed && target.reached;
      return [{ source, target, available, traversed }];
    })), [allNodes, currentNodeId, nodeMap]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !currentNode) return;
    const frameId = requestAnimationFrame(() => {
      const targetTop = getNodeY(currentNode, totalFloors) + 48 - container.clientHeight * 0.62;
      container.scrollTop = Math.max(0, targetTop);
    });
    return () => cancelAnimationFrame(frameId);
  }, [currentNode, totalFloors]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#080b10] text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(#64748b_0.7px,transparent_0.7px)] [background-size:18px_18px]" />

      <header className="relative z-20 flex min-h-16 shrink-0 items-center justify-between border-b border-slate-700/70 bg-[#0d1118]/95 px-4 shadow-xl md:px-8">
        <div className="flex min-w-0 items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2 text-rose-300" title={t("map.hp")}>
            <Heart size={17} strokeWidth={2.5} />
            <span className="font-mono text-sm font-bold">{currentHp}/{maxHp}</span>
          </div>
          <div className="flex items-center gap-2 text-amber-300" title={t("map.gold")}>
            <Coins size={18} />
            <span className="font-mono text-sm font-bold">{gold}</span>
          </div>
          {relicsCount > 0 && (
            <div className="hidden items-center gap-2 text-cyan-300 sm:flex" title={t("map.relics")}>
              <Gem size={17} />
              <span className="font-mono text-sm font-bold">{relicsCount}</span>
            </div>
          )}
        </div>

        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 text-slate-300 md:flex">
          <MapPinned size={18} className="text-amber-400" />
          <span className="font-fantasy text-sm tracking-widest">{t("map.choosePath")}</span>
        </div>

        <button
          onClick={onViewDeck}
          className="flex h-9 items-center gap-2 border border-slate-600 bg-slate-800/70 px-3 text-sm text-slate-200 transition-colors hover:border-slate-400 hover:bg-slate-700"
          title={t("map.viewDeck")}
        >
          <Layers3 size={17} />
          <span className="font-mono font-bold">{deckCount}</span>
          <span className="hidden sm:inline">{t("map.cards")}</span>
        </button>
      </header>

      <div ref={scrollRef} className="map-scroll relative z-10 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="pointer-events-none sticky top-0 z-20 h-12 bg-gradient-to-b from-[#080b10] to-transparent" />
        <div className="relative mx-auto w-full max-w-3xl" style={{ height: `${mapHeight}px` }}>
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 100 ${mapHeight}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {connections.map(({ source, target, available, traversed }) => (
              <line
                key={`${source.id}-${target.id}`}
                x1={getNodeX(source)}
                y1={getNodeY(source, totalFloors)}
                x2={getNodeX(target)}
                y2={getNodeY(target, totalFloors)}
                className={available ? "map-path map-path-available" : traversed ? "map-path map-path-traversed" : "map-path"}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {floors.map((floorNodes) => {
            const floorNumber = floorNodes[0]?.floor;
            if (!floorNumber) return null;
            const y = getNodeY(floorNodes[0], totalFloors);
            const isCurrentFloor = floorNumber === currentFloor;
            return (
              <React.Fragment key={floorNumber}>
                <div
                  className={`pointer-events-none absolute left-2 flex -translate-y-1/2 items-center gap-2 text-xs font-bold md:left-5 ${
                    isCurrentFloor ? "text-amber-300" : "text-slate-600"
                  }`}
                  style={{ top: `${y}px` }}
                >
                  <span className="w-5 text-right font-mono">{floorNumber}</span>
                  <span className={`h-px w-4 ${isCurrentFloor ? "bg-amber-400" : "bg-slate-700"}`} />
                </div>

                {floorNodes.map((node) => {
                  const NodeIcon = NODE_ICONS[node.type];
                  const isCurrent = node.id === currentNodeId;
                  const isAccessible = accessibleIds.has(node.id);
                  const isPast = node.floor < currentFloor;
                  const isBoss = node.type === "BOSS";
                  return (
                    <button
                      key={node.id}
                      onClick={() => isAccessible && onSelectNode(node)}
                      disabled={!isAccessible}
                      className={`map-node absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 ${
                        isBoss ? "h-16 w-16" : "h-14 w-14"
                      } ${NODE_STYLES[node.type]} ${
                        isCurrent ? "map-node-current" : ""
                      } ${isAccessible ? "map-node-accessible" : "cursor-default"} ${
                        isPast && !isCurrent ? "opacity-45" : ""
                      }`}
                      style={{ left: `${getNodeX(node)}%`, top: `${getNodeY(node, totalFloors)}px` }}
                      title={`${t(node.label)} · ${t("map.floor")} ${node.floor}`}
                      aria-label={`${t(node.label)}, ${t("map.floor")} ${node.floor}`}
                    >
                      <NodeIcon size={isBoss ? 28 : 22} strokeWidth={1.8} />
                      {node.completed && <span className="map-node-check" aria-label="Completed">✓</span>}
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
        <div className="pointer-events-none sticky bottom-0 z-20 h-16 bg-gradient-to-t from-[#080b10] to-transparent" />
      </div>

      <footer className="relative z-20 flex h-10 shrink-0 items-center justify-center border-t border-slate-800 bg-[#0d1118]/95 text-xs uppercase text-slate-500">
        <span className="tracking-widest">{t("map.floor")} </span>
        <span className="ml-2 font-mono font-bold text-amber-300">{currentFloor}</span>
        <span className="mx-2 text-slate-700">/</span>
        <span className="font-mono">{totalFloors}</span>
      </footer>
    </div>
  );
};

export default TowerMap;