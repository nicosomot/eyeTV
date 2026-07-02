export function userRef(db, uid) {
  return db.collection('users').doc(uid);
}

export function seriesRef(db, uid, tmdbId) {
  return userRef(db, uid).collection('series').doc(String(tmdbId));
}

export function watchedRef(db, uid, tmdbId, season, episode) {
  return seriesRef(db, uid, tmdbId).collection('watched').doc(`s${season}_e${episode}`);
}

export async function countWatched(db, uid, tmdbId) {
  const snap = await seriesRef(db, uid, tmdbId).collection('watched').get();
  return snap.size;
}

export async function markEpisodeWatched(db, firebaseFieldValue, uid, tmdbId, season, episode) {
  const batch = db.batch();
  const wRef = watchedRef(db, uid, tmdbId, season, episode);
  batch.set(wRef, { watched_at: firebaseFieldValue.serverTimestamp() });
  batch.update(seriesRef(db, uid, tmdbId), { last_watched: { season, episode } });
  await batch.commit();
}

export async function unmarkEpisodeWatched(db, uid, tmdbId, season, episode) {
  await watchedRef(db, uid, tmdbId, season, episode).delete();
}

export async function getTmdbApiKey(db, uid) {
  const snap = await userRef(db, uid).get();
  const data = snap.data();
  return data && data.tmdb_api_key ? data.tmdb_api_key : null;
}

export async function saveTmdbApiKey(db, uid, apiKey) {
  await userRef(db, uid).set({ tmdb_api_key: apiKey }, { merge: true });
}
