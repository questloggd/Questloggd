// log.js
document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.getElementById('log-open');
  const overlay = document.getElementById('log-overlay');
  const closeBtn = document.getElementById('log-close');
  const search = document.getElementById('log-search');
  const results = document.getElementById('log-results');

  let t, selIndex = -1;
  let selected = { id: null, name: '', year: '', image: '', rating: 0 };
  let userId = null;

  // Fetch logged-in user ID
  fetch('/api/me', { credentials: 'include' })
    .then(r => r.json())
    .then(data => { if (data.id) userId = data.id; })
    .catch(err => console.error('Failed to get logged-in user:', err));

  // OPEN/CLOSE SEARCH MODAL
  function openModal() {
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => search.focus(), 0);
  }

  function closeModal() {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    results.style.display = 'none';
    results.innerHTML = '';
    search.value = '';
  }

  openBtn?.addEventListener('click', e => { e.preventDefault(); openModal(); });
  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (!overlay || overlay.classList.contains('hidden')) return; if (e.key === 'Escape') closeModal(); });

  // SEARCH (DEBOUNCED)
  function debounce(fn, ms = 300) { clearTimeout(t); t = setTimeout(fn, ms); }

  search.addEventListener('input', () => {
    const q = search.value.trim();
    selIndex = -1;
    if (!q) { results.style.display = 'none'; results.innerHTML = ''; return; }

    debounce(async () => {
      try {
        const r = await fetch(`/games/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
        const data = await r.json();
        renderResults(data);
      } catch (err) {
        console.error(err);
      }
    }, 250);
  });

  function renderResults(list) {
    if (!list.length) { results.style.display = 'none'; results.innerHTML = ''; return; }

    results.innerHTML = list.map((g, i) => `
      <div class="log-item"
           data-i="${i}"
           data-id="${g.id}"
           data-name="${g.name}"
           data-year="${g.year || ''}"
           data-img="${g.image || ''}">
        <img class="log-thumb" src="${g.image || ''}" alt="${g.name}">
        <div>
          <div>${g.name}</div>
          <div class="log-meta">${g.year || ''}</div>
        </div>
      </div>
    `).join('');
    results.style.display = 'block';
  }

  // CLICK OR KEYBOARD SELECT
  results.addEventListener('click', e => { const row = e.target.closest('.log-item'); if (!row) return; choose(row); });
  search.addEventListener('keydown', e => {
    const items = [...results.querySelectorAll('.log-item')];
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); selIndex = Math.min(selIndex + 1, items.length - 1); highlight(items); }
    if (e.key === 'ArrowUp') { e.preventDefault(); selIndex = Math.max(selIndex - 1, 0); highlight(items); }
    if (e.key === 'Enter' && selIndex >= 0) { e.preventDefault(); choose(items[selIndex]); }
  });

  function highlight(items) {
    items.forEach(el => el.classList.remove('active'));
    if (selIndex >= 0) items[selIndex].classList.add('active');
    const el = items[selIndex];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  function choose(row) {
    openReview({
      id: row.dataset.id,
      name: row.dataset.name,
      year: row.dataset.year || '',
      image: row.dataset.img || ''
    });
  }

  // REVIEW MODAL
  const reviewOverlay = document.getElementById('review-overlay');
  const revClose = document.getElementById('rev-close');
  const revBack = document.getElementById('rev-back');
  const revCover = document.getElementById('rev-cover');
  const revName = document.getElementById('rev-name');
  const revYear = document.getElementById('rev-year');
  const revDateEn = document.getElementById('rev-date-enabled');
  const revDate = document.getElementById('rev-date');
  const revText = document.getElementById('rev-text');
  const revTags = document.getElementById('rev-tags');
  const revSave = document.getElementById('rev-save');
  const revMsg = document.getElementById('rev-msg');
  const starElements = document.querySelectorAll('.rev-star');

  function openReview(game) {
    selected = { ...game, rating: 0 };
    revCover.src = game.image || '';
    revName.textContent = game.name || '';
    revYear.textContent = game.year ? String(game.year) : '';
    revDate.valueAsDate = new Date();
    revText.value = '';
    revTags.value = '';
    paintStars(0);
    revMsg.textContent = '';
    closeModal();
    reviewOverlay.classList.remove('hidden');
    reviewOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeReview() {
    reviewOverlay.classList.add('hidden');
    reviewOverlay.setAttribute('aria-hidden', 'true');
  }

  revClose?.addEventListener('click', closeReview);
  revBack?.addEventListener('click', () => { closeReview(); openModal(); });
  reviewOverlay?.addEventListener('click', e => { if (e.target === reviewOverlay) closeReview(); });
  document.addEventListener('keydown', e => { if (!reviewOverlay || reviewOverlay.classList.contains('hidden')) return; if (e.key === 'Escape') closeReview(); });

  // STAR RATING
  function paintStars(n) { starElements.forEach(star => { const value = parseInt(star.dataset.value, 10); star.textContent = value <= n ? '★' : '☆'; }); }
  starElements.forEach(star => {
    star.addEventListener('mouseenter', () => paintStars(parseInt(star.dataset.value, 10)));
    star.addEventListener('mouseleave', () => paintStars(selected.rating || 0));
    star.addEventListener('click', () => { selected.rating = parseInt(star.dataset.value, 10); paintStars(selected.rating); });
  });

  // SAVE LOG ENTRY
  revSave?.addEventListener('click', async () => {
    if (!userId) {
      revMsg.textContent = 'You must be logged in to save a log.';
      return;
    }
    revMsg.textContent = 'Saving…';
    try {
      const res = await fetch('/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          gameId: selected.id,
          gameName: selected.name,
          year: selected.year,
          image: selected.image || '',
          date: revDateEn.checked ? revDate.value : new Date().toISOString(),
          review: revText.value.trim(),
          rating: selected.rating,
          tags: revTags.value.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        revMsg.textContent = 'Logged! Updating profile…';
        setTimeout(() => {
          if (window.addNewLog) addNewLog({
            gameId: selected.id,
            gameName: selected.name,
            year: selected.year,
            image: selected.image,
            date: revDateEn.checked ? revDate.value : new Date().toISOString(),
            review: revText.value.trim(),
            rating: selected.rating,
            tags: revTags.value.trim()
          });
          closeReview();
        }, 300);
      } else {
        revMsg.textContent = data.error || 'Failed to save log';
      }
    } catch (err) {
      console.error(err);
      revMsg.textContent = 'Network error.';
    }
  });
});
