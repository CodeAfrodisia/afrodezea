// /api/vault.js
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  // Mock vault items
  const items = [
    {
      id: 'AFD-2025-000124',
      artworkId: 'Afrodisia-1',
      title: 'Afrodisia — Featured',
      imageUrl: '/assets/images/art/placeholders/afrodisia/piece-1.jpg',
      tier: 'digital',
      acquiredAt: new Date().toISOString(),
      certificate: {
        code: 'AFD-2025-000124',
        pdfUrl: '/mock/certificates/AFD-2025-000124.pdf',
      },
    },
    {
      id: 'AFD-2025-000125',
      artworkId: 'Deeper-2',
      title: 'Deeper — Meditation',
      imageUrl: '/assets/images/art/placeholders/deeper/piece-2.jpg',
      tier: 'print',
      acquiredAt: new Date(Date.now() - 86400000).toISOString(),
      certificate: {
        code: 'AFD-2025-000125',
        pdfUrl: '/mock/certificates/AFD-2025-000125.pdf',
      },
    },
  ];
  res.status(200).json({ items });
}
