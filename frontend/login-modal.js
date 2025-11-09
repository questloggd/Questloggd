const toggle = document.getElementById("signin-toggle");
const panel  = document.getElementById("signin-panel");
const form   = document.getElementById("signinForm");
const msg    = document.getElementById("signin-msg");

function openPanel() {
  panel?.classList.remove("hidden");
  panel?.setAttribute("aria-hidden", "false");
}
function closePanel() {
  panel?.classList.add("ckhidden");
  panel?.setAttribute("aria-hidden", "true");
}
function isOpen() { return panel && !panel.classList.contains("hidden"); }

if (toggle && panel) {
  toggle.addEventListener("click", (e) => { e.preventDefault(); isOpen() ? closePanel() : openPanel(); });
  document.addEventListener("pointerdown", (e) => {
    if (!isOpen()) return;
    if (!panel.contains(e.target) && !toggle.contains(e.target)) closePanel();
  });
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (msg) msg.textContent = "Signing in…";

    // Accept si-username, si-email, or email input ids
    const userEl = document.getElementById("si-username")
                 || document.getElementById("si-email")
                 || document.getElementById("email");
    const passEl = document.getElementById("si-password")
                 || document.getElementById("password");

    const email = userEl ? userEl.value.trim() : '';
    const password = passEl ? passEl.value : '';

    if (!email || !password) {
      if (msg) msg.textContent = "Enter email and password";
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        if (msg) msg.textContent = "Signed in. Redirecting...";
        // small delay to allow message to show
        setTimeout(() => { window.location.href = data.redirect || "quest_user.html"; }, 300);
      } else {
        if (msg) msg.textContent = data.error || 'Invalid credentials';
      }
    } catch (err) {
      console.error(err);
      if (msg) msg.textContent = "Network error. Is the backend running?";
    }
  });
}
