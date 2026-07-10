(function () {
  const { escapeHtml, relativeTime, formatReadingMinutes, renderPostCard, icons } = window.SomBlog;

  const container = document.getElementById('post-container');
  const backToTopBtn = document.getElementById('back-to-top');

  if (icons) backToTopBtn.innerHTML = icons.arrowUp;

  window.addEventListener('scroll', () => {
    backToTopBtn.classList.toggle('visible', window.scrollY > 400);
  });
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

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

  async function loadRelated(post) {
    if (!post.category) return '';

    try {
      const res = await fetch('/api/posts?category=' + encodeURIComponent(post.category) + '&limit=4');
      if (!res.ok) return '';
      const data = await res.json();
      const related = (data.posts || []).filter((p) => p.slug !== post.slug).slice(0, 3);

      if (!related.length) return '';

      return `
        <section class="related-section">
          <h2>Maqaallo laga yaabo inaad ka hesho</h2>
          <div class="related-grid">${related.map(renderPostCard).join('')}</div>
        </section>
      `;
    } catch (err) {
      console.error('Failed to load related posts', err);
      return '';
    }
  }

  function wireShareButton(post) {
    const btn = document.getElementById('share-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const url = window.location.href;

      if (navigator.share) {
        try {
          await navigator.share({ title: post.title, text: post.excerpt || '', url });
        } catch (err) {
          // Sharing was cancelled or failed silently - nothing to do.
        }
        return;
      }

      try {
        await navigator.clipboard.writeText(url);
        const original = btn.innerHTML;
        btn.innerHTML = 'Link-ga waa la koobiyeeyay!';
        setTimeout(() => {
          btn.innerHTML = original;
        }, 2000);
      } catch (err) {
        console.error('Could not copy link', err);
      }
    });
  }

  async function loadPost() {
    const slug = getSlug();

    if (!slug) {
      container.innerHTML = '<p class="error-state">Maqaal lama sheegin.</p>';
      return;
    }

    try {
      const res = await fetch('/api/posts/' + encodeURIComponent(slug));

      if (res.status === 404) {
        container.innerHTML = '<p class="error-state">Maqaalkan lama helin.</p>';
        return;
      }

      if (!res.ok) throw new Error('Request failed');

      const data = await res.json();
      const post = data.post;

      document.title = post.title + ' - SomBlog';

      const category = post.category
        ? `<span class="category-pill">${escapeHtml(post.category)}</span>`
        : '';

      container.innerHTML = `
        <article class="post-article">
          <header class="post-header">
            ${category}
            <h1>${escapeHtml(post.title)}</h1>
            <div class="post-meta-row">
              <span class="meta-item">${icons.calendar} ${relativeTime(post.createdAt)}</span>
              <span class="meta-item">${icons.clock} ${formatReadingMinutes(post.readingMinutes)}</span>
            </div>
          </header>
          ${post.coverImage ? `<img class="post-cover" src="${escapeHtml(post.coverImage)}" alt="">` : ''}
          <div class="post-content">${renderContent(post.content)}</div>
          <div class="post-footer-actions">
            <button class="share-btn" id="share-btn" type="button">${icons.share} La wadaag</button>
          </div>
          <div id="related-container"></div>
        </article>
      `;

      wireShareButton(post);

      const relatedHtml = await loadRelated(post);
      document.getElementById('related-container').innerHTML = relatedHtml;
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p class="error-state">Lama soo rarin karin maqaalkan. Fadlan mar kale isku day.</p>';
    }
  }

  loadPost();
})();
