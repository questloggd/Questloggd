document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const msg = document.getElementById('msg');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = (document.getElementById('email') || {}).value?.trim() || '';
    const password = (document.getElementById('password') || {}).value || '';

    if (!email || !password) {
      if (msg) msg.textContent = 'Enter email and password';
      return;
    }

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ensures session cookies work
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Save userId safely
        if (data.user?.id) {
          localStorage.setItem('userId', data.user.id);
        } else {
          console.warn('No userId returned from login response');
          localStorage.removeItem('userId'); // clear any previous ID
        }

        // Redirect to intended page
        window.location.href = data.redirect || '/quest_user.html';
      } else {
        // Login failed: show error message
        if (msg) msg.textContent = data.error || 'Login failed';
        localStorage.removeItem('userId'); // clear previous ID
      }
    } catch (err) {
      console.error('Login error:', err);
      if (msg) msg.textContent = 'Network error. Is the backend running?';
      localStorage.removeItem('userId');
    }
  });
});
