import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { flyJot, haptic } from "../lib/fly";
import { nextExpiryChoice, type ExpiryChoice } from "../lib/notes";

interface Props {
  onSend: (text: string, expiry: ExpiryChoice) => void;
}

export interface CaptureBarHandle {
  focus: () => void;
  /** Drop shared text into the input, ready to send. */
  prefill: (text: string) => void;
}

/**
 * The docked input at the bottom of the Jot tab: open the app and you are
 * already writing. A small timer toggle cycles the disappearing-jot choice.
 */
const CaptureBar = forwardRef<CaptureBarHandle, Props>(function CaptureBar(
  { onSend },
  ref,
) {
  const [text, setText] = useState("");
  const [expiry, setExpiry] = useState<ExpiryChoice>(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus({ preventScroll: true }),
    prefill: (incoming: string) => {
      setText((prev) =>
        prev.trim() === ""
          ? incoming
          : `${prev.replace(/\s+$/, "")}\n${incoming}`,
      );
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
        el.focus({ preventScroll: true });
      });
    },
  }));

  const send = () => {
    const trimmed = text.trim();
    if (trimmed === "") return;
    flyJot(trimmed, sendRef.current);
    onSend(trimmed, expiry);
    haptic();
    setText("");
    setExpiry(0);
    // Keep the keyboard up: capture is usually more than one thought.
    inputRef.current?.focus({ preventScroll: true });
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const cycleTimer = () => {
    setExpiry((prev) => nextExpiryChoice(prev));
    haptic(5);
  };

  return (
    <div className="capture-wrap">
      <div className="capture-bar">
        <button
          className={`timer-btn${expiry !== 0 ? " armed" : ""}`}
          onClick={cycleTimer}
          aria-label={
            expiry === 0
              ? "Disappearing jot: off"
              : `Disappearing jot: ${expiry} hours`
          }
          title="Disappearing jot"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 1.5h8M4 14.5h8M4.5 1.5v2.2c0 1.9 3.5 3.1 3.5 4.3s-3.5 2.4-3.5 4.3v2.2M11.5 1.5v2.2c0 1.9-3.5 3.1-3.5 4.3s3.5 2.4 3.5 4.3v2.2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {expiry !== 0 && <span className="timer-label">{expiry}h</span>}
        </button>
        <textarea
          ref={inputRef}
          className="capture-input"
          value={text}
          placeholder="jot something"
          aria-label="Jot something"
          rows={1}
          enterKeyHint="send"
          onChange={(e) => {
            setText(e.target.value);
            // Auto-grow up to the CSS max-height.
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          ref={sendRef}
          className="send-btn"
          onClick={send}
          disabled={text.trim() === ""}
          aria-label="Send jot"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 13V3M3.5 7.5L8 3l4.5 4.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
});

export default CaptureBar;
