import { describe, it, expect } from 'vitest';
import { FIXED_ROWS, randomPage, buildGenreRows, buildRandomRowPath } from '../src/discover.js';

describe('FIXED_ROWS', () => {
  it('définit les 3 rangées canoniques en page 1', () => {
    expect(FIXED_ROWS).toEqual([
      { title: 'Populaires', path: '/tv/popular?page=1' },
      { title: 'Mieux notées', path: '/tv/top_rated?page=1' },
      { title: 'En ce moment', path: '/tv/on_the_air?page=1' },
    ]);
  });
});

describe('randomPage', () => {
  it('retourne 1 quand le random fourni vaut 0', () => {
    expect(randomPage(20, () => 0)).toBe(1);
  });

  it('retourne maxPages quand le random fourni est proche de 1', () => {
    expect(randomPage(20, () => 0.999)).toBe(20);
  });

  it('retourne une valeur intermédiaire cohérente', () => {
    expect(randomPage(500, () => 0.5)).toBe(251);
  });
});

describe('buildGenreRows', () => {
  it('construit une rangée par genre avec une page aléatoire entre 1 et 20', () => {
    const genres = [
      { id: 10759, name: 'Action & Aventure' },
      { id: 35, name: 'Comédie' },
    ];

    const rows = buildGenreRows(genres, () => 0);

    expect(rows).toEqual([
      { title: 'Action & Aventure', path: '/discover/tv?with_genres=10759&page=1' },
      { title: 'Comédie', path: '/discover/tv?with_genres=35&page=1' },
    ]);
  });

  it('retourne un tableau vide si aucun genre', () => {
    expect(buildGenreRows([], () => 0)).toEqual([]);
  });
});

describe('buildRandomRowPath', () => {
  it('construit un chemin discover/tv trié par popularité avec une page aléatoire entre 1 et 500', () => {
    expect(buildRandomRowPath(() => 0)).toBe('/discover/tv?page=1&sort_by=popularity.desc');
  });
});
