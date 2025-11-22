// /api/certificates/issue.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = typeof req.body === 'object' && req.body ? req.body : await new Promise(resolve => {
      let data=''; req.on('data', c => data+=c); req.on('end', ()=> resolve(JSON.parse(data||'{}')));
    });
    const { orderItemId = 'mock-item-1', artworkTitle='Untitled', buyer='collector@example.com' } = body || {};

    const seq = Math.floor(100000 + Math.random()*900000);
    const year = new Date().getFullYear();
    const code = `AFD-${year}-${String(seq).padStart(6,'0')}`;

    const certificate = {
      code,
      artworkTitle,
      artist: 'Afrodezea Studio',
      edition: 'Digital Collector’s Edition',
      buyer,
      issuedAt: new Date().toISOString(),
      pdfUrl: `/mock/certificates/${code}.pdf`,
      orderItemId,
    };

    // In production: generate animated certificate, store PDF in Supabase bucket, insert DB rows.
    return res.status(200).json({ ok: true, certificate });
  } catch (err) {
    console.error('issue certificate error', err);
    return res.status(200).json({ ok: false, error: String(err && err.message || err) });
  }
}
