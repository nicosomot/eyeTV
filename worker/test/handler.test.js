import { describe, it, expect, vi } from 'vitest';
import { createHandler } from '../src/handler.js';

describe('createHandler', () => {
  const allowedOrigin = 'https://tonpseudo.github.io';

  it('répond 401 si non autorisé, avec en-têtes CORS', async () => {
    const isAuthorized = vi.fn().mockResolvedValue(false);
    const proxyToTMDB = vi.fn();
    const handler = createHandler({ isAuthorized, proxyToTMDB, allowedOrigin });

    const req = new Request('https://proxy.example/tv/1');
    const res = await handler.fetch(req, {});

    expect(res.status).toBe(401);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin);
    expect(proxyToTMDB).not.toHaveBeenCalled();
  });

  it('relaie vers proxyToTMDB si autorisé', async () => {
    const isAuthorized = vi.fn().mockResolvedValue(true);
    const proxyToTMDB = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    const handler = createHandler({ isAuthorized, proxyToTMDB, allowedOrigin });

    const req = new Request('https://proxy.example/tv/1');
    const res = await handler.fetch(req, { TMDB_API_KEY: 'key' });

    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin);
    expect(proxyToTMDB).toHaveBeenCalledWith('/tv/1', expect.any(URL), 'key');
  });

  it('répond directement au préflight OPTIONS sans appeler isAuthorized', async () => {
    const isAuthorized = vi.fn();
    const proxyToTMDB = vi.fn();
    const handler = createHandler({ isAuthorized, proxyToTMDB, allowedOrigin });

    const req = new Request('https://proxy.example/tv/1', { method: 'OPTIONS' });
    const res = await handler.fetch(req, {});

    expect(res.status).toBe(204);
    expect(isAuthorized).not.toHaveBeenCalled();
  });
});
