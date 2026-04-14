const MIN = 80;
const MAX = 140;

export function clampUiFontScalePercent(n: number): number {
  if (Number.isNaN(n)) {
    return 100;
  }
  return Math.min(MAX, Math.max(MIN, Math.round(n)));
}

/** Applies root font scale so rem-based typography scales app-wide. */
export function applyUiFontScalePercent(percent: number): void {
  const p = clampUiFontScalePercent(percent);
  document.documentElement.style.setProperty("--font-scale", String(p / 100));
}
