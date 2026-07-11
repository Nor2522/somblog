(function () {
  const { relativeTime, formatReadingMinutes, renderPostCard, icons } = window.SomBlog;

  const heroContainer = document.getElementById('hero-container');
  const postsContainer = document.getElementById('posts-container');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const categoryPillsEl = document.getElementById('category-pills');
  const backToTopBtn = document.getElementById('back-to-top');

  const RECENT_COUNT = 6;
  const state = { q: '', category: '' };
  let heroTimer = null;

  // ---------- hero carousel ----------

  function renderHero(posts) {
    if (!posts.length) {
      heroContainer.innerHTML = '';
      return;
    }

    const slides = posts
      .map((post, i) => {
        const category = post.category ? `<span class="category-label">${window.SomBlog.escapeHtml(post.category)}</span>` : '';
        return `
        <div class="hero-slide${i === 0 ? ' active' : ''}" data-index="${i}">
          ${post.coverImage ? `<img src="${window.SomBlog.escapeHtml(post.coverImage)}" alt="" loading="lazy">` : ''}
          <div class="hero-body">
            <div class="hero-meta">${category}<span class="meta-item">${icons.calendar} ${relativeTime(post.createdAt)}</span><span class="meta-item">${icons.clock} ${formatReadingMinutes(post.readingMinutes)}</span></div>
            <h2><a href="post.html?slug=${encodeURIComponent(post.slug)}">${window.SomBlog.escapeHtml(post.title)}</a></h2>
            ${post.excerpt ? `<p class="hero-excerpt">${window.SomBlog.escapeHtml(post.excerpt)}</p>` : ''}
          </div>
        </div>
      `;
      })
      .join('');

    const dots = posts
      .map((_, i) => `<button type="button" data-index="${i}" class="${i === 0 ? 'active' : ''}" aria-label="Slide ${i + 1}"></button>`)
      .join('');

    heroContainer.innerHTML = `
      <div class="hero">
        ${slides}
        ${posts.length > 1 ? `<div class="hero-dots">${dots}</div>` : ''}
      </div>
    `;

    if (posts.length > 1) {
      let current = 0;
      const slideEls = heroContainer.querySelectorAll('.hero-slide');
      const dotEls = heroContainer.querySelectorAll('.hero-dots button');

      function goTo(index) {
        current = index;
        slideEls.forEach((el, i) => el.classList.toggle('active', i === index));
        dotEls.forEach((el, i) => el.classList.toggle('active', i === index));
      }

      dotEls.forEach((dot) => {
        dot.addEventListener('click', () => {
          goTo(Number(dot.dataset.index));
          restartTimer();
        });
      });

      function restartTimer() {
        if (heroTimer) clearInterval(heroTimer);
        heroTimer = setInterval(() => goTo((current + 1) % posts.length), 5500);
      }

      const heroEl = heroContainer.querySelector('.hero');
      heroEl.addEventListener('mouseenter', () => heroTimer && clearInterval(heroTimer));
      heroEl.addEventListener('mouseleave', restartTimer);
      restartTimer();
    }
  }

  async function loadHero() {
    try {
      const res = await fetch('/api/posts?limit=5');
      if (!res.ok) return;
      const data = await res.json();
      renderHero(data.posts || []);
    } catch (err) {
      console.error('Failed to load hero posts', err);
    }
  }

  // ---------- category pills ----------

  async function loadCategories() {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) return;
      const data = await res.json();
      (data.categories || []).forEach((cat) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = cat;
        btn.dataset.category = cat;
        categoryPillsEl.appendChild(btn);
      });
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  }

  categoryPillsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    categoryPillsEl.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.category = btn.dataset.category || '';
    loadRecent();
  });

  // ---------- recent posts grid (no pagination - see articles.html for that) ----------

  async function loadRecent() {
    postsContainer.innerHTML = '<p class="loading-state">Soo raraya maqaallada...</p>';

    const params = new URLSearchParams();
    params.set('limit', RECENT_COUNT);
    if (state.q) params.set('q', state.q);
    if (state.category) params.set('category', state.category);

    try {
      const res = await fetch('/api/posts?' + params.toString());
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      const posts = data.posts || [];

      postsContainer.innerHTML = posts.length
        ? posts.map(renderPostCard).join('')
        : '<p class="empty-state">Wax maqaallo ah lama helin.</p>';
    } catch (err) {
      console.error(err);
      postsContainer.innerHTML = '<p class="error-state">Lama soo rarin karin maqaallada. Fadlan mar kale isku day.</p>';
    }
  }

  searchBtn.addEventListener('click', () => {
    state.q = searchInput.value.trim();
    loadRecent();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      state.q = searchInput.value.trim();
      loadRecent();
    }
  });

  // ---------- back to top ----------

  window.addEventListener('scroll', () => {
    backToTopBtn.classList.toggle('visible', window.scrollY > 400);
  });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  if (icons) backToTopBtn.innerHTML = icons.arrowUp;

  loadHero();
  loadCategories();
  loadRecent();
})();
