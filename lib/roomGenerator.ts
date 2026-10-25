export interface FurnitureItem {
  id: string;
  type: 'bed' | 'couch' | 'table' | 'locker' | 'cabinet' | 'tv' | 'crate' | 'pillar' | 'lamp' | 'counter';
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  rotation?: number; // radians
  color?: string;
  accentColor?: string;
}

export interface WallSegment {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}

export interface DoorData {
  id: string;
  name: string;
  position: [number, number, number]; // center of door opening [x, y, z]
  wallNormal: 'x' | 'z'; // 'x' means doorway is in a wall running along Z (crossing X axis)
  width: number;
  height: number;
  roomASideName: string; // e.g. "Central Corridor"
  roomBSideName: string; // e.g. "Dormitory"
  angle: number; // current swing angle (0 = closed, ±1.5 rad = open)
  targetAngle: number;
  isLocked: boolean;
  lockedSide: 'roomA' | 'roomB' | null;
}

export interface RoomLayout {
  id: string;
  theme: string;
  title: string;
  subtitle: string;
  dimensions: { width: number; depth: number };
  ambientColor: string;
  wallColor: string;
  floorColor: string;
  walls: WallSegment[];
  doors: DoorData[];
  furniture: FurnitureItem[];
  spawnPoints: [number, number][];
}

// -------------------------------------------------------------
// HYPER-REALISTIC MULTI-ROOM FACILITY ARCHITECTURE
// -------------------------------------------------------------
// Overall Dimensions: Width = 34m (X: -17 to 17), Depth = 36m (Z: -18 to 18)
// Wall Height = 4.5m (Ceiling-height, zero peek-over in first person)
// Central Corridor: X: -3 to 3, Z: -18 to 18
// Room 1 (North-West, X: -17 to -3, Z: -18 to -2): Student Dormitory
// Room 2 (North-East, X: 3 to 17, Z: -18 to -2): Security & CCTV Command
// Room 3 (South-West, X: -17 to -3, Z: 2 to 18): Retreat Cafeteria
// Room 4 (South-East, X: 3 to 17, Z: 2 to 18): Quarantine & Medical Infirmary
// -------------------------------------------------------------

export function generateRoomLayout(roomId: string, requestedTheme?: string): RoomLayout {
  const wallH = 4.5;
  const wallThick = 0.5;

  // Exterior and Interior Partition Walls
  const walls: WallSegment[] = [
    // --- EXTERIOR BOUNDARY WALLS (Height 4.5m) ---
    // North Wall (Z = -18)
    { id: 'w-ext-n', position: [0, wallH / 2, -18], size: [34, wallH, wallThick], color: '#27272a' },
    // South Wall (Z = 18)
    { id: 'w-ext-s', position: [0, wallH / 2, 18], size: [34, wallH, wallThick], color: '#27272a' },
    // West Wall (X = -17)
    { id: 'w-ext-w', position: [-17, wallH / 2, 0], size: [wallThick, wallH, 36], color: '#27272a' },
    // East Wall (X = 17)
    { id: 'w-ext-e', position: [17, wallH / 2, 0], size: [wallThick, wallH, 36], color: '#27272a' },

    // --- HORIZONTAL ROOM DIVIDERS (Z = 0) ---
    // West Divider (Between Dormitory and Cafeteria, X from -17 to -3, length 14)
    { id: 'w-div-w', position: [-10, wallH / 2, 0], size: [14, wallH, wallThick], color: '#1f2937' },
    // East Divider (Between Security and Infirmary, X from 3 to 17, length 14)
    { id: 'w-div-e', position: [10, wallH / 2, 0], size: [14, wallH, wallThick], color: '#1f2937' },

    // --- CORRIDOR WEST WALL (X = -3, spans Z from -18 to 18) ---
    // Segment N: Z from -18 to -11 (length 7, center -14.5)
    { id: 'w-cw-n', position: [-3, wallH / 2, -14.5], size: [wallThick, wallH, 7], color: '#292524' },
    // Doorway 1 Opening: Z from -11 to -9 (Door at Z = -10, lintel above door)
    { id: 'w-cw-lintel-1', position: [-3, 3.75, -10], size: [wallThick, 1.5, 2], color: '#292524' },
    // Segment Mid: Z from -9 to 9 (length 18, center 0)
    { id: 'w-cw-mid', position: [-3, wallH / 2, 0], size: [wallThick, wallH, 18], color: '#292524' },
    // Doorway 3 Opening: Z from 9 to 11 (Door at Z = 10, lintel above door)
    { id: 'w-cw-lintel-3', position: [-3, 3.75, 10], size: [wallThick, 1.5, 2], color: '#292524' },
    // Segment S: Z from 11 to 18 (length 7, center 14.5)
    { id: 'w-cw-s', position: [-3, wallH / 2, 14.5], size: [wallThick, wallH, 7], color: '#292524' },

    // --- CORRIDOR EAST WALL (X = 3, spans Z from -18 to 18) ---
    // Segment N: Z from -18 to -11 (length 7, center -14.5)
    { id: 'w-ce-n', position: [3, wallH / 2, -14.5], size: [wallThick, wallH, 7], color: '#292524' },
    // Doorway 2 Opening: Z from -11 to -9 (Door at Z = -10, lintel above door)
    { id: 'w-ce-lintel-2', position: [3, 3.75, -10], size: [wallThick, 1.5, 2], color: '#292524' },
    // Segment Mid: Z from -9 to 9 (length 18, center 0)
    { id: 'w-ce-mid', position: [3, wallH / 2, 0], size: [wallThick, wallH, 18], color: '#292524' },
    // Doorway 4 Opening: Z from 9 to 11 (Door at Z = 10, lintel above door)
    { id: 'w-ce-lintel-4', position: [3, 3.75, 10], size: [wallThick, 1.5, 2], color: '#292524' },
    // Segment S: Z from 11 to 18 (length 7, center 14.5)
    { id: 'w-ce-s', position: [3, wallH / 2, 14.5], size: [wallThick, wallH, 7], color: '#292524' },
  ];

  // 4 Physical Doors placed in the doorway openings
  // Doorway dimensions: width = 2m, height = 3m
  const doors: DoorData[] = [
    {
      id: 'door-dorm',
      name: 'Dormitory Door',
      position: [-3, 1.5, -10],
      wallNormal: 'x', // door sits at X = -3, player crosses X to enter
      width: 1.9,
      height: 3,
      roomASideName: 'Central Corridor', // X > -3
      roomBSideName: 'Dormitory Room',   // X < -3
      angle: 0,
      targetAngle: 0,
      isLocked: false,
      lockedSide: null,
    },
    {
      id: 'door-security',
      name: 'Security Command Door',
      position: [3, 1.5, -10],
      wallNormal: 'x', // door sits at X = 3
      width: 1.9,
      height: 3,
      roomASideName: 'Central Corridor', // X < 3
      roomBSideName: 'Security Room',    // X > 3
      angle: 0,
      targetAngle: 0,
      isLocked: false,
      lockedSide: null,
    },
    {
      id: 'door-cafeteria',
      name: 'Cafeteria Door',
      position: [-3, 1.5, 10],
      wallNormal: 'x', // door sits at X = -3
      width: 1.9,
      height: 3,
      roomASideName: 'Central Corridor', // X > -3
      roomBSideName: 'Cafeteria',        // X < -3
      angle: 0,
      targetAngle: 0,
      isLocked: false,
      lockedSide: null,
    },
    {
      id: 'door-infirmary',
      name: 'Infirmary Door',
      position: [3, 1.5, 10],
      wallNormal: 'x', // door sits at X = 3
      width: 1.9,
      height: 3,
      roomASideName: 'Central Corridor', // X < 3
      roomBSideName: 'Infirmary',        // X > 3
      angle: 0,
      targetAngle: 0,
      isLocked: false,
      lockedSide: null,
    },
  ];

  // Automatic Fixed Furniture placed in each distinct room & corridor
  const furniture: FurnitureItem[] = [
    // --- CENTRAL CORRIDOR FURNITURE & SCONCES ---
    { id: 'corr-bench-1', type: 'couch', name: 'Corridor Waiting Bench', position: [0, 0.45, -4], size: [2.5, 0.9, 1.1], color: '#3f3f46' },
    { id: 'corr-bench-2', type: 'couch', name: 'Corridor Waiting Bench', position: [0, 0.45, 4], size: [2.5, 0.9, 1.1], color: '#3f3f46' },
    { id: 'corr-board', type: 'tv', name: 'Curfew Notice Board', position: [0, 2.2, -17.5], size: [4, 2, 0.2], color: '#18181b', accentColor: '#dc2626' },
    { id: 'corr-pillar-1', type: 'pillar', name: 'Corridor Arch', position: [-2.6, 2.2, 0], size: [0.6, 4.4, 0.6], color: '#52525b' },
    { id: 'corr-pillar-2', type: 'pillar', name: 'Corridor Arch', position: [2.6, 2.2, 0], size: [0.6, 4.4, 0.6], color: '#52525b' },

    // --- ROOM 1: DORMITORY (NW: X: -17 to -3, Z: -18 to -2) ---
    // Bunk Beds along North & West walls
    { id: 'dorm-bed-1', type: 'bed', name: 'Bunk Bed Alpha', position: [-14.5, 0.9, -15], size: [2.2, 1.8, 3.8], color: '#27272a', accentColor: '#dc2626' },
    { id: 'dorm-bed-2', type: 'bed', name: 'Bunk Bed Beta', position: [-14.5, 0.9, -9], size: [2.2, 1.8, 3.8], color: '#27272a', accentColor: '#71717a' },
    { id: 'dorm-bed-3', type: 'bed', name: 'Bunk Bed Gamma', position: [-8, 0.9, -15], size: [2.2, 1.8, 3.8], color: '#27272a', accentColor: '#dc2626' },
    // Lockers along divider
    { id: 'dorm-lockers', type: 'locker', name: 'Student Lockers', position: [-10, 1.6, -2.5], size: [6, 3.2, 0.8], color: '#18181b', accentColor: '#ef4444' },
    // Study table in center of dorm
    { id: 'dorm-table', type: 'table', name: 'Dorm Study Desk', position: [-10, 0.5, -9], size: [3.5, 0.9, 2], color: '#451a03', accentColor: '#f59e0b' },
    { id: 'dorm-lamp', type: 'lamp', name: 'Dim Floor Lamp', position: [-6, 1.2, -15], size: [0.6, 2.4, 0.6], color: '#ef4444' },

    // --- ROOM 2: SECURITY & CCTV COMMAND (NE: X: 3 to 17, Z: -18 to -2) ---
    // Surveillance Console with Multi-Monitors
    { id: 'sec-console', type: 'counter', name: 'Surveillance Desk', position: [10, 0.7, -15], size: [6, 1.3, 2.2], color: '#09090b', accentColor: '#38bdf8' },
    { id: 'sec-monitors', type: 'tv', name: 'CCTV Video Wall', position: [10, 2.5, -17.5], size: [7, 2.6, 0.4], color: '#020617', accentColor: '#0284c7' },
    // Server Rack Unit
    { id: 'sec-servers', type: 'cabinet', name: 'Mainframe Server Rack', position: [15, 1.8, -9], size: [1.4, 3.6, 4], color: '#1e293b', accentColor: '#10b981' },
    // Security briefing table
    { id: 'sec-table', type: 'table', name: 'Tactical Holo-Table', position: [9, 0.5, -8], size: [3.8, 0.9, 2.4], color: '#1e293b', accentColor: '#ef4444' },

    // --- ROOM 3: CAFETERIA (SW: X: -17 to -3, Z: 2 to 18) ---
    // Long dining tables with seats
    { id: 'cafe-table-1', type: 'table', name: 'Cafeteria Table A', position: [-10, 0.6, 6], size: [5.5, 1, 2.2], color: '#312e81', accentColor: '#6366f1' },
    { id: 'cafe-table-2', type: 'table', name: 'Cafeteria Table B', position: [-10, 0.6, 13], size: [5.5, 1, 2.2], color: '#312e81', accentColor: '#6366f1' },
    // Food Dispenser Serving Counter
    { id: 'cafe-counter', type: 'counter', name: 'Food Service Counter', position: [-15.5, 0.8, 10], size: [1.8, 1.5, 8], color: '#1e293b', accentColor: '#f97316' },
    // Vending machine
    { id: 'cafe-vending', type: 'cabinet', name: 'Beverage Vending Machine', position: [-6, 1.6, 16.5], size: [2, 3.2, 1.2], color: '#991b1b', accentColor: '#f87171' },

    // --- ROOM 4: INFIRMARY & QUARANTINE (SE: X: 3 to 17, Z: 2 to 18) ---
    // Medical Gurney Beds
    { id: 'inf-bed-1', type: 'bed', name: 'Infirmary Bed A', position: [8, 0.6, 6], size: [2.2, 1.1, 4], color: '#f8fafc', accentColor: '#ef4444' },
    { id: 'inf-bed-2', type: 'bed', name: 'Infirmary Bed B', position: [14, 0.6, 6], size: [2.2, 1.1, 4], color: '#f8fafc', accentColor: '#ef4444' },
    // Autopsy / Treatment Table
    { id: 'inf-table', type: 'table', name: 'Surgical Treatment Table', position: [11, 0.6, 13], size: [4, 1.1, 2.2], color: '#52525b', accentColor: '#dc2626' },
    // Medicine / Biohazard Cabinet
    { id: 'inf-cabinet', type: 'cabinet', name: 'Emergency Pharma Storage', position: [15.5, 1.8, 14], size: [1.2, 3.4, 4], color: '#1e293b', accentColor: '#ef4444' },
    // Quarantine Crates
    { id: 'inf-crates', type: 'crate', name: 'Hazardous Waste Crates', position: [6, 0.7, 16], size: [2.5, 1.4, 2.5], color: '#78350f', accentColor: '#eab308' },
  ];

  // Spawn points distributed across the rooms and corridor
  const spawnPoints: [number, number][] = [
    // Corridor Spawns
    [0, -12],
    [0, -4],
    [0, 4],
    [0, 12],
    // Dormitory Spawns
    [-10, -6],
    [-7, -11],
    // Security Spawns
    [9, -6],
    [13, -12],
    // Cafeteria Spawns
    [-10, 9],
    [-7, 14],
    // Infirmary Spawns
    [10, 9],
    [11, 15],
  ];

  return {
    id: `layout-${roomId}-facility`,
    theme: requestedTheme || 'facility',
    title: 'Yooil Retreat Multi-Chamber Complex',
    subtitle: 'Corridors sealed with reinforced security doors under curfew',
    dimensions: { width: 34, depth: 36 },
    ambientColor: '#090d16',
    wallColor: '#27272a',
    floorColor: '#18181b',
    walls,
    doors,
    furniture,
    spawnPoints,
  };
}
