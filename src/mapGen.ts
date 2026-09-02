import { generateUUID } from "./utils";

export type NodeType = "BATTLE" | "ELITE" | "REST" | "SHOP" | "EVENT" | "TREASURE" | "BOSS";

export interface TowerNode {
  id: string;
  type: NodeType;
  floor: number;
  x: number; // 0-1 position within floor
  icon: string;
  label: string;
  connections: string[]; // node ids on next floor
  reached: boolean;
  completed: boolean;
}

const NODE_ICONS: Record<NodeType, string> = {
  BATTLE: "⚔️",
  ELITE: "💀",
  REST: "🏕️",
  SHOP: "🏪",
  EVENT: "❓",
  TREASURE: "💰",
  BOSS: "👑",
};

const NODE_LABELS: Record<NodeType, string> = {
  BATTLE: "nodes.battle",
  ELITE: "nodes.elite",
  REST: "nodes.rest",
  SHOP: "nodes.shop",
  EVENT: "nodes.event",
  TREASURE: "nodes.treasure",
  BOSS: "nodes.boss",
};

const BOSS_FLOORS = [5, 10];
const FINAL_BOSS_FLOOR = 15;
const TOTAL_FLOORS = 15;

/** Generate a full tower map for a run */
export function generateTower(): TowerNode[][] {
  const floors: TowerNode[][] = [];

  for (let f = 1; f <= TOTAL_FLOORS; f++) {
    const isBoss = BOSS_FLOORS.includes(f);
    const isFinal = f === FINAL_BOSS_FLOOR;
    const isFirst = f === 1;

    if (isFirst) {
      // Floor 1: single battle node (entered by clicking, like any other node)
      floors.push([makeNode("BATTLE", f, 0.5)]);
    } else if (isFinal) {
      // Final boss: single node
      floors.push([makeNode("BOSS", f, 0.5)]);
    } else if (isBoss) {
      // Boss floor: just the boss
      floors.push([makeNode("BOSS", f, 0.5)]);
    } else {
      // Regular floor: 2-4 nodes
      const count = 2 + Math.floor(Math.random() * 3); // 2-4
      const types = generateFloorTypes(f);
      const nodes: TowerNode[] = [];
      for (let i = 0; i < count; i++) {
        const x = count === 1 ? 0.5 : i / (count - 1);
        nodes.push(makeNode(types[i % types.length], f, x));
      }
      floors.push(nodes);
    }
  }

  // Generate connections between floors
  for (let f = 0; f < floors.length - 1; f++) {
    connectFloors(floors[f], floors[f + 1]);
  }

  return floors;
}

function makeNode(type: NodeType, floor: number, x: number): TowerNode {
  return {
    id: generateUUID(),
    type,
    floor,
    x,
    icon: NODE_ICONS[type],
    label: NODE_LABELS[type],
    connections: [],
    reached: false,
    completed: false,
  };
}

/** Generate node types for a floor, ensuring variety */
function generateFloorTypes(floor: number): NodeType[] {
  const types: NodeType[] = ["BATTLE"]; // Always at least one battle

  // Rest before bosses (floor 4 and 9) and every 4th floor
  if (floor % 4 === 0 || floor === 9) types.push("REST");
  // Shop every 3rd floor
  if (floor % 3 === 0) types.push("SHOP");
  // Treasure on floors 7 and 13 (mid-act rewards)
  if (floor === 7 || floor === 13) types.push("TREASURE");

  // Always add an event
  types.push("EVENT");

  // 30% chance of elite on floors 3+
  if (floor >= 3 && Math.random() < 0.3) types.push("ELITE");

  // Fill to at least 3 node types
  while (types.length < 3) {
    if (!types.includes("BATTLE")) types.push("BATTLE");
    else if (!types.includes("EVENT")) types.push("EVENT");
    else types.push("BATTLE");
  }

  return types;
}

/** Connect nodes from one floor to the next, creating meaningful branches */
function connectFloors(fromFloor: TowerNode[], toFloor: TowerNode[]): void {
  if (fromFloor.length === 1) {
    // Single node fans out to multiple nodes on next floor
    for (const target of toFloor) {
      fromFloor[0].connections.push(target.id);
    }
  } else if (toFloor.length === 1) {
    // Multiple nodes converge to single node (e.g. approaching a boss)
    for (const source of fromFloor) {
      source.connections.push(toFloor[0].id);
    }
  } else {
    // Multi-to-multi with real branching:
    // Sort both floors by x position, connect with some crossing
    const sortedFrom = [...fromFloor].sort((a, b) => a.x - b.x);
    const sortedTo = [...toFloor].sort((a, b) => a.x - b.x);

    for (const source of sortedFrom) {
      // Each source connects to 1-2 targets within range
      const candidates = sortedTo.filter(
        (t) => Math.abs(t.x - source.x) < 0.55,
      );
      if (candidates.length === 0) {
        // Connect to nearest
        const nearest = sortedTo.reduce((a, b) =>
          Math.abs(a.x - source.x) < Math.abs(b.x - source.x) ? a : b,
        );
        source.connections.push(nearest.id);
      } else {
        // Connect to 1-2 candidates
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        source.connections.push(shuffled[0].id);
        if (shuffled.length > 1 && Math.random() < 0.6) {
          source.connections.push(shuffled[1].id);
        }
      }
    }
    // Ensure every target has at least one incoming connection
    for (const target of sortedTo) {
      const hasIncoming = sortedFrom.some((s) =>
        s.connections.includes(target.id),
      );
      if (!hasIncoming) {
        const nearest = sortedFrom.reduce((a, b) =>
          Math.abs(a.x - target.x) < Math.abs(b.x - target.x) ? a : b,
        );
        nearest.connections.push(target.id);
      }
    }
  }
}

/** Get nodes accessible from current position */
export function getAccessibleNodes(
  floors: TowerNode[][],
  currentFloor: number,
  currentNodeId: string,
): TowerNode[] {
  if (currentFloor >= TOTAL_FLOORS) return [];
  // Run start: no node entered yet -> the first floor is the entry point.
  if (!currentNodeId) return floors[0] ?? [];
  const currentFloorNodes = floors[currentFloor - 1];
  const nextFloorNodes = floors[currentFloor];
  if (!currentFloorNodes || !nextFloorNodes) return [];
  const currentNode = currentFloorNodes.find((n) => n.id === currentNodeId);
  if (!currentNode) return [];

  return nextFloorNodes.filter((n) => currentNode.connections.includes(n.id));
}

/** Find a node by ID */
export function findNode(
  floors: TowerNode[][],
  nodeId: string,
): TowerNode | undefined {
  for (const floor of floors) {
    const node = floor.find((n) => n.id === nodeId);
    if (node) return node;
  }
  return undefined;
}
