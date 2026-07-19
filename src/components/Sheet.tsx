import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Full-height variant for the note editor. */
  tall?: boolean;
  children: ReactNode;
}

const CLOSE_MS = 200;
const DISMISS_DRAG_PX = 80;

/**
 * A modal sheet: slides up from the bottom on phones, appears as a centered
 * card on wider screens. Closes on backdrop tap, Escape, the labeled close
 * button, or dragging the handle down past the threshold.
 */
export default function Sheet({ open, title, onClose, tall, children }: Props) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragFrom = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (open) {
      setRender(true);
      setClosing(false);
      setDragY(0);
    } else if (render) {
      setClosing(true);
      const t = window.setTimeout(() => {
        setRender(false);
        setClosing(false);
      }, CLOSE_MS);
      return () => window.clearTimeout(t);
    }
  }, [open, render]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Move focus into the sheet so keyboard users land in the right place.
    const first = panelRef.current?.querySelector<HTMLElement>(
      "input, textarea, button:not(.sheet-close)",
    );
    first?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!render) return null;

  const onHandleDown = (e: React.PointerEvent) => {
    dragFrom.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onHandleMove = (e: React.PointerEvent) => {
    if (dragFrom.current === null) return;
    setDragY(Math.max(0, e.clientY - dragFrom.current));
  };
  const onHandleUp = () => {
    if (dragFrom.current === null) return;
    const passed = dragY > DISMISS_DRAG_PX;
    dragFrom.current = null;
    setDragY(0);
    if (passed) onClose();
  };

  // Portal to <body>: the screen's entrance animation creates a stacking
  // context that would otherwise trap the sheet underneath other chrome.
  return createPortal(
    <div
      className={`sheet-backdrop${closing ? " closing" : ""}`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className={`sheet${tall ? " sheet-tall" : ""}${closing ? " closing" : ""}`}
        style={
          dragY > 0
            ? { transform: `translateY(${dragY}px)`, transition: "none" }
            : undefined
        }
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sheet-handle"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <div className="sheet-grabber" aria-hidden="true" />
          <h2 className="sheet-title">{title}</h2>
        </div>
        <button className="sheet-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3 3l8 8M11 3l-8 8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
