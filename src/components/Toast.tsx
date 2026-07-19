import { createPortal } from "react-dom";

export interface ToastData {
  id: number;
  message: string;
  /** Optional action button, e.g. Undo. */
  action?: { label: string; onPress: () => void };
  kind: "confirm" | "undo";
}

interface Props {
  toast: ToastData | null;
  /** Hold-to-pause: finger down freezes the auto-dismiss timer. */
  onHold?: () => void;
  onRelease?: () => void;
}

/**
 * A single floating pill above the capture bar. The aria-live region stays
 * mounted even when empty so screen readers reliably announce new toasts —
 * a hard-won a11y fix, do not regress it.
 */
export default function Toast({ toast, onHold, onRelease }: Props) {
  // Portal to <body> so the screen's stacking context can't trap it.
  return createPortal(
    <div className="toast-wrap" aria-live="polite">
      {toast && (
        <div
          key={toast.id}
          className={`toast toast-${toast.kind}`}
          onPointerDown={onHold}
          onPointerUp={onRelease}
          onPointerCancel={onRelease}
          onPointerLeave={onRelease}
        >
          {toast.kind === "confirm" && (
            <svg
              className="toast-check"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2.5 7.5l3 3 6-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          <span>{toast.message}</span>
          {toast.action && (
            <button className="toast-action" onClick={toast.action.onPress}>
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
