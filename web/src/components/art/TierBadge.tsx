// web/src/components/art/TierBadge.tsx
import React from 'react';
import { tierLabels } from '../../theme/rooms';
import type { Tier } from '../../pages/Art';

export function TierBadge({ tier }: { tier: Tier }) {
  const label = tierLabels[tier];
  const color = tier === 'original' ? 'bg-amber-500 text-black' : tier === 'print' ? 'bg-purple-500/20 text-purple-200' : 'bg-emerald-500/20 text-emerald-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${color} border border-white/10`}>{label}</span>
  );
}
