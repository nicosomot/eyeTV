import { progressPct, nextEpisode, extractEpisodesPerSeason, avatarInitial } from './logic.js';
import { tmdbFetch as tmdbFetchRaw } from './tmdb.js';
import { userRef, seriesRef, countWatched, markEpisodeWatched, unmarkEpisodeWatched } from './firestore.js';

firebase.initializeApp(CONFIG.FIREBASE);
const db = firebase.firestore();
const auth = firebase.auth();

const tmdbFetch = (path) => tmdbFetchRaw(path, auth, CONFIG.TMDB_WORKER_BASE);

let currentUser = null;

const screens = {
  login: document.getElementById('screen-login'),
  watching: document.getElementById('screen-watching'),
  watchlist: document.getElementById('screen-watchlist'),
  detail: document.getElementById('screen-detail'),
};
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    renderUserBubble(user);
    showScreen('watching');
    loadWatchingScreen();
    loadWatchlistScreen();
  } else {
    currentUser = null;
    showScreen('login');
  }
});

document.getElementById('btn-google-signin').addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
});

function renderUserBubble(user) {
  const bubble = document.getElementById('avatar-bubble');
  bubble.innerHTML = '';
  if (user.photoURL) {
    const img = document.createElement('img');
    img.src = user.photoURL;
    img.alt = user.displayName || '';
    img.onerror = () => {
      bubble.innerHTML = '';
      bubble.textContent = avatarInitial(user.displayName, user.email);
    };
    bubble.appendChild(img);
  } else {
    bubble.textContent = avatarInitial(user.displayName, user.email);
  }
}

document.getElementById('avatar-bubble').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('avatar-menu').classList.toggle('open');
});

document.addEventListener('click', () => {
  document.getElementById('avatar-menu').classList.remove('open');
});

document.getElementById('menu-signout').addEventListener('click', () => {
  auth.signOut();
});

document.querySelectorAll('.nav-tab').forEach((tab) => {
  tab.addEventListener('click', () => showScreen(tab.dataset.tab));
});

document.getElementById('btn-back').addEventListener('click', () => {
  const activeTab = document.querySelector('.nav-tab.active').dataset.tab;
  showScreen(activeTab);
});

function showScreen(name) {
  Object.values(screens).forEach((s) => {
    s.style.display = 'none';
    s.classList.remove('active');
  });
  const bottomNav = document.getElementById('bottom-nav');
  const avatarWrap = document.getElementById('avatar-wrap');

  if (name === 'login') {
    bottomNav.style.display = 'none';
    avatarWrap.style.display = 'none';
    screens.login.style.display = 'block';
    screens.login.classList.add('active');
    return;
  }

  avatarWrap.style.display = 'block';

  if (name === 'detail') {
    bottomNav.style.display = 'none';
    screens.detail.style.display = 'block';
    screens.detail.classList.add('active');
    return;
  }

  bottomNav.style.display = 'flex';
  screens[name].style.display = 'block';
  screens[name].classList.add('active');
  document.querySelectorAll('.nav-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === name);
  });
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

async function loadWatchingScreen() {
  const container = document.getElementById('watching-list');
  container.innerHTML = '<div class="loading">Chargement…</div>';

  const snap = await userRef(db, currentUser.uid).collection('series')
    .where('status', '==', 'watching')
    .orderBy('added_at', 'desc')
    .get();

  if (snap.empty) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Aucune série en cours.<br>Ajoute-en une depuis la Watchlist.</p>
      </div>`;
    return;
  }

  const cards = await Promise.all(snap.docs.map(async (doc) => {
    const data = doc.data();
    const watched = await countWatched(db, currentUser.uid, doc.id);
    return { tmdbId: doc.id, data, watched };
  }));

  cards.sort((a, b) => {
    const aComplete = a.watched >= a.data.total_episodes;
    const bComplete = b.watched >= b.data.total_episodes;
    if (aComplete && !bComplete) return 1;
    if (!aComplete && bComplete) return -1;
    return 0;
  });

  container.innerHTML = '';
  cards.forEach(({ tmdbId, data, watched }) => {
    const pct = progressPct(watched, data.total_episodes);
    const isComplete = watched >= data.total_episodes;
    const next = nextEpisode(data.last_watched, data.episodes_per_season || []);

    const card = document.createElement('div');
    card.className = 'series-card';
    card.innerHTML = `
      <img class="series-poster" src="${data.poster_path ? 'https://image.tmdb.org/t/p/w185' + data.poster_path : ''}" alt="${data.title}" loading="lazy">
      <div class="series-info">
        <div class="series-title">${data.title}</div>
        <div class="series-progress-label">
          ${isComplete
            ? `✓ Terminé · ${watched} épisodes`
            : next
              ? `S${next.season}E${next.episode - 1 || 1} · ${watched}/${data.total_episodes} épisodes`
              : `En attente de nouveaux épisodes`}
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${isComplete ? 'complete' : ''}" style="width:${pct}%"></div>
        </div>
        ${isComplete
          ? `<button class="btn-secondary btn-archive-card" data-id="${tmdbId}">Archiver</button>`
          : next
            ? `<button class="btn-primary btn-mark-next" data-id="${tmdbId}" data-season="${next.season}" data-episode="${next.episode}">✓ S${next.season}E${next.episode} vu</button>`
            : ''}
      </div>`;

    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      openDetail(tmdbId, data);
    });
    container.appendChild(card);
  });

  container.querySelectorAll('.btn-mark-next').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const { id, season, episode } = btn.dataset;
      btn.disabled = true;
      btn.textContent = '…';
      await markEpisodeWatched(db, firebase.firestore.FieldValue, currentUser.uid, id, parseInt(season), parseInt(episode));
      showToast(`S${season}E${episode} marqué vu ✓`);
      await loadWatchingScreen();
    });
  });

  container.querySelectorAll('.btn-archive-card').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await seriesRef(db, currentUser.uid, btn.dataset.id).update({ status: 'archived' });
      showToast('Série archivée');
      await loadWatchingScreen();
    });
  });
}

async function loadWatchlistScreen() {
  const container = document.getElementById('watchlist-list');
  container.innerHTML = '<div class="loading">Chargement…</div>';

  const snap = await userRef(db, currentUser.uid).collection('series')
    .where('status', '==', 'watchlist')
    .orderBy('added_at', 'desc')
    .get();

  if (snap.empty) {
    container.innerHTML = `<div class="empty-state"><p>Ta watchlist est vide.<br>Recherche une série ci-dessus.</p></div>`;
    return;
  }

  container.innerHTML = '';
  snap.docs.forEach((doc) => {
    const data = doc.data();
    const item = document.createElement('div');
    item.className = 'series-card';
    item.innerHTML = `
      <img class="series-poster" src="${data.poster_path ? 'https://image.tmdb.org/t/p/w185' + data.poster_path : ''}" alt="${data.title}" loading="lazy">
      <div class="series-info">
        <div class="series-title">${data.title}</div>
        <div class="series-progress-label">${data.total_seasons} saison(s) · ${data.total_episodes} épisodes</div>
        <button class="btn-primary btn-start-watching" data-id="${doc.id}">▶ Commencer</button>
      </div>`;
    container.appendChild(item);
  });

  container.querySelectorAll('.btn-start-watching').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await seriesRef(db, currentUser.uid, btn.dataset.id).update({
        status: 'watching',
        last_watched: { season: 1, episode: 0 },
      });
      showToast('Bonne série !');
      showScreen('watching');
      await loadWatchingScreen();
      await loadWatchlistScreen();
    });
  });
}

const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let searchTimeout = null;

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  if (q.length < 2) { searchResults.style.display = 'none'; return; }
  searchTimeout = setTimeout(() => searchTMDB(q), 400);
});

async function searchTMDB(query) {
  const data = await tmdbFetch(`/search/tv?query=${encodeURIComponent(query)}`);
  searchResults.style.display = '';
  searchResults.innerHTML = '';

  if (!data.results || !data.results.length) {
    searchResults.innerHTML = '<div style="padding:14px;color:var(--text-muted);font-size:0.85rem">Aucun résultat</div>';
    return;
  }

  data.results.slice(0, 6).forEach((show) => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `
      <img class="result-poster" src="${show.poster_path ? 'https://image.tmdb.org/t/p/w185' + show.poster_path : ''}" alt="">
      <div>
        <div class="result-title">${show.name}</div>
        <div class="result-year">${show.first_air_date ? show.first_air_date.slice(0, 4) : '—'}</div>
      </div>`;
    item.addEventListener('click', () => addSeries(show));
    searchResults.appendChild(item);
  });
}

async function addSeries(show) {
  const existing = await seriesRef(db, currentUser.uid, show.id).get();
  if (existing.exists) {
    showToast('Déjà dans ta liste');
    searchResults.style.display = 'none';
    searchInput.value = '';
    return;
  }

  const details = await tmdbFetch(`/tv/${show.id}`);
  const episodesPerSeason = extractEpisodesPerSeason(details.seasons || []);

  await seriesRef(db, currentUser.uid, show.id).set({
    title: show.name,
    poster_path: show.poster_path || null,
    status: 'watchlist',
    added_at: firebase.firestore.FieldValue.serverTimestamp(),
    total_episodes: details.number_of_episodes || 0,
    total_seasons: details.number_of_seasons || 0,
    episodes_per_season: episodesPerSeason,
    last_watched: null,
  });

  searchResults.style.display = 'none';
  searchInput.value = '';
  showToast(`"${show.name}" ajouté à la watchlist`);
  await loadWatchlistScreen();
}

function checkSVG() {
  return `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <polyline points="2,6 5,9 10,3" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

async function openDetail(tmdbId, seriesData) {
  document.getElementById('detail-poster').src = seriesData.poster_path ? 'https://image.tmdb.org/t/p/w342' + seriesData.poster_path : '';
  document.getElementById('detail-title').textContent = seriesData.title;

  const watched = await countWatched(db, currentUser.uid, tmdbId);
  const pct = progressPct(watched, seriesData.total_episodes);
  document.getElementById('detail-progress-fill').style.width = pct + '%';
  document.getElementById('detail-progress-fill').className = 'progress-fill' + (pct === 100 ? ' complete' : '');
  document.getElementById('detail-progress-label').textContent = `${watched} / ${seriesData.total_episodes} épisodes · ${pct}%`;

  const archiveBtn = document.getElementById('btn-archive');
  if (seriesData.status === 'archived') {
    archiveBtn.textContent = '↩ Remettre en cours';
    archiveBtn.onclick = async () => {
      await seriesRef(db, currentUser.uid, tmdbId).update({ status: 'watching' });
      showToast('Remis en cours');
      showScreen('watching');
      await loadWatchingScreen();
    };
  } else {
    archiveBtn.textContent = '🗄 Archiver';
    archiveBtn.onclick = async () => {
      await seriesRef(db, currentUser.uid, tmdbId).update({ status: 'archived' });
      showToast('Archivé');
      showScreen('watching');
      await loadWatchingScreen();
    };
  }

  const seasonsContainer = document.getElementById('seasons-container');
  seasonsContainer.innerHTML = '<div class="loading">Chargement des saisons…</div>';

  const tmdbDetails = await tmdbFetch(`/tv/${tmdbId}`);
  const watchedSnap = await seriesRef(db, currentUser.uid, tmdbId).collection('watched').get();
  const watchedSet = new Set(watchedSnap.docs.map((d) => d.id));

  seasonsContainer.innerHTML = '';

  for (let s = 1; s <= tmdbDetails.number_of_seasons; s++) {
    const block = document.createElement('div');
    block.className = 'season-block';

    const header = document.createElement('div');
    header.className = 'season-header';
    header.innerHTML = `<span>Saison ${s}</span><span>▸</span>`;

    const episodesDiv = document.createElement('div');
    episodesDiv.className = 'season-episodes';
    episodesDiv.style.display = 'none';

    let seasonLoaded = false;

    header.addEventListener('click', async () => {
      const isOpen = episodesDiv.style.display !== 'none';
      if (isOpen) {
        episodesDiv.style.display = 'none';
        header.classList.remove('open');
        header.querySelector('span:last-child').textContent = '▸';
        return;
      }

      header.classList.add('open');
      header.querySelector('span:last-child').textContent = '▾';
      episodesDiv.style.display = 'block';

      if (seasonLoaded) return;
      seasonLoaded = true;

      episodesDiv.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:0.85rem">Chargement…</div>';
      const seasonData = await tmdbFetch(`/tv/${tmdbId}/season/${s}`);
      episodesDiv.innerHTML = '';

      const markAllBtn = document.createElement('button');
      markAllBtn.className = 'season-mark-all';
      markAllBtn.textContent = '✓ Marquer toute la saison comme vue';
      markAllBtn.addEventListener('click', async () => {
        const batch = db.batch();
        seasonData.episodes.forEach((ep) => {
          const key = `s${s}_e${ep.episode_number}`;
          if (!watchedSet.has(key)) {
            const ref = seriesRef(db, currentUser.uid, tmdbId).collection('watched').doc(key);
            batch.set(ref, { watched_at: firebase.firestore.FieldValue.serverTimestamp() });
            watchedSet.add(key);
          }
        });
        const lastEp = seasonData.episodes[seasonData.episodes.length - 1];
        batch.update(seriesRef(db, currentUser.uid, tmdbId), {
          last_watched: { season: s, episode: lastEp.episode_number },
        });
        await batch.commit();
        showToast(`Saison ${s} marquée comme vue`);
        episodesDiv.querySelectorAll('.ep-check').forEach((c) => {
          c.classList.add('watched');
          c.innerHTML = checkSVG();
        });
      });
      episodesDiv.appendChild(markAllBtn);

      seasonData.episodes.forEach((ep) => {
        const key = `s${s}_e${ep.episode_number}`;
        const isWatched = watchedSet.has(key);

        const row = document.createElement('div');
        row.className = 'episode-row';
        row.innerHTML = `
          <div class="ep-check ${isWatched ? 'watched' : ''}">${isWatched ? checkSVG() : ''}</div>
          <div class="ep-num">${ep.episode_number}</div>
          <div class="ep-label">${ep.name}</div>`;

        row.addEventListener('click', async () => {
          const check = row.querySelector('.ep-check');
          if (watchedSet.has(key)) {
            await unmarkEpisodeWatched(db, currentUser.uid, tmdbId, s, ep.episode_number);
            watchedSet.delete(key);
            check.classList.remove('watched');
            check.innerHTML = '';
          } else {
            await markEpisodeWatched(db, firebase.firestore.FieldValue, currentUser.uid, tmdbId, s, ep.episode_number);
            watchedSet.add(key);
            check.classList.add('watched');
            check.innerHTML = checkSVG();
          }
          const newWatched = watchedSet.size;
          const newPct = progressPct(newWatched, seriesData.total_episodes);
          document.getElementById('detail-progress-fill').style.width = newPct + '%';
          document.getElementById('detail-progress-label').textContent = `${newWatched} / ${seriesData.total_episodes} épisodes · ${newPct}%`;
        });

        episodesDiv.appendChild(row);
      });
    });

    block.appendChild(header);
    block.appendChild(episodesDiv);
    seasonsContainer.appendChild(block);
  }

  showScreen('detail');
}
