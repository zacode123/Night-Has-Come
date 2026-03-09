'use client';

import React, { useEffect, useRef, useState } from 'react';

interface DrippingTextProps {
  text: string;
  className?: string;
}

export default function DrippingText({ text, className = '' }: DrippingTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fontLoaded, setFontLoaded] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => {
      // Small delay to ensure CSS variables are applied
      setTimeout(() => setFontLoaded(true), 100);
    });
  }, []);

  useEffect(() => {
    if (!fontLoaded) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const computedStyle = window.getComputedStyle(container);
    const fontFamily = computedStyle.fontFamily;

    const width = 1200;
    const height = 160;
    canvas.width = width;
    canvas.height = height;

    // Draw initial text to get pixel data
    ctx.clearRect(0, 0, width, height);
    // Fallback font if fontFamily is empty or not loaded yet
    const font = fontFamily ? fontFamily : 'sans-serif';
    ctx.font = `100px ${font}`;
    ctx.fillStyle = '#dc2626';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(text, width / 2, 10);

    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // Find bottom corners
    const corners: {x: number, y: number}[] = [];
    for (let x = 0; x < width; x += 4) {
      let bottomY = -1;
      for (let y = height - 1; y >= 0; y--) {
        if (pixels[(y * width + x) * 4 + 3] > 150) {
          bottomY = y;
          break;
        }
      }
      if (bottomY > 0) {
        // Check if it's a corner (left or right edge)
        const leftAlpha = x > 4 ? pixels[(bottomY * width + (x - 4)) * 4 + 3] : 0;
        const rightAlpha = x < width - 4 ? pixels[(bottomY * width + (x + 4)) * 4 + 3] : 0;
        if (leftAlpha < 150 || rightAlpha < 150) {
          corners.push({x, y: bottomY});
        }
      }
    }

    // If no corners found (e.g. font loading issue), add some random points along the bottom
    if (corners.length === 0) {
        for(let i=0; i<20; i++) {
            corners.push({x: width/2 - 300 + Math.random()*600, y: 110});
        }
    }

    let animationFrameId: number;
    let frameCount = 0;

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);
      
      // Draw text
      ctx.shadowColor = 'rgba(220, 38, 38, 0.8)';
      ctx.shadowBlur = 15;
      ctx.font = `100px ${font}`;
      ctx.fillStyle = '#dc2626';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(text, width / 2, 10);
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [text, fontLoaded]);

  return (
    <div 
      ref={containerRef}
      className={`relative flex justify-center items-start w-full font-['var(--font-nosifer)'] ${className}`}
    >
      <canvas 
        ref={canvasRef} 
        className={`max-w-full h-auto transition-opacity duration-1000 ${fontLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ width: '100%', maxWidth: '1200px', filter: 'drop-shadow(0 0 10px rgba(220,38,38,0.5))' }}
      />
      {/* Fallback text while font loads or canvas initializes */}
      {!fontLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-red-600 tracking-widest drop-shadow-[0_0_10px_rgba(220,38,38,0.8)] whitespace-nowrap">
          {text}
        </div>
      )}
    </div>
  );
}
