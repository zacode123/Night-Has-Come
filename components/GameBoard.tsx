'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Lock, Unlock, ShieldAlert } from 'lucide-react';
import Avatar3D from '@/components/Avatar3D';
import VirtualJoystick from '@/components/VirtualJoystick';
import {
  generateRoomLayout,
  RoomLayout,
  FurnitureItem,
  DoorData,
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

// -------------------------------------------------------------
// WORLD CONTROLLER: SMOOTH FOLLOW CAMERA & CAMERA-RELATIVE STEERING
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

  const halfW = roomLayout.dimensions.width / 2 - 0.8;
  const halfD = roomLayout.dimensions.depth / 2 - 0.8;
  const obstacleBoxes = useMemo(
    () => [
      ...roomLayout.walls.map((w) => ({ position: w.position, size: w.size })),
      ...roomLayout.furniture.filter((f) => f.type !== 'rug').map((f) => ({ position: f.position, size: f.size })),
    ],
    [roomLayout]
  );

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

    // 2. Camera-Relative Joystick Steering Math:
    // Screen input: stickY is forward (+1) into screen, stickX is right (+1)
    // Transform with current camera yaw camYawRef.current:
    const cyaw = camYawRef.current ?? 0;
    const worldDirX = stickX * Math.cos(cyaw) + stickY * Math.sin(cyaw);
    const worldDirZ = -stickX * Math.sin(cyaw) + stickY * Math.cos(cyaw);

    const inputLength = Math.hypot(worldDirX, worldDirZ);
    // Deadzone 0.15: completely prevents flipping or jitter when player is at rest!
    const hasInput = inputLength >= 0.15 && isAlive;

    const maxSpeed = isSprinting ? 6.2 : 3.5;
    const acceleration = isSprinting ? 24.0 : 18.0;
    const friction = hasInput ? 0.94 : 0.82;

    if (hasInput) {
      const normX = worldDirX / (inputLength > 1 ? inputLength : 1);
      const normZ = worldDirZ / (inputLength > 1 ? inputLength : 1);

      const targetVx = normX * maxSpeed;
      const targetVz = normZ * maxSpeed;

      velocityRef.current.x += (targetVx - velocityRef.current.x) * Math.min(1, acceleration * dt);
      velocityRef.current.z += (targetVz - velocityRef.current.z) * Math.min(1, acceleration * dt);

      // Character heading smoothly faces the movement vector
      const targetAngle = Math.atan2(normX, normZ);
      const currentRot = playerRotRef.current ?? 0;
      let angleDiff = targetAngle - currentRot;
      angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      const nextRot = currentRot + angleDiff * Math.min(1, dt * 14);
      playerRotRef.current = nextRot;

      // Smooth third-person camera trailing when moving
      if (cameraMode === 'thirdPerson') {
        let camDiff = nextRot - cyaw;
        camDiff = Math.atan2(Math.sin(camDiff), Math.cos(camDiff));
        camYawRef.current = cyaw + camDiff * Math.min(1, dt * 2.2);
      } else {
        // First Person: Camera always matches model heading
        camYawRef.current = nextRot;
      }
    } else {
      // AT REST: Heading is LOCKED. Camera yaw is LOCKED. ZERO flicker, ZERO flips!
      velocityRef.current.x *= Math.pow(friction, dt * 60);
      velocityRef.current.z *= Math.pow(friction, dt * 60);

      if (Math.abs(velocityRef.current.x) < 0.02) velocityRef.current.x = 0;
      if (Math.abs(velocityRef.current.z) < 0.02) velocityRef.current.z = 0;
    }

    // 3. Update camera yaw only if moving forward (Standard 3rd person stability)
    // This fixes the "starting to rotate" issue when moving sideways!
    if (cameraMode === 'thirdPerson' && hasInput && isAlive) {
      const isMovingForward = stickY > 0.4;
      if (isMovingForward) {
        const currentHeading = playerRotRef.current ?? 0;
        let camDiff = currentHeading - cyaw;
        camDiff = Math.atan2(Math.sin(camDiff), Math.cos(camDiff));
        // Slow camera rotation follow (only when moving forward)
        camYawRef.current = cyaw + camDiff * Math.min(1, dt * 1.8);
      }
    }

    const currentSpeed = Math.hypot(velocityRef.current.x, velocityRef.current.z);

    // Update player gesture
    let currentGesture = 'idle';
    if (currentSpeed > 3.8) {
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

    // Candidate Position & Wall Collision
    const prevX = playerPosRef.current[0];
    const prevZ = playerPosRef.current[2];
    let candidateX = THREE.MathUtils.clamp(prevX + velocityRef.current.x * dt, -halfW, halfW);
    let candidateZ = THREE.MathUtils.clamp(prevZ + velocityRef.current.z * dt, -halfD, halfD);

    const playerRadius = 0.38;
    for (const box of obstacleBoxes) {
      const [bx, , bz] = box.position;
      const [bw, , bd] = box.size;
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

    // Smooth Camera Follow
    const px = candidateX;
    const py = playerPosRef.current[1];
    const pz = candidateZ;

    if (cameraMode === 'firstPerson') {
      const eyeHeight = 1.65;
      camera.position.x = px;
      camera.position.y = py + eyeHeight;
      camera.position.z = pz;
      const lookDist = 15;
      const pRot = playerRotRef.current ?? 0;
      camera.lookAt(
        px + Math.sin(pRot) * lookDist,
        py + eyeHeight,
        pz + Math.cos(pRot) * lookDist
      );
    } else {
      const distance = 7.2;
      const height = 5.2;
      const camAngle = camYawRef.current ?? 0;
      const targetCamX = px - Math.sin(camAngle) * distance;
      const targetCamZ = pz - Math.cos(camAngle) * distance;
      const targetCamY = py + height;

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX, Math.min(1, dt * 10));
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY, Math.min(1, dt * 10));
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, Math.min(1, dt * 10));
      camera.lookAt(px, py + 1.2, pz);
    }

    // Bot kinematics simulation in useFrame (Zero React re-render overhead!)
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

    // Throttled Network Broadcast (10Hz / 100ms) only when moving
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
// WALL SCONCE & BULB LIGHT FIXTURE (High-Fidelity Emissive Mesh)
// -------------------------------------------------------------
function WallSconceBulb({ fixture }: { fixture: WallLightFixture; isNight: boolean }) {
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
          emissiveIntensity={3.5}
          roughness={0.1}
        />
      </mesh>

      {/* Internal Filament Core */}
      <mesh position={[0, 0.17, 0.22]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
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
      {/* Heavy Wood Frame with Brass Trim */}
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

      {/* Door Leaf (Swinging on Hinge at corner) */}
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

        {/* Brass Inlay Panels */}
        <mesh position={isXDoor ? [0, doorHeight / 2, doorWidth / 2] : [doorWidth / 2, doorHeight / 2, 0]}>
          <boxGeometry args={isXDoor ? [thickness + 0.02, doorHeight * 0.88, doorWidth * 0.88] : [doorWidth * 0.88, doorHeight * 0.88, thickness + 0.02]} />
          <meshStandardMaterial color="#1f140e" roughness={0.7} metalness={0.4} />
        </mesh>

        {/* Glowing Emissive Door Handle Indicator */}
        <mesh position={isXDoor ? [0.1, 1.2, doorWidth * 0.85] : [doorWidth * 0.85, 1.2, 0.1]}>
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
        {/* Main Persian Rug Carpet Surface */}
        <mesh position={[0, 0.015, 0]} receiveShadow>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial
            color={item.color || '#7f1d1d'}
            roughness={0.92}
            metalness={0.05}
          />
        </mesh>
        {/* Ornate Gold Border Line */}
        <mesh position={[0, 0.018, 0]} receiveShadow>
          <planeGeometry args={[w * 0.94, d * 0.94]} />
          <meshStandardMaterial
            color={item.accentColor || '#d97706'}
            roughness={0.85}
            metalness={0.3}
          />
        </mesh>
        {/* Inner Pattern Center */}
        <mesh position={[0, 0.021, 0]} receiveShadow>
          <planeGeometry args={[w * 0.86, d * 0.86]} />
          <meshStandardMaterial
            color={item.color || '#7f1d1d'}
            roughness={0.92}
            metalness={0.05}
          />
        </mesh>
      </group>
    );
  }

  if (item.type === 'bookshelf') {
    return (
      <group position={item.position} rotation={[0, item.rotation || 0, 0]}>
        {/* Cabinet Frame */}
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={item.color || '#2e1509'} roughness={0.7} />
        </mesh>
        {/* Book Rows */}
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
        {/* Grandfather Clock Column Body */}
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={item.color || '#29170e'} roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Clock Face with Golden Ring */}
        <mesh position={[0, h - 0.45, d / 2 + 0.02]}>
          <circleGeometry args={[0.22, 24]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.3} />
        </mesh>
        {/* Golden Pendulum Chamber */}
        <mesh position={[0, h / 2 - 0.2, d / 2 + 0.02]}>
          <boxGeometry args={[0.22, 0.6, 0.04]} />
          <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    );
  }

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
// HYPER-REALISTIC MULTI-ROOM ENVIRONMENT WITH CEILING BEAMS & SCONCES
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
      {/* Warm Ambient & Directional Lighting */}
      <ambientLight intensity={isNight ? 0.45 : 0.95} color={isNight ? '#312e81' : '#fffbeb'} />
      <directionalLight
        position={[12, 26, 12]}
        intensity={isNight ? 0.6 : 1.4}
        color={isNight ? '#60a5fa' : '#fed7aa'}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Strategic Manor Chamber Zone Lights (High performance & realistic ambient glow) */}
      {/* 1. Grand Gallery Center */}
      <pointLight
        position={[0, 3.4, 0]}
        intensity={isNight ? 1.5 : 2.4}
        distance={22}
        decay={2}
        color="#fef3c7"
      />
      {/* 2. West Wing (Study & Dining) */}
      <pointLight
        position={[-7, 3.2, 0]}
        intensity={isNight ? 1.2 : 2.0}
        distance={18}
        decay={2}
        color="#fed7aa"
      />
      {/* 3. East Wing (Surveillance & Infirmary) */}
      <pointLight
        position={[7, 3.2, 0]}
        intensity={isNight ? 1.2 : 2.0}
        distance={18}
        decay={2}
        color="#fed7aa"
      />

      {/* Warm Wall Sconces & Light Bulbs on Walls */}
      {layout.wallLights.map((fixture) => (
        <WallSconceBulb key={fixture.id} fixture={fixture} isNight={isNight} />
      ))}

      {/* Antique Manor Parquet Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[layout.dimensions.width, layout.dimensions.depth]} />
        <meshStandardMaterial
          color={layout.floorColor}
          roughness={0.65}
          metalness={0.2}
        />
      </mesh>

      {/* Decorative Floor Inlay Frame */}
      <gridHelper
        args={[36, 36, '#78350f', '#27221f']}
        position={[0, 0.01, 0]}
      />

      {/* Ceiling Timber Rafter Beams (at Y = 4.4m) for Grand Manor Architecture */}
      {[-12, -6, 0, 6, 12].map((zPos, idx) => (
        <mesh key={idx} position={[0, 4.4, zPos]} castShadow>
          <boxGeometry args={[layout.dimensions.width, 0.35, 0.45]} />
          <meshStandardMaterial color="#1c120c" roughness={0.8} />
        </mesh>
      ))}

      {/* All 4.5m Ceiling-Height Partition Walls */}
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

      {/* 4 Physical Manor Doors */}
      {doors.map((door) => (
        <PhysicalDoorMesh
          key={door.id}
          door={door}
          playerPos={playerPos}
          onToggleLock={onToggleLock}
        />
      ))}

      {/* Fixed Manor Furniture & Rug Items */}
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

  // Local state for Current Player Physics & Movement
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 0]);
  const [playerRot, setPlayerRot] = useState<number>(0);
  const [playerGesture, setPlayerGesture] = useState<
    'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'heal' | 'investigate'
  >('idle');
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [jumpTimer, setJumpTimer] = useState<number>(0);

  // Virtual joystick movement vector from touch/mouse controls
  const joystickVector = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Procedural Room Layout with Fixed Multi-room architecture
  const roomLayout = useMemo(() => generateRoomLayout(roomId), [roomId]);
  const halfW = roomLayout.dimensions.width / 2 - 0.8;
  const halfD = roomLayout.dimensions.depth / 2 - 0.8;

  // Doors State
  const [doors, setDoors] = useState<DoorData[]>(roomLayout.doors);

  // NPC Bots state
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

  // Initialize guaranteed open-space spawn position for current player
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

  // Initialize NPC Bots at safe open spawn points
  useEffect(() => {
    setBotStates((prev) => {
      const next = { ...prev };
      players
        .filter((p) => Boolean(p.is_bot))
        .forEach((p, idx) => {
          if (!next[p.id]) {
            const [sx, sz] = getSafeOpenSpawnPoint(roomLayout, p.id || idx + 10);
            next[p.id] = {
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

  // Physics & Kinematics Refs (Zero React re-render overhead during 60fps movement)
  const playerPosRef = useRef<[number, number, number]>([0, 0, 0]);
  const playerRotRef = useRef<number>(0);
  const playerGestureRef = useRef<string>("idle");
  const camYawRef = useRef<number>(0);
  const botStatesRef = useRef<Record<string, any>>({});
  const [chamberName, setChamberName] = useState<string>("Grand Gallery");

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
            gesture: "idle",
            idleTimer: Math.random() * 2 + 1,
          };
        }
      });
  }, [players, roomLayout]);

  // Handle Role Action  // Handle Role Action
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
      const curP = playerPosRef.current || [0, 0, 0];
      const dist = Math.hypot(tx - curP[0], tz - curP[2]);
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
        dpr={[1, 1.5]}
        gl={{ powerPreference: 'high-performance', antialias: false, depth: true, stencil: false, precision: 'mediump' }}
        camera={{ position: [0, 8, 10], fov: 50, near: 0.08 }}
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

        {/* Current User Avatar */}
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

      {/* Top Right: Manor Chamber Location Indicator */}
      <div className="absolute top-3 right-3 z-20 px-3 py-1.5 bg-black/75 border border-amber-900/40 rounded-xl text-[11px] font-mono text-amber-200 backdrop-blur-md shadow flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span>{chamberName}</span>
      </div>

      {/* Virtual Joystick for Touch and Mouse Controls with Bottom Perspective Toggle */}
      <VirtualJoystick
        onMove={(vec) => {
          joystickVector.current = vec;
        }}
        onSprintToggle={(sprinting) => {
          setIsSprinting(sprinting);
        }}
        onJump={triggerJump}
        onAction={handleRoleAction}
        onToggleCamera={() => {
          audioEngine.playClick();
          setCameraMode((prev) => (prev === 'thirdPerson' ? 'firstPerson' : 'thirdPerson'));
        }}
        cameraMode={cameraMode}
        role={currentPlayer?.role}
        isAlive={currentPlayer?.alive ?? true}
      />
    </div>
  );
}
