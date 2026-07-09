(function () {
  const postsContainer = document.getElementById('posts-container');
  const searchInput = document.getElementById('search-input');
  const categorySelect = document.getElementById('category-select');
  const searchBtn = document.getElementById('search-btn');

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (err) {
      return '';
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) return;
      const data = await res.json();
      (data.categories || []).forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categorySelect.appendChild(opt);
      });
    } catch (err) {
      // Category filter is a nice-to-have; fail silently if it can't load.
      console.error('Failed to load categories', err);
    }
  }

  function renderPosts(posts) {
    if (!posts.length) {
      postsContainer.innerHTML = '<p class="empty-state">No posts found.</p>';
      return;
    }

    const items = posts
      .map((post) => {
        const category = post.category
          ? `<span class="category-tag">${escapeHtml(post.category)}</span>`
          : '';
        return `
          <li>
            <div class="post-meta">${formatDate(post.createdAt)}${category}</div>
            <h2><a href="/post.html?slug=${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a></h2>
            ${post.excerpt ? `<p class="post-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
            <a class="read-more" href="/post.html?slug=${encodeURIComponent(post.slug)}">Read more &rarr;</a>
          </li>
        `;
      })
      .join('');

    postsContainer.innerHTML = `<ul class="post-list">${items}</ul>`;
  }

  async function loadPosts() {
    postsContainer.innerHTML = '<p class="loading-state">Loading posts...</p>';

    const params = new URLSearchParams();
    const q = searchInput.value.trim();
    const category = categorySelect.value;
    if (q) params.set('q', q);
    if (category) params.set('category', category);

    try {
      const res = await fetch('/api/posts?' + params.toString());
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      renderPosts(data.posts || []);
    } catch (err) {
      console.error(err);
      postsContainer.innerHTML = '<p class="error-state">Could not load posts. Please try again later.</p>';
    }
  }

  searchBtn.addEventListener('click', loadPosts);
  categorySelect.addEventListener('change', loadPosts);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loadPosts();
    }
  });

  loadCategories();
  loadPosts();
})();
