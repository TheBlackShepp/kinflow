import { useCallback, useRef, useState } from "react";

const LONG_PRESS_DURATION = 500;
const MOVE_THRESHOLD = 8;

export function useLongPress(
  onLongPress: (x: number, y: number) => void,
  options?: { duration?: number }
) {
  const duration = options?.duration ?? LONG_PRESS_DURATION;
  const [progress, setProgress] = useState(0);
  const [pressing, setPressing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const firedRef = useRef(false);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPressing(false);
    setProgress(0);
    originRef.current = null;
    firedRef.current = false;
  }, []);

  const tick = useCallback(() => {
    if (!startRef.current) return;
    const elapsed = performance.now() - startRef.current;
    const p = Math.min(elapsed / duration, 1);
    setProgress(p);
    if (p < 1) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [duration]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button && e.button !== 0) return;
      firedRef.current = false;
      originRef.current = { x: e.clientX, y: e.clientY };
      startRef.current = performance.now();
      setPressing(true);
      setProgress(0);
      rafRef.current = requestAnimationFrame(tick);

      try { navigator.vibrate?.(10); } catch {}

      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        setProgress(1);
        try { navigator.vibrate?.(30); } catch {}
        const { x, y } = originRef.current ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        onLongPress(x, y);
        cleanup();
      }, duration);
    },
    [onLongPress, duration, tick, cleanup]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!originRef.current) return;
      const dx = e.clientX - originRef.current.x;
      const dy = e.clientY - originRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
        cleanup();
      }
    },
    [cleanup]
  );

  const onPointerUp = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const onPointerCancel = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const onPointerLeave = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    pressing,
    progress,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerLeave,
    },
  };
}
