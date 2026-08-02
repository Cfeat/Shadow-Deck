import React from "react";
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

const NODE_COLORS: Record<NodeType, string> = {
  BATTLE: "border-red-700 bg-red-950/60 hover:border-red-400",
  ELITE: "border-orange-600 bg-orange-950/60 hover:border-orange-300",
  REST: "border-green-700 bg-green-950/60 hover:border-green-400",
  SHOP: "border-yellow-700 bg-yellow-950/60 hover:border-yellow-400",
  EVENT: "border-purple-700 bg-purple-950/60 hover:border-purple-400",
  TREASURE: "border-amber-500 bg-amber-950/60 hover:border-amber-300",
  BOSS: "border-red-500 bg-red-950/80 hover:border-red-300 shadow-[0_0_15px_rgba(255,0,0,0.3)]",
};

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

  // Flatten all nodes for rendering, with connections for lines
  const allNodes = floors.flat();

  const accessibleNodes = getAccessibleNodes(floors, currentFloor, currentNodeId);
  const accessibleIds = new Set(accessibleNodes.map((n) => n.id));
  // Also include current node if not yet completed (player must click to enter)
  const curNode = allNodes.find(n => n.id === currentNodeId);
  if (curNode && !curNode.completed) {
    accessibleIds.add(curNode.id);
  }

  // Build a map for quick lookup
  const nodeMap = new Map<string, TowerNode>();
  allNodes.forEach((n) => nodeMap.set(n.id, n));

  // Calculate connection lines
  const connections: { x1: number; y1: number; x2: number; y2: number; active: boolean }[] = [];
  const currentFloorNodes = floors[currentFloor - 1] || [];
  const currentNode = currentFloorNodes.find((n) => n.id === currentNodeId);

  for (const floor of floors) {
    for (const node of floor) {
      if (node.connections.length === 0) continue;
      const nextFloor = floors[floor.findIndex((f) => f[0]?.floor === node.floor)];
      if (!nextFloor) continue;

      for (const connId of node.connections) {
        const target = nextFloor.find((n) => n.id === connId);
        if (!target) continue;

        const isActive =
          currentNode?.connections.includes(connId) ||
          (currentNodeId === node.id);

        connections.push({
          x1: node.x * 100,
          y1: (16 - node.floor) * 100, // invert: floor 1 at bottom
          x2: target.x * 100,
          y2: (16 - target.floor) * 100,
          active: isActive,
        });
      }
    }
  }

  // Only show floors near the player (current floor -1 to +2)
  const visibleFloors = floors.filter(
    (f) => f[0].floor >= currentFloor - 1 && f[0].floor <= currentFloor + 3,
  );

  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-100 bg-black/60 backdrop-blur-md p-4">
      {/* Stats bar */}
      <div className="absolute top-4 w-full flex justify-center gap-8 text-sm font-mono text-slate-400 z-10">
        <span>❤️ {currentHp}/{maxHp}</span>
        <span className="text-yellow-500">${gold}</span>
        <button onClick={onViewDeck} className="hover:text-slate-200 transition-colors">
          🃏 {deckCount} {t("map.cards")}
        </button>
        {relicsCount > 0 && <span>🏺 {relicsCount}</span>}
      </div>

      {/* Tower Map */}
      <div className="relative w-full max-w-md flex-1 flex flex-col justify-center items-center overflow-hidden">
        <div
          className="relative"
          style={{
            width: "320px",
            height: `${visibleFloors.length * 90 + 40}px`,
          }}
        >
          {/* Connection lines (SVG overlay) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {connections
              .filter((c) => {
                const fy1 = 16 - c.y1 / 100;
                const fy2 = 16 - c.y2 / 100;
                return (
                  fy1 >= currentFloor - 1 &&
                  fy1 <= currentFloor + 3 &&
                  fy2 >= currentFloor - 1 &&
                  fy2 <= currentFloor + 3
                );
              })
              .map((c, i) => {
                const baseY = 45;
                const y1 = baseY + ((16 - c.y1 / 100) - (currentFloor - 1)) * 90;
                const y2 = baseY + ((16 - c.y2 / 100) - (currentFloor - 1)) * 90;
                return (
                  <line
                    key={i}
                    x1={`${c.x1}%`}
                    y1={y1}
                    x2={`${c.x2}%`}
                    y2={y2}
                    stroke={c.active ? "#fbbf24" : "#334155"}
                    strokeWidth={c.active ? 2 : 1}
                    opacity={c.active ? 0.8 : 0.3}
                  />
                );
              })}
          </svg>

          {/* Nodes */}
          {visibleFloors.map((floor) => {
            const floorNum = floor[0].floor;
            const isCurrentFloor = floorNum === currentFloor;
            const top = 45 + (floorNum - (currentFloor - 1)) * 90;

            return (
              <div
                key={floorNum}
                className="absolute left-0 right-0 flex justify-center"
                style={{ top: `${top}px` }}
              >
                <div className="flex items-center gap-2">
                  {/* Floor number */}
                  <span
                    className={`text-xs w-8 text-right ${
                      isCurrentFloor ? "text-yellow-400 font-bold" : "text-slate-600"
                    }`}
                  >
                    {floorNum}
                  </span>

                  {/* Nodes */}
                  <div className="flex gap-4 relative">
                    {floor.map((node) => {
                      const isCurrent = node.id === currentNodeId;
                      const isAccessible = accessibleIds.has(node.id);
                      const isPast = node.floor < currentFloor;
                      const isBoss = node.type === "BOSS";

                      return (
                        <button
                          key={node.id}
                          onClick={() => isAccessible && onSelectNode(node)}
                          disabled={!isAccessible}
                          className={`
                            relative w-14 h-14 rounded-full border-2 flex items-center justify-center
                            text-2xl transition-all duration-300
                            ${NODE_COLORS[node.type]}
                            ${isCurrent ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-black scale-110" : ""}
                            ${isAccessible ? "cursor-pointer animate-pulse-glow" : "cursor-not-allowed opacity-50"}
                            ${isPast ? "opacity-40 grayscale" : ""}
                            ${isBoss ? "w-16 h-16 text-3xl" : ""}
                          `}
                          title={t(node.label)}
                        >
                          {node.icon}
                          {node.completed && (
                            <span className="absolute -top-1 -right-1 text-green-400 text-xs">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floor label */}
      <div className="text-center mb-2">
        <span className="text-slate-500 text-sm uppercase tracking-widest">
          {t("map.floor")} {currentFloor} / 15
        </span>
      </div>
    </div>
  );
};

export default TowerMap;
