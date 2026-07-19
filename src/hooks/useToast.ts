import { useCallback, useRef, useState } from "react";
import type { ToastData } from "../components/Toast";

/**
 * Per-screen toast state: one visible pill, auto-dismissed. Holding a finger
 * on the pill pauses the timer (so Undo is never a race), releasing resumes
 * with whatever time was left.
 */
export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timer = useRef(0);
  const id = useRef(0);
  const expiresAt = useRef(0);
  const remaining = useRef(0);

  const arm = useCallback((duration: number) => {
    window.clearTimeout(timer.current);
    expiresAt.current = Date.now() + duration;
    timer.current = window.setTimeout(() => setToast(null), duration);
  }, []);

  const showToast = useCallback(
    (data: Omit<ToastData, "id">, duration: number) => {
      id.current += 1;
      setToast({ ...data, id: id.current });
      arm(duration);
    },
    [arm],
  );

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  /** Finger down on the pill: freeze the clock. */
  const pause = useCallback(() => {
    window.clearTimeout(timer.current);
    remaining.current = Math.max(600, expiresAt.current - Date.now());
  }, []);

  /** Finger up: give back the time that was left. */
  const resume = useCallback(() => {
    if (remaining.current > 0) arm(remaining.current);
    remaining.current = 0;
  }, [arm]);

  return { toast, showToast, dismiss, pause, resume };
}
