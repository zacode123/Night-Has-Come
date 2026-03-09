'use client';

import { Canvas } from '@react-three/fiber';
import { Sphere, Box, Tetrahedron, Float } from '@react-three/drei';
import { useState } from 'react';

export default function Background3D() {
  const [elements] = useState(() =>
    Array.from({ length: 50 }).map((_, i) => {
      const type = i % 3;

      const position = [
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30
      ] as [number, number, number];

      const rotation = [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        0
      ] as [number, number, number];

      const scale = Math.random() * 1.8 + 0.5;

      const color = '#991b1b';

      return { type, position, rotation, scale, color };
    })
  );

  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 12] }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} />

        {elements.map((el, i) => (
          <Float key={i} speed={2} rotationIntensity={1} floatIntensity={1}>
            {el.type === 0 && (
              <Sphere
                args={[0.6 * el.scale, 32, 32]}
                position={el.position}
              >
                <meshStandardMaterial color={el.color} />
              </Sphere>
            )}

            {el.type === 1 && (
              <Box
                args={[0.9 * el.scale, 0.9 * el.scale, 0.9 * el.scale]}
                position={el.position}
                rotation={el.rotation}
              >
                <meshStandardMaterial color={el.color} />
              </Box>
            )}

            {el.type === 2 && (
              <Tetrahedron
                args={[0.8 * el.scale]}
                position={el.position}
                rotation={el.rotation}
              >
                <meshStandardMaterial color={el.color} />
              </Tetrahedron>
            )}
          </Float>
        ))}
      </Canvas>
    </div>
  );
}
