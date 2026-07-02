export function progressPct(watched, total) {
  if (!total) return 0;
  return Math.round((watched / total) * 100);
}

export function extractEpisodesPerSeason(tmdbSeasons) {
  return tmdbSeasons
    .filter((s) => s.season_number >= 1)
    .sort((a, b) => a.season_number - b.season_number)
    .map((s) => s.episode_count);
}

export function nextEpisode(lastWatched, episodesPerSeason) {
  if (!lastWatched || (!lastWatched.season && !lastWatched.episode)) {
    return { season: 1, episode: 1 };
  }
  const { season, episode } = lastWatched;
  const currentSeasonTotal = episodesPerSeason[season - 1];
  if (currentSeasonTotal === undefined) {
    return null;
  }
  if (episode >= currentSeasonTotal) {
    const nextSeasonTotal = episodesPerSeason[season];
    if (nextSeasonTotal === undefined) {
      return null;
    }
    return { season: season + 1, episode: 1 };
  }
  return { season, episode: episode + 1 };
}

export function avatarInitial(displayName, email) {
  const source = displayName || email || '';
  return source.charAt(0).toUpperCase() || '?';
}
