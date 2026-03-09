import { useRef } from 'react';

export function useLongPress(callback: () => void, ms = 500) {
  const timer = useRef<NodeJS.Timeout>();
  const start = () => {
    timer.current = setTimeout(callback, ms);
  };
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
  };
}
