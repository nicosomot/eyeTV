import { describe, it, expect, vi } from 'vitest';
import { matchRoute, proxyToTMDB } from '../src/tmdbProxy.js';

describe('matchRoute', () => {
  it('reconnaît /search/tv avec query', () => {
    const url = new URL('https://proxy.example/search/tv?query=breaking+bad');
    expect(matchRoute('/search/tv', url)).toBe('/search/tv?query=breaking%20bad');
  });

  it('reconnaît /tv/:id', () => {
    const url = new URL('https://proxy.example/tv/1396');
    expect(matchRoute('/tv/1396', url)).toBe('/tv/1396');
  });

  it('reconnaît /tv/:id/season/:n', () => {
    const url = new URL('https://proxy.example/tv/1396/season/2');
    expect(matchRoute('/tv/1396/season/2', url)).toBe('/tv/1396/season/2');
  });

  it('retourne null pour une route inconnue', () => {
    const url = new URL('https://proxy.example/movie/1');
    expect(matchRoute('/movie/1', url)).toBeNull();
  });
});

describe('proxyToTMDB', () => {
  it("appelle TMDB avec la clé api et language=fr-FR, sans exposer la clé au client", async () => {
    const fakeResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const fetchFn = vi.fn().mockResolvedValue(fakeResponse);
    const url = new URL('https://proxy.example/tv/1396');

    const result = await proxyToTMDB('/tv/1396', url, 'SECRET_KEY', fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.themoviedb.org/3/tv/1396?api_key=SECRET_KEY&language=fr-FR'
    );
    expect(result.status).toBe(200);
  });

  it('retourne 404 pour une route inconnue', async () => {
    const fetchFn = vi.fn();
    const url = new URL('https://proxy.example/movie/1');

    const result = await proxyToTMDB('/movie/1', url, 'SECRET_KEY', fetchFn);

    expect(result.status).toBe(404);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
