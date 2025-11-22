import React from 'react';
import type { PlayerState } from '../../game/types';

interface Props {
  player: PlayerState;
  onSubmit: (num: number) => void;
  onChange: (s: string) => void;
  locked: boolean;
}

export function PlayerPanel({ player, onChange, onSubmit, locked }: Props) {
  const submit = () => {
    if (locked) return;
    const num = Number(player.input);
    if (!Number.isFinite(num)) return;
    onSubmit(num);
  };
  return (
    <div className={`rounded-xl p-4 bg-charcoal-900/70 border ${locked ? 'border-charcoal-700' : 'border-gold-500'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-cream-100 font-bold">{player.name}</div>
        <div className="text-gold-400 font-extrabold text-2xl">{player.score}</div>
      </div>
      <div className="text-sm text-cream-300/80 mb-2">Answer</div>
      <div className="flex gap-2">
        <input
          aria-label={`${player.name} answer`}
          inputMode="numeric"
          pattern="[0-9]*"
          value={player.input}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9-]/g, ''))}
          className="flex-1 rounded-lg bg-charcoal-800 text-cream-100 px-3 py-2 outline-none focus:ring-4 ring-gold-400"
          disabled={locked}
        />
        <button
          onClick={submit}
          disabled={locked}
          className="px-3 py-2 rounded-lg bg-gold-500 hover:bg-gold-600 text-charcoal-900 font-bold disabled:opacity-50"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
