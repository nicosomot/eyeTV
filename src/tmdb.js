export async function tmdbFetch(path, auth, workerBase) {
  const token = await auth.currentUser.getIdToken();
  const url = `${workerBase}${path}`;
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.json();
}
