document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const msg = document.getElementById("msg");

  msg.textContent = "Signing up...";

  try {
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      // Save userId locally
      localStorage.setItem('userId', data.user?.id || data.tokenPayload?.id || '');
      msg.textContent = "Signup successful! Redirecting...";
      setTimeout(() => {
        window.location.href = data.redirect || "/quest_user.html";
      }, 1000);
    } else {
      msg.textContent = data.error || "Signup failed.";
    }
  } catch (err) {
    console.error("Signup error:", err);
    msg.textContent = "Network or server error.";
  }
});