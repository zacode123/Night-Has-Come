'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Lock, Unlock, ShieldAlert, MapPin } from 'lucide-react';
import Avatar3D from '@/components/Avatar3D';
import VirtualJoystick from '@/components/VirtualJoystick';
import MafiaTargetModal from '@/components/MafiaTargetModal';
import {
  generateRoomLayout,
  RoomLayout,
  FurnitureItem,
  DoorData,
  WindowData,
  WallLightFixture,
  getSafeOpenSpawnPoint,
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

function getChamberDetails(chamber: string) {
  switch (chamber) {
    case 'Grand Gallery':
      return {
        label: 'Grand Gallery',
        subtitle: 'Main central hall connecting all rooms',
        tag: 'CENTRAL CORRIDOR',
      };
    case 'Master Study':
      return {
        label: 'Master Study',
        subtitle: 'West wing private room with study desks & sunlit windows',
        tag: 'WEST WING',
      };
    case 'Surveillance Salon':
      return {
        label: 'Surveillance Salon',
        subtitle: 'East security observation room with perimeter windows',
        tag: 'EAST WING',
      };
    case 'Dining Hall':
      return {
        label: 'Dining Hall',
        subtitle: 'Southwest communal room, banquet tables & bay windows',
        tag: 'SOUTHWEST ROOM',
      };
    case 'Apothecary Infirmary':
      return {
        label: 'Apothecary Infirmary',
        subtitle: 'Southeast medical recovery clinic & natural light windows',
        tag: 'SOUTHEAST CLINIC',
      };
    default:
      return {
        label: chamber,
        subtitle: 'Retreat Center Room',
        tag: 'MANOR LOCATION',
      };
  }
}

// -------------------------------------------------------------
// WORLD CONTROLLER: SMOOTH CAMERA & JITTER-FREE MOVEMENT
// -------------------------------------------------------------
function WorldController({
  roomLayout,
  doors,
  setDoors,
  broadcastDoorUpdate,
  isSprinting,
  cameraMode,
  isAlive,
  joystickVector,
  keysDown,
  playerPosRef,
  playerRotRef,
  playerGestureRef,
  camYawRef,
  botStatesRef,
  onChamberChange,
  onUpdatePosition,
}: {
  roomLayout: RoomLayout;
  doors: DoorData[];
  setDoors: React.Dispatch<React.SetStateAction<DoorData[]>>;
  broadcastDoorUpdate: (doorId: string, updates: Partial<DoorData>) => void;
  isSprinting: boolean;
  cameraMode: 'firstPerson' | 'thirdPerson';
  isAlive: boolean;
  joystickVector: React.RefObject<{ x: number; y: number }>;
  keysDown: React.RefObject<Record<string, boolean>>;
  playerPosRef: React.RefObject<[number, number, number] | null>;
  playerRotRef: React.RefObject<number | null>;
  playerGestureRef: React.RefObject<string | null>;
  camYawRef: React.RefObject<number>;
  botStatesRef: React.RefObject<Record<string, any>>;
  onChamberChange: (chamber: string) => void;
  onUpdatePosition?: (pos: { x: number; z: number; rotation: number; gesture: string }) => void;
}) {
  const { camera } = useThree();
  const velocityRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const stepCadenceTimer = useRef<number>(0);
  const lastBroadcastTime = useRef<number>(0);
  const lastHudUpdateTime = useRef<number>(0);

  const halfW = roomLayout.dimensions.width / 2 - 0.9;
  const halfD = roomLayout.dimensions.depth / 2 - 0.9;
  const obstacleBoxes = useMemo(
    () => [
      ...roomLayout.walls.map((w) => ({ position: w.position, size: w.size })),
      ...roomLayout.furniture.filter((f) => f.type !== 'rug').map((f) => ({ position: f.position, size: f.size })),
    ],
    [roomLayout]
  );

  // Dynamic Camera FOV adjustment: 76 in First Person for wide comfortable view, 58 in Third Person
  useEffect(() => {
    const targetFov = cameraMode === 'firstPerson' ? 76 : 58;
    if ((camera as THREE.PerspectiveCamera).fov !== targetFov) {
      (camera as THREE.PerspectiveCamera).fov = targetFov;
      camera.updateProjectionMatrix();
    }
  }, [cameraMode, camera]);

  useFrame((_, rawDelta) => {
    if (!playerPosRef.current) return;
    const dt = Math.min(rawDelta, 0.05);

    // 1. Gather Directional Input Vector from Virtual Joystick & Keyboard
    let stickX = joystickVector.current?.x || 0;
    let stickY = joystickVector.current?.y || 0;

    if (keysDown.current?.['w'] || keysDown.current?.['arrowup']) stickY += 1;
    if (keysDown.current?.['s'] || keysDown.current?.['arrowdown']) stickY -= 1;
    if (keysDown.current?.['a'] || keysDown.current?.['arrowleft']) stickX -= 1;
    if (keysDown.current?.['d'] || keysDown.current?.['arrowright']) stickX += 1;

    let worldDirX = 0;
    let worldDirZ = 0;

    if (cameraMode === 'firstPerson') {
      // In first-person: smooth turning with stickX, forward/backward along view angle
      if (Math.abs(stickX) > 0.12) {
        const turnSpeed = 2.2;
        playerRotRef.current = (playerRotRef.current ?? 0) - stickX * turnSpeed * dt;
      }
      const curRot = playerRotRef.current ?? 0;
      worldDirX = Math.sin(curRot) * stickY;
      worldDirZ = Math.cos(curRot) * stickY;
    } else {
      // In third-person: screen-relative translation directly moves character smoothly
      worldDirX = stickX;
      worldDirZ = -stickY;
    }

    const inputLength = Math.hypot(stickX, stickY);
    const hasInput = inputLength >= 0.12 && isAlive;

    const maxSpeed = isSprinting ? 6.0 : 3.4;
    const acceleration = isSprinting ? 22.0 : 16.0;
    const friction = hasInput ? 0.94 : 0.82;

    if (hasInput) {
      const normX = worldDirX / (inputLength > 1 ? inputLength : 1);
      const normZ = worldDirZ / (inputLength > 1 ? inputLength : 1);

      const targetVx = normX * maxSpeed;
      const targetVz = normZ * maxSpeed;

      velocityRef.current.x += (targetVx - velocityRef.current.x) * Math.min(1, acceleration * dt);
      velocityRef.current.z += (targetVz - velocityRef.current.z) * Math.min(1, acceleration * dt);

      // Character heading smoothly faces movement vector in third-person
      if (cameraMode === 'thirdPerson') {
        const targetAngle = Math.atan2(normX, normZ);
        const currentRot = playerRotRef.current ?? 0;
        let angleDiff = targetAngle - currentRot;
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        const nextRot = currentRot + angleDiff * Math.min(1, dt * 14);
        playerRotRef.current = nextRot;
      }
    } else {
      velocityRef.current.x *= Math.pow(friction, dt * 60);
      velocityRef.current.z *= Math.pow(friction, dt * 60);

      if (Math.abs(velocityRef.current.x) < 0.02) velocityRef.current.x = 0;
      if (Math.abs(velocityRef.current.z) < 0.02) velocityRef.current.z = 0;
    }

    const currentSpeed = Math.hypot(velocityRef.current.x, velocityRef.current.z);

    // Update player gesture
    let currentGesture = 'idle';
    if (currentSpeed > 3.6) {
      currentGesture = 'run';
    } else if (currentSpeed > 0.18) {
      currentGesture = 'walk';
    } else {
      currentGesture = 'idle';
    }
    playerGestureRef.current = currentGesture;

    // Footstep audio cadence
    if (currentGesture !== 'idle') {
      stepCadenceTimer.current += dt;
      const interval = currentGesture === 'run' ? 0.28 : 0.46;
      if (stepCadenceTimer.current >= interval) {
        stepCadenceTimer.current = 0;
        audioEngine.playFootstep(currentGesture === 'run');
      }
    } else {
      stepCadenceTimer.current = 0;
    }

    // Candidate Position & Smooth Wall Sliding Collision (Zero Shaking or Jitter!)
    const prevX = playerPosRef.current[0];
    const prevZ = playerPosRef.current[2];
    let candidateX = THREE.MathUtils.clamp(prevX + velocityRef.current.x * dt, -halfW, halfW);
    let candidateZ = THREE.MathUtils.clamp(prevZ + velocityRef.current.z * dt, -halfD, halfD);

    const playerRadius = 0.36;

    // Test X-axis movement independently for smooth wall sliding
    for (const box of obstacleBoxes) {
      const [bx, , bz] = box.position;
      const [bw, , bd] = box.size;
      const minX = bx - bw / 2 - playerRadius;
      const maxX = bx + bw / 2 + playerRadius;
      const minZ = bz - bd / 2 - playerRadius;
      const maxZ = bz + bd / 2 + playerRadius;

      if (candidateX >= minX && candidateX <= maxX && prevZ >= minZ && prevZ <= maxZ) {
        candidateX = prevX;
        velocityRef.current.x = 0;
        break;
      }
    }

    // Test Z-axis movement independently
    for (const box of obstacleBoxes) {
      const [bx, , bz] = box.position;
      const [bw, , bd] = box.size;
      const minX = bx - bw / 2 - playerRadius;
      const maxX = bx + bw / 2 + playerRadius;
      const minZ = bz - bd / 2 - playerRadius;
      const maxZ = bz + bd / 2 + playerRadius;

      if (candidateX >= minX && candidateX <= maxX && candidateZ >= minZ && candidateZ <= maxZ) {
        candidateZ = prevZ;
        velocityRef.current.z = 0;
        break;
      }
    }

    // Physical Door Push
    doors.forEach((door) => {
      const [dx, , dz] = door.position;
      const dist = Math.hypot(candidateX - dx, candidateZ - dz);
      if (dist < 1.4) {
        if (door.isLocked) {
          candidateX = prevX;
          candidateZ = prevZ;
          velocityRef.current.x = 0;
          velocityRef.current.z = 0;
        } else {
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

    playerPosRef.current[0] = candidateX;
    playerPosRef.current[2] = candidateZ;

    const px = candidateX;
    const py = playerPosRef.current[1];
    const pz = candidateZ;

    // -----------------------------------------------------------------
    // CAMERA POSITIONING & DAMPING
    // -----------------------------------------------------------------
    if (cameraMode === 'firstPerson') {
      // First Person: Human Eye Height = 1.55m, silky exponential damping (ZERO violent shake)
      const eyeHeight = 1.55;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, px, 18, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, py + eyeHeight, 18, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, pz, 18, dt);

      // Smooth heading yaw
      const pRot = playerRotRef.current ?? 0;
      camYawRef.current = THREE.MathUtils.damp(camYawRef.current, pRot, 16, dt);
      const lookDist = 12;
      camera.lookAt(
        camera.position.x + Math.sin(camYawRef.current) * lookDist,
        camera.position.y,
        camera.position.z + Math.cos(camYawRef.current) * lookDist
      );
    } else {
      // Third Person: Low Eye Level Camera well BELOW the 4.4m rafters & ceiling (Ceiling is never visible!)
      const distance = 4.2;
      const height = 2.1;

      // Clamp camera within room boundaries so it never clips into walls
      const targetCamX = THREE.MathUtils.clamp(px, -halfW + 0.8, halfW - 0.8);
      const targetCamY = py + height;
      const targetCamZ = THREE.MathUtils.clamp(pz + distance, -halfD + 0.8, halfD - 0.8);

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 12, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 12, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 12, dt);

      // Look at character torso/shoulder level (slightly above ground)
      camera.lookAt(px, py + 1.35, pz);
    }

    // Bot kinematics simulation
    const botMap = botStatesRef.current;
    if (botMap) {
      Object.keys(botMap).forEach((botId) => {
        const bot = botMap[botId];
        const dist = Math.hypot(bot.targetX - bot.x, bot.targetZ - bot.z);
        if (dist < 0.5) {
          bot.idleTimer -= dt;
          bot.gesture = 'idle';
          if (bot.idleTimer <= 0) {
            const [safeX, safeZ] = getSafeOpenSpawnPoint(roomLayout, Math.random() * 100);
            bot.targetX = safeX;
            bot.targetZ = safeZ;
            bot.idleTimer = Math.random() * 4 + 2;
          }
        } else {
          const dx = bot.targetX - bot.x;
          const dz = bot.targetZ - bot.z;
          const bLen = Math.hypot(dx, dz) || 1;
          const bSpeed = 2.4;
          bot.x += (dx / bLen) * bSpeed * dt;
          bot.z += (dz / bLen) * bSpeed * dt;
          bot.rotation = Math.atan2(dx / bLen, dz / bLen);
          bot.gesture = 'walk';
        }
      });
    }

    // Throttled Network Broadcast
    const now = performance.now();
    if (now - lastBroadcastTime.current > 100 && onUpdatePosition) {
      if (hasInput || currentSpeed > 0.05) {
        lastBroadcastTime.current = now;
        onUpdatePosition({
          x: candidateX,
          z: candidateZ,
          rotation: playerRotRef.current ?? 0,
          gesture: currentGesture,
        });
      }
    }

    // Throttled HUD update for current chamber
    if (now - lastHudUpdateTime.current > 300) {
      lastHudUpdateTime.current = now;
      let chamber = 'Grand Gallery';
      if (candidateX > -3 && candidateX < 3) chamber = 'Grand Gallery';
      else if (candidateX <= -3 && candidateZ < 0) chamber = 'Master Study';
      else if (candidateX >= 3 && candidateZ < 0) chamber = 'Surveillance Salon';
      else if (candidateX <= -3 && candidateZ >= 0) chamber = 'Dining Hall';
      else chamber = 'Apothecary Infirmary';
      onChamberChange(chamber);
    }
  });

  return null;
}

// -------------------------------------------------------------
// REAL ARCHITECTURAL WINDOW WITH REAL GLASS & OUTDOOR SUNLIGHT
// -------------------------------------------------------------
function ArchitecturalWindowMesh({
  windowData,
  isNight,
}: {
  windowData: WindowData;
  isNight: boolean;
}) {
  const [wx, wy, wz] = windowData.position;
  const [wWidth, wHeight] = windowData.size;
  const isX = windowData.wallNormal === 'x';
  const frameThick = 0.38;
  const barThick = 0.06;

  // Exterior vista position slightly outside the window
  const vistaDistance = 0.6;
  const vistaX = isX ? wx + (wx > 0 ? vistaDistance : -vistaDistance) : wx;
  const vistaZ = !isX ? wz + (wz > 0 ? vistaDistance : -vistaDistance) : wz;

  return (
    <group position={[wx, wy, wz]}>
      {/* Heavy Timber / Metal Outer Window Frame */}
      {/* Top Frame Bar */}
      <mesh position={[0, wHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={isX ? [frameThick, 0.14, wWidth] : [wWidth, 0.14, frameThick]} />
        <meshStandardMaterial color="#1a110a" roughness={0.7} metalness={0.4} />
      </mesh>
      {/* Bottom Frame Sill */}
      <mesh position={[0, -wHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={isX ? [frameThick + 0.12, 0.18, wWidth + 0.2] : [wWidth + 0.2, 0.18, frameThick + 0.12]} />
        <meshStandardMaterial color="#2b1a10" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* Left Frame Post */}
      <mesh position={isX ? [0, 0, -wWidth / 2] : [-wWidth / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={isX ? [frameThick, wHeight, 0.14] : [0.14, wHeight, frameThick]} />
        <meshStandardMaterial color="#1a110a" roughness={0.7} metalness={0.4} />
      </mesh>
      {/* Right Frame Post */}
      <mesh position={isX ? [0, 0, wWidth / 2] : [wWidth / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={isX ? [frameThick, wHeight, 0.14] : [0.14, wHeight, frameThick]} />
        <meshStandardMaterial color="#1a110a" roughness={0.7} metalness={0.4} />
      </mesh>

      {/* Center Dividing Mullions (Cross Bars) */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={isX ? [frameThick * 0.8, wHeight, barThick] : [barThick, wHeight, frameThick * 0.8]} />
        <meshStandardMaterial color="#1a110a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={isX ? [frameThick * 0.8, barThick, wWidth] : [wWidth, barThick, frameThick * 0.8]} />
        <meshStandardMaterial color="#1a110a" roughness={0.7} />
      </mesh>

      {/* Real Translucent Glass Pane with Reflections */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={isX ? [0.03, wHeight - 0.08, wWidth - 0.08] : [wWidth - 0.08, wHeight - 0.08, 0.03]} />
        <meshStandardMaterial
          color={isNight ? '#0f172a' : '#e0f2fe'}
          emissive={isNight ? '#020617' : '#bae6fd'}
          emissiveIntensity={isNight ? 0.15 : 0.6}
          roughness={0.1}
          metalness={0.7}
          transparent
          opacity={isNight ? 0.45 : 0.65}
        />
      </mesh>

      {/* Outside Scenery Backdrop visible through the window */}
      <mesh
        position={isX ? [(wx > 0 ? vistaDistance : -vistaDistance), 0, 0] : [0, 0, (wz > 0 ? vistaDistance : -vistaDistance)]}
        rotation={isX ? [0, wx > 0 ? -Math.PI / 2 : Math.PI / 2, 0] : [0, wz > 0 ? Math.PI : 0, 0]}
      >
        <planeGeometry args={[wWidth * 1.5, wHeight * 1.5]} />
        <meshBasicMaterial
          color={isNight ? '#020617' : '#38bdf8'}
        />
      </mesh>

      {/* Daytime Streaming Sunlight Beam (Volumetric Soft Sunlight shaft) */}
      {!isNight && (
        <mesh
          position={isX ? [wx > 0 ? -1.8 : 1.8, -0.6, 0] : [0, -0.6, wz > 0 ? -1.8 : 1.8]}
          rotation={
            isX
              ? [0, 0, wx > 0 ? Math.PI / 6 : -Math.PI / 6]
              : [wz > 0 ? Math.PI / 6 : -Math.PI / 6, 0, 0]
          }
        >
          <planeGeometry args={[wWidth * 0.9, 3.6]} />
          <meshBasicMaterial
            color="#fef08a"
            transparent
            opacity={0.16}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

// -------------------------------------------------------------
// WALL SCONCE & BULB LIGHT FIXTURE
// -------------------------------------------------------------
function WallSconceBulb({ fixture, isNight }: { fixture: WallLightFixture; isNight: boolean }) {
  const [fx, fy, fz] = fixture.position;
  const bulbColor = fixture.color || '#fef3c7';

  return (
    <group position={[fx, fy, fz]} rotation={[0, fixture.rotationY, 0]}>
      {/* Brass Wall Mount Plate */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.24, 0.36, 0.05]} />
        <meshStandardMaterial color="#78350f" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Curved Brass Sconce Stem */}
      <mesh position={[0, -0.06, 0.14]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.24, 8]} />
        <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.25} />
      </mesh>

      {/* Brass Socket Cup */}
      <mesh position={[0, 0.08, 0.22]} castShadow>
        <cylinderGeometry args={[0.07, 0.05, 0.08, 12]} />
        <meshStandardMaterial color="#92400e" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Glowing Glass Light Bulb with Bloom/Emissive Intensity */}
      <mesh position={[0, 0.17, 0.22]}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial
          color={bulbColor}
          emissive={bulbColor}
          emissiveIntensity={isNight ? 2.8 : 1.8}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
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
  const [dx, , dz] = door.position;
  const isXDoor = door.wallNormal === 'x';
  const doorWidth = door.width;
  const doorHeight = door.height;
  const thickness = 0.12;

  const playerSide = isXDoor
    ? playerPos[0] > dx
      ? 'roomA'
      : 'roomB'
    : playerPos[2] > dz
    ? 'roomA'
    : 'roomB';

  const distToDoor = Math.hypot(playerPos[0] - dx, playerPos[2] - dz);
  const showHandlePrompt = distToDoor < 2.0;
  const isLockedFromOtherSide = door.isLocked && door.lockedSide !== playerSide;

  return (
    <group position={[dx, 0, dz]}>
      {/* Door Frame */}
      <mesh position={isXDoor ? [0, doorHeight / 2, -doorWidth / 2 - 0.08] : [-doorWidth / 2 - 0.08, doorHeight / 2, 0]} castShadow>
        <boxGeometry args={isXDoor ? [0.45, doorHeight, 0.16] : [0.16, doorHeight, 0.45]} />
        <meshStandardMaterial color="#271c19" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={isXDoor ? [0, doorHeight / 2, doorWidth / 2 + 0.08] : [doorWidth / 2 + 0.08, doorHeight / 2, 0]} castShadow>
        <boxGeometry args={isXDoor ? [0.45, doorHeight, 0.16] : [0.16, doorHeight, 0.45]} />
        <meshStandardMaterial color="#271c19" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, doorHeight + 0.08, 0]} castShadow>
        <boxGeometry args={isXDoor ? [0.45, 0.16, doorWidth + 0.32] : [doorWidth + 0.32, 0.16, 0.45]} />
        <meshStandardMaterial color="#271c19" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Door Leaf (Swinging on Hinge) */}
      <group
        position={isXDoor ? [0, 0, -doorWidth / 2] : [-doorWidth / 2, 0, 0]}
        rotation={[0, door.angle, 0]}
      >
        <mesh
          position={isXDoor ? [0, doorHeight / 2, doorWidth / 2] : [doorWidth / 2, doorHeight / 2, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={isXDoor ? [thickness, doorHeight, doorWidth] : [doorWidth, doorHeight, thickness]} />
          <meshStandardMaterial
            color={door.isLocked ? '#451a03' : '#382216'}
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>

        {/* Lock State Indicator Badge */}
        <mesh position={isXDoor ? [thickness / 2 + 0.02, 1.45, doorWidth - 0.3] : [doorWidth - 0.3, 1.45, thickness / 2 + 0.02]}>
          <boxGeometry args={[0.08, 0.22, 0.18]} />
          <meshStandardMaterial
            color={door.isLocked ? '#ef4444' : '#22c55e'}
            emissive={door.isLocked ? '#dc2626' : '#16a34a'}
            emissiveIntensity={1.8}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </group>

      {/* Floating 3D Contextual Handle Lock/Unlock Button */}
      {showHandlePrompt && (
        <Html position={[0, 1.45, 0]} center distanceFactor={14}>
          <div className="pointer-events-auto transform -translate-y-4">
            {isLockedFromOtherSide ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/95 border border-red-500 rounded-xl text-red-300 text-xs font-bold shadow-2xl backdrop-blur-md">
                <ShieldAlert size={14} className="text-red-400" />
                <span>Locked from other side</span>
              </div>
            ) : door.isLocked ? (
              <button
                type="button"
                onClick={() => onToggleLock(door.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-2xl transition-all cursor-pointer border border-amber-300 active:scale-95"
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
// FURNITURE MESH RENDERER WITH RICH MANOR PROPS
// -------------------------------------------------------------
function FurnitureMesh({ item }: { item: FurnitureItem }) {
  const [w, h, d] = item.size;

  if (item.type === 'rug') {
    return (
      <group position={item.position} rotation={[0, item.rotation || 0, 0]}>
        <mesh position={[0, 0.015, 0]} receiveShadow>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial
            color={item.color || '#7f1d1d'}
            roughness={0.92}
            metalness={0.05}
          />
        </mesh>
        <mesh position={[0, 0.018, 0]} receiveShadow>
          <planeGeometry args={[w * 0.94, d * 0.94]} />
          <meshStandardMaterial
            color={item.accentColor || '#d97706'}
            roughness={0.85}
            metalness={0.3}
          />
        </mesh>
      </group>
    );
  }

  if (item.type === 'bookshelf') {
    return (
      <group position={item.position} rotation={[0, item.rotation || 0, 0]}>
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={item.color || '#2e1509'} roughness={0.7} />
        </mesh>
        {[-1.2, -0.4, 0.4, 1.2].map((yOffset, idx) => (
          <mesh key={idx} position={[0, h / 2 + yOffset, 0.05]} castShadow>
            <boxGeometry args={[w * 0.88, 0.55, d * 0.85]} />
            <meshStandardMaterial
              color={idx % 2 === 0 ? '#991b1b' : '#1e3a8a'}
              roughness={0.6}
            />
          </mesh>
        ))}
      </group>
    );
  }

  if (item.type === 'clock') {
    return (
      <group position={item.position} rotation={[0, item.rotation || 0, 0]}>
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={item.color || '#29170e'} roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, h - 0.45, d / 2 + 0.02]}>
          <circleGeometry args={[0.22, 24]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.3} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={item.position} rotation={[0, item.rotation || 0, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={item.color || '#3f3f46'}
          roughness={0.65}
          metalness={0.25}
        />
      </mesh>
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
// ENVIRONMENT WITH WINDOWS, REAL SUNLIGHT & NIGHT CURFEW LIGHTING
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
      {/* DAY TIME: Bright warm sunlight coming in from outside windows */}
      {/* NIGHT TIME: Dark, moody, low curfew lighting */}
      <ambientLight
        intensity={isNight ? 0.22 : 1.1}
        color={isNight ? '#09090b' : '#fffbeb'}
      />

      {/* Main Directional Sun / Moon beam streaming through windows */}
      <directionalLight
        position={isNight ? [-15, 22, -15] : [22, 28, 20]}
        intensity={isNight ? 0.35 : 2.4}
        color={isNight ? '#38bdf8' : '#fef3c7'}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />

      {/* Soft Secondary Outdoor Fill Light */}
      <directionalLight
        position={isNight ? [12, 14, 16] : [-16, 20, -18]}
        intensity={isNight ? 0.15 : 1.2}
        color={isNight ? '#1e293b' : '#fed7aa'}
      />

      {/* Strategic Manor Chamber Zone Lights */}
      {/* 1. Grand Gallery Center */}
      <pointLight
        position={[0, 3.2, 0]}
        intensity={isNight ? 1.0 : 2.2}
        distance={20}
        decay={2}
        color="#fef3c7"
      />
      {/* 2. West Wing (Study & Dining) */}
      <pointLight
        position={[-8, 3.0, 0]}
        intensity={isNight ? 0.8 : 1.8}
        distance={18}
        decay={2}
        color="#fed7aa"
      />
      {/* 3. East Wing (Surveillance & Infirmary) */}
      <pointLight
        position={[8, 3.0, 0]}
        intensity={isNight ? 0.8 : 1.8}
        distance={18}
        decay={2}
        color="#fed7aa"
      />

      {/* Real Architectural Windows with Exterior Views & Sunlight */}
      {layout.windows.map((win) => (
        <ArchitecturalWindowMesh key={win.id} windowData={win} isNight={isNight} />
      ))}

      {/* Wall Sconces & Bulbs */}
      {layout.wallLights.map((fixture) => (
        <WallSconceBulb key={fixture.id} fixture={fixture} isNight={isNight} />
      ))}

      {/* Parquet Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[layout.dimensions.width, layout.dimensions.depth]} />
        <meshStandardMaterial
          color={layout.floorColor}
          roughness={0.65}
          metalness={0.2}
        />
      </mesh>

      {/* Floor Inlay */}
      <gridHelper
        args={[36, 36, '#78350f', '#27221f']}
        position={[0, 0.01, 0]}
      />

      {/* Partition Walls */}
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

      {/* Physical Doors */}
      {doors.map((door) => (
        <PhysicalDoorMesh
          key={door.id}
          door={door}
          playerPos={playerPos}
          onToggleLock={onToggleLock}
        />
      ))}

      {/* Furniture */}
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
  dayNumber: _dayNumber,
  players,
  currentUserId,
  isAdmin = false,
  onUpdatePosition,
  onRoleAction,
}: GameBoardProps) {
  const [cameraMode, setCameraMode] = useState<'thirdPerson' | 'firstPerson'>('thirdPerson');
  const [actionBurstTime, setActionBurstTime] = useState<number>(0);
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);

  // Local state for Current Player Physics & Movement
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 0]);
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [jumpTimer, setJumpTimer] = useState<number>(0);

  // Virtual joystick movement vector
  const joystickVector = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Procedural Room Layout with Windows
  const roomLayout = useMemo(() => generateRoomLayout(roomId), [roomId]);

  // Doors State
  const [doors, setDoors] = useState<DoorData[]>(roomLayout.doors);

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

  // Initialize safe spawn position for current player
  useEffect(() => {
    const [sx, sz] = getSafeOpenSpawnPoint(roomLayout, currentUserId);
    setPlayerPos([sx, 0, sz]);
    playerPosRef.current = [sx, 0, sz];
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

  // Toggle Door Lock
  const handleToggleDoorLock = useCallback(
    (doorId: string) => {
      const door = doors.find((d) => d.id === doorId);
      if (!door) return;

      const [dx, , dz] = door.position;
      const isXDoor = door.wallNormal === 'x';
      const playerSide = isXDoor
        ? playerPos[0] > dx
          ? 'roomA'
          : 'roomB'
        : playerPos[2] > dz
        ? 'roomA'
        : 'roomB';

      if (door.isLocked) {
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

  // Physics & Kinematics Refs
  const playerPosRef = useRef<[number, number, number]>([0, 0, 0]);
  const playerRotRef = useRef<number>(Math.PI);
  const playerGestureRef = useRef<string>('idle');
  const camYawRef = useRef<number>(Math.PI);
  const botStatesRef = useRef<Record<string, any>>({});
  const [chamberName, setChamberName] = useState<string>('Grand Gallery');

  // Sync bot states into ref
  useEffect(() => {
    players
      .filter((p) => Boolean(p.is_bot))
      .forEach((p, idx) => {
        if (!botStatesRef.current[p.id]) {
          const [sx, sz] = getSafeOpenSpawnPoint(roomLayout, p.id || idx + 10);
          botStatesRef.current[p.id] = {
            x: sx,
            z: sz,
            targetX: sx,
            targetZ: sz,
            rotation: 0,
            gesture: 'idle',
            idleTimer: Math.random() * 2 + 1,
          };
        }
      });
  }, [players, roomLayout]);

  // Role Action Button Click: Opens targeted selection modal for Mafia, Doctor, Police
  const handleOpenRoleActionModal = () => {
    if (!currentPlayer?.alive) return;
    audioEngine.playClick();
    setShowRoleModal(true);
  };

  // Target Confirmed by Mafia / Doctor / Police from the Selection Modal
  const handleConfirmRoleTarget = (targetId: string) => {
    setActionBurstTime(Date.now());
    audioEngine.playRoleReveal();

    if (onRoleAction && currentPlayer?.role) {
      if (currentPlayer.role === 'Mafia') {
        onRoleAction('attack', targetId);
      } else if (currentPlayer.role === 'Doctor') {
        onRoleAction('heal', targetId);
      } else if (currentPlayer.role === 'Police' || currentPlayer.role === 'Detective') {
        onRoleAction('investigate', targetId);
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* Three.js Canvas */}
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{
          powerPreference: 'high-performance',
          antialias: true,
          depth: true,
        }}
        camera={{ position: [0, 2.1, 4.2], fov: 58, near: 0.05 }}
        className="w-full h-full"
      >
        <WorldController
          roomLayout={roomLayout}
          doors={doors}
          setDoors={setDoors}
          broadcastDoorUpdate={broadcastDoorUpdate}
          isSprinting={isSprinting}
          cameraMode={cameraMode}
          isAlive={currentPlayer?.alive ?? true}
          joystickVector={joystickVector}
          keysDown={keysDown}
          playerPosRef={playerPosRef}
          playerRotRef={playerRotRef}
          playerGestureRef={playerGestureRef}
          camYawRef={camYawRef}
          botStatesRef={botStatesRef}
          onChamberChange={setChamberName}
          onUpdatePosition={onUpdatePosition}
        />

        <RoomEnvironment
          layout={roomLayout}
          phase={phase}
          doors={doors}
          playerPos={playerPos}
          onToggleLock={handleToggleDoorLock}
        />

        {/* Current User Avatar - Hidden in First Person so player's mesh never clips into camera */}
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
          position={playerPosRef.current || [0, 0, 0]}
          rotation={playerRotRef.current || 0}
          gesture="idle"
          positionRef={playerPosRef}
          rotationRef={playerRotRef}
          gestureRef={playerGestureRef}
          isCurrentPlayer={true}
          jumpProgress={jumpTimer}
          actionTrigger={actionBurstTime}
        />

        {/* Render Other Connected Players & Bots */}
        {players
          .filter((p) => p.id !== currentUserId)
          .map((player) => {
            const isBot = Boolean(player.is_bot);
            const bState = botStatesRef.current[player.id];
            const rState = remotePlayerPositions.current[player.id];
            const [defaultSpawnX, defaultSpawnZ] = getSafeOpenSpawnPoint(roomLayout, player.id);

            const posX = isBot ? (bState?.x ?? defaultSpawnX) : rState ? rState.x : (player.x ?? defaultSpawnX);
            const posZ = isBot ? (bState?.z ?? defaultSpawnZ) : rState ? rState.z : (player.z ?? defaultSpawnZ);
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

      {/* Top Right: Manor Chamber Location Indicator */}
      <div className="absolute top-3 right-3 z-20 max-w-[260px] bg-zinc-950/90 border border-amber-600/50 rounded-2xl p-2.5 backdrop-blur-md shadow-2xl flex flex-col gap-1 select-none pointer-events-none">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-amber-400 shrink-0" />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-400">
              LOCATION (ROOM)
            </span>
          </div>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300">
            {getChamberDetails(chamberName).tag}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-xs sm:text-sm font-black font-mono text-white tracking-wide truncate">
            {getChamberDetails(chamberName).label}
          </span>
        </div>

        <p className="text-[10px] text-zinc-400 leading-tight">
          {getChamberDetails(chamberName).subtitle}
        </p>
      </div>

      {/* Virtual Joystick for Touch and Mouse Controls */}
      <VirtualJoystick
        onMove={(vec) => {
          joystickVector.current = vec;
        }}
        onSprintToggle={(sprinting) => {
          setIsSprinting(sprinting);
        }}
        onJump={triggerJump}
        onAction={handleOpenRoleActionModal}
        onToggleCamera={() => {
          audioEngine.playClick();
          setCameraMode((prev) => (prev === 'thirdPerson' ? 'firstPerson' : 'thirdPerson'));
        }}
        cameraMode={cameraMode}
        role={currentPlayer?.role}
        isAlive={currentPlayer?.alive ?? true}
      />

      {/* Mafia / Special Role Target Selection Modal */}
      <MafiaTargetModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        players={players}
        currentUserId={currentUserId}
        role={currentPlayer?.role}
        onConfirmTarget={handleConfirmRoleTarget}
      />
    </div>
  );
}
