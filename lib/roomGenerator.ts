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

export interface RoomLayout {
  id: string;
  theme: 'dormitory' | 'lounge' | 'cafeteria' | 'basement' | 'infirmary';
  title: string;
  subtitle: string;
  dimensions: { width: number; depth: number };
  ambientColor: string;
  wallColor: string;
  floorColor: string;
  furniture: FurnitureItem[];
  spawnPoints: [number, number][];
}

const ROOM_THEMES: Record<string, Omit<RoomLayout, 'id'>> = {
  dormitory: {
    theme: 'dormitory',
    title: 'Yooil Retreat Dormitory',
    subtitle: 'Where students were assigned before the curfew',
    dimensions: { width: 28, depth: 24 },
    ambientColor: '#1c1917',
    wallColor: '#292524',
    floorColor: '#18181b',
    furniture: [
      { id: 'bed-1', type: 'bed', name: 'Bunk Bed A', position: [-8, 0.7, -7], size: [2.2, 1.4, 3.8], color: '#3f3f46', accentColor: '#dc2626' },
      { id: 'bed-2', type: 'bed', name: 'Bunk Bed B', position: [-8, 0.7, 0], size: [2.2, 1.4, 3.8], color: '#3f3f46', accentColor: '#71717a' },
      { id: 'bed-3', type: 'bed', name: 'Bunk Bed C', position: [-8, 0.7, 7], size: [2.2, 1.4, 3.8], color: '#3f3f46', accentColor: '#dc2626' },
      { id: 'bed-4', type: 'bed', name: 'Bunk Bed D', position: [8, 0.7, -7], size: [2.2, 1.4, 3.8], color: '#3f3f46', accentColor: '#71717a' },
      { id: 'bed-5', type: 'bed', name: 'Bunk Bed E', position: [8, 0.7, 0], size: [2.2, 1.4, 3.8], color: '#3f3f46', accentColor: '#dc2626' },
      { id: 'bed-6', type: 'bed', name: 'Bunk Bed F', position: [8, 0.7, 7], size: [2.2, 1.4, 3.8], color: '#3f3f46', accentColor: '#71717a' },
      { id: 'locker-1', type: 'locker', name: 'Student Lockers', position: [0, 1.5, -10], size: [6, 3, 1], color: '#18181b', accentColor: '#ef4444' },
      { id: 'table-center', type: 'table', name: 'Study Table', position: [0, 0.5, 0], size: [4.5, 0.9, 2.5], color: '#451a03' },
      { id: 'lamp-1', type: 'lamp', name: 'Dim Floor Lamp', position: [-2, 1.2, -4], size: [0.6, 2.4, 0.6], color: '#ef4444' },
      { id: 'lamp-2', type: 'lamp', name: 'Emergency Light', position: [2, 1.2, 4], size: [0.6, 2.4, 0.6], color: '#dc2626' },
    ],
    spawnPoints: [
      [0, 3], [-2, 2], [2, 2], [-3, -2], [3, -2], [0, -4], [-5, 4], [5, 4], [-4, -5], [4, -5]
    ]
  },
  lounge: {
    theme: 'lounge',
    title: 'Central Recreation Hall',
    subtitle: 'Surveillance monitors and broken broadcast speakers',
    dimensions: { width: 30, depth: 26 },
    ambientColor: '#0f172a',
    wallColor: '#1e293b',
    floorColor: '#090d16',
    furniture: [
      { id: 'couch-1', type: 'couch', name: 'Leather Sofa', position: [-4, 0.6, -2], size: [4.5, 1.2, 2], color: '#7f1d1d' },
      { id: 'couch-2', type: 'couch', name: 'Sectional Sofa', position: [4, 0.6, -2], size: [4.5, 1.2, 2], color: '#7f1d1d' },
      { id: 'table-coffee', type: 'table', name: 'Glass Coffee Table', position: [0, 0.4, -2], size: [3, 0.7, 1.8], color: '#334155' },
      { id: 'tv-stand', type: 'tv', name: 'Broadcast Monitor', position: [0, 1.8, -11], size: [5, 2.8, 0.8], color: '#020617', accentColor: '#ef4444' },
      { id: 'cabinet-1', type: 'cabinet', name: 'Archive Bookcase', position: [-12, 1.6, 3], size: [1.2, 3.2, 6], color: '#292524' },
      { id: 'cabinet-2', type: 'cabinet', name: 'Trophy Case', position: [12, 1.6, 3], size: [1.2, 3.2, 6], color: '#292524' },
      { id: 'pillar-1', type: 'pillar', name: 'Concrete Pillar', position: [-7, 2.5, 6], size: [1.4, 5, 1.4], color: '#475569' },
      { id: 'pillar-2', type: 'pillar', name: 'Concrete Pillar', position: [7, 2.5, 6], size: [1.4, 5, 1.4], color: '#475569' },
    ],
    spawnPoints: [
      [0, 2], [-3, 4], [3, 4], [-1, 6], [1, 6], [-5, 0], [5, 0], [-2, -5], [2, -5], [0, -8]
    ]
  },
  basement: {
    theme: 'basement',
    title: 'Underground Facility',
    subtitle: 'Flickering red beacons and blocked emergency exits',
    dimensions: { width: 32, depth: 28 },
    ambientColor: '#2b0707',
    wallColor: '#180707',
    floorColor: '#0c0202',
    furniture: [
      { id: 'crate-1', type: 'crate', name: 'Storage Crates', position: [-9, 0.8, -8], size: [3, 1.6, 3], color: '#78350f' },
      { id: 'crate-2', type: 'crate', name: 'Sealed Containers', position: [-7, 1.2, -6], size: [2.5, 2.4, 2.5], color: '#451a03' },
      { id: 'crate-3', type: 'crate', name: 'Equipment Stack', position: [9, 1, -8], size: [3.5, 2, 3], color: '#78350f' },
      { id: 'pillar-b1', type: 'pillar', name: 'Support Beam', position: [-6, 3, 0], size: [1.6, 6, 1.6], color: '#262626' },
      { id: 'pillar-b2', type: 'pillar', name: 'Support Beam', position: [6, 3, 0], size: [1.6, 6, 1.6], color: '#262626' },
      { id: 'generator', type: 'counter', name: 'Backup Power Unit', position: [0, 1.5, -11], size: [5, 3, 2.2], color: '#171717', accentColor: '#dc2626' },
      { id: 'table-metal', type: 'table', name: 'Autopsy Table', position: [0, 0.6, 4], size: [4, 1.1, 2], color: '#52525b', accentColor: '#dc2626' },
    ],
    spawnPoints: [
      [0, -2], [-3, -1], [3, -1], [-4, 3], [4, 3], [0, 7], [-7, 2], [7, 2], [-2, -6], [2, -6]
    ]
  },
  cafeteria: {
    theme: 'cafeteria',
    title: 'Retreat Cafeteria',
    subtitle: 'Tipped chairs and bloodstained voting white line',
    dimensions: { width: 30, depth: 26 },
    ambientColor: '#172554',
    wallColor: '#1e1b4b',
    floorColor: '#0b0f19',
    furniture: [
      { id: 'table-c1', type: 'table', name: 'Dining Table A', position: [-6, 0.6, -4], size: [6, 1, 2], color: '#312e81' },
      { id: 'table-c2', type: 'table', name: 'Dining Table B', position: [6, 0.6, -4], size: [6, 1, 2], color: '#312e81' },
      { id: 'table-c3', type: 'table', name: 'Dining Table C', position: [-6, 0.6, 4], size: [6, 1, 2], color: '#312e81' },
      { id: 'table-c4', type: 'table', name: 'Dining Table D', position: [6, 0.6, 4], size: [6, 1, 2], color: '#312e81' },
      { id: 'counter-serving', type: 'counter', name: 'Food Dispenser Counter', position: [0, 1.1, -11], size: [14, 2.2, 1.8], color: '#1e293b' },
      { id: 'vending-1', type: 'cabinet', name: 'Vending Machine', position: [12, 1.6, -8], size: [1.8, 3.2, 1.4], color: '#991b1b', accentColor: '#f87171' },
    ],
    spawnPoints: [
      [0, 0], [-2, 0], [2, 0], [0, 2], [0, -2], [-10, 0], [10, 0], [-3, 7], [3, 7], [0, 8]
    ]
  }
};

export function generateRoomLayout(roomId: string, requestedTheme?: string): RoomLayout {
  // Deterministic seed based on room string
  const themes = ['dormitory', 'lounge', 'basement', 'cafeteria'];
  let chosenTheme = requestedTheme || themes[0];
  if (!requestedTheme) {
    let hash = 0;
    for (let i = 0; i < roomId.length; i++) {
      hash = (hash << 5) - hash + roomId.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % themes.length;
    chosenTheme = themes[idx];
  }

  const base = ROOM_THEMES[chosenTheme] || ROOM_THEMES.dormitory;
  return {
    ...base,
    id: `layout-${roomId}-${chosenTheme}`
  };
}
