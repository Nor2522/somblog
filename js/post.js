(function () {
  const container = document.getElementById('post-container');

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

  // Content is stored as plain text. We escape it for safety, then turn
  // blank-line-separated blocks into paragraphs and single line breaks
  // into <br>, so admins don't need to know any markup to write a post.
  function renderContent(content) {
    const escaped = escapeHtml(content);
    return escaped
      .split(/\n\s*\n/)
      .map((block) => `<p>${block.trim().replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  function getSlug() {
    const params = new URLSearchParams(window.location.search);
    return params.get('slug');
  }

  async function loadPost() {
    const slug = getSlug();

    if (!slug) {
      container.innerHTML = '<p class="error-state">No post specified.</p>';
      return;
    }

    try {
      const res = await fetch('/api/posts/' + encodeURIComponent(slug));

      if (res.status === 404) {
        container.innerHTML = '<p class="error-state">This post could not be found.</p>';
        return;
      }

      if (!res.ok) throw new Error('Request failed');

      const data = await res.json();
      const post = data.post;

      document.title = post.title + ' - SomBlog';

      const category = post.category
        ? `<span class="category-tag">${escapeHtml(post.category)}</span>`
        : '';

      container.innerHTML = `
        <article>
          <header class="post-header">
            <div class="post-meta">${formatDate(post.createdAt)}${category}</div>
            <h1>${escapeHtml(post.title)}</h1>
          </header>
          ${post.coverImage ? `<img class="post-cover" src="${escapeHtml(post.coverImage)}" alt="">` : ''}
          <div class="post-content">${renderContent(post.content)}</div>
        </article>
      `;
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p class="error-state">Could not load this post. Please try again later.</p>';
    }
  }

  loadPost();
})();
