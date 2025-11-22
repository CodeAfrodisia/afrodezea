// /api/verify/[code].js
export default async function handler(req, res) {
  const { code } = req.query;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  // Mock verification payload
  const ok = String(code || '').startsWith('AFD-');
  const data = ok ? {
    code,
    artworkTitle: 'Afrodisia — Featured',
    artist: 'Afrodezea Studio',
    edition: 'Digital Collector’s Edition',
    buyer: 'collector@example.com',
    issuedAt: new Date().toISOString(),
    hash: '0xFADECAFEBEEF1234567890',
    pdfUrl: `/mock/certificates/${code}.pdf`,
  } : null;
  res.status(200).json({ valid: ok, certificate: data });
}
