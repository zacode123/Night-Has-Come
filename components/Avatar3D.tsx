'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';

interface Avatar3DProps {
  id: string;
  name: string;
  avatarBase64?: string | null;
  personality?: string;
  role?: string;
  isBot?: boolean;
  isAlive?: boolean;
  isAdmin?: boolean;
  visible?: boolean;
  position: [number, number, number];
  rotation: number;
  gesture: 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'heal' | 'investigate';
  isCurrentPlayer?: boolean;
  jumpProgress?: number; // 0 to 1
  actionTrigger?: number; // timestamp to trigger burst VFX
}

export default function Avatar3D({
  id: _id,
  name,
  avatarBase64,
  personality = 'Leader',
  role = 'Citizen',
  isBot = false,
  isAdmin = false,
  visible = true,
  isAlive = true,
  position,
  rotation,
  gesture,
  isCurrentPlayer = false,
  jumpProgress = 0,
  actionTrigger = 0,
}: Avatar3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);

  // Limb Joint Pivot Groups
  const leftShoulderRef = useRef<THREE.Group>(null);
  const rightShoulderRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const leftHipRef = useRef<THREE.Group>(null);
  const rightHipRef = useRef<THREE.Group>(null);
  const leftKneeRef = useRef<THREE.Group>(null);
  const rightKneeRef = useRef<THREE.Group>(null);

  const actionRingRef = useRef<THREE.Mesh>(null);

  // Personality styling colors
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

  // Texture creation for the Head Faceplate
  const headTexture = useMemo(() => {
    if (typeof window === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = isBot ? '#090d16' : '#18181b';
    ctx.fillRect(0, 0, 128, 128);

    if (avatarBase64) {
      const img = new Image();
      img.src = avatarBase64;
      img.onload = () => {
        ctx.clearRect(0, 0, 128, 128);
        ctx.save();
        ctx.beginPath();
        ctx.arc(64, 64, 56, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 8, 8, 112, 112);
        ctx.restore();

        // Personality border ring
        ctx.lineWidth = 6;
        ctx.strokeStyle = personalityColor;
        ctx.beginPath();
        ctx.arc(64, 64, 56, 0, Math.PI * 2);
        ctx.stroke();

        texture.needsUpdate = true;
      };
    } else if (isBot) {
      // Crisp vector Bot Logo Insignia
      ctx.clearRect(0, 0, 128, 128);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, 128, 128);

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

      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(48, 48, 32, 28);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(54, 54, 8, 8);
      ctx.fillRect(66, 54, 8, 8);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(52, 68, 24, 3);
    } else {
      // Clean faceplate with personality circle
      ctx.clearRect(0, 0, 128, 128);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, 128, 128);

      ctx.lineWidth = 6;
      ctx.strokeStyle = personalityColor;
      ctx.beginPath();
      ctx.arc(64, 64, 54, 0, Math.PI * 2);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [avatarBase64, isBot, personalityColor]);

  // Skin and Clothing Colors
  const skinColor = '#e2b391';
  const shoeColor = '#18181b';
  const soleColor = '#e4e4e7';
  const pantsColor = isBot ? '#1e293b' : '#27272a';
  const shirtColor = isBot ? '#0f172a' : isCurrentPlayer ? '#991b1b' : '#3f3f46';

  // Kinematics and Animation Frame Loop
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Smooth root position interpolation
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      position[0],
      delta * 14
    );
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      position[2],
      delta * 14
    );

    // Jump parabolic arc
    let jumpY = 0;
    if (jumpProgress > 0) {
      jumpY = Math.sin(jumpProgress * Math.PI) * 1.5;
    }
    groupRef.current.position.y = position[1] + jumpY;

    // Smooth rotation interpolation on character body
    if (bodyGroupRef.current) {
      const currentRot = bodyGroupRef.current.rotation.y;
      bodyGroupRef.current.rotation.y = THREE.MathUtils.lerp(currentRot, rotation, delta * 15);
    }

    // Kinematic Joint Animations
    const time = performance.now() / 1000;
    const isMoving = gesture === 'walk' || gesture === 'run';
    const cadence = gesture === 'run' ? 14 : 8;
    const strideAmp = gesture === 'run' ? 0.75 : 0.45;

    if (isMoving && isAlive) {
      const swing = Math.sin(time * cadence) * strideAmp;

      // Leg Hips & Knees
      if (leftHipRef.current) leftHipRef.current.rotation.x = -swing;
      if (rightHipRef.current) rightHipRef.current.rotation.x = swing;

      // Dynamic Knee Flexion (bend knee when leg moves forward)
      if (leftKneeRef.current) {
        leftKneeRef.current.rotation.x = swing < 0 ? Math.abs(swing) * 0.8 : 0;
      }
      if (rightKneeRef.current) {
        rightKneeRef.current.rotation.x = swing > 0 ? Math.abs(swing) * 0.8 : 0;
      }

      // Arms & Forearms (Counter-swing with natural bend)
      if (leftShoulderRef.current) leftShoulderRef.current.rotation.x = swing * 0.85;
      if (rightShoulderRef.current) rightShoulderRef.current.rotation.x = -swing * 0.85;

      if (leftElbowRef.current) {
        leftElbowRef.current.rotation.x = swing > 0 ? swing * 0.4 : 0.1;
      }
      if (rightElbowRef.current) {
        rightElbowRef.current.rotation.x = swing < 0 ? -swing * 0.4 : 0.1;
      }

      // Torso Walk Bobbing & Leaning
      if (torsoRef.current) {
        torsoRef.current.position.y = 0.75 + Math.abs(Math.sin(time * cadence * 2)) * 0.05;
        torsoRef.current.rotation.x = gesture === 'run' ? 0.18 : 0.06; // Forward lean
        torsoRef.current.rotation.y = Math.sin(time * cadence) * 0.05; // Pelvis sway
      }
    } else {
      // Idle Breathing & Natural Posture
      const breathe = Math.sin(time * 2.2) * 0.03;

      if (leftHipRef.current) leftHipRef.current.rotation.x = 0;
      if (rightHipRef.current) rightHipRef.current.rotation.x = 0;
      if (leftKneeRef.current) leftKneeRef.current.rotation.x = 0;
      if (rightKneeRef.current) rightKneeRef.current.rotation.x = 0;

      if (leftShoulderRef.current) {
        leftShoulderRef.current.rotation.x = breathe;
        leftShoulderRef.current.rotation.z = -0.05;
      }
      if (rightShoulderRef.current) {
        rightShoulderRef.current.rotation.x = breathe;
        rightShoulderRef.current.rotation.z = 0.05;
      }
      if (leftElbowRef.current) leftElbowRef.current.rotation.x = 0.15;
      if (rightElbowRef.current) rightElbowRef.current.rotation.x = 0.15;

      if (torsoRef.current) {
        torsoRef.current.position.y = 0.75 + breathe * 0.3;
        torsoRef.current.rotation.x = breathe * 0.5;
        torsoRef.current.rotation.y = 0;
      }
    }

    // Action Burst VFX Ring Animation
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

  if (!visible) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Ground Aura Glow Ring */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.65, 32]} />
        <meshBasicMaterial
          color={isCurrentPlayer ? '#ef4444' : personalityColor}
          transparent
          opacity={isCurrentPlayer ? 0.85 : 0.35}
        />
      </mesh>

      {/* Role Action Blast Ring */}
      <mesh
        ref={actionRingRef}
        position={[0, 0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[0.001, 0.001, 0.001]}
      >
        <ringGeometry args={[0.4, 0.8, 32]} />
        <meshBasicMaterial
          color={role === 'Mafia' ? '#ef4444' : role === 'Doctor' ? '#10b981' : '#3b82f6'}
          transparent
          opacity={0}
        />
      </mesh>

      {/* Rotating Body Hierarchy */}
      <group ref={bodyGroupRef}>
        {!isAlive ? (
          // Fallen / Eliminated Chalk Marker
          <group position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <circleGeometry args={[0.7, 32]} />
              <meshBasicMaterial color="#450a0a" transparent opacity={0.7} />
            </mesh>
            <Text
              position={[0, 0, 0.02]}
              fontSize={0.28}
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
            {/* Torso & Upper Body Group */}
            <group ref={torsoRef} position={[0, 0.75, 0]}>
              {/* Pelvis / Belt */}
              <mesh position={[0, 0.05, 0]} castShadow>
                <boxGeometry args={[0.46, 0.14, 0.28]} />
                <meshStandardMaterial color={pantsColor} roughness={0.7} />
              </mesh>

              {/* Chest / Jacket Body */}
              <mesh position={[0, 0.35, 0]} castShadow>
                <boxGeometry args={[0.50, 0.52, 0.32]} />
                <meshStandardMaterial color={shirtColor} roughness={0.6} />
              </mesh>

              {/* Collar Accent */}
              <mesh position={[0, 0.62, 0.02]} castShadow>
                <boxGeometry args={[0.26, 0.08, 0.24]} />
                <meshStandardMaterial color={personalityColor} roughness={0.5} />
              </mesh>

              {/* Head with Profile Faceplate */}
              <group position={[0, 0.95, 0]}>
                {/* Cranium */}
                <mesh castShadow>
                  <boxGeometry args={[0.44, 0.44, 0.44]} />
                  <meshStandardMaterial
                    color={isBot ? '#0f172a' : '#18181b'}
                    roughness={0.4}
                  />
                </mesh>

                {/* Front Face Plate with Photo / Bot Logo Texture */}
                <mesh position={[0, 0, 0.23]}>
                  <planeGeometry args={[0.40, 0.40]} />
                  {headTexture ? (
                    <meshBasicMaterial map={headTexture} transparent />
                  ) : (
                    <meshBasicMaterial color={personalityColor} />
                  )}
                </mesh>

                {/* Back of Head Accent Badge */}
                <mesh position={[0, 0, -0.23]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[0.34, 0.34]} />
                  <meshBasicMaterial color={personalityColor} />
                </mesh>
              </group>

              {/* --- ARTICULATED LEFT ARM (Shoulder Pivot) --- */}
              <group ref={leftShoulderRef} position={[-0.34, 0.54, 0]}>
                {/* Shoulder Cap */}
                <mesh position={[0, 0, 0]} castShadow>
                  <sphereGeometry args={[0.09, 12, 12]} />
                  <meshStandardMaterial color={shirtColor} />
                </mesh>

                {/* Upper Arm */}
                <mesh position={[0, -0.16, 0]} castShadow>
                  <boxGeometry args={[0.13, 0.26, 0.14]} />
                  <meshStandardMaterial color={shirtColor} />
                </mesh>

                {/* Elbow & Forearm Joint */}
                <group ref={leftElbowRef} position={[0, -0.30, 0]}>
                  {/* Forearm */}
                  <mesh position={[0, -0.14, 0]} castShadow>
                    <boxGeometry args={[0.12, 0.24, 0.12]} />
                    <meshStandardMaterial color={skinColor} roughness={0.7} />
                  </mesh>

                  {/* Modeled Hand: Palm + Thumb + Fingers */}
                  <group position={[0, -0.28, 0]}>
                    {/* Palm */}
                    <mesh position={[0, -0.04, 0]} castShadow>
                      <boxGeometry args={[0.10, 0.08, 0.08]} />
                      <meshStandardMaterial color={skinColor} />
                    </mesh>
                    {/* Thumb */}
                    <mesh position={[0.04, -0.03, 0.03]} castShadow>
                      <boxGeometry args={[0.04, 0.05, 0.04]} />
                      <meshStandardMaterial color={skinColor} />
                    </mesh>
                    {/* Fingers */}
                    <mesh position={[0, -0.10, 0]} castShadow>
                      <boxGeometry args={[0.09, 0.06, 0.07]} />
                      <meshStandardMaterial color={skinColor} />
                    </mesh>
                  </group>
                </group>
              </group>

              {/* --- ARTICULATED RIGHT ARM (Shoulder Pivot) --- */}
              <group ref={rightShoulderRef} position={[0.34, 0.54, 0]}>
                {/* Shoulder Cap */}
                <mesh position={[0, 0, 0]} castShadow>
                  <sphereGeometry args={[0.09, 12, 12]} />
                  <meshStandardMaterial color={shirtColor} />
                </mesh>

                {/* Upper Arm */}
                <mesh position={[0, -0.16, 0]} castShadow>
                  <boxGeometry args={[0.13, 0.26, 0.14]} />
                  <meshStandardMaterial color={shirtColor} />
                </mesh>

                {/* Elbow & Forearm Joint */}
                <group ref={rightElbowRef} position={[0, -0.30, 0]}>
                  {/* Forearm */}
                  <mesh position={[0, -0.14, 0]} castShadow>
                    <boxGeometry args={[0.12, 0.24, 0.12]} />
                    <meshStandardMaterial color={skinColor} roughness={0.7} />
                  </mesh>

                  {/* Modeled Hand: Palm + Thumb + Fingers */}
                  <group position={[0, -0.28, 0]}>
                    {/* Palm */}
                    <mesh position={[0, -0.04, 0]} castShadow>
                      <boxGeometry args={[0.10, 0.08, 0.08]} />
                      <meshStandardMaterial color={skinColor} />
                    </mesh>
                    {/* Thumb */}
                    <mesh position={[-0.04, -0.03, 0.03]} castShadow>
                      <boxGeometry args={[0.04, 0.05, 0.04]} />
                      <meshStandardMaterial color={skinColor} />
                    </mesh>
                    {/* Fingers */}
                    <mesh position={[0, -0.10, 0]} castShadow>
                      <boxGeometry args={[0.09, 0.06, 0.07]} />
                      <meshStandardMaterial color={skinColor} />
                    </mesh>
                  </group>
                </group>
              </group>
            </group>

            {/* --- ARTICULATED LEFT LEG (Hip Pivot at Y = 0.72) --- */}
            <group ref={leftHipRef} position={[-0.14, 0.72, 0]}>
              {/* Thigh */}
              <mesh position={[0, -0.18, 0]} castShadow>
                <boxGeometry args={[0.17, 0.34, 0.18]} />
                <meshStandardMaterial color={pantsColor} roughness={0.7} />
              </mesh>

              {/* Knee & Calf Joint */}
              <group ref={leftKneeRef} position={[0, -0.36, 0]}>
                {/* Shin / Calf */}
                <mesh position={[0, -0.16, 0]} castShadow>
                  <boxGeometry args={[0.16, 0.30, 0.17]} />
                  <meshStandardMaterial color={pantsColor} roughness={0.7} />
                </mesh>

                {/* Modeled Foot & Shoe */}
                <group position={[0, -0.32, 0]}>
                  {/* Shoe Upper / Body */}
                  <mesh position={[0, 0, 0.04]} castShadow>
                    <boxGeometry args={[0.16, 0.10, 0.24]} />
                    <meshStandardMaterial color={shoeColor} roughness={0.5} />
                  </mesh>
                  {/* Rubber Sole */}
                  <mesh position={[0, -0.06, 0.04]} castShadow receiveShadow>
                    <boxGeometry args={[0.17, 0.04, 0.26]} />
                    <meshStandardMaterial color={soleColor} roughness={0.8} />
                  </mesh>
                </group>
              </group>
            </group>

            {/* --- ARTICULATED RIGHT LEG (Hip Pivot at Y = 0.72) --- */}
            <group ref={rightHipRef} position={[0.14, 0.72, 0]}>
              {/* Thigh */}
              <mesh position={[0, -0.18, 0]} castShadow>
                <boxGeometry args={[0.17, 0.34, 0.18]} />
                <meshStandardMaterial color={pantsColor} roughness={0.7} />
              </mesh>

              {/* Knee & Calf Joint */}
              <group ref={rightKneeRef} position={[0, -0.36, 0]}>
                {/* Shin / Calf */}
                <mesh position={[0, -0.16, 0]} castShadow>
                  <boxGeometry args={[0.16, 0.30, 0.17]} />
                  <meshStandardMaterial color={pantsColor} roughness={0.7} />
                </mesh>

                {/* Modeled Foot & Shoe */}
                <group position={[0, -0.32, 0]}>
                  {/* Shoe Upper / Body */}
                  <mesh position={[0, 0, 0.04]} castShadow>
                    <boxGeometry args={[0.16, 0.10, 0.24]} />
                    <meshStandardMaterial color={shoeColor} roughness={0.5} />
                  </mesh>
                  {/* Rubber Sole */}
                  <mesh position={[0, -0.06, 0.04]} castShadow receiveShadow>
                    <boxGeometry args={[0.17, 0.04, 0.26]} />
                    <meshStandardMaterial color={soleColor} roughness={0.8} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        )}
      </group>

      {/* Floating 3D Nameplate above Head */}
      <Billboard position={[0, 2.35, 0]} follow={true}>
        <Text
          fontSize={0.24}
          color={isAdmin ? '#ef4444' : isCurrentPlayer ? '#f87171' : '#f4f4f5'}
          outlineWidth={0.03}
          outlineColor="#000000"
          anchorX="center"
          anchorY="bottom"
        >
          {isAdmin ? `👑 [ADMIN] ${name}` : isBot ? `🤖 [BOT] ${name}` : name}
        </Text>

        <Text
          position={[0, -0.20, 0]}
          fontSize={0.15}
          color={personalityColor}
          outlineWidth={0.02}
          outlineColor="#000000"
          anchorX="center"
          anchorY="top"
        >
          {personality} {isCurrentPlayer ? '(YOU)' : ''}
        </Text>
      </Billboard>
    </group>
  );
}
