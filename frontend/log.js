// OPEN/CLOSE SEARCH MODAL
const openBtn = document.getElementById('log-open');
const overlay = document.getElementById('log-overlay');
const closeBtn = document.getElementById('log-close');
const search = document.getElementById('log-search');
const results = document.getElementById('log-results');

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

openBtn?.addEventListener('click', e => {
  e.preventDefault();
  openModal();
});

closeBtn?.addEventListener('click', closeModal);

overlay?.addEventListener('click', e => {
  if (e.target === overlay) closeModal();
});

document.addEventListener('keydown', e => {
  if (!overlay || overlay.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeModal();
});


// SEARCH (DEBOUNCED)
let t, selIndex = -1;

function debounce(fn, ms = 300) {
  clearTimeout(t);
  t = setTimeout(fn, ms);
}

search.addEventListener('input', () => {
  const q = search.value.trim();
  selIndex = -1;
  if (!q) {
    results.style.display = 'none';
    results.innerHTML = '';
    return;
  }

  debounce(async () => {
    try {
      const r = await fetch(`http://localhost:3000/games/search?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      renderResults(data);
    } catch (err) {
      console.log(err);
    }
  }, 250);
});

function renderResults(list) {
  if (!list.length) {
    results.style.display = 'none';
    results.innerHTML = '';
    return;
  }

  results.innerHTML = list
    .map((g, i) => `
      <div class="log-item"
           data-i="${i}"
           data-id="${g.id}"
           data-name="${g.name}"
           data-year="${g.year || ''}"
           data-img="${g.image || ''}">
        <img class="log-thumb" src="${g.image || ''}" alt="">
        <div>
          <div>${g.name}</div>
          <div class="log-meta">${g.year || ''}</div>
        </div>
      </div>
    `)
    .join('');

  results.style.display = 'block';
}


// CLICK SELECT
results.addEventListener('click', e => {
  const row = e.target.closest('.log-item');
  if (!row) return;
  choose(row);
});

// KEYBOARD NAVIGATION
search.addEventListener('keydown', e => {
  const items = [...results.querySelectorAll('.log-item')];
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selIndex = Math.min(selIndex + 1, items.length - 1);
    highlight(items);
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    selIndex = Math.max(selIndex - 1, 0);
    highlight(items);
  }

  if (e.key === 'Enter' && selIndex >= 0) {
    e.preventDefault();
    choose(items[selIndex]);
  }
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


// REVIEW MODAL CONTROLS
const reviewOverlay = document.getElementById('review-overlay');
const revClose = document.getElementById('rev-close');
const revBack = document.getElementById('rev-back');
const revCover = document.getElementById('rev-cover');
const revName = document.getElementById('rev-name');
const revYear = document.getElementById('rev-year');
const revDateEn = document.getElementById('rev-date-enabled');
const revDate = document.getElementById('rev-date');
const revText = document.getElementById('rev-text');
const revStars = document.getElementById('rev-stars');
const revTags = document.getElementById('rev-tags');
const revSave = document.getElementById('rev-save');
const revMsg = document.getElementById('rev-msg');

let selected = { id: null, name: '', year: '', image: '', rating: 0 };

function openReview(game) {
  selected = { ...game, rating: 0 };

  revCover.src = game.image || '';
  revName.textContent = game.name || '';
  revYear.textContent = game.year ? String(game.year) : '';
  revDate.valueAsDate = new Date();
  revText.value = '';
  paintStars(0);
  revMsg.textContent = '';

  closeModal(); // close search modal

  reviewOverlay.classList.remove('hidden');
  reviewOverlay.setAttribute('aria-hidden', 'false');
}

function closeReview() {
  reviewOverlay.classList.add('hidden');
  reviewOverlay.setAttribute('aria-hidden', 'true');
}

revClose?.addEventListener('click', closeReview);

revBack?.addEventListener('click', () => {
  closeReview();
  openModal();
});

reviewOverlay?.addEventListener('click', e => {
  if (e.target === reviewOverlay) closeReview();
});

document.addEventListener('keydown', e => {
  if (!reviewOverlay || reviewOverlay.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeReview();
});


// STAR RATING
function paintStars(n) {
  revStars.textContent = '★★★★★'
    .split('')
    .map((ch, i) => (i < n ? '★' : '☆'))
    .join('');
}

revStars.addEventListener('mousemove', e => {
  const box = revStars.getBoundingClientRect();
  const rel = (e.clientX - box.left) / box.width;
  const hover = Math.min(5, Math.max(1, Math.ceil(rel * 5)));
  paintStars(hover);
});

revStars.addEventListener('mouseleave', () => paintStars(selected.rating || 0));

revStars.addEventListener('click', e => {
  const box = revStars.getBoundingClientRect();
  const rel = (e.clientX - box.left) / box.width;
  selected.rating = Math.min(5, Math.max(1, Math.ceil(rel * 5)));
  paintStars(selected.rating);
});


// SAVE LOG ENTRY
revSave.addEventListener('click', async () => {
  revMsg.textContent = 'Saving…';

  try {
    const res = await fetch('http://localhost:3000/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: selected.id,
        name: selected.name,
        year: selected.year,
        image: selected.image,
        date: revDateEn.checked ? revDate.value : null,
        review: revText.value.trim(),
        rating: selected.rating,
        tags: revTags.value.trim()
      })
    });

    const data = await res.json();

    if (res.ok) {
      revMsg.textContent = 'Logged! Redirecting…';
      setTimeout(() => (window.location.href = 'quest_user.html'), 600);
    } else {
      revMsg.textContent = data?.message || 'Could not save.';
    }
  } catch (err) {
    revMsg.textContent = 'Network error.';
  }
});
