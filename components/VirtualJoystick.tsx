'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Zap, ArrowUp, Camera, Crosshair, Heart, Search } from 'lucide-react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
  onSprintToggle: (isSprinting: boolean) => void;
  onJump: () => void;
  onRoleAction?: () => void;
  onAction?: () => void;
  onToggleCamera?: () => void;
  cameraMode?: 'thirdPerson' | 'isometric';
  role?: string | null;
  isAlive?: boolean;
  phase?: string;
}

export default function VirtualJoystick({
  onMove,
  onSprintToggle,
  onJump,
  onRoleAction,
  onAction,
  onToggleCamera,
  cameraMode = 'thirdPerson',
  role = 'Citizen',
  isAlive = true,
  phase: _phase = 'Discussion',
}: VirtualJoystickProps) {
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const maxRadius = 46; // max displacement radius in px

  // Update position from pointer (touch or mouse)
  const processMovement = useCallback(
    (clientX: number, clientY: number) => {
      const dx = clientX - dragStartPos.current.x;
      const dy = clientY - dragStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) {
        setJoystickPos({ x: 0, y: 0 });
        onMove({ x: 0, y: 0 });
        return;
      }

      const clampedDist = Math.min(distance, maxRadius);
      const angle = Math.atan2(dy, dx);
      const clampedX = Math.cos(angle) * clampedDist;
      const clampedY = Math.sin(angle) * clampedDist;

      setJoystickPos({ x: clampedX, y: clampedY });

      // Screen UP is dy < 0, so inverting Y makes pushing UP = positive forward (+1)
      onMove({
        x: clampedX / maxRadius,
        y: -(clampedY / maxRadius),
      });
    },
    [onMove]
  );

  const handlePointerDown = (clientX: number, clientY: number) => {
    dragStartPos.current = { x: clientX, y: clientY };
    setIsDragging(true);
  };

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;
      processMovement(clientX, clientY);
    },
    [isDragging, processMovement]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setJoystickPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  }, [onMove]);

  // Global mouse event listeners during mouse drag
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      handlePointerUp();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const toggleSprint = () => {
    const next = !isSprinting;
    setIsSprinting(next);
    onSprintToggle(next);
  };

  // Determine Role Action styling and icon
  const getRoleActionButton = () => {
    if (!isAlive) return null;
    if (role === 'Mafia') {
      return {
        label: 'ATTACK',
        color: 'from-red-600 to-red-800 border-red-500 shadow-red-900/50',
        icon: <Crosshair size={20} className="text-white" />,
      };
    }
    if (role === 'Doctor') {
      return {
        label: 'HEAL',
        color: 'from-emerald-600 to-emerald-800 border-emerald-500 shadow-emerald-900/50',
        icon: <Heart size={20} className="text-white" />,
      };
    }
    if (role === 'Police' || role === 'Detective') {
      return {
        label: 'SCAN',
        color: 'from-blue-600 to-indigo-800 border-blue-500 shadow-blue-900/50',
        icon: <Search size={20} className="text-white" />,
      };
    }
    return null;
  };

  const roleAction = getRoleActionButton();

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between p-3 sm:p-4">
      {/* Top Floating Mini Bar: Camera Switch */}
      <div className="flex justify-between items-center w-full pointer-events-auto">
        {onToggleCamera ? (
          <button
            onClick={onToggleCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-semibold text-zinc-200 hover:text-white shadow-lg active:scale-95 transition-transform"
          >
            <Camera size={14} className="text-red-400" />
            <span>{cameraMode === 'thirdPerson' ? 'Third Person' : 'Isometric'}</span>
          </button>
        ) : (
          <div />
        )}

        <div className="text-[11px] font-mono tracking-wider bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-zinc-300 hidden sm:block">
          WASD or Joystick: Move | Shift: Sprint | Space: Jump
        </div>
      </div>

      {/* Bottom Area: Left Joystick + Right Action Cluster */}
      <div className="flex justify-between items-end w-full pb-1">
        {/* Left: Dual Touch & Mouse Analog Virtual Joystick Base */}
        <div
          onTouchStart={(e) => {
            e.stopPropagation();
            const touch = e.touches[0];
            handlePointerDown(touch.clientX, touch.clientY);
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
            const touch = e.touches[0];
            handlePointerMove(touch.clientX, touch.clientY);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            handlePointerUp();
          }}
          onTouchCancel={(e) => {
            e.stopPropagation();
            handlePointerUp();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            handlePointerDown(e.clientX, e.clientY);
          }}
          className="pointer-events-auto relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-black/55 backdrop-blur-md border border-amber-900/40 shadow-2xl flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
        >
          {/* Inner D-pad directional guide lines */}
          <div className="absolute inset-3 rounded-full border border-dashed border-amber-500/20 pointer-events-none" />
          <div className="absolute w-full h-[1px] bg-white/10 pointer-events-none" />
          <div className="absolute h-full w-[1px] bg-white/10 pointer-events-none" />

          {/* Draggable Stick Handle */}
          <div
            style={{
              transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
            className={`w-12 h-12 rounded-full shadow-lg border-2 flex items-center justify-center pointer-events-none transition-colors ${
              isDragging
                ? 'bg-amber-600 border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.85)]'
                : 'bg-zinc-800/90 border-zinc-600'
            }`}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-amber-200" />
          </div>
        </div>

        {/* Right: Action Buttons Cluster */}
        <div className="pointer-events-auto flex items-end gap-2.5 sm:gap-3">
          {/* Sprint Toggle */}
          <button
            onClick={toggleSprint}
            aria-label="Sprint"
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full border flex flex-col items-center justify-center transition-all shadow-lg active:scale-95 ${
              isSprinting
                ? 'bg-amber-500 border-amber-300 text-black shadow-[0_0_15px_rgba(245,158,11,0.8)] font-black'
                : 'bg-black/60 backdrop-blur-md border-white/20 text-zinc-300 hover:text-white'
            }`}
          >
            <Zap size={20} className={isSprinting ? 'fill-current' : ''} />
            <span className="text-[9px] font-bold tracking-tighter">RUN</span>
          </button>

          {/* Jump Button */}
          <button
            onClick={onJump}
            aria-label="Jump"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-zinc-300 hover:text-white flex flex-col items-center justify-center shadow-lg active:scale-90 active:bg-blue-600 transition-all"
          >
            <ArrowUp size={20} />
            <span className="text-[9px] font-bold tracking-tighter">JUMP</span>
          </button>

          {/* Role Action Button */}
          {roleAction && (
            <button
              onClick={onRoleAction || onAction}
              aria-label={roleAction.label}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${roleAction.color} border-2 flex flex-col items-center justify-center shadow-xl active:scale-95 transition-transform`}
            >
              {roleAction.icon}
              <span className="text-[9px] font-black tracking-wider text-white mt-0.5">
                {roleAction.label}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
