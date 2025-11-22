// web/src/theme/rooms.ts
export type RoomKey =
  | 'Genesis'
  | 'Lovelust'
  | 'RedWine'
  | 'Afrodisia'
  | 'Deeper'
  | 'PleasureDeity'
  | 'Silhouette';

export const themes: Record<RoomKey, {
  description: string;
  sound: string; // path or id
  palette: string[]; // Tailwind-compatible color tokens or hex
}> = {
  Genesis: {
    description: 'The beginning — abstract rebirths',
    sound: '/assets/audio/afrodisia/track01-genesis.mp3',
    palette: ['#D4AF37', '#FFFFF0', '#1C1C1C'], // Gold · Ivory · Charcoal
  },
  Lovelust: {
    description: 'Passion, heat, curves, intimacy',
    sound: '/assets/audio/afrodisia/track02-lovelust.mp3',
    palette: ['#B22222', '#800020', '#8B4513'], // Red · Burgundy · Warm brown
  },
  RedWine: {
    description: 'Seduction, indulgence, celebration',
    sound: '/assets/audio/afrodisia/track03-red-wine.mp3',
    palette: ['#4B0E1F', '#301934', '#3B0B2E'], // Merlot · Deep purple
  },
  Afrodisia: {
    description: 'Centerpiece — divine sensuality',
    sound: '/assets/audio/afrodisia/track04-afrodisia.mp3',
    palette: ['#D4AF37', '#673147', '#000000'], // Gold · Plum · Black
  },
  Deeper: {
    description: 'Mystery, depth, shadow, meditation',
    sound: '/assets/audio/afrodisia/track05-deeper.mp3',
    palette: ['#3F00FF', '#8A2BE2', '#191970'], // Indigo · Violet · Midnight
  },
  PleasureDeity: {
    description: 'Power and divinity in pleasure',
    sound: '/assets/audio/afrodisia/track06-pleasure-deity.mp3',
    palette: ['#B87333', '#DC143C', '#1C1C1C'], // Copper · Crimson · Charcoal
  },
  Silhouette: {
    description: 'The lingering afterglow',
    sound: '/assets/audio/afrodisia/track07-silhouette.mp3',
    palette: ['#C0C0C0', '#708090', '#6A5ACD'], // Silver · Smoke · Violet-gray
  },
};

export const tierLabels = {
  digital: 'Digital Collector’s Edition',
  print: 'Limited Edition Print',
  original: 'Original Artwork',
} as const;

export function calcCommission(tier: 'digital'|'print'|'original', desired: number) {
  const rate = tier === 'original' ? 0.25 : 0.20;
  const commission = Math.round(desired * rate);
  const total = desired + commission;
  return { rate, commission, total };
}
