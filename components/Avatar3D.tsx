'use client';

import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

interface Avatar3DProps {
  id: string;
  name: string;
  avatarBase64?: string | null;
  personality?: string;
  role?: string;
  isBot?: boolean;
  isAlive?: boolean;
  position: [number, number, number];
  rotation: number;
  gesture: 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'heal' | 'investigate';
  isCurrentPlayer?: boolean;
  jumpProgress?: number; // 0 to 1
  actionTrigger?: number; // timestamp to trigger burst VFX
}

export default function Avatar3D({
  id,
  name,
  avatarBase64,
  personality = 'Leader',
  role = 'Citizen',
  isBot = false,
  isAlive = true,
  position,
  rotation,
  gesture,
  isCurrentPlayer = false,
  jumpProgress = 0,
  actionTrigger = 0,
}: Avatar3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const actionRingRef = useRef<THREE.Mesh>(null);

  // Personality ring colors
  const personalityColor = useMemo(() => {
    switch (personality) {
      case 'Leader': return '#dc2626'; // red
      case 'Quiet Observer': return '#3b82f6'; // blue
      case 'Strategic Thinker': return '#8b5cf6'; // purple
      case 'Rebellious': return '#f59e0b'; // amber
      case 'Aggressive': return '#ef4444'; // bright red
      case 'Friendly': return '#10b981'; // green
      case 'Cautious': return '#64748b'; // slate
      case 'Empathetic': return '#ec4899'; // pink
      default: return '#94a3b8';
    }
  }, [personality]);

  // Texture creation for the Head
  const headTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background base
    ctx.fillStyle = isBot ? '#090d16' : '#18181b';
    ctx.fillRect(0, 0, 128, 128);

    if (avatarBase64) {
      // 1. Player has profile picture: draw circular cropped photo
      const img = new Image();
      img.src = avatarBase64;
      img.onload = () => {
        ctx.clearRect(0, 0, 128, 128);
        ctx.save();
        ctx.beginPath();
        ctx.arc(64, 64, 58, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 6, 6, 116, 116);
        ctx.restore();

        // Personality border ring
        ctx.lineWidth = 6;
        ctx.strokeStyle = personalityColor;
        ctx.beginPath();
        ctx.arc(64, 64, 58, 0, Math.PI * 2);
        ctx.stroke();

        texture.needsUpdate = true;
      };
    } else if (isBot) {
      // 2. Bot: Draw crisp vector Bot Logo Insignia (Shield with tech circuit core)
      ctx.clearRect(0, 0, 128, 128);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 128, 128);

      // Outer hexagonal/shield crest
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(64, 20);
      ctx.lineTo(104, 38);
      ctx.lineTo(104, 82);
      ctx.lineTo(64, 108);
      ctx.lineTo(24, 82);
      ctx.lineTo(24, 38);
      ctx.closePath();
      ctx.stroke();

      // Bot Core Processor Icon / Logo
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(48, 48, 32, 28);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(54, 54, 8, 8); // left sensor
      ctx.fillRect(66, 54, 8, 8); // right sensor
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(52, 68, 24, 3); // optical scan line

      // Microchip circuit traces
      ctx.strokeStyle = '#0891b2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(64, 20); ctx.lineTo(64, 48); // top trace
      ctx.moveTo(24, 60); ctx.lineTo(48, 60); // left trace
      ctx.moveTo(104, 60); ctx.lineTo(80, 60); // right trace
      ctx.moveTo(64, 76); ctx.lineTo(64, 108); // bottom trace
      ctx.stroke();

      // Tech nodes
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(64, 34, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(36, 60, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(92, 60, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(64, 92, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      // 3. Player with NO profile picture: Do not show any silhouette face!
      // Keep completely clean faceplate with subtle personality border ring
      ctx.clearRect(0, 0, 128, 128);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, 128, 128);

      ctx.lineWidth = 5;
      ctx.strokeStyle = personalityColor;
      ctx.beginPath();
      ctx.arc(64, 64, 56, 0, Math.PI * 2);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [avatarBase64, isBot, personalityColor]);

  // Animation cycle using useFrame
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Smooth position interpolation
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      position[0],
      delta * 12
    );
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      position[2],
      delta * 12
    );

    // Jump vertical curve: parabolic arc
    let jumpY = 0;
    if (jumpProgress > 0) {
      jumpY = Math.sin(jumpProgress * Math.PI) * 1.6;
    }
    groupRef.current.position.y = position[1] + jumpY;

    // Smooth rotation interpolation
    const currentRot = groupRef.current.rotation.y;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(currentRot, rotation, delta * 15);

    // Limb animations for walk / run
    const time = state.clock.getElapsedTime();
    const isMoving = gesture === 'walk' || gesture === 'run';
    const speedMultiplier = gesture === 'run' ? 14 : 7;
    const limbAmp = gesture === 'run' ? 0.8 : 0.5;

    if (isMoving && isAlive) {
      const swing = Math.sin(time * speedMultiplier) * limbAmp;
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.8;
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.8;
      if (torsoRef.current) {
        torsoRef.current.rotation.z = Math.sin(time * speedMultiplier) * 0.05;
        torsoRef.current.rotation.x = gesture === 'run' ? 0.2 : 0.05; // forward lean
      }
    } else {
      // Idle breathing
      const breathe = Math.sin(time * 2) * 0.04;
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) leftArmRef.current.rotation.x = breathe;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -breathe;
      if (torsoRef.current) {
        torsoRef.current.rotation.x = breathe * 0.5;
        torsoRef.current.rotation.z = 0;
      }
    }

    // Action VFX Ring animation
    if (actionRingRef.current && actionTrigger > 0) {
      const elapsed = (Date.now() - actionTrigger) / 1000;
      if (elapsed < 0.8) {
        actionRingRef.current.scale.setScalar(1 + elapsed * 3);
        const mat = actionRingRef.current.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 1 - elapsed / 0.8);
      } else {
        actionRingRef.current.scale.setScalar(0.001);
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Selection / Current Player Aura Glow Ring on Floor */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.65, 32]} />
        <meshBasicMaterial
          color={isCurrentPlayer ? '#ef4444' : personalityColor}
          transparent
          opacity={isCurrentPlayer ? 0.85 : 0.4}
        />
      </mesh>

      {/* Role Action VFX Blast Ring */}
      <mesh ref={actionRingRef} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.001, 0.001, 0.001]}>
        <ringGeometry args={[0.4, 0.8, 32]} />
        <meshBasicMaterial
          color={role === 'Mafia' ? '#ef4444' : role === 'Doctor' ? '#10b981' : '#3b82f6'}
          transparent
          opacity={0}
        />
      </mesh>

      {/* Dead State Marker or Standing Body */}
      {!isAlive ? (
        // Fallen skull or red chalk outline marker
        <group position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <circleGeometry args={[0.7, 32]} />
            <meshBasicMaterial color="#450a0a" transparent opacity={0.7} />
          </mesh>
          <Text
            position={[0, 0, 0.02]}
            fontSize={0.3}
            color="#ef4444"
            font="bold"
            anchorX="center"
            anchorY="middle"
          >
            ☠ ELIMINATED
          </Text>
        </group>
      ) : (
        <group>
          {/* Torso */}
          <mesh ref={torsoRef} position={[0, 1.05, 0]}>
            <boxGeometry args={[0.55, 0.7, 0.35]} />
            <meshStandardMaterial
              color={isBot ? '#1e293b' : isCurrentPlayer ? '#991b1b' : '#27272a'}
              roughness={0.5}
            />
          </mesh>

          {/* Head with Avatar Profile Picture Texture */}
          <group position={[0, 1.65, 0]}>
            <mesh>
              <boxGeometry args={[0.48, 0.48, 0.48]} />
              <meshStandardMaterial
                color={isBot ? '#0f172a' : '#18181b'}
                roughness={0.4}
              />
            </mesh>

            {/* Front Face Plate with Photo Texture */}
            <mesh position={[0, 0, 0.25]}>
              <planeGeometry args={[0.44, 0.44]} />
              {headTexture ? (
                <meshBasicMaterial map={headTexture} transparent />
              ) : (
                <meshBasicMaterial color={personalityColor} />
              )}
            </mesh>

            {/* Back Head Color Indicator */}
            <mesh position={[0, 0, -0.25]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[0.4, 0.4]} />
              <meshBasicMaterial color={personalityColor} />
            </mesh>
          </group>

          {/* Left Arm */}
          <mesh ref={leftArmRef} position={[-0.38, 1.05, 0]}>
            <boxGeometry args={[0.16, 0.65, 0.18]} />
            <meshStandardMaterial color={isBot ? '#334155' : '#3f3f46'} />
          </mesh>

          {/* Right Arm */}
          <mesh ref={rightArmRef} position={[0.38, 1.05, 0]}>
            <boxGeometry args={[0.16, 0.65, 0.18]} />
            <meshStandardMaterial color={isBot ? '#334155' : '#3f3f46'} />
          </mesh>

          {/* Left Leg */}
          <mesh ref={leftLegRef} position={[-0.16, 0.4, 0]}>
            <boxGeometry args={[0.2, 0.75, 0.22]} />
            <meshStandardMaterial color="#09090b" roughness={0.7} />
          </mesh>

          {/* Right Leg */}
          <mesh ref={rightLegRef} position={[0.16, 0.4, 0]}>
            <boxGeometry args={[0.2, 0.75, 0.22]} />
            <meshStandardMaterial color="#09090b" roughness={0.7} />
          </mesh>
        </group>
      )}

      {/* 3D Floating Nameplate above Head */}
      <group position={[0, 2.25, 0]}>
        <Text
          fontSize={0.25}
          color={isCurrentPlayer ? '#f87171' : '#f4f4f5'}
          outlineWidth={0.03}
          outlineColor="#000000"
          anchorX="center"
          anchorY="bottom"
        >
          {isBot ? `[BOT] ${name}` : name}
        </Text>

        <Text
          position={[0, -0.22, 0]}
          fontSize={0.16}
          color={personalityColor}
          outlineWidth={0.02}
          outlineColor="#000000"
          anchorX="center"
          anchorY="top"
        >
          {personality} {isCurrentPlayer ? '(YOU)' : ''}
        </Text>
      </group>
    </group>
  );
}
