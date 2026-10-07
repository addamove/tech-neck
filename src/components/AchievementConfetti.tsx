import { useEffect, useState, type CSSProperties } from "react";

const colors = ["#2dbdb3", "#9ee7ca", "#ffcf70", "#86c9e8", "#eab3cc"];

export default function AchievementConfetti() {
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFinished(true);
      return;
    }
    const timer = window.setTimeout(() => setFinished(true), 3500);
    return () => window.clearTimeout(timer);
  }, []);
  if (finished) return null;
  return (
    <div className="achievement-confetti" aria-hidden="true">
      {Array.from({ length: 28 }, (_, index) => (
        <span
          key={index}
          style={{
            "--confetti-left": `${(index * 37) % 100}%`,
            "--confetti-drift": `${((index * 29) % 120) - 60}px`,
            "--confetti-turn": `${index % 2 ? -420 : 500}deg`,
            "--confetti-delay": `${(index % 7) * 0.045}s`,
            "--confetti-duration": `${2.2 + (index % 4) * 0.2}s`,
            backgroundColor: colors[index % colors.length],
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
