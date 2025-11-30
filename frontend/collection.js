document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('gameGrid');
  const usernameEl = document.querySelector('.collection-header .username');

  const searchInput = document.getElementById('searchInput');
  const genreFilter = document.getElementById('genreFilter');
  const yearFilter = document.getElementById('yearFilter');
  const platformFilter = document.getElementById('platformFilter');
  const sortFilter = document.getElementById('sortFilter');

  const userId = localStorage.getItem('userId');
  if (!userId) return (grid.innerHTML = '<p style="color:red;">Not logged in</p>');

  let games = [];

  // -------------------------------------------------
  // FETCH USER COLLECTION
  // -------------------------------------------------
  async function fetchCollection() {
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to fetch collection');

      const data = await res.json();

      if (usernameEl) {
        usernameEl.textContent = `${data.username}'s Collection`;
      }

      games = data.recentlyPlayed || [];

      // -------------------------------------------------
      // 🔥 FIX: NORMALIZE GAME PROPERTIES
      // -------------------------------------------------
      games = games.map(g => ({
        ...g,
        gameId: g.gameId || g.id || g._id,
        gameName: g.gameName || g.title || g.name || (g.game && g.game.title) || "Unknown Game",
        image: g.image || (g.game && g.game.image) || "images/placeholder.png",
        genre: g.genre || (g.game && g.game.genre) || [],
        year: g.year || (g.game && g.game.year) || null,
        platforms: g.platforms || (g.game && g.game.platforms) || [],
        popularity: g.popularity || 0
      }));

      populateFilters(games);
      renderGrid();
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<p style="color:red;">Failed to load collection. ${err.message}</p>`;
    }
  }

  // -------------------------------------------------
  // FILTER OPTIONS
  // -------------------------------------------------
  function populateFilters(games) {
    const genres = new Set();
    const years = new Set();
    const platforms = new Set();

    games.forEach((g) => {
      (g.genre || []).forEach((gn) => genres.add(gn));
      if (g.year) years.add(String(g.year));
      (g.platforms || []).forEach((p) => platforms.add(p));
    });

    addOptions(genreFilter, genres, 'All Genres');
    addOptions(yearFilter, years, 'All Years');
    addOptions(platformFilter, platforms, 'All Platforms');
  }

  function addOptions(select, values, defaultText) {
    select.innerHTML = `<option value="all">${defaultText}</option>`;
    [...values]
      .sort()
      .forEach((v) => (select.innerHTML += `<option value="${v}">${v}</option>`));
  }

  // -------------------------------------------------
  // RENDER GRID WITH CLICKABLE GAME CARDS
  // -------------------------------------------------
  function renderGrid() {
    const search = searchInput.value.toLowerCase();
    const genre = genreFilter.value;
    const year = yearFilter.value;
    const platform = platformFilter.value;
    const sort = sortFilter.value;

    let filtered = games.filter((g) => {
      const matchesSearch = g.gameName.toLowerCase().includes(search);
      const matchesGenre = genre === 'all' || (g.genre || []).includes(genre);
      const matchesYear = year === 'all' || String(g.year) === year;
      const matchesPlatform =
        platform === 'all' || (g.platforms || []).includes(platform);

      return matchesSearch && matchesGenre && matchesYear && matchesPlatform;
    });

    // Sorting
    if (sort === 'az') {
      filtered.sort((a, b) => a.gameName.localeCompare(b.gameName));
    } else if (sort === 'popularity') {
      filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    // -----------------------------------------------------
    // GRID HTML — CLICKABLE GAME CARDS
    // -----------------------------------------------------
    grid.innerHTML = filtered.length
      ? filtered
          .map(
            (g) => `
      <div class="game-card" onclick="window.location.href='game_details.html?id=${g.gameId}'">
        <img src="${g.image}" alt="${g.gameName}">
        <div class="game-title">${g.gameName}</div>
      </div>
    `
          )
          .join('')
      : '<p style="color:#ccc;">No games match your filters.</p>';
  }

  // -------------------------------------------------
  // EVENT LISTENERS
  // -------------------------------------------------
  ;[searchInput, genreFilter, yearFilter, platformFilter, sortFilter].forEach((el) => {
    el.addEventListener('input', renderGrid);
    el.addEventListener('change', renderGrid);
  });

  fetchCollection();
});
