// /api/room/[roomId]/artworks.js
export default async function handler(req, res) {
  const {
    query: { roomId },
    method,
  } = req;
  if (method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Return mock artworks for a room
  const mk = (n) => ({
    id: `${roomId}-${n}`,
    title: `${roomId} — Piece ${n}`,
    room: roomId,
    artist: { id: 'artist-1', name: 'Afrodezea Studio' },
    tier: n % 3 === 0 ? 'digital' : n % 3 === 1 ? 'print' : 'original',
    priceDesired: n % 3 === 2 ? 1400 : n % 3 === 1 ? 300 : 75,
    edition: n % 3 === 2 ? { type: 'original' } : n % 3 === 1 ? { type: 'limited', size: 50, remaining: 37 } : { type: 'open' },
    imageUrl: `/assets/images/art/placeholders/${String(roomId).toLowerCase()}/piece-${n}.jpg`,
  });

  const artworks = [1,2,3,4,5,6].map(mk);
  res.status(200).json({ artworks });
}
