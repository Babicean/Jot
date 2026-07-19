/**
 * The streak celebration: a small radial burst of particles from the hero
 * total — fireworks in the app's own palette, over in under a second.
 */
export function celebrate(originEl: HTMLElement | null): void {
  if (!originEl) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const styles = getComputedStyle(document.documentElement);
  const colors = [
    styles.getPropertyValue("--accent").trim(),
    styles.getPropertyValue("--warn").trim(),
    styles.getPropertyValue("--ink-3").trim(),
  ];

  const COUNT = 20;
  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement("span");
    p.className = "burst-p";
    const size = 4 + Math.random() * 4;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.background = colors[i % colors.length];
    if (Math.random() < 0.4) p.style.borderRadius = "1.5px"; // a few squares
    document.body.appendChild(p);

    // Radial spread with a gentle upward bias, then gravity pulls down.
    const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 55 + Math.random() * 65;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 24;
    const fall = 30 + Math.random() * 26;
    const duration = 620 + Math.random() * 280;

    const animation = p.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.4)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + fall}px)) scale(0.5)`,
          opacity: 0,
        },
      ],
      { duration, easing: "cubic-bezier(0.2, 0.7, 0.35, 1)" },
    );
    animation.onfinish = () => p.remove();
  }
}
