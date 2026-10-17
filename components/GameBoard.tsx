'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Avatar3D from '@/components/Avatar3D';
import VirtualJoystick from '@/components/VirtualJoystick';
import { generateRoomLayout, RoomLayout, FurnitureItem } from '@/lib/roomGenerator';
import { audioEngine } from '@/lib/audioEngine';

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
  onUpdatePosition?: (pos: { x: number; z: number; rotation: number; gesture: string }) => void;
  onRoleAction?: (action: 'attack' | 'heal' | 'investigate', targetId: string) => void;
}

// -------------------------------------------------------------
// CAMERA CONTROLLER COMPONENT
// -------------------------------------------------------------
function CameraController({
  targetPos,
  targetRot,
  cameraMode,
}: {
  targetPos: [number, number, number];
  targetRot: number;
  cameraMode: 'thirdPerson' | 'isometric';
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const [tx, ty, tz] = targetPos;

    if (cameraMode === 'thirdPerson') {
      // GTA Follow Cam: placed behind player based on rotation
      const distance = 4.8;
      const height = 2.4;
      const camX = tx - Math.sin(targetRot) * distance;
      const camZ = tz - Math.cos(targetRot) * distance;
      const camY = ty + height;

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, camX, delta * 6);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, camY, delta * 6);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, camZ, delta * 6);

      // Look slightly above target
      const lookTarget = new THREE.Vector3(tx, ty + 1.2, tz);
      camera.lookAt(lookTarget);
    } else {
      // Tactical Isometric Cam (Direct South-elevated angle aligned with screen axes)
      const isoHeight = 11;
      const isoBack = 9;
      const targetCamPos = new THREE.Vector3(tx, isoHeight, tz + isoBack);

      camera.position.lerp(targetCamPos, delta * 5);
      camera.lookAt(tx, 0.8, tz);
    }
  });

  return null;
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
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Accent Detail */}
      {item.accentColor && (
        <mesh position={[0, h + 0.02, 0]}>
          <boxGeometry args={[w * 0.9, 0.05, d * 0.9]} />
          <meshBasicMaterial color={item.accentColor} />
        </mesh>
      )}
    </group>
  );
}

// -------------------------------------------------------------
// ROOM ENVIRONMENT COMPONENT
// -------------------------------------------------------------
function RoomEnvironment({ layout, phase }: { layout: RoomLayout; phase: string }) {
  const halfW = layout.dimensions.width / 2;
  const halfD = layout.dimensions.depth / 2;
  const isNight = phase === 'Night';

  return (
    <group>
      {/* Lighting */}
      <ambientLight intensity={isNight ? 0.35 : 0.85} color={isNight ? '#1e3a8a' : '#ffffff'} />
      <directionalLight
        position={[12, 18, 10]}
        intensity={isNight ? 0.4 : 1.2}
        color={isNight ? '#3b82f6' : '#fff1f2'}
        castShadow
      />
      {/* Red Emergency Warning Light */}
      <pointLight
        position={[0, 6, 0]}
        color={isNight ? '#ef4444' : '#f87171'}
        intensity={isNight ? 2.5 : 1}
        distance={25}
      />

      {/* Floor with grid tiles */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[layout.dimensions.width, layout.dimensions.depth]} />
        <meshStandardMaterial
          color={layout.floorColor}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Grid lines helper */}
      <gridHelper
        args={[Math.max(layout.dimensions.width, layout.dimensions.depth), 24, '#7f1d1d', '#27272a']}
        position={[0, 0.02, 0]}
      />

      {/* Perimeter White Line (Rules boundary from the drama!) */}
      <lineSegments position={[0, 0.04, 0]}>
        <edgesGeometry
          args={[new THREE.BoxGeometry(layout.dimensions.width - 1.5, 0.1, layout.dimensions.depth - 1.5)]}
        />
        <lineBasicMaterial color="#ef4444" linewidth={2} />
      </lineSegments>

      {/* Walls */}
      {/* Back Wall (Z-) */}
      <mesh position={[0, 4, -halfD]}>
        <boxGeometry args={[layout.dimensions.width, 8, 0.8]} />
        <meshStandardMaterial color={layout.wallColor} roughness={0.9} />
      </mesh>
      {/* Front Wall (Z+) */}
      <mesh position={[0, 4, halfD]}>
        <boxGeometry args={[layout.dimensions.width, 8, 0.8]} />
        <meshStandardMaterial color={layout.wallColor} roughness={0.9} />
      </mesh>
      {/* Left Wall (X-) */}
      <mesh position={[-halfW, 4, 0]}>
        <boxGeometry args={[0.8, 8, layout.dimensions.depth]} />
        <meshStandardMaterial color={layout.wallColor} roughness={0.9} />
      </mesh>
      {/* Right Wall (X+) */}
      <mesh position={[halfW, 4, 0]}>
        <boxGeometry args={[0.8, 8, layout.dimensions.depth]} />
        <meshStandardMaterial color={layout.wallColor} roughness={0.9} />
      </mesh>

      {/* Render All Furniture Items */}
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
  onUpdatePosition,
  onRoleAction,
}: GameBoardProps) {
  const [cameraMode, setCameraMode] = useState<'thirdPerson' | 'isometric'>('thirdPerson');
  const [actionBurstTime, setActionBurstTime] = useState<number>(0);

  // Local state for Current Player Physics & Movement
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 0]);
  const [playerRot, setPlayerRot] = useState<number>(0);
  const [playerGesture, setPlayerGesture] = useState<
    'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'heal' | 'investigate'
  >('idle');
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [jumpTimer, setJumpTimer] = useState<number>(0); // 0 to 1

  // Virtual joystick movement vector from touch controls
  const joystickVector = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // NPC Bot Simulated Positions & Routines
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

  // Procedural Room Layout
  const roomLayout = useMemo(() => generateRoomLayout(roomId), [roomId]);
  const halfW = roomLayout.dimensions.width / 2 - 1.5;
  const halfD = roomLayout.dimensions.depth / 2 - 1.5;

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

  // Initialize / maintain NPC Bots
  useEffect(() => {
    setBotStates((prev) => {
      const next = { ...prev };
      players
        .filter((p) => p.is_bot || p.id !== currentUserId)
        .forEach((p, idx) => {
          if (!next[p.id]) {
            const spawn = roomLayout.spawnPoints[(idx + 1) % roomLayout.spawnPoints.length] || [idx * 2 - 4, idx * 2 - 4];
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
  }, [players, currentUserId, roomLayout]);

  // Jump animation ticker
  useEffect(() => {
    if (jumpTimer <= 0) return;
    const interval = setInterval(() => {
      setJumpTimer((prev) => {
        if (prev >= 1) return 0;
        return prev + 0.1;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [jumpTimer]);

  const triggerJump = useCallback(() => {
    if (jumpTimer > 0) return;
    setJumpTimer(0.01);
    audioEngine.playHover();
  }, [jumpTimer]);

  // Keyboard controls listener (WASD, Arrows, Shift, Space, E)
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

  // Physics state refs for smooth momentum and inertia
  const velocityRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  const playerRotRef = useRef<number>(0);
  const playerPosRef = useRef<[number, number, number]>([0, 0, 0]);

  // Keep refs in sync with state for zero-latency physics ticks
  useEffect(() => {
    playerPosRef.current = playerPos;
  }, [playerPos]);

  useEffect(() => {
    playerRotRef.current = playerRot;
  }, [playerRot]);

  // Main Simulation & Movement Loop (Smooth Realistic Physics with Inertia)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let lastBroadcastTime = 0;

    const gameLoop = (currentTime: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (currentTime - lastTime) / 1000));
      lastTime = currentTime;

      // 1. Gather movement inputs from keyboard or virtual joystick
      let stickX = joystickVector.current.x;
      let stickY = joystickVector.current.y;

      if (keysDown.current['w'] || keysDown.current['arrowup']) stickY += 1;
      if (keysDown.current['s'] || keysDown.current['arrowdown']) stickY -= 1;
      if (keysDown.current['a'] || keysDown.current['arrowleft']) stickX -= 1;
      if (keysDown.current['d'] || keysDown.current['arrowright']) stickX += 1;

      // In Three.js with camera on South looking North:
      // UP on screen = -Z (Forward into screen)
      // DOWN on screen = +Z (Back towards camera)
      // RIGHT on screen = +X (East)
      // LEFT on screen = -X (West)
      const inputX = stickX;
      const inputZ = -stickY;

      // Normalize input vector if needed
      const inputLength = Math.hypot(inputX, inputZ);
      let normInputX = 0;
      let normInputZ = 0;
      if (inputLength > 0.05) {
        normInputX = inputX / (inputLength > 1 ? inputLength : 1);
        normInputZ = inputZ / (inputLength > 1 ? inputLength : 1);
      }

      const hasInput = inputLength > 0.05 && (currentPlayer?.alive ?? true);

      // Realistic Kinematics (Acceleration, Friction, Terminal Velocity)
      const maxSpeed = isSprinting ? 5.8 : 3.2;
      const acceleration = isSprinting ? 22.0 : 16.0;
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

        // Calculate smooth turning towards movement direction
        const targetAngle = Math.atan2(normInputX, normInputZ);
        let angleDiff = targetAngle - playerRotRef.current;
        // Normalize angle difference to [-PI, PI] for shortest rotation path
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
        playerRotRef.current += angleDiff * Math.min(1, dt * 14);
        setPlayerRot(playerRotRef.current);
      } else {
        // Natural friction deceleration to rest
        velocityRef.current.x *= Math.pow(friction, dt * 60);
        velocityRef.current.z *= Math.pow(friction, dt * 60);

        if (Math.abs(velocityRef.current.x) < 0.01) velocityRef.current.x = 0;
        if (Math.abs(velocityRef.current.z) < 0.01) velocityRef.current.z = 0;
      }

      const currentSpeed = Math.hypot(velocityRef.current.x, velocityRef.current.z);

      // Update gesture based on actual physical velocity
      if (currentSpeed > 3.4) {
        setPlayerGesture('run');
      } else if (currentSpeed > 0.15) {
        setPlayerGesture('walk');
      } else {
        setPlayerGesture('idle');
      }

      // 2. Sliding collision resolution with furniture
      const prevX = playerPosRef.current[0];
      const prevZ = playerPosRef.current[2];
      let candidateX = THREE.MathUtils.clamp(prevX + velocityRef.current.x * dt, -halfW, halfW);
      let candidateZ = THREE.MathUtils.clamp(prevZ + velocityRef.current.z * dt, -halfD, halfD);

      const playerRadius = 0.38;

      // Check collision on X axis
      for (const item of roomLayout.furniture) {
        const [fx, _, fz] = item.position;
        const [fw, __, fd] = item.size;
        const boxMinX = fx - fw / 2 - playerRadius;
        const boxMaxX = fx + fw / 2 + playerRadius;
        const boxMinZ = fz - fd / 2 - playerRadius;
        const boxMaxZ = fz + fd / 2 + playerRadius;

        if (candidateX >= boxMinX && candidateX <= boxMaxX && prevZ >= boxMinZ && prevZ <= boxMaxZ) {
          candidateX = prevX;
          velocityRef.current.x = 0;
          break;
        }
      }

      // Check collision on Z axis (allows smooth sliding along furniture edges)
      for (const item of roomLayout.furniture) {
        const [fx, _, fz] = item.position;
        const [fw, __, fd] = item.size;
        const boxMinX = fx - fw / 2 - playerRadius;
        const boxMaxX = fx + fw / 2 + playerRadius;
        const boxMinZ = fz - fd / 2 - playerRadius;
        const boxMaxZ = fz + fd / 2 + playerRadius;

        if (candidateX >= boxMinX && candidateX <= boxMaxX && candidateZ >= boxMinZ && candidateZ <= boxMaxZ) {
          candidateZ = prevZ;
          velocityRef.current.z = 0;
          break;
        }
      }

      if (candidateX !== prevX || candidateZ !== prevZ) {
        playerPosRef.current = [candidateX, playerPosRef.current[1], candidateZ];
        setPlayerPos([candidateX, playerPosRef.current[1], candidateZ]);
      }

      // 3. Realistic NPC Bot smooth wandering kinematics
      setBotStates((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((botId) => {
          const bot = updated[botId];
          const distToTarget = Math.hypot(bot.targetX - bot.x, bot.targetZ - bot.z);

          if (distToTarget < 0.4) {
            // Reached target -> pause or pick new furniture/spot waypoint
            bot.idleTimer -= dt;
            bot.gesture = 'idle';

            if (bot.idleTimer <= 0) {
              const randomFurniture =
                roomLayout.furniture[Math.floor(Math.random() * roomLayout.furniture.length)];
              const targetX = THREE.MathUtils.clamp(
                randomFurniture.position[0] + (Math.random() * 3 - 1.5),
                -halfW,
                halfW
              );
              const targetZ = THREE.MathUtils.clamp(
                randomFurniture.position[2] + (Math.random() * 3 - 1.5),
                -halfD,
                halfD
              );

              bot.targetX = targetX;
              bot.targetZ = targetZ;
              bot.idleTimer = Math.random() * 4 + 2;
            }
          } else {
            // Move smoothly toward waypoint with angular slerp
            const targetAngle = Math.atan2(bot.targetX - bot.x, bot.targetZ - bot.z);
            let angleDiff = targetAngle - bot.rotation;
            angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
            bot.rotation += angleDiff * Math.min(1, dt * 8);

            const botSpeed = 1.4; // smooth physical walking velocity
            bot.x += Math.sin(bot.rotation) * botSpeed * dt;
            bot.z += Math.cos(bot.rotation) * botSpeed * dt;
            bot.gesture = 'walk';
          }
        });
        return updated;
      });

      // 4. Periodic broadcast to room participants (every 100ms)
      const now = Date.now();
      if (now - lastBroadcastTime > 100 && onUpdatePosition) {
        lastBroadcastTime = now;
        onUpdatePosition({
          x: playerPosRef.current[0],
          z: playerPosRef.current[2],
          rotation: playerRotRef.current,
          gesture: currentSpeed > 3.4 ? 'run' : currentSpeed > 0.15 ? 'walk' : 'idle',
        });
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentPlayer?.alive, halfD, halfW, isSprinting, onUpdatePosition, roomLayout.furniture]);

  // Handle Role Action (Attack / Heal / Investigate)
  const handleRoleAction = () => {
    if (!currentPlayer?.alive) return;
    setActionBurstTime(Date.now());
    audioEngine.playRoleReveal();

    // Find closest player in range
    const targets = players.filter((p) => p.id !== currentUserId && (p.alive ?? true));
    let closestTarget = targets[0];
    let minDistance = Infinity;

    targets.forEach((t) => {
      const bState = botStates[t.id];
      const tx = bState ? bState.x : (t.x || 0);
      const tz = bState ? bState.z : (t.z || 0);
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
        camera={{ position: [0, 10, 10], fov: 50 }}
        className="w-full h-full"
      >
        <CameraController
          targetPos={playerPos}
          targetRot={playerRot}
          cameraMode={cameraMode}
        />

        <RoomEnvironment layout={roomLayout} phase={phase} />

        {/* Current User Avatar */}
        <Avatar3D
          id={currentUserId}
          name={currentPlayer?.username || 'You'}
          avatarBase64={currentPlayer?.avatar_base64}
          personality={currentPlayer?.personality || 'Leader'}
          role={currentPlayer?.role || 'Citizen'}
          isBot={false}
          isAlive={currentPlayer?.alive ?? true}
          position={playerPos}
          rotation={playerRot}
          gesture={playerGesture}
          isCurrentPlayer={true}
          jumpProgress={jumpTimer}
          actionTrigger={actionBurstTime}
        />

        {/* Render Other Players & AI Bots */}
        {players
          .filter((p) => p.id !== currentUserId)
          .map((player) => {
            const botState = botStates[player.id];
            const posX = botState ? botState.x : (player.x || 0);
            const posZ = botState ? botState.z : (player.z || 0);
            const rot = botState ? botState.rotation : (player.rotation || 0);
            const gest = botState ? botState.gesture : (player.gesture || 'idle');

            return (
              <Avatar3D
                key={player.id}
                id={player.id}
                name={player.username}
                avatarBase64={player.avatar_base64}
                personality={player.personality || 'Quiet Observer'}
                role={player.role || 'Citizen'}
                isBot={player.is_bot ?? true}
                isAlive={player.alive ?? true}
                position={[posX, 0, posZ]}
                rotation={rot}
                gesture={gest}
                isCurrentPlayer={false}
              />
            );
          })}
      </Canvas>

      {/* Floating Virtual Joystick HUD on top of 3D Canvas */}
      <VirtualJoystick
        onMove={(v) => {
          joystickVector.current = v;
        }}
        onSprintToggle={(s) => setIsSprinting(s)}
        onJump={triggerJump}
        onRoleAction={handleRoleAction}
        onToggleCamera={() =>
          setCameraMode((prev) => (prev === 'thirdPerson' ? 'isometric' : 'thirdPerson'))
        }
        cameraMode={cameraMode}
        role={currentPlayer?.role}
        isAlive={currentPlayer?.alive ?? true}
        phase={phase}
      />

      {/* Room Badge in corner */}
      <div className="absolute top-2 left-2 pointer-events-none z-10 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-xs">
        <span className="font-bold text-red-500">{roomLayout.title}</span>
        <span className="text-zinc-400 ml-2">Phase: {phase}</span>
      </div>
    </div>
  );
}
