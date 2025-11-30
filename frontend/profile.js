document.addEventListener('DOMContentLoaded', async () => {
  const carousel = document.getElementById('carousel');
  const topGamesContainer = document.querySelector('.top-games');
  const recentReviewsContainer = document.querySelector('.recent-reviews');
  const usernameEl = document.querySelector('.username');
  const profilePicEl = document.querySelector('.profile-pic');
  const bioEl = document.querySelector('.bio');

  const userId = localStorage.getItem('userId');
  if (!userId) return console.warn('No user logged in');

  async function fetchProfile() {
    try {
      const res = await fetch(`/api/user/${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();

      // Basic profile data
      if (usernameEl) usernameEl.textContent = data.username || "Unknown";
      if (profilePicEl) profilePicEl.src = data.profilePic || "images/profile.jpg";
      if (bioEl) bioEl.textContent = data.bio || "";

      renderAll(data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }

  function renderAll(profileData) {
    renderFavorites(profileData.favouriteGames || []);
    renderCarousel(profileData.recentlyPlayed || []);
    renderReviews(profileData.recentReviews || []);
  }

  // ⭐ FAVORITE GAMES SECTION
  function renderFavorites(top) {
    if (!topGamesContainer) return;

    topGamesContainer.innerHTML = top.map(game => `
      <div class="game-card" onclick="window.location.href='game_details.html?id=${game.gameId}'">
        <img src="${game.image || 'images/placeholder.png'}" alt="${game.gameName || 'Unknown Game'}">
        <div class="game-name">${game.gameName || 'Unknown Game'}</div>
        <div class="game-rating">
          ${'★'.repeat(game.rating || 0)}${'☆'.repeat(5 - (game.rating || 0))}
        </div>
      </div>
    `).join('');
  }

  // ⭐ RECENTLY PLAYED CAROUSEL
  function renderCarousel(recent) {
    if (!carousel) return;

    carousel.innerHTML = recent.map(g => `
      <div class="carousel-item" onclick="window.location.href='game_details.html?id=${g.gameId}'">
        <img src="${g.image || 'images/placeholder.png'}" alt="${g.gameName || 'Unknown Game'}">
      </div>
    `).join('');
  }

  // ⭐ RECENT REVIEWS SECTION
  function renderReviews(reviews) {
    if (!recentReviewsContainer) return;

    if (!reviews.length) {
      recentReviewsContainer.innerHTML = "<h3>No reviews yet</h3>";
      return;
    }

    recentReviewsContainer.innerHTML = `
      <h3>Recent Reviews</h3>
      ${reviews.map(r => `
        <div class="review-item" onclick="window.location.href='game_details.html?id=${r.gameId}'">
          <img src="${r.image || 'images/placeholder.png'}" alt="${r.gameName || 'Unknown Game'}" class="review-game-img">
          <div class="review-text">
            <strong>${r.gameName || "Unknown Game"}:</strong> ${r.review || ""}
          </div>
        </div>
      `).join('')}
    `;
  }

  fetchProfile();
});
