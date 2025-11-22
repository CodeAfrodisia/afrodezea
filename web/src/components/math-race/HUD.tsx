import React from 'react';
import type { Difficulty, Mode } from '../../game/types';

export function HUD({
  mode,
  difficulty,
  timeLeft,
  p1,
  p2,
}: {
  mode: Mode;
  difficulty: Difficulty;
  timeLeft: number | null;
  p1: number;
  p2: number;
}) {
  return (
    <div className="flex items-center justify-between w-full px-4 py-2 bg-charcoal-900/70 rounded-xl border border-charcoal-700">
      <div className="flex items-center gap-2">
        <span className="px-2 py-1 rounded bg-wine-700 text-cream-100 text-xs uppercase tracking-wide">
          {difficulty}
        </span>
        <span className="px-2 py-1 rounded bg-charcoal-700 text-cream-100 text-xs uppercase tracking-wide">
          {mode.kind === 'timed' ? `Timed: ${Math.ceil(timeLeft ?? 0)}s` : `Target: ${mode.targetScore}`}
        </span>
      </div>
      <div className="text-cream-300 text-sm">
        P1 {p1} • {p2} {mode.kind === 'target' ? `(${mode.targetScore} to win)` : ''}
      </div>
    </div>
  );
}
