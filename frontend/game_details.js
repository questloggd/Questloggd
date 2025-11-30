document.addEventListener("DOMContentLoaded", async () => {

    const userId = localStorage.getItem("userId");
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get("id");

    if (!gameId) {
        alert("Missing game ID");
        return;
    }

    // UI elements
    const titleEl = document.getElementById("game-title");
    const coverEl = document.getElementById("game-cover");
    const descEl = document.getElementById("game-description");
    const avgRatingEl = document.getElementById("avg-rating");
    const yourRatingEl = document.getElementById("your-rating");
    const yourReviewEl = document.getElementById("your-review");
    const reviewListEl = document.getElementById("review-list");

    try {
        // -------------------------------------------
        // 1️⃣ Fetch your user’s logs (we can get game info from this)
        // -------------------------------------------
        const userRes = await fetch(`/api/user/${encodeURIComponent(userId)}`);
        const userData = await userRes.json();

        // Find the entry for this game
        let userGameData = (userData.recentlyPlayed || []).find(g =>
            String(g.gameId) === String(gameId)
        );

        // -------------------------------------------
        // 2️⃣ Normalize game fields (IMPORTANT)
        // -------------------------------------------
        let game = {
            gameId: userGameData?.gameId || gameId,
            gameName:
                userGameData?.gameName ||
                userGameData?.title ||
                userGameData?.name ||
                userGameData?.game?.title ||
                "Unknown Game",
            image:
                userGameData?.image ||
                userGameData?.game?.image ||
                "images/placeholder.png",
            description:
                userGameData?.description ||
                userGameData?.game?.description ||
                "No description available."
        };

        // Fill UI
        titleEl.textContent = game.gameName;
        coverEl.src = game.image;
        descEl.textContent = game.description;

        // -------------------------------------------
        // 3️⃣ Fetch ALL logs for this game
        // -------------------------------------------
        const logsRes = await fetch(`/api/game/logs/${gameId}`);
        const logs = await logsRes.json();

        if (!Array.isArray(logs)) return;

        // → Compute average rating
        const ratings = logs.map(l => l.rating).filter(r => Number(r) > 0);
        const avg = ratings.length
            ? (ratings.reduce((a, b) => a + b) / ratings.length).toFixed(1)
            : "–";

        avgRatingEl.textContent = avg;

        // → Find YOUR review
        const yourLog = logs.find(l => String(l.userId) === String(userId));

        if (yourLog) {
            yourRatingEl.textContent = yourLog.rating
                ? `${yourLog.rating}/5`
                : "Not rated";

            yourReviewEl.textContent = yourLog.review || "No review yet";
        }

        // → Review List
        reviewListEl.innerHTML = logs
            .map(
                l => `
                <div class="review-card">
                    <img src="${l.userPfp || 'images/profile.jpg'}">
                    <div class="review-content">
                        <div class="review-user">${l.username || "Unknown User"}</div>
                        <div class="rating-number">${l.rating || "-"}/5</div>
                        <p>${l.review || ""}</p>
                    </div>
                </div>
            `
            )
            .join("");

    } catch (err) {
        console.error("Error loading game:", err);
    }

});
