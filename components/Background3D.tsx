'use client';

import { Canvas } from '@react-three/fiber';
import { Sphere, Box, Tetrahedron, Float } from '@react-three/drei';
import { useState } from 'react';

export default function Background3D() {
  const [elements] = useState(() =>
    Array.from({ length: 20 }).map((_, i) => {
      const type = i % 3;
      const position = [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20
      ] as [number, number, number];
      const rotation = [Math.random() * Math.PI, Math.random() * Math.PI, 0] as [number, number, number];
      const color = '#f5caca';

      return { type, position, rotation, color };
    })
  );

  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 10] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        {elements.map((el, i) => (
          <Float key={i} speed={2} rotationIntensity={1} floatIntensity={1}>
            {el.type === 0 && <Sphere args={[0.5, 32, 32]} position={el.position}><meshStandardMaterial color={el.color} /></Sphere>}
            {el.type === 1 && <Box args={[0.8, 0.8, 0.8]} position={el.position} rotation={el.rotation}><meshStandardMaterial color={el.color} /></Box>}
            {el.type === 2 && <Tetrahedron args={[0.7]} position={el.position} rotation={el.rotation}><meshStandardMaterial color={el.color} /></Tetrahedron>}
          </Float>
        ))}
      </Canvas>
    </div>
  );
}
