import { describe, it, expect, vi } from 'vitest';
import { tmdbFetch, validateTmdbKey } from '../src/tmdb.js';

describe('tmdbFetch', () => {
  it('appelle TMDB avec la clé et language=fr-FR sur un chemin sans query existante', async () => {
    const fakeResponse = { json: () => Promise.resolve({ ok: true }) };
    const fetchFn = vi.fn().mockResolvedValue(fakeResponse);

    const result = await tmdbFetch('/tv/1396', 'MY_KEY', fetchFn);

    expect(fetchFn).toHaveBeenCalledWith('https://api.themoviedb.org/3/tv/1396?api_key=MY_KEY&language=fr-FR');
    expect(result).toEqual({ ok: true });
  });

  it('utilise & si le chemin contient déjà une query', async () => {
    const fakeResponse = { json: () => Promise.resolve({ results: [] }) };
    const fetchFn = vi.fn().mockResolvedValue(fakeResponse);

    await tmdbFetch('/search/tv?query=breaking', 'MY_KEY', fetchFn);

    expect(fetchFn).toHaveBeenCalledWith('https://api.themoviedb.org/3/search/tv?query=breaking&api_key=MY_KEY&language=fr-FR');
  });
});

describe('validateTmdbKey', () => {
  it('retourne true si TMDB répond 200', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 200 });
    expect(await validateTmdbKey('GOOD_KEY', fetchFn)).toBe(true);
  });

  it('retourne false si TMDB répond 401', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 401 });
    expect(await validateTmdbKey('BAD_KEY', fetchFn)).toBe(false);
  });
});
