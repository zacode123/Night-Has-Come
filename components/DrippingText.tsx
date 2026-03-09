'use client';

import React, { useEffect, useRef } from "react";

interface DrippingTextProps {
  text: string;
  className?: string;
}

export default function DrippingText({ text, className = "" }: DrippingTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Non-null assertion fixes the TypeScript build error
    const ctx = canvas.getContext("2d")!;

    const width = 900;
    const height = 200;

    canvas.width = width;
    canvas.height = height;

    const fontSize = 55;

    ctx.font = `bold ${fontSize}px Nosifer, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff2a2a";

    ctx.fillText(text, width / 2, fontSize);

    const image = ctx.getImageData(0, 0, width, height).data;

    const emitters: { x: number; y: number }[] = [];

    // detect bottom pixels of letters
    for (let x = 0; x < width; x += 4) {
      for (let y = height - 1; y > 0; y--) {
        const alpha = image[(y * width + x) * 4 + 3];
        if (alpha > 150) {
          emitters.push({ x, y });
          break;
        }
      }
    }

    const drops: {
      x: number;
      y: number;
      r: number;
      vy: number;
      length: number;
    }[] = [];

    function spawnDrops() {
      if (emitters.length === 0) return;

      if (Math.random() < 0.06) {
        const p = emitters[Math.floor(Math.random() * emitters.length)];

        drops.push({
          x: p.x,
          y: p.y,
          r: 3 + Math.random() * 2,
          vy: 0,
          length: 0
        });
      }
    }

    function drawDrop(d: typeof drops[number]) {
      ctx.beginPath();

      // drip tail
      ctx.moveTo(d.x, d.y - d.length);
      ctx.lineTo(d.x, d.y);

      ctx.strokeStyle = "#ff2a2a";
      ctx.lineWidth = d.r;
      ctx.stroke();

      // droplet
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = "#ff2a2a";
      ctx.fill();
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      ctx.font = `bold ${fontSize}px Nosifer, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#ff2a2a";
      ctx.fillText(text, width / 2, fontSize);

      spawnDrops();

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];

        d.vy += 0.2;
        d.y += d.vy;
        d.length += 0.4;

        drawDrop(d);

        if (d.y > height) {
          drops.splice(i, 1);
        }
      }

      requestAnimationFrame(animate);
    }

    animate();
  }, [text]);

  return (
    <div className={`w-full flex justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          maxWidth: "900px",
          filter: "drop-shadow(0 0 10px red)"
        }}
      />
    </div>
  );
}
