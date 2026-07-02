export function createHandler({ isAuthorized, proxyToTMDB, allowedOrigin }) {
  function withCORS(response) {
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Access-Control-Allow-Headers', 'Authorization');
    return new Response(response.body, { status: response.status, headers });
  }

  return {
    async fetch(request, env) {
      if (request.method === 'OPTIONS') {
        return withCORS(new Response(null, { status: 204 }));
      }
      const authorized = await isAuthorized(request, env);
      if (!authorized) {
        return withCORS(new Response('Unauthorized', { status: 401 }));
      }
      const url = new URL(request.url);
      const response = await proxyToTMDB(url.pathname, url, env.TMDB_API_KEY);
      return withCORS(response);
    },
  };
}
