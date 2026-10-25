'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Eye, Lock, Unlock, ShieldAlert } from 'lucide-react';
import Avatar3D from '@/components/Avatar3D';
import VirtualJoystick from '@/components/VirtualJoystick';
import {
  generateRoomLayout,
  RoomLayout,
  FurnitureItem,
  WallSegment,
  DoorData,
} from '@/lib/roomGenerator';
import { audioEngine } from '@/lib/audioEngine';
import { supabase } from '@/lib/supabaseClient';

export interface Player3DData {
  id: string;
  username: string;
  avatar_base64?: string | null;
  personality?: string;
  role?: string | null;
  is_bot?: boolean;
  alive?: boolean;
  x?: number;
  z?: number;
  rotation?: number;
  gesture?: 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'heal' | 'investigate';
}

interface GameBoardProps {
  roomId: string;
  phase: string;
  dayNumber: number;
  players: Player3DData[];
  currentUserId: string;
  isAdmin?: boolean;
  onUpdatePosition?: (pos: { x: number; z: number; rotation: number; gesture: string }) => void;
  onRoleAction?: (action: 'attack' | 'heal' | 'investigate', targetId: string) => void;
}

// -------------------------------------------------------------
// CAMERA CONTROLLER: FIRST PERSON (EYE-LEVEL) VS THIRD PERSON (ENLARGED)
// -------------------------------------------------------------
function CameraController({
  targetPos,
  targetRot,
  cameraMode,
}: {
  targetPos: [number, number, number];
  targetRot: number;
  cameraMode: 'firstPerson' | 'thirdPerson';
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const [tx, ty, tz] = targetPos;

    if (cameraMode === 'firstPerson') {
      // True Eye-Level View (1.65m height, horizontal forward look vector)
      const eyeHeight = 1.65;
      camera.position.x = tx;
      camera.position.y = ty + eyeHeight;
      camera.position.z = tz;

      // Look straight ahead in the player facing direction (horizontal sightline)
      const lookDist = 15;
      const targetLookX = tx + Math.sin(targetRot) * lookDist;
      const targetLookY = ty + eyeHeight; // strictly horizontal, not upper side
      const targetLookZ = tz + Math.cos(targetRot) * lookDist;

      camera.lookAt(targetLookX, targetLookY, targetLookZ);
    } else {
      // Enlarged Third Person Tactical View (Pulled back, elevated, sees over walls & rooms)
      const distance = 7.5;
      const height = 5.8;
      const camX = tx - Math.sin(targetRot) * distance;
      const camZ = tz - Math.cos(targetRot) * distance;
      const camY = ty + height;

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, camX, Math.min(1, delta * 7));
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, camY, Math.min(1, delta * 7));
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, camZ, Math.min(1, delta * 7));

      // Look at player center-of-mass
      const lookTarget = new THREE.Vector3(tx, ty + 1.2, tz);
      camera.lookAt(lookTarget);
    }
  });

  return null;
}

// -------------------------------------------------------------
// REALISTIC 3D PHYSICAL DOOR COMPONENT
// -------------------------------------------------------------
function PhysicalDoorMesh({
  door,
  playerPos,
  onToggleLock,
}: {
  door: DoorData;
  playerPos: [number, number, number];
  onToggleLock: (doorId: string) => void;
}) {
  const [dx, dy, dz] = door.position;
  const isXDoor = door.wallNormal === 'x'; // door opening crosses X axis
  const doorWidth = door.width;
  const doorHeight = door.height;
  const thickness = 0.12;

  // Determine which side of the door the player is currently standing on
  // For door at X = -3 (or 3):
  const playerSide = isXDoor
    ? playerPos[0] > dx
      ? 'roomA' // Central Corridor side
      : 'roomB' // Inside Room side
    : playerPos[2] > dz
    ? 'roomA'
    : 'roomB';

  const distToDoor = Math.hypot(playerPos[0] - dx, playerPos[2] - dz);
  const showHandlePrompt = distToDoor < 2.0;

  const canUnlock = !door.isLocked || door.lockedSide === playerSide;
  const isLockedFromOtherSide = door.isLocked && door.lockedSide !== playerSide;

  return (
    <group position={[dx, 0, dz]}>
      {/* Heavy Steel Door Frame */}
      {/* Left Frame Post */}
      <mesh position={isXDoor ? [0, doorHeight / 2, -doorWidth / 2 - 0.08] : [-doorWidth / 2 - 0.08, doorHeight / 2, 0]} castShadow>
        <boxGeometry args={isXDoor ? [0.45, doorHeight, 0.16] : [0.16, doorHeight, 0.45]} />
        <meshStandardMaterial color="#18181b" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Right Frame Post */}
      <mesh position={isXDoor ? [0, doorHeight / 2, doorWidth / 2 + 0.08] : [doorWidth / 2 + 0.08, doorHeight / 2, 0]} castShadow>
        <boxGeometry args={isXDoor ? [0.45, doorHeight, 0.16] : [0.16, doorHeight, 0.45]} />
        <meshStandardMaterial color="#18181b" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Frame Top Header */}
      <mesh position={[0, doorHeight + 0.08, 0]} castShadow>
        <boxGeometry args={isXDoor ? [0.45, 0.16, doorWidth + 0.32] : [doorWidth + 0.32, 0.16, 0.45]} />
        <meshStandardMaterial color="#18181b" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* Door Leaf (Swinging on Hinge at corner) */}
      <group
        position={isXDoor ? [0, 0, -doorWidth / 2] : [-doorWidth / 2, 0, 0]}
        rotation={[0, door.angle, 0]}
      >
        {/* Main Door Panel */}
        <mesh
          position={isXDoor ? [0, doorHeight / 2, doorWidth / 2] : [doorWidth / 2, doorHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={isXDoor ? [thickness, doorHeight, doorWidth] : [doorWidth, doorHeight, thickness]} />
          <meshStandardMaterial
            color={door.isLocked ? '#450a0a' : '#27272a'}
            roughness={0.6}
            metalness={0.3}
          />
        </mesh>

        {/* Steel Cross Brace Panel Detail */}
        <mesh position={isXDoor ? [0, doorHeight / 2, doorWidth / 2] : [doorWidth / 2, doorHeight / 2, 0]}>
          <boxGeometry args={isXDoor ? [thickness + 0.02, doorHeight * 0.88, doorWidth * 0.88] : [doorWidth * 0.88, doorHeight * 0.88, thickness + 0.02]} />
          <meshStandardMaterial color="#18181b" roughness={0.7} metalness={0.5} />
        </mesh>

        {/* Door Brass Handle & Lock Bolt at Z = doorWidth * 0.85 */}
        <mesh position={isXDoor ? [0.1, 1.2, doorWidth * 0.85] : [doorWidth * 0.85, 1.2, 0.1]}>
          <boxGeometry args={[0.08, 0.22, 0.18]} />
          <meshStandardMaterial color={door.isLocked ? '#ef4444' : '#eab308'} metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Lock Status Indicator Glow on Handle */}
        <pointLight
          position={isXDoor ? [0.15, 1.2, doorWidth * 0.85] : [doorWidth * 0.85, 1.2, 0.15]}
          color={door.isLocked ? '#ef4444' : '#22c55e'}
          intensity={0.8}
          distance={1.5}
        />
      </group>

      {/* Floating 3D Contextual Handle Lock/Unlock Button */}
      {showHandlePrompt && (
        <Html position={[0, 1.45, 0]} center distanceFactor={14}>
          <div className="pointer-events-auto transform -translate-y-4">
            {isLockedFromOtherSide ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/95 border border-red-500 rounded-xl text-red-300 text-xs font-bold shadow-2xl backdrop-blur-md animate-pulse">
                <ShieldAlert size={14} className="text-red-400" />
                <span>Locked from other side</span>
              </div>
            ) : door.isLocked ? (
              <button
                type="button"
                onClick={() => onToggleLock(door.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-black font-extrabold text-xs rounded-xl shadow-2xl transition-all cursor-pointer border border-yellow-300 active:scale-95"
              >
                <Unlock size={14} />
                <span>Unlock Door</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onToggleLock(door.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white font-extrabold text-xs rounded-xl shadow-2xl transition-all cursor-pointer border border-red-400 active:scale-95"
              >
                <Lock size={14} />
                <span>Lock Door</span>
              </button>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// -------------------------------------------------------------
// FURNITURE MESH RENDERER
// -------------------------------------------------------------
function FurnitureMesh({ item }: { item: FurnitureItem }) {
  const [w, h, d] = item.size;

  return (
    <group position={item.position} rotation={[0, item.rotation || 0, 0]}>
      {/* Main Furniture Box */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={item.color || '#3f3f46'}
          roughness={0.65}
          metalness={0.25}
        />
      </mesh>

      {/* Accent Detail */}
      {item.accentColor && (
        <mesh position={[0, h + 0.02, 0]}>
          <boxGeometry args={[w * 0.9, 0.04, d * 0.9]} />
          <meshBasicMaterial color={item.accentColor} />
        </mesh>
      )}
    </group>
  );
}

// -------------------------------------------------------------
// HYPER-REALISTIC MULTI-ROOM ENVIRONMENT
// -------------------------------------------------------------
function RoomEnvironment({
  layout,
  phase,
  doors,
  playerPos,
  onToggleLock,
}: {
  layout: RoomLayout;
  phase: string;
  doors: DoorData[];
  playerPos: [number, number, number];
  onToggleLock: (doorId: string) => void;
}) {
  const isNight = phase === 'Night';

  return (
    <group>
      {/* Ambient & Directional Lighting */}
      <ambientLight intensity={isNight ? 0.35 : 0.85} color={isNight ? '#1e3a8a' : '#ffffff'} />
      <directionalLight
        position={[15, 24, 15]}
        intensity={isNight ? 0.5 : 1.3}
        color={isNight ? '#60a5fa' : '#fffbeb'}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Emergency Hallway Beacons */}
      <pointLight position={[0, 4.2, -10]} color="#ef4444" intensity={1.5} distance={15} />
      <pointLight position={[0, 4.2, 0]} color="#ef4444" intensity={1.5} distance={15} />
      <pointLight position={[0, 4.2, 10]} color="#ef4444" intensity={1.5} distance={15} />

      {/* Main Facility Concrete Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[layout.dimensions.width, layout.dimensions.depth]} />
        <meshStandardMaterial
          color={layout.floorColor}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Floor Grid Guidelines */}
      <gridHelper
        args={[36, 36, '#991b1b', '#27272a']}
        position={[0, 0.02, 0]}
      />

      {/* Red Rule Execution Boundaries along Corridor */}
      <lineSegments position={[0, 0.04, 0]}>
        <edgesGeometry
          args={[new THREE.BoxGeometry(6, 0.05, 36)]}
        />
        <lineBasicMaterial color="#dc2626" linewidth={2} />
      </lineSegments>

      {/* All 4.5m Ceiling-Height Partition Walls (Strict full occlusion) */}
      {layout.walls.map((wall) => (
        <mesh key={wall.id} position={wall.position} castShadow receiveShadow>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial
            color={wall.color || layout.wallColor}
            roughness={0.85}
            metalness={0.15}
          />
        </mesh>
      ))}

      {/* 4 Physical Doors with Push Swing & 1-Sided Lock */}
      {doors.map((door) => (
        <PhysicalDoorMesh
          key={door.id}
          door={door}
          playerPos={playerPos}
          onToggleLock={onToggleLock}
        />
      ))}

      {/* Fixed Realistic Furniture Items */}
      {layout.furniture.map((item) => (
        <FurnitureMesh key={item.id} item={item} />
      ))}
    </group>
  );
}

// -------------------------------------------------------------
// MAIN GAMEBOARD 3D VIEWPORT
// -------------------------------------------------------------
export default function GameBoard({
  roomId,
  phase,
  dayNumber,
  players,
  currentUserId,
  isAdmin = false,
  onUpdatePosition,
  onRoleAction,
}: GameBoardProps) {
  const [cameraMode, setCameraMode] = useState<'thirdPerson' | 'firstPerson'>('thirdPerson');
  const [actionBurstTime, setActionBurstTime] = useState<number>(0);

  // Local state for Current Player Physics & Movement
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 0]);
  const [playerRot, setPlayerRot] = useState<number>(0);
  const [playerGesture, setPlayerGesture] = useState<
    'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'heal' | 'investigate'
  >('idle');
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [jumpTimer, setJumpTimer] = useState<number>(0);

  // Virtual joystick movement vector from touch controls
  const joystickVector = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Procedural Room Layout with Fixed Multi-room architecture
  const roomLayout = useMemo(() => generateRoomLayout(roomId), [roomId]);
  const halfW = roomLayout.dimensions.width / 2 - 0.8;
  const halfD = roomLayout.dimensions.depth / 2 - 0.8;

  // Doors State (Physical doors with one-sided locking)
  const [doors, setDoors] = useState<DoorData[]>(roomLayout.doors);

  // Only simulate NPC Bots for true AI bots
  const [botStates, setBotStates] = useState<
    Record<
      string,
      {
        x: number;
        z: number;
        targetX: number;
        targetZ: number;
        rotation: number;
        gesture: 'idle' | 'walk' | 'run';
        idleTimer: number;
      }
    >
  >({});

  // Real human players interpolation targets
  const remotePlayerPositions = useRef<
    Record<string, { x: number; z: number; rotation: number; gesture: string }>
  >({});

  // Sync incoming real player positions
  useEffect(() => {
    players.forEach((p) => {
      if (p.id !== currentUserId && !p.is_bot && p.x !== undefined && p.z !== undefined) {
        remotePlayerPositions.current[p.id] = {
          x: p.x,
          z: p.z,
          rotation: p.rotation || 0,
          gesture: p.gesture || 'idle',
        };
      }
    });
  }, [players, currentUserId]);

  // Find Current Player Details
  const currentPlayer = useMemo(
    () => players.find((p) => p.id === currentUserId) || players[0],
    [players, currentUserId]
  );

  // Initialize spawn position for current player
  useEffect(() => {
    const spawnIdx = Math.abs(currentUserId.charCodeAt(0) || 0) % roomLayout.spawnPoints.length;
    const [sx, sz] = roomLayout.spawnPoints[spawnIdx] || [0, 0];
    setPlayerPos([sx, 0, sz]);
  }, [currentUserId, roomLayout]);

  // Realtime channel for Door state updates
  useEffect(() => {
    const channel = supabase
      .channel(`game-doors:${roomId}`)
      .on('broadcast', { event: 'door_update' }, ({ payload }) => {
        if (payload?.doorId) {
          setDoors((prev) =>
            prev.map((d) =>
              d.id === payload.doorId
                ? {
                    ...d,
                    angle: payload.angle ?? d.angle,
                    isLocked: payload.isLocked ?? d.isLocked,
                    lockedSide: payload.lockedSide ?? d.lockedSide,
                  }
                : d
            )
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Broadcast Door Update
  const broadcastDoorUpdate = useCallback(
    (doorId: string, updates: Partial<DoorData>) => {
      const channel = supabase.channel(`game-doors:${roomId}`);
      channel.send({
        type: 'broadcast',
        event: 'door_update',
        payload: { doorId, ...updates },
      });
    },
    [roomId]
  );

  // Toggle Door Lock (With 1-sided lock enforcement)
  const handleToggleDoorLock = useCallback(
    (doorId: string) => {
      const door = doors.find((d) => d.id === doorId);
      if (!door) return;

      const [dx, _, dz] = door.position;
      const isXDoor = door.wallNormal === 'x';
      const playerSide = isXDoor
        ? playerPos[0] > dx
          ? 'roomA' // Central Corridor side
          : 'roomB' // Inside Room side
        : playerPos[2] > dz
        ? 'roomA'
        : 'roomB';

      if (door.isLocked) {
        // Only allow unlocking if player is on the side that locked it!
        if (door.lockedSide === playerSide) {
          audioEngine.playDoorUnlock();
          const updated = { isLocked: false, lockedSide: null };
          setDoors((prev) =>
            prev.map((d) => (d.id === doorId ? { ...d, ...updated } : d))
          );
          broadcastDoorUpdate(doorId, updated);
        } else {
          audioEngine.playHover();
        }
      } else {
        // Lock the door from player's current side
        audioEngine.playDoorLock();
        const updated: Partial<DoorData> = { isLocked: true, lockedSide: playerSide };
        setDoors((prev) =>
          prev.map((d) => (d.id === doorId ? { ...d, ...updated } : d))
        );
        broadcastDoorUpdate(doorId, updated);
      }
    },
    [broadcastDoorUpdate, doors, playerPos]
  );

  // Initialize NPC Bots ONLY for true bots (player.is_bot === true)
  useEffect(() => {
    setBotStates((prev) => {
      const next = { ...prev };
      players
        .filter((p) => Boolean(p.is_bot))
        .forEach((p, idx) => {
          if (!next[p.id]) {
            const spawn =
              roomLayout.spawnPoints[(idx + 4) % roomLayout.spawnPoints.length] || [0, 0];
            next[p.id] = {
              x: spawn[0],
              z: spawn[1],
              targetX: spawn[0],
              targetZ: spawn[1],
              rotation: 0,
              gesture: 'idle',
              idleTimer: Math.random() * 2 + 1,
            };
          }
        });
      return next;
    });
  }, [players, roomLayout]);

  // Jump animation ticker
  useEffect(() => {
    if (jumpTimer <= 0) return;
    const interval = setInterval(() => {
      setJumpTimer((prev) => {
        if (prev >= 1) {
          audioEngine.playLand();
          return 0;
        }
        return prev + 0.1;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [jumpTimer]);

  const triggerJump = useCallback(() => {
    if (jumpTimer > 0) return;
    setJumpTimer(0.01);
    audioEngine.playJump();
  }, [jumpTimer]);

  // Keyboard controls listener
  const keysDown = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDown.current[e.key.toLowerCase()] = true;
      if (e.code === 'Space') {
        e.preventDefault();
        triggerJump();
      }
      if (e.key.toLowerCase() === 'shift') {
        setIsSprinting(true);
      }
      if (e.key.toLowerCase() === 'e') {
        handleRoleAction();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.key.toLowerCase()] = false;
      if (e.key.toLowerCase() === 'shift') {
        setIsSprinting(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [triggerJump]);

  // Physics & Kinematics Game Loop
  const playerPosRef = useRef<[number, number, number]>([0, 0, 0]);
  const playerRotRef = useRef<number>(0);
  const velocityRef = useRef<{ x: number; z: number }>({ x: 0, y: 0, z: 0 });
  const stepCadenceTimer = useRef<number>(0);

  useEffect(() => {
    let lastTime = performance.now();
    let animationFrameId: number;
    let lastBroadcastTime = 0;

    const gameLoop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;

      // 1. Gather Directional Input Vector
      let stickX = joystickVector.current.x;
      let stickY = joystickVector.current.y;

      if (keysDown.current['w'] || keysDown.current['arrowup']) stickY += 1;
      if (keysDown.current['s'] || keysDown.current['arrowdown']) stickY -= 1;
      if (keysDown.current['a'] || keysDown.current['arrowleft']) stickX -= 1;
      if (keysDown.current['d'] || keysDown.current['arrowright']) stickX += 1;

      const inputX = stickX;
      const inputZ = -stickY;

      const inputLength = Math.hypot(inputX, inputZ);
      let normInputX = 0;
      let normInputZ = 0;
      if (inputLength > 0.05) {
        normInputX = inputX / (inputLength > 1 ? inputLength : 1);
        normInputZ = inputZ / (inputLength > 1 ? inputLength : 1);
      }

      const hasInput = inputLength > 0.05 && (currentPlayer?.alive ?? true);

      // Speeds & Accelerations
      const maxSpeed = isSprinting ? 6.0 : 3.4;
      const acceleration = isSprinting ? 24.0 : 18.0;
      const friction = hasInput ? 0.94 : 0.85;

      const currentVx = velocityRef.current.x;
      const currentVz = velocityRef.current.z;

      let targetVx = 0;
      let targetVz = 0;

      if (hasInput) {
        targetVx = normInputX * maxSpeed;
        targetVz = normInputZ * maxSpeed;

        velocityRef.current.x += (targetVx - currentVx) * Math.min(1, acceleration * dt);
        velocityRef.current.z += (targetVz - currentVz) * Math.min(1, acceleration * dt);

        const targetAngle = Math.atan2(normInputX, normInputZ);
        let angleDiff = targetAngle - playerRotRef.current;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        playerRotRef.current += angleDiff * Math.min(1, dt * 15);
        setPlayerRot(playerRotRef.current);
      } else {
        velocityRef.current.x *= Math.pow(friction, dt * 60);
        velocityRef.current.z *= Math.pow(friction, dt * 60);

        if (Math.abs(velocityRef.current.x) < 0.01) velocityRef.current.x = 0;
        if (Math.abs(velocityRef.current.z) < 0.01) velocityRef.current.z = 0;
      }

      const currentSpeed = Math.hypot(velocityRef.current.x, velocityRef.current.z);

      // Update gesture based on velocity
      let currentGesture: 'idle' | 'walk' | 'run' = 'idle';
      if (currentSpeed > 3.6) {
        currentGesture = 'run';
        setPlayerGesture('run');
      } else if (currentSpeed > 0.15) {
        currentGesture = 'walk';
        setPlayerGesture('walk');
      } else {
        setPlayerGesture('idle');
      }

      // Synced Footstep Audio Cadence
      if (currentGesture !== 'idle') {
        stepCadenceTimer.current += dt;
        const interval = currentGesture === 'run' ? 0.27 : 0.46;
        if (stepCadenceTimer.current >= interval) {
          stepCadenceTimer.current = 0;
          audioEngine.playFootstep(currentGesture === 'run');
        }
      } else {
        stepCadenceTimer.current = 0;
      }

      // 2. Candidate Position & Wall Collision Resolution
      const prevX = playerPosRef.current[0];
      const prevZ = playerPosRef.current[2];
      let candidateX = THREE.MathUtils.clamp(prevX + velocityRef.current.x * dt, -halfW, halfW);
      let candidateZ = THREE.MathUtils.clamp(prevZ + velocityRef.current.z * dt, -halfD, halfD);

      const playerRadius = 0.38;

      // Wall & Furniture Collisions
      const obstacleBoxes = [
        ...roomLayout.walls.map((w) => ({ position: w.position, size: w.size })),
        ...roomLayout.furniture.map((f) => ({ position: f.position, size: f.size })),
      ];

      for (const box of obstacleBoxes) {
        const [bx, _, bz] = box.position;
        const [bw, __, bd] = box.size;
        const boxMinX = bx - bw / 2 - playerRadius;
        const boxMaxX = bx + bw / 2 + playerRadius;
        const boxMinZ = bz - bd / 2 - playerRadius;
        const boxMaxZ = bz + bd / 2 + playerRadius;

        if (candidateX >= boxMinX && candidateX <= boxMaxX && prevZ >= boxMinZ && prevZ <= boxMaxZ) {
          candidateX = prevX;
          velocityRef.current.x = 0;
        }
        if (candidateX >= boxMinX && candidateX <= boxMaxX && candidateZ >= boxMinZ && candidateZ <= boxMaxZ) {
          candidateZ = prevZ;
          velocityRef.current.z = 0;
        }
      }

      // 3. Physical Door Push Kinematics
      doors.forEach((door) => {
        const [dx, _, dz] = door.position;
        const dist = Math.hypot(candidateX - dx, candidateZ - dz);

        // When player walks into a door
        if (dist < 1.4) {
          if (door.isLocked) {
            // Locked door blocks movement like a solid wall
            candidateX = prevX;
            candidateZ = prevZ;
            velocityRef.current.x = 0;
            velocityRef.current.z = 0;
          } else {
            // Unlocked door swings open in direction of player push
            const pushDir = candidateX - dx > 0 ? 1 : -1;
            const targetAngle = pushDir * 1.45;

            if (Math.abs(door.angle - targetAngle) > 0.1) {
              audioEngine.playDoorPush();
              setDoors((prevDoors) =>
                prevDoors.map((d) =>
                  d.id === door.id
                    ? { ...d, angle: THREE.MathUtils.lerp(d.angle, targetAngle, 0.2) }
                    : d
                )
              );
              broadcastDoorUpdate(door.id, { angle: targetAngle });
            }
          }
        }
      });

      if (candidateX !== prevX || candidateZ !== prevZ) {
        playerPosRef.current = [candidateX, playerPosRef.current[1], candidateZ];
        setPlayerPos([candidateX, playerPosRef.current[1], candidateZ]);
      }

      // 4. Smooth AI Bot Movement
      setBotStates((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((botId) => {
          const bot = updated[botId];
          const distToTarget = Math.hypot(bot.targetX - bot.x, bot.targetZ - bot.z);

          if (distToTarget < 0.5) {
            bot.idleTimer -= dt;
            bot.gesture = 'idle';

            if (bot.idleTimer <= 0) {
              const randomFurniture =
                roomLayout.furniture[Math.floor(Math.random() * roomLayout.furniture.length)];
              bot.targetX = THREE.MathUtils.clamp(
                randomFurniture.position[0] + (Math.random() * 3 - 1.5),
                -halfW,
                halfW
              );
              bot.targetZ = THREE.MathUtils.clamp(
                randomFurniture.position[2] + (Math.random() * 3 - 1.5),
                -halfD,
                halfD
              );
              bot.idleTimer = Math.random() * 4 + 2;
            }
          } else {
            const targetAngle = Math.atan2(bot.targetX - bot.x, bot.targetZ - bot.z);
            let angleDiff = targetAngle - bot.rotation;
            angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
            bot.rotation += angleDiff * Math.min(1, dt * 8);

            const botSpeed = 1.6;
            bot.x += Math.sin(bot.rotation) * botSpeed * dt;
            bot.z += Math.cos(bot.rotation) * botSpeed * dt;
            bot.gesture = 'walk';
          }
        });
        return updated;
      });

      // 5. High-Frequency Realtime Broadcast (every 60ms)
      const now = Date.now();
      if (now - lastBroadcastTime > 60 && onUpdatePosition) {
        lastBroadcastTime = now;
        onUpdatePosition({
          x: playerPosRef.current[0],
          z: playerPosRef.current[2],
          rotation: playerRotRef.current,
          gesture: currentSpeed > 3.6 ? 'run' : currentSpeed > 0.15 ? 'walk' : 'idle',
        });
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    broadcastDoorUpdate,
    currentPlayer?.alive,
    doors,
    halfD,
    halfW,
    isSprinting,
    onUpdatePosition,
    roomLayout.furniture,
    roomLayout.walls,
  ]);

  // Handle Role Action
  const handleRoleAction = () => {
    if (!currentPlayer?.alive) return;
    setActionBurstTime(Date.now());
    audioEngine.playRoleReveal();

    const targets = players.filter((p) => p.id !== currentUserId && (p.alive ?? true));
    let closestTarget = targets[0];
    let minDistance = Infinity;

    targets.forEach((t) => {
      const bState = botStates[t.id];
      const rState = remotePlayerPositions.current[t.id];
      const tx = bState ? bState.x : rState ? rState.x : (t.x || 0);
      const tz = bState ? bState.z : rState ? rState.z : (t.z || 0);
      const dist = Math.hypot(tx - playerPos[0], tz - playerPos[2]);
      if (dist < minDistance) {
        minDistance = dist;
        closestTarget = t;
      }
    });

    if (closestTarget && onRoleAction) {
      if (currentPlayer.role === 'Mafia') {
        onRoleAction('attack', closestTarget.id);
      } else if (currentPlayer.role === 'Doctor') {
        onRoleAction('heal', closestTarget.id);
      } else if (currentPlayer.role === 'Police' || currentPlayer.role === 'Detective') {
        onRoleAction('investigate', closestTarget.id);
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* Three.js Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 8, 10], fov: 50, near: 0.08 }}
        className="w-full h-full"
      >
        <CameraController
          targetPos={playerPos}
          targetRot={playerRot}
          cameraMode={cameraMode}
        />

        <RoomEnvironment
          layout={roomLayout}
          phase={phase}
          doors={doors}
          playerPos={playerPos}
          onToggleLock={handleToggleDoorLock}
        />

        {/* Current User Avatar (Hidden in First Person so player sees strictly from eye level) */}
        <Avatar3D
          id={currentUserId}
          name={currentPlayer?.username || 'You'}
          avatarBase64={currentPlayer?.avatar_base64}
          personality={currentPlayer?.personality || 'Leader'}
          role={currentPlayer?.role || 'Citizen'}
          isBot={false}
          isAdmin={isAdmin}
          visible={cameraMode !== 'firstPerson'}
          isAlive={currentPlayer?.alive ?? true}
          position={playerPos}
          rotation={playerRot}
          gesture={playerGesture}
          isCurrentPlayer={true}
          jumpProgress={jumpTimer}
          actionTrigger={actionBurstTime}
        />

        {/* Render Other Players: Real Human Players + AI Bots */}
        {players
          .filter((p) => p.id !== currentUserId)
          .map((player) => {
            const isBot = Boolean(player.is_bot);
            const bState = botStates[player.id];
            const rState = remotePlayerPositions.current[player.id];

            const posX = isBot ? bState?.x || 0 : rState ? rState.x : (player.x || 0);
            const posZ = isBot ? bState?.z || 0 : rState ? rState.z : (player.z || 0);
            const rot = isBot ? bState?.rotation || 0 : rState ? rState.rotation : (player.rotation || 0);
            const gest = isBot
              ? bState?.gesture || 'idle'
              : (rState?.gesture || player.gesture || 'idle') as any;

            return (
              <Avatar3D
                key={player.id}
                id={player.id}
                name={player.username}
                avatarBase64={player.avatar_base64}
                personality={player.personality || 'Quiet Observer'}
                role={player.role || 'Citizen'}
                isBot={isBot}
                visible={true}
                isAlive={player.alive ?? true}
                position={[posX, 0, posZ]}
                rotation={rot}
                gesture={gest}
                isCurrentPlayer={false}
              />
            );
          })}
      </Canvas>

      {/* Top Left: Perspective Buttons: (eye icon) Third Person / (eye icon) First Person */}
      <div className="absolute top-3 left-3 z-20 flex gap-2">
        <button
          type="button"
          onClick={() => {
            audioEngine.playClick();
            setCameraMode('thirdPerson');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-lg backdrop-blur-md cursor-pointer ${
            cameraMode === 'thirdPerson'
              ? 'bg-red-700 text-white shadow-red-900/50 border border-red-500 scale-105'
              : 'bg-black/60 text-zinc-400 hover:text-white border border-white/10'
          }`}
        >
          <Eye size={14} />
          <span>Third Person</span>
        </button>

        <button
          type="button"
          onClick={() => {
            audioEngine.playClick();
            setCameraMode('firstPerson');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-lg backdrop-blur-md cursor-pointer ${
            cameraMode === 'firstPerson'
              ? 'bg-red-700 text-white shadow-red-900/50 border border-red-500 scale-105'
              : 'bg-black/60 text-zinc-400 hover:text-white border border-white/10'
          }`}
        >
          <Eye size={14} />
          <span>First Person</span>
        </button>
      </div>

      {/* Top Right: Current Room Location HUD */}
      <div className="absolute top-3 right-3 z-20 px-3 py-1 bg-black/70 border border-white/15 rounded-xl text-[11px] font-mono text-zinc-300 backdrop-blur-md shadow flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>
          {playerPos[0] > -3 && playerPos[0] < 3
            ? 'Central Corridor'
            : playerPos[0] <= -3 && playerPos[2] < 0
            ? 'Dormitory'
            : playerPos[0] >= 3 && playerPos[2] < 0
            ? 'Security CCTV'
            : playerPos[0] <= -3 && playerPos[2] >= 0
            ? 'Cafeteria'
            : 'Infirmary'}
        </span>
      </div>

      {/* Virtual Joystick for Mobile Touch Controls */}
      <VirtualJoystick
        onMove={(vec) => {
          joystickVector.current = vec;
        }}
        onSprintToggle={(sprinting) => {
          setIsSprinting(sprinting);
        }}
        onJump={triggerJump}
        onAction={handleRoleAction}
        role={currentPlayer?.role}
        isAlive={currentPlayer?.alive ?? true}
      />
    </div>
  );
}
