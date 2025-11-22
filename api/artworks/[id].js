// /api/artworks/[id].js
export default async function handler(req, res) {
  const { id } = req.query;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const room = String(id || '').split('-')[0] || 'Afrodisia';
  const idx = Number(String(id || '').split('-')[1] || 1);
  const artwork = {
    id,
    title: `${room} — Piece ${idx}`,
    room,
    artist: { id: 'artist-1', name: 'Afrodezea Studio' },
    tier: idx % 3 === 0 ? 'digital' : idx % 3 === 1 ? 'print' : 'original',
    priceDesired: idx % 3 === 2 ? 1400 : idx % 3 === 1 ? 300 : 75,
    edition: idx % 3 === 2 ? { type: 'original' } : idx % 3 === 1 ? { type: 'limited', size: 50, remaining: 37 } : { type: 'open' },
    imageUrl: `/assets/images/art/placeholders/${room.toLowerCase()}/piece-${idx}.jpg`,
    story: 'Inspired by Afrodezea\'s Afrodisia soundscape.'
  };
  res.status(200).json({ artwork });
}
