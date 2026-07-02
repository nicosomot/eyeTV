const TMDB_BASE = 'https://api.themoviedb.org/3';

export async function tmdbFetch(path, apiKey, fetchFn = fetch) {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${TMDB_BASE}${path}${separator}api_key=${apiKey}&language=fr-FR`;
  const r = await fetchFn(url);
  return r.json();
}

export async function validateTmdbKey(apiKey, fetchFn = fetch) {
  const r = await fetchFn(`${TMDB_BASE}/authentication?api_key=${apiKey}`);
  return r.status === 200;
}
