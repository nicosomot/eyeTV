export const FIXED_ROWS = [
  { title: 'Populaires', path: '/tv/popular?page=1' },
  { title: 'Mieux notées', path: '/tv/top_rated?page=1' },
  { title: 'En ce moment', path: '/tv/on_the_air?page=1' },
];

export function randomPage(maxPages, randomFn = Math.random) {
  return Math.floor(randomFn() * maxPages) + 1;
}

export function buildGenreRows(genres, randomFn = Math.random) {
  return genres.map((g) => ({
    title: g.name,
    path: `/discover/tv?with_genres=${g.id}&page=${randomPage(20, randomFn)}`,
  }));
}

export function buildRandomRowPath(randomFn = Math.random) {
  return `/discover/tv?page=${randomPage(500, randomFn)}&sort_by=popularity.desc`;
}
