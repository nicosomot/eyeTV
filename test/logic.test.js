import { describe, it, expect } from 'vitest';
import { progressPct, nextEpisode, extractEpisodesPerSeason, avatarInitial } from '../src/logic.js';

describe('progressPct', () => {
  it('retourne 0 si total est 0', () => {
    expect(progressPct(0, 0)).toBe(0);
  });

  it('calcule le pourcentage arrondi', () => {
    expect(progressPct(5, 10)).toBe(50);
    expect(progressPct(1, 3)).toBe(33);
  });
});

describe('extractEpisodesPerSeason', () => {
  it('filtre la saison 0 et trie par numéro de saison', () => {
    const seasons = [
      { season_number: 2, episode_count: 10 },
      { season_number: 0, episode_count: 3 },
      { season_number: 1, episode_count: 8 },
    ];
    expect(extractEpisodesPerSeason(seasons)).toEqual([8, 10]);
  });
});

describe('nextEpisode', () => {
  it('retourne S1E1 si aucune série regardée', () => {
    expect(nextEpisode(null, [8, 10])).toEqual({ season: 1, episode: 1 });
  });

  it("incrémente l'épisode dans la saison courante", () => {
    expect(nextEpisode({ season: 1, episode: 3 }, [8, 10])).toEqual({ season: 1, episode: 4 });
  });

  it('passe à la saison suivante en fin de saison', () => {
    expect(nextEpisode({ season: 1, episode: 8 }, [8, 10])).toEqual({ season: 2, episode: 1 });
  });

  it('retourne null si la dernière saison connue est terminée', () => {
    expect(nextEpisode({ season: 2, episode: 10 }, [8, 10])).toBeNull();
  });

  it('retourne null si la saison courante est inconnue de episodesPerSeason', () => {
    expect(nextEpisode({ season: 5, episode: 1 }, [8, 10])).toBeNull();
  });
});

describe('avatarInitial', () => {
  it('utilise la première lettre du displayName si présent', () => {
    expect(avatarInitial('Nicolas Morin', 'nico@example.com')).toBe('N');
  });

  it("utilise la première lettre de l'email si displayName absent", () => {
    expect(avatarInitial(null, 'nico@example.com')).toBe('N');
  });

  it('retourne "?" si ni displayName ni email ne sont disponibles', () => {
    expect(avatarInitial(null, null)).toBe('?');
    expect(avatarInitial(undefined, undefined)).toBe('?');
  });

  it('met la lettre en majuscule', () => {
    expect(avatarInitial('nicolas', null)).toBe('N');
  });
});
