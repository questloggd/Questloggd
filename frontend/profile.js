document.addEventListener('DOMContentLoaded', async () => {
  const carousel = document.getElementById('carousel');
  const topGamesContainer = document.querySelector('.top-games');
  const recentReviewsContainer = document.querySelector('.recent-reviews');
  const usernameEl = document.querySelector('.username');
  const profilePicEl = document.querySelector('.profile-pic');
  const bioEl = document.querySelector('.bio');

  let logs = [];

  // Get user ID from session or localStorage
  const userId = localStorage.getItem('userId');
  if (!userId) return console.warn('No user logged in');

  async function fetchProfile() {
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();

      // Update profile info
      if (usernameEl) usernameEl.textContent = data.username || 'Unknown';
      if (profilePicEl) profilePicEl.src = data.profilePic || 'images/profile.jpg';
      if (bioEl) bioEl.textContent = data.bio || '';

      logs = data.recentlyPlayed || [];

      renderAll(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }

  function renderAll(profileData) {
    renderFavorites(profileData.favouriteGames || []);
    renderCarousel(profileData.recentlyPlayed || []);
    renderReviews(profileData.recentReviews || []);
  }

  function renderFavorites(top) {
    if (!topGamesContainer) return;
    topGamesContainer.innerHTML = top.map(game => `
      <div class="game-card">
        <img src="${game.image || 'images/placeholder.png'}" alt="${game.name}">
        <div class="game-name">${game.name}</div>
        <div class="game-rating">${'★'.repeat(game.rating)}${'☆'.repeat(5 - game.rating)}</div>
      </div>
    `).join('');
  }

  function renderCarousel(recent) {
    if (!carousel) return;
    carousel.innerHTML = recent.map(game => `
      <div class="carousel-item">
        <img src="${game.image || 'images/placeholder.png'}" alt="${game.name}">
      </div>
    `).join('');
  }

  function renderReviews(reviews) {
    if (!recentReviewsContainer) return;
    recentReviewsContainer.innerHTML = reviews.length ? `
      <h3>Recent Reviews</h3>
      ${reviews.map(r => `
        <div class="review-item">
          <img src="${r.image || 'images/placeholder.png'}" alt="${r.name}" class="review-game-img">
          <div class="review-text"><strong>${r.name}:</strong> ${r.review}</div>
        </div>
      `).join('')}
    ` : '<h3>No reviews yet</h3>';
  }

  // Called from log.js after a new log is saved
  window.addNewLog = function(newLog) {
    logs.unshift(newLog);
    renderAll({ favouriteGames: logs, recentlyPlayed: logs, recentReviews: logs.filter(l => l.review) });
  }

  fetchProfile();
});