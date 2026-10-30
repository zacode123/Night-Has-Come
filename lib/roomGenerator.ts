export interface FurnitureItem {
  id: string;
  type: 'bed' | 'couch' | 'table' | 'locker' | 'cabinet' | 'tv' | 'crate' | 'pillar' | 'lamp' | 'counter' | 'bookshelf' | 'clock' | 'rug';
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

export interface WindowData {
  id: string;
  name: string;
  position: [number, number, number]; // center [x, y, z]
  size: [number, number]; // [width, height]
  wallNormal: 'x' | 'z';
  roomName: string;
}

export interface WallLightFixture {
  id: string;
  position: [number, number, number];
  rotationY: number; // radians (faces into the room)
  color?: string;
  intensity?: number;
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
  windows: WindowData[];
  furniture: FurnitureItem[];
  wallLights: WallLightFixture[];
  spawnPoints: [number, number][];
}

// -------------------------------------------------------------
// HYPER-REALISTIC MOODY MYSTERY MANOR ARCHITECTURE
// -------------------------------------------------------------
// Overall Dimensions: Width = 34m (X: -17 to 17), Depth = 36m (Z: -18 to 18)
// Wall Height = 4.5m
// Real Windows in exterior walls on all 4 wings:
// - North: Master Study, Grand Gallery, Surveillance Salon
// - South: Dining Hall, Grand Gallery, Apothecary
// - West: Master Study West, Dining Hall West
// - East: Surveillance Salon East, Apothecary East
// -------------------------------------------------------------

export function generateRoomLayout(roomId: string, requestedTheme?: string): RoomLayout {
  const wallH = 4.5;
  const wallThick = 0.5;

  // Real Manor Windows
  const windows: WindowData[] = [
    // North Windows (Z = -18)
    { id: 'win-n-study', name: 'Study North Bay Window', position: [-10, 2.3, -18], size: [4.4, 2.4], wallNormal: 'z', roomName: 'Master Study' },
    { id: 'win-n-gallery', name: 'Grand Gallery North Cathedral Window', position: [0, 2.4, -18], size: [3.2, 2.6], wallNormal: 'z', roomName: 'Grand Gallery' },
    { id: 'win-n-sec', name: 'Surveillance North Window', position: [10, 2.3, -18], size: [4.4, 2.4], wallNormal: 'z', roomName: 'Surveillance Salon' },

    // South Windows (Z = 18)
    { id: 'win-s-dine', name: 'Dining Hall South Bay Window', position: [-10, 2.3, 18], size: [4.4, 2.4], wallNormal: 'z', roomName: 'Dining Hall' },
    { id: 'win-s-gallery', name: 'Grand Gallery South Cathedral Window', position: [0, 2.4, 18], size: [3.2, 2.6], wallNormal: 'z', roomName: 'Grand Gallery' },
    { id: 'win-s-inf', name: 'Apothecary South Window', position: [10, 2.3, 18], size: [4.4, 2.4], wallNormal: 'z', roomName: 'Apothecary Infirmary' },

    // West Windows (X = -17)
    { id: 'win-w-study', name: 'Study West Tall Window', position: [-17, 2.3, -9], size: [4.0, 2.4], wallNormal: 'x', roomName: 'Master Study' },
    { id: 'win-w-dine', name: 'Dining West Tall Window', position: [-17, 2.3, 9], size: [4.0, 2.4], wallNormal: 'x', roomName: 'Dining Hall' },

    // East Windows (X = 17)
    { id: 'win-e-sec', name: 'Security East Tall Window', position: [17, 2.3, -9], size: [4.0, 2.4], wallNormal: 'x', roomName: 'Surveillance Salon' },
    { id: 'win-e-inf', name: 'Apothecary East Tall Window', position: [17, 2.3, 9], size: [4.0, 2.4], wallNormal: 'x', roomName: 'Apothecary Infirmary' },
  ];

  // Exterior and Interior Partition Walls crafted around real architectural window openings
  const walls: WallSegment[] = [
    // --- NORTH EXTERIOR WALL WITH WINDOW OPENINGS (Z = -18) ---
    // Outer West North Pillar
    { id: 'w-ext-n-w', position: [-15.5, wallH / 2, -18], size: [3.0, wallH, wallThick], color: '#27221f' },
    // Study Window Sill (below window Y 0 to 1.1)
    { id: 'w-ext-n-study-sill', position: [-10, 0.55, -18], size: [4.4, 1.1, wallThick], color: '#27221f' },
    // Study Window Lintel (above window Y 3.5 to 4.5)
    { id: 'w-ext-n-study-lintel', position: [-10, 4.0, -18], size: [4.4, 1.0, wallThick], color: '#27221f' },
    // Mid West North Wall (between Study and Gallery)
    { id: 'w-ext-n-mid-w', position: [-4.75, wallH / 2, -18], size: [6.1, wallH, wallThick], color: '#27221f' },
    // Gallery North Window Sill & Lintel
    { id: 'w-ext-n-gal-sill', position: [0, 0.55, -18], size: [3.2, 1.1, wallThick], color: '#27221f' },
    { id: 'w-ext-n-gal-lintel', position: [0, 4.1, -18], size: [3.2, 0.8, wallThick], color: '#27221f' },
    // Mid East North Wall (between Gallery and Surveillance)
    { id: 'w-ext-n-mid-e', position: [4.75, wallH / 2, -18], size: [6.1, wallH, wallThick], color: '#27221f' },
    // Surveillance Window Sill & Lintel
    { id: 'w-ext-n-sec-sill', position: [10, 0.55, -18], size: [4.4, 1.1, wallThick], color: '#27221f' },
    { id: 'w-ext-n-sec-lintel', position: [10, 4.0, -18], size: [4.4, 1.0, wallThick], color: '#27221f' },
    // Outer East North Pillar
    { id: 'w-ext-n-e', position: [15.5, wallH / 2, -18], size: [3.0, wallH, wallThick], color: '#27221f' },

    // --- SOUTH EXTERIOR WALL WITH WINDOW OPENINGS (Z = 18) ---
    // Outer West South Pillar
    { id: 'w-ext-s-w', position: [-15.5, wallH / 2, 18], size: [3.0, wallH, wallThick], color: '#27221f' },
    // Dining Window Sill & Lintel
    { id: 'w-ext-s-dine-sill', position: [-10, 0.55, 18], size: [4.4, 1.1, wallThick], color: '#27221f' },
    { id: 'w-ext-s-dine-lintel', position: [-10, 4.0, 18], size: [4.4, 1.0, wallThick], color: '#27221f' },
    // Mid West South Wall
    { id: 'w-ext-s-mid-w', position: [-4.75, wallH / 2, 18], size: [6.1, wallH, wallThick], color: '#27221f' },
    // Gallery South Window Sill & Lintel
    { id: 'w-ext-s-gal-sill', position: [0, 0.55, 18], size: [3.2, 1.1, wallThick], color: '#27221f' },
    { id: 'w-ext-s-gal-lintel', position: [0, 4.1, 18], size: [3.2, 0.8, wallThick], color: '#27221f' },
    // Mid East South Wall
    { id: 'w-ext-s-mid-e', position: [4.75, wallH / 2, 18], size: [6.1, wallH, wallThick], color: '#27221f' },
    // Apothecary Window Sill & Lintel
    { id: 'w-ext-s-inf-sill', position: [10, 0.55, 18], size: [4.4, 1.1, wallThick], color: '#27221f' },
    { id: 'w-ext-s-inf-lintel', position: [10, 4.0, 18], size: [4.4, 1.0, wallThick], color: '#27221f' },
    // Outer East South Pillar
    { id: 'w-ext-s-e', position: [15.5, wallH / 2, 18], size: [3.0, wallH, wallThick], color: '#27221f' },

    // --- WEST EXTERIOR WALL WITH WINDOW OPENINGS (X = -17) ---
    // North West Corner Column
    { id: 'w-ext-w-n', position: [-17, wallH / 2, -15.5], size: [wallThick, wallH, 5], color: '#27221f' },
    // Study West Window Sill & Lintel
    { id: 'w-ext-w-study-sill', position: [-17, 0.55, -9], size: [wallThick, 1.1, 4.0], color: '#27221f' },
    { id: 'w-ext-w-study-lintel', position: [-17, 4.0, -9], size: [wallThick, 1.0, 4.0], color: '#27221f' },
    // West Divider Mid Wall
    { id: 'w-ext-w-mid', position: [-17, wallH / 2, 0], size: [wallThick, wallH, 10], color: '#27221f' },
    // Dining West Window Sill & Lintel
    { id: 'w-ext-w-dine-sill', position: [-17, 0.55, 9], size: [wallThick, 1.1, 4.0], color: '#27221f' },
    { id: 'w-ext-w-dine-lintel', position: [-17, 4.0, 9], size: [wallThick, 1.0, 4.0], color: '#27221f' },
    // South West Corner Column
    { id: 'w-ext-w-s', position: [-17, wallH / 2, 15.5], size: [wallThick, wallH, 5], color: '#27221f' },

    // --- EAST EXTERIOR WALL WITH WINDOW OPENINGS (X = 17) ---
    // North East Corner Column
    { id: 'w-ext-e-n', position: [17, wallH / 2, -15.5], size: [wallThick, wallH, 5], color: '#27221f' },
    // Security East Window Sill & Lintel
    { id: 'w-ext-e-sec-sill', position: [17, 0.55, -9], size: [wallThick, 1.1, 4.0], color: '#27221f' },
    { id: 'w-ext-e-sec-lintel', position: [17, 4.0, -9], size: [wallThick, 1.0, 4.0], color: '#27221f' },
    // East Divider Mid Wall
    { id: 'w-ext-e-mid', position: [17, wallH / 2, 0], size: [wallThick, wallH, 10], color: '#27221f' },
    // Apothecary East Window Sill & Lintel
    { id: 'w-ext-e-inf-sill', position: [17, 0.55, 9], size: [wallThick, 1.1, 4.0], color: '#27221f' },
    { id: 'w-ext-e-inf-lintel', position: [17, 4.0, 9], size: [wallThick, 1.0, 4.0], color: '#27221f' },
    // South East Corner Column
    { id: 'w-ext-e-s', position: [17, wallH / 2, 15.5], size: [wallThick, wallH, 5], color: '#27221f' },

    // --- HORIZONTAL ROOM DIVIDERS (Z = 0) ---
    // West Divider (Between Study and Dining Hall, X from -17 to -3, length 14)
    { id: 'w-div-w', position: [-10, wallH / 2, 0], size: [14, wallH, wallThick], color: '#231e1c' },
    // East Divider (Between Clockwork and Apothecary, X from 3 to 17, length 14)
    { id: 'w-div-e', position: [10, wallH / 2, 0], size: [14, wallH, wallThick], color: '#231e1c' },

    // --- CORRIDOR WEST WALL (X = -3, spans Z from -18 to 18) ---
    { id: 'w-cw-n', position: [-3, wallH / 2, -14.5], size: [wallThick, wallH, 7], color: '#2a2421' },
    { id: 'w-cw-lintel-1', position: [-3, 3.75, -10], size: [wallThick, 1.5, 2], color: '#2a2421' },
    { id: 'w-cw-mid', position: [-3, wallH / 2, 0], size: [wallThick, wallH, 18], color: '#2a2421' },
    { id: 'w-cw-lintel-3', position: [-3, 3.75, 10], size: [wallThick, 1.5, 2], color: '#2a2421' },
    { id: 'w-cw-s', position: [-3, wallH / 2, 14.5], size: [wallThick, wallH, 7], color: '#2a2421' },

    // --- CORRIDOR EAST WALL (X = 3, spans Z from -18 to 18) ---
    { id: 'w-ce-n', position: [3, wallH / 2, -14.5], size: [wallThick, wallH, 7], color: '#2a2421' },
    { id: 'w-ce-lintel-2', position: [3, 3.75, -10], size: [wallThick, 1.5, 2], color: '#2a2421' },
    { id: 'w-ce-mid', position: [3, wallH / 2, 0], size: [wallThick, wallH, 18], color: '#2a2421' },
    { id: 'w-ce-lintel-4', position: [3, 3.75, 10], size: [wallThick, 1.5, 2], color: '#2a2421' },
    { id: 'w-ce-s', position: [3, wallH / 2, 14.5], size: [wallThick, wallH, 7], color: '#2a2421' },
  ];

  // 4 Physical Manor Doors
  const doors: DoorData[] = [
    {
      id: 'door-dorm',
      name: 'Master Study Door',
      position: [-3, 1.5, -10],
      wallNormal: 'x',
      width: 1.9,
      height: 3,
      roomASideName: 'Grand Gallery',
      roomBSideName: 'Master Study',
      angle: 0,
      targetAngle: 0,
      isLocked: false,
      lockedSide: null,
    },
    {
      id: 'door-security',
      name: 'Surveillance Salon Door',
      position: [3, 1.5, -10],
      wallNormal: 'x',
      width: 1.9,
      height: 3,
      roomASideName: 'Grand Gallery',
      roomBSideName: 'Surveillance Salon',
      angle: 0,
      targetAngle: 0,
      isLocked: false,
      lockedSide: null,
    },
    {
      id: 'door-cafeteria',
      name: 'Dining Hall Door',
      position: [-3, 1.5, 10],
      wallNormal: 'x',
      width: 1.9,
      height: 3,
      roomASideName: 'Grand Gallery',
      roomBSideName: 'Dining Hall',
      angle: 0,
      targetAngle: 0,
      isLocked: false,
      lockedSide: null,
    },
    {
      id: 'door-infirmary',
      name: 'Apothecary Door',
      position: [3, 1.5, 10],
      wallNormal: 'x',
      width: 1.9,
      height: 3,
      roomASideName: 'Grand Gallery',
      roomBSideName: 'Apothecary Infirmary',
      angle: 0,
      targetAngle: 0,
      isLocked: false,
      lockedSide: null,
    },
  ];

  // Wall-mounted Warm Sconces with Filament Bulbs
  const wallLights: WallLightFixture[] = [
    // Grand Gallery (Corridor) Bulbs mounted on walls at height 3.2m
    { id: 'wl-corr-1', position: [-2.7, 3.2, -14], rotationY: Math.PI / 2, color: '#fef3c7', intensity: 2.2 },
    { id: 'wl-corr-2', position: [2.7, 3.2, -14], rotationY: -Math.PI / 2, color: '#fef3c7', intensity: 2.2 },
    { id: 'wl-corr-3', position: [-2.7, 3.2, -5], rotationY: Math.PI / 2, color: '#fed7aa', intensity: 2.2 },
    { id: 'wl-corr-4', position: [2.7, 3.2, -5], rotationY: -Math.PI / 2, color: '#fed7aa', intensity: 2.2 },
    { id: 'wl-corr-5', position: [-2.7, 3.2, 5], rotationY: Math.PI / 2, color: '#fed7aa', intensity: 2.2 },
    { id: 'wl-corr-6', position: [2.7, 3.2, 5], rotationY: -Math.PI / 2, color: '#fed7aa', intensity: 2.2 },
    { id: 'wl-corr-7', position: [-2.7, 3.2, 14], rotationY: Math.PI / 2, color: '#fef3c7', intensity: 2.2 },
    { id: 'wl-corr-8', position: [2.7, 3.2, 14], rotationY: -Math.PI / 2, color: '#fef3c7', intensity: 2.2 },
    // Gallery Ends
    { id: 'wl-corr-north', position: [0, 3.4, -17.7], rotationY: 0, color: '#ef4444', intensity: 2.5 },
    { id: 'wl-corr-south', position: [0, 3.4, 17.7], rotationY: Math.PI, color: '#ef4444', intensity: 2.5 },

    // Room 1 (Study) Bulbs
    { id: 'wl-study-1', position: [-16.7, 3.2, -14], rotationY: Math.PI / 2, color: '#ffedd5', intensity: 2.0 },
    { id: 'wl-study-2', position: [-14, 3.2, -17.7], rotationY: 0, color: '#fef3c7', intensity: 2.0 },
    { id: 'wl-study-3', position: [-3.3, 3.2, -5], rotationY: -Math.PI / 2, color: '#fed7aa', intensity: 2.0 },

    // Room 2 (Surveillance / Clockwork) Bulbs
    { id: 'wl-sec-1', position: [16.7, 3.2, -14], rotationY: -Math.PI / 2, color: '#bae6fd', intensity: 2.4 },
    { id: 'wl-sec-2', position: [14, 3.2, -17.7], rotationY: 0, color: '#fed7aa', intensity: 2.0 },
    { id: 'wl-sec-3', position: [3.3, 3.2, -5], rotationY: Math.PI / 2, color: '#bae6fd', intensity: 2.0 },

    // Room 3 (Dining Hall) Bulbs
    { id: 'wl-dine-1', position: [-16.7, 3.2, 14], rotationY: Math.PI / 2, color: '#ffedd5', intensity: 2.2 },
    { id: 'wl-dine-2', position: [-14, 3.2, 17.7], rotationY: Math.PI, color: '#fef3c7', intensity: 2.2 },
    { id: 'wl-dine-3', position: [-3.3, 3.2, 5], rotationY: -Math.PI / 2, color: '#fed7aa', intensity: 2.0 },

    // Room 4 (Apothecary) Bulbs
    { id: 'wl-inf-1', position: [16.7, 3.2, 14], rotationY: -Math.PI / 2, color: '#a7f3d0', intensity: 2.0 },
    { id: 'wl-inf-2', position: [14, 3.2, 17.7], rotationY: Math.PI, color: '#fef3c7', intensity: 2.0 },
    { id: 'wl-inf-3', position: [3.3, 3.2, 5], rotationY: Math.PI / 2, color: '#a7f3d0', intensity: 2.0 },
  ];

  // Richer Mystery Manor Furniture & Props
  const furniture: FurnitureItem[] = [
    // --- GRAND GALLERY (CORRIDOR) ---
    { id: 'corr-rug-1', type: 'rug', name: 'Persian Corridor Runner', position: [0, 0.015, 0], size: [2.2, 0.02, 32], color: '#7f1d1d', accentColor: '#d97706' },
    { id: 'corr-bench-1', type: 'couch', name: 'Velvet Chesterfield Settee', position: [0, 0.45, -4], size: [2.4, 0.9, 0.9], color: '#451a03', accentColor: '#b45309' },
    { id: 'corr-bench-2', type: 'couch', name: 'Velvet Chesterfield Settee', position: [0, 0.45, 4], size: [2.4, 0.9, 0.9], color: '#451a03', accentColor: '#b45309' },
    { id: 'corr-clock', type: 'clock', name: 'Antique Grandfather Clock', position: [-2.6, 1.6, -16], size: [0.7, 3.2, 0.6], color: '#29170e', accentColor: '#d97706' },
    { id: 'corr-board', type: 'tv', name: 'Curfew Notice Board', position: [0, 2.2, -17.5], size: [3.6, 2, 0.15], color: '#1c1917', accentColor: '#dc2626' },
    { id: 'corr-pillar-1', type: 'pillar', name: 'Marble Arch Column', position: [-2.6, 2.2, 0], size: [0.6, 4.4, 0.6], color: '#3f3f46' },
    { id: 'corr-pillar-2', type: 'pillar', name: 'Marble Arch Column', position: [2.6, 2.2, 0], size: [0.6, 4.4, 0.6], color: '#3f3f46' },

    // --- ROOM 1: ANTIQUE MASTER STUDY (NW) ---
    { id: 'study-rug', type: 'rug', name: 'Ornate Study Rug', position: [-10, 0.015, -10], size: [8, 0.02, 7], color: '#7f1d1d', accentColor: '#d97706' },
    { id: 'study-desk', type: 'table', name: 'Mahogany Executive Desk', position: [-10, 0.5, -9], size: [3.4, 0.9, 1.8], color: '#3f1f10', accentColor: '#b45309' },
    { id: 'study-books-1', type: 'bookshelf', name: 'Tall Library Bookshelf', position: [-16.5, 2.0, -14], size: [0.8, 4.0, 3.5], color: '#2e1509', accentColor: '#d97706' },
    { id: 'study-books-2', type: 'bookshelf', name: 'Tall Library Bookshelf', position: [-16.5, 2.0, -4], size: [0.8, 4.0, 3.5], color: '#2e1509', accentColor: '#d97706' },
    { id: 'study-chair-1', type: 'couch', name: 'Leather Wingback Chair', position: [-10, 0.5, -7.2], size: [1.1, 1.0, 1.1], color: '#451a03' },
    { id: 'study-bed-1', type: 'bed', name: 'Canopy Daybed', position: [-7.5, 0.8, -15.5], size: [2.4, 1.6, 3.2], color: '#27272a', accentColor: '#991b1b' },
    { id: 'study-lamp', type: 'lamp', name: 'Brass Bankers Floor Lamp', position: [-12.5, 1.2, -9], size: [0.5, 2.2, 0.5], color: '#d97706' },

    // --- ROOM 2: SURVEILLANCE & CLOCKWORK SALON (NE) ---
    { id: 'sec-console', type: 'counter', name: 'Surveillance Desk', position: [10, 0.7, -15], size: [5.5, 1.3, 2.0], color: '#18181b', accentColor: '#38bdf8' },
    { id: 'sec-monitors', type: 'tv', name: 'CCTV Video Wall', position: [10, 2.5, -17.6], size: [4.2, 2.0, 0.3], color: '#09090b', accentColor: '#0ea5e9' },
    { id: 'sec-servers', type: 'cabinet', name: 'Mainframe Cabinet', position: [15.8, 1.8, -14], size: [1.2, 3.6, 3.2], color: '#1e293b', accentColor: '#10b981' },
    { id: 'sec-table', type: 'table', name: 'Tactical Holo-Table', position: [9, 0.5, -8], size: [3.5, 0.9, 2.2], color: '#1e293b', accentColor: '#ef4444' },
    { id: 'sec-chair', type: 'couch', name: 'Operator Swivel Chair', position: [9, 0.5, -6.2], size: [1.0, 1.0, 1.0], color: '#0f172a' },

    // --- ROOM 3: GRAND DINING HALL (SW) ---
    { id: 'dine-rug', type: 'rug', name: 'Banquet Hall Carpet', position: [-10, 0.015, 10], size: [8, 0.02, 9], color: '#831843', accentColor: '#f59e0b' },
    { id: 'dine-table', type: 'table', name: 'Long Manor Feast Table', position: [-10, 0.6, 10], size: [4.2, 1.0, 2.4], color: '#381c0e', accentColor: '#d97706' },
    { id: 'dine-buffet', type: 'counter', name: 'Carved Buffet Credenza', position: [-16.3, 0.8, 14], size: [1.2, 1.6, 4.5], color: '#27170f', accentColor: '#b45309' },
    { id: 'dine-fireplace', type: 'pillar', name: 'Stone Hearth Fireplace', position: [-10, 1.6, 17.6], size: [4.2, 3.0, 0.6], color: '#1c1917', accentColor: '#f97316' },

    // --- ROOM 4: APOTHECARY & INFIRMARY (SE) ---
    { id: 'inf-bed-1', type: 'bed', name: 'Vintage Treatment Bed Alpha', position: [8, 0.6, 6], size: [2.0, 1.1, 3.6], color: '#e2e8f0', accentColor: '#ef4444' },
    { id: 'inf-bed-2', type: 'bed', name: 'Vintage Treatment Bed Beta', position: [14, 0.6, 6], size: [2.0, 1.1, 3.6], color: '#e2e8f0', accentColor: '#ef4444' },
    { id: 'inf-table', type: 'table', name: 'Apothecary Lab Table', position: [11, 0.6, 13], size: [3.6, 1.0, 2.0], color: '#334155', accentColor: '#059669' },
    { id: 'inf-cabinet', type: 'cabinet', name: 'Glass Medicine Apothecary', position: [16.2, 1.8, 14], size: [1.1, 3.4, 3.6], color: '#1e293b', accentColor: '#10b981' },
    { id: 'inf-crates', type: 'crate', name: 'Herbal Supply Crates', position: [6, 0.7, 16], size: [2.2, 1.3, 2.2], color: '#78350f', accentColor: '#d97706' },
  ];

  // Guaranteed Open-Space Spawn Spots (Strictly far from any wall, furniture, or door)
  const spawnPoints: [number, number][] = [
    // Grand Gallery (Center Corridor) - wide open strip X: [-1.2, 1.2]
    [0, -12],
    [0, -8],
    [0, -1],
    [0, 1],
    [0, 8],
    [0, 12],
    // Master Study - Open floor spaces
    [-7.5, -9],
    [-13.5, -8.5],
    [-7.0, -4.5],
    [-13.0, -4.5],
    // Surveillance Salon - Open floor spaces
    [6.0, -8.5],
    [13.5, -8.5],
    [6.5, -4.5],
    [13.0, -4.5],
    // Dining Hall - Open floor spaces around the feast table
    [-6.5, 6.0],
    [-13.5, 6.0],
    [-6.5, 14.5],
    [-13.5, 14.5],
    // Apothecary Infirmary - Open floor spaces
    [6.5, 10.0],
    [13.5, 10.5],
    [7.5, 14.0],
    [13.5, 15.0],
  ];

  return {
    id: `layout-${roomId}-manor`,
    theme: requestedTheme || 'manor',
    title: 'Yooil Mystery Manor',
    subtitle: 'Chambers locked under curfew with antique brass wall sconces and grand window vistas',
    dimensions: { width: 34, depth: 36 },
    ambientColor: '#18120c',
    wallColor: '#2b231d',
    floorColor: '#1a1410',
    walls,
    doors,
    windows,
    furniture,
    wallLights,
    spawnPoints,
  };
}

/**
 * Checks whether a 2D coordinate [x, z] collides with any wall or furniture item,
 * with a safety clearance buffer.
 */
export function isCoordinateClear(
  x: number,
  z: number,
  layout: RoomLayout,
  buffer: number = 0.95
): boolean {
  // Check outer arena boundaries
  const halfW = layout.dimensions.width / 2 - buffer;
  const halfD = layout.dimensions.depth / 2 - buffer;
  if (Math.abs(x) > halfW || Math.abs(z) > halfD) return false;

  // Check walls
  for (const wall of layout.walls) {
    const [wx, , wz] = wall.position;
    const [wWidth, , wDepth] = wall.size;
    const minX = wx - wWidth / 2 - buffer;
    const maxX = wx + wWidth / 2 + buffer;
    const minZ = wz - wDepth / 2 - buffer;
    const maxZ = wz + wDepth / 2 + buffer;

    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
      return false;
    }
  }

  // Check furniture
  for (const item of layout.furniture) {
    // Rugs are flat on floor (height 0.02) and do not block player movement
    if (item.type === 'rug') continue;

    const [fx, , fz] = item.position;
    const [fWidth, , fDepth] = item.size;
    const minX = fx - fWidth / 2 - buffer;
    const maxX = fx + fWidth / 2 + buffer;
    const minZ = fz - fDepth / 2 - buffer;
    const maxZ = fz + fDepth / 2 + buffer;

    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
      return false;
    }
  }

  return true;
}

/**
 * Returns a guaranteed collision-free, open-floor spawn coordinate [x, z].
 * If a seed (like user ID or index) is provided, deterministic yet varied placement is used.
 */
export function getSafeOpenSpawnPoint(
  layout: RoomLayout,
  seed?: string | number
): [number, number] {
  // 1. Try curated open spawn list first
  const validCurated = layout.spawnPoints.filter(([sx, sz]) =>
    isCoordinateClear(sx, sz, layout, 0.8)
  );

  if (validCurated.length > 0) {
    let index = 0;
    if (typeof seed === 'number') {
      index = Math.abs(seed) % validCurated.length;
    } else if (typeof seed === 'string') {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
      }
      index = Math.abs(hash) % validCurated.length;
    } else {
      index = Math.floor(Math.random() * validCurated.length);
    }
    return validCurated[index];
  }

  // Fallback: Grand corridor center
  return [0, 0];
}
