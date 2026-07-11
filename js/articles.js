(function () {
  const { renderPostCard, icons } = window.SomBlog;

  const postsContainer = document.getElementById('posts-container');
  const loadMoreRow = document.getElementById('load-more-row');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const categoryPillsEl = document.getElementById('category-pills');
  const backToTopBtn = document.getElementById('back-to-top');

  const PAGE_SIZE = 6;
  const state = { q: '', category: '', skip: 0, total: 0 };

  // Deep-link support: /articles.html?category=Wararka
  const initialParams = new URLSearchParams(window.location.search);
  if (initialParams.get('category')) state.category = initialParams.get('category');
  if (initialParams.get('q')) {
    state.q = initialParams.get('q');
    searchInput.value = state.q;
  }

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
        if (cat === state.category) {
          categoryPillsEl.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
        }
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
    resetAndLoad();
  });

  function renderLoadMore() {
    const remaining = state.total - state.skip;
    if (remaining <= 0) {
      loadMoreRow.innerHTML = '';
      return;
    }
    loadMoreRow.innerHTML = `<button type="button" id="load-more-btn">${icons.book} Soo rar in badan (${remaining} kale)</button>`;
    document.getElementById('load-more-btn').addEventListener('click', loadMore);
  }

  async function fetchPosts(skip) {
    const params = new URLSearchParams();
    params.set('limit', PAGE_SIZE);
    params.set('skip', skip);
    if (state.q) params.set('q', state.q);
    if (state.category) params.set('category', state.category);

    const res = await fetch('/api/posts?' + params.toString());
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  }

  async function resetAndLoad() {
    state.skip = 0;
    postsContainer.innerHTML = '<p class="loading-state">Soo raraya maqaallada...</p>';
    loadMoreRow.innerHTML = '';

    try {
      const data = await fetchPosts(0);
      state.total = data.total || 0;
      const posts = data.posts || [];
      state.skip = posts.length;

      postsContainer.innerHTML = posts.length
        ? posts.map(renderPostCard).join('')
        : '<p class="empty-state">Wax maqaallo ah lama helin.</p>';

      renderLoadMore();
    } catch (err) {
      console.error(err);
      postsContainer.innerHTML = '<p class="error-state">Lama soo rarin karin maqaallada. Fadlan mar kale isku day.</p>';
    }
  }

  async function loadMore() {
    const btn = document.getElementById('load-more-btn');
    if (btn) btn.disabled = true;

    try {
      const data = await fetchPosts(state.skip);
      const posts = data.posts || [];
      state.total = data.total || state.total;
      state.skip += posts.length;
      postsContainer.insertAdjacentHTML('beforeend', posts.map(renderPostCard).join(''));
      renderLoadMore();
    } catch (err) {
      console.error(err);
      if (btn) btn.disabled = false;
    }
  }

  searchBtn.addEventListener('click', () => {
    state.q = searchInput.value.trim();
    resetAndLoad();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      state.q = searchInput.value.trim();
      resetAndLoad();
    }
  });

  window.addEventListener('scroll', () => {
    backToTopBtn.classList.toggle('visible', window.scrollY > 400);
  });
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  if (icons) backToTopBtn.innerHTML = icons.arrowUp;

  loadCategories();
  resetAndLoad();
})();
