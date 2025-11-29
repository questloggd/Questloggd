document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const msg = document.getElementById('msg');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('email') || {}).value?.trim() || '';
    const password = (document.getElementById('password') || {}).value || '';
    if (!email || !password) { if (msg) msg.textContent = 'Enter email and password'; return; }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
      // Save userId locally
      localStorage.setItem('userId', data.user?.id || data.tokenPayload?.id || '');
      window.location.href = data.redirect || '/quest_user.html';
    }
    } catch (err) {
      console.error('Login error:', err);
      if (msg) msg.textContent = 'Network error. Is the backend running?';
    }
  });
});