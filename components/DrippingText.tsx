'use client';

import React, { useEffect, useRef } from 'react';

export default function DrippingText({ text }: { text: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const width = 1000;
    const height = 250;

    canvas.width = width;
    canvas.height = height;

    ctx.font = '120px Nosifer, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#dc2626';
    ctx.fillText(text, width / 2, 120);

    const data = ctx.getImageData(0, 0, width, height).data;

    const emitters: { x: number; y: number }[] = [];

    // detect bottom pixels
    for (let x = 0; x < width; x += 5) {
      for (let y = height - 1; y > 0; y--) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 150) {
          emitters.push({ x, y });
          break;
        }
      }
    }

    const drops: any[] = [];

    function spawnDrops() {
      if (Math.random() < 0.08) {
        const p = emitters[Math.floor(Math.random() * emitters.length)];

        drops.push({
          x: p.x,
          y: p.y,
          radius: 4 + Math.random() * 4,
          vy: 0,
          stretch: 1
        });
      }
    }

    function drawDrop(d: any) {
      ctx.beginPath();
      ctx.ellipse(
        d.x,
        d.y,
        d.radius * d.stretch,
        d.radius,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = '#dc2626';
      ctx.font = '120px Nosifer, sans-serif';
      ctx.fillText(text, width / 2, 120);

      spawnDrops();

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];

        d.vy += 0.15; // gravity
        d.y += d.vy;

        d.stretch = Math.min(2, 1 + d.vy * 0.2);

        drawDrop(d);

        if (d.y > height) {
          drops.splice(i, 1);
        }
      }

      requestAnimationFrame(animate);
    }

    animate();
  }, [text]);

  return <canvas ref={canvasRef} style={{ width: '100%' }} />;
}
