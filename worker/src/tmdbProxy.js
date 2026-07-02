const TMDB_BASE = 'https://api.themoviedb.org/3';

const ROUTES = [
  {
    pattern: /^\/search\/tv$/,
    build: (match, url) => `/search/tv?query=${encodeURIComponent(url.searchParams.get('query'))}`,
  },
  {
    pattern: /^\/tv\/(\d+)$/,
    build: (match) => `/tv/${match[1]}`,
  },
  {
    pattern: /^\/tv\/(\d+)\/season\/(\d+)$/,
    build: (match) => `/tv/${match[1]}/season/${match[2]}`,
  },
];

export function matchRoute(pathname, url) {
  for (const route of ROUTES) {
    const match = pathname.match(route.pattern);
    if (match) return route.build(match, url);
  }
  return null;
}

export async function proxyToTMDB(pathname, url, apiKey, fetchFn = fetch) {
  const tmdbPath = matchRoute(pathname, url);
  if (!tmdbPath) {
    return new Response('Not found', { status: 404 });
  }
  const separator = tmdbPath.includes('?') ? '&' : '?';
  const tmdbUrl = `${TMDB_BASE}${tmdbPath}${separator}api_key=${apiKey}&language=fr-FR`;
  const resp = await fetchFn(tmdbUrl);
  return new Response(resp.body, {
    status: resp.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
