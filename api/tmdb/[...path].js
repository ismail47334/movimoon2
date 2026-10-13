export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const bearer = (process.env.TMDB_READ_ACCESS_TOKEN || '').trim();
  const v3key = (process.env.TMDB_API_KEY || '').trim();
  if (!bearer && !v3key) return res.status(503).json({ error: 'tmdb_not_configured' });

  const { path } = req.query;
  const tmdbPath = Array.isArray(path) ? path.join('/') : (path || '');

  const url = new URL(`https://api.themoviedb.org/3/${tmdbPath}`);
  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'path' || k === 'api_key') continue;
    url.searchParams.append(k, v);
  }

  try {
    const headers = { Accept: 'application/json' };
    if (bearer) headers['Authorization'] = `Bearer ${bearer}`;
    else url.searchParams.set('api_key', v3key);

    const r = await fetch(url, { headers });
    const data = await r.json();
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'tmdb_fetch_failed', message: String(e) });
  }
}
