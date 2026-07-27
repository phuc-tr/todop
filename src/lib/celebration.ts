import confetti from "canvas-confetti";

export function fireConfetti() {
  const end = Date.now() + 900;
  const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"];
  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      startVelocity: 55,
      origin: { x: 0, y: 0.8 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      startVelocity: 55,
      origin: { x: 1, y: 0.8 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({
    particleCount: 120,
    spread: 100,
    origin: { y: 0.6 },
    colors,
  });
}