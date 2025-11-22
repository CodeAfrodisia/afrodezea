import React from 'react';

export function ScoreTicker({ p1, p2 }: { p1: number; p2: number }) {
  return (
    <div className="flex items-center gap-6 text-cream-100">
      <div className="text-lg">Score</div>
      <div className="text-3xl font-black text-gold-400">{p1}</div>
      <div className="text-xl">:</div>
      <div className="text-3xl font-black text-gold-400">{p2}</div>
    </div>
  );
}
