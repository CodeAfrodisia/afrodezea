// /api/rooms.js
export default async function handler(req, res) {
  // GET /api/rooms?theme=afrodisia (theme param optional; returning static 7 rooms for Phase 1)
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const rooms = [
    { id: 'Genesis', name: 'Genesis', description: 'The beginning — abstract rebirths' },
    { id: 'Lovelust', name: 'Lovelust', description: 'Passion, heat, curves, intimacy' },
    { id: 'RedWine', name: 'Red Wine', description: 'Seduction, indulgence, celebration' },
    { id: 'Afrodisia', name: 'Afrodisia', description: 'Centerpiece — divine sensuality' },
    { id: 'Deeper', name: 'Deeper', description: 'Mystery, depth, shadow, meditation' },
    { id: 'PleasureDeity', name: 'Pleasure Deity', description: 'Power and divinity in pleasure' },
    { id: 'Silhouette', name: 'Silhouette', description: 'The lingering afterglow' },
  ];
  res.status(200).json({ rooms });
}
