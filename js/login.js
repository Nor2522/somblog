(function () {
  const form = document.getElementById('login-form');
  const msgEl = document.getElementById('form-msg');

  function showMsg(text, type) {
    msgEl.textContent = text;
    msgEl.className = 'form-msg ' + type;
  }

  // If already logged in, skip straight to the dashboard.
  fetch('/api/auth/me')
    .then((res) => res.json())
    .then((data) => {
      if (data.authenticated) {
        window.location.href = '/admin/dashboard.html';
      }
    })
    .catch(() => {});

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msgEl.textContent = '';
    msgEl.className = '';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showMsg(data.error || 'Login failed. Please try again.', 'error');
        submitBtn.disabled = false;
        return;
      }

      window.location.href = '/admin/dashboard.html';
    } catch (err) {
      console.error(err);
      showMsg('Could not reach the server. Please try again.', 'error');
      submitBtn.disabled = false;
    }
  });
})();
