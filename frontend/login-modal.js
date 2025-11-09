// Toggle the sign-in dropdown
const toggle = document.getElementById("signin-toggle");
const panel  = document.getElementById("signin-panel");
const form   = document.getElementById("signinForm");
const msg    = document.getElementById("signin-msg");

function openPanel() {
  panel.classList.remove("hidden");
  panel.setAttribute("aria-hidden", "false");
}

function closePanel() {
  panel.classList.add("hidden");
  panel.setAttribute("aria-hidden", "true");
}

function isOpen() {
  return !panel.classList.contains("hidden");
}

if (toggle && panel) {
  // Open/close on toggle
  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    isOpen() ? closePanel() : openPanel();
  });

  // Prevent outside handler when clicking inside
  panel.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  });
  toggle.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  });

  // Close only on true outside clicks (use pointerdown for reliability)
  document.addEventListener("pointerdown", (e) => {
    if (!isOpen()) return;
    const clickedToggle = toggle.contains(e.target);
    const clickedInsidePanel = panel.contains(e.target);
    if (!clickedToggle && !clickedInsidePanel) {
      closePanel();
    }
  });
}

// Submit sign-in to backend (uses your existing POST /auth/login)
if (form){
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    msg.textContent = "Signing in…";

    const emailOrUser = document.getElementById("si-username").value.trim();
    const password    = document.getElementById("si-password").value;

    try{
      const res = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ email: emailOrUser, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        msg.textContent = "Signed in! Redirecting...";
        setTimeout(() => {
          window.location.href = "quest_user.html";
        }, 800);
      } else {
        msg.textContent = data?.message || "Invalid credentials.";
      }

    }catch(err){
      console.log(err);
      msg.textContent = "Network error. Is the backend running?";
    }
  });
}

