import React from 'react';

interface Props { value: number; }
export function Countdown({ value }: Props) {
  return (
    <div aria-live="polite" className="text-6xl font-extrabold text-gold-400 drop-shadow-md animate-pulse">
      {value > 0 ? value : 'Go!'}
    </div>
  );
}
