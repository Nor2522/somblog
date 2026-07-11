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

  function ratedKey(slug) {
    return 'somblog-rated-' + slug;
  }

  function starsMarkup(idPrefix, filledCount, interactive) {
    let html = `<div class="rating-stars${interactive ? ' interactive' : ''}" id="${idPrefix}">`;
    for (let i = 1; i <= 5; i++) {
      html += `<button type="button" data-value="${i}" class="${i <= filledCount ? 'filled' : ''}" ${interactive ? '' : 'disabled'} aria-label="${i} stars">&#9733;</button>`;
    }
    html += '</div>';
    return html;
  }

  function summaryText(average, count) {
    if (!count) return 'Wali lama qiimeynin maqaalkan - noqo qofka ugu horreeya!';
    return `${average.toFixed(1)} / 5 - ${count} ${count === 1 ? 'qof ayaa' : 'qof ayaa'} qiimeeyay`;
  }

  function showThankYouModal(chosenRating) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-emoji">&#128075;</div>
        <h3>Aad ayaad noo dhiirrigelisay!</h3>
        ${starsMarkup('modal-stars', chosenRating, false)}
        <p>Ma jeclaan lahayd inaad nala wadaagto fikirkaaga WhatsApp-ka?</p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" id="modal-no">Hadda maya</button>
          <button type="button" class="btn" id="modal-yes">Haa</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.getElementById('modal-no').addEventListener('click', close);
    document.getElementById('modal-yes').addEventListener('click', () => {
      const number = window.SomBlog.config.whatsappNumber;
      const message = `Salaan! Waxaan maqaalkan "${document.title.replace(' - SomBlog', '')}" ku siiyay ${chosenRating}/5 xiddigood. Waxaan rabaa inaan idinla wadaago fikirkayga.`;
      window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
      close();
    });
  }

  function renderRating(post) {
    const container = document.getElementById('rating-container');
    if (!container) return;

    const count = post.ratingCount || 0;
    const average = count > 0 ? post.ratingSum / count : 0;
    const alreadyRatedValue = (() => {
      try {
        return localStorage.getItem(ratedKey(post.slug));
      } catch (err) {
        return null;
      }
    })();

    if (alreadyRatedValue) {
      container.innerHTML = `
        <section class="rating-section">
          <h3>Waad ku mahadsan tahay qiimeyntaada!</h3>
          ${starsMarkup('rating-stars', Number(alreadyRatedValue), false)}
          <p class="rating-summary">${summaryText(average, count)}</p>
        </section>
      `;
      return;
    }

    container.innerHTML = `
      <section class="rating-section">
        <h3>Akhriste, waad qiimeyn kartaa maqaalkan</h3>
        ${starsMarkup('rating-stars', 0, true)}
        <p class="rating-summary" id="rating-summary">${summaryText(average, count)}</p>
      </section>
    `;

    const starsEl = document.getElementById('rating-stars');
    const buttons = Array.from(starsEl.querySelectorAll('button'));
    let submitting = false;

    function paint(upTo) {
      buttons.forEach((btn, i) => btn.classList.toggle('filled', i < upTo));
    }

    buttons.forEach((btn) => {
      btn.addEventListener('mouseenter', () => paint(Number(btn.dataset.value)));
      btn.addEventListener('focus', () => paint(Number(btn.dataset.value)));
    });
    starsEl.addEventListener('mouseleave', () => paint(0));

    buttons.forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (submitting) return;
        submitting = true;
        const value = Number(btn.dataset.value);

        try {
          const res = await fetch(`/api/posts/${encodeURIComponent(post.slug)}/rate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: value }),
          });

          if (!res.ok) throw new Error('Rating failed');

          const data = await res.json();

          try {
            localStorage.setItem(ratedKey(post.slug), String(value));
          } catch (err) {
            // localStorage may be unavailable - the rating still went
            // through server-side, it just won't be remembered locally.
          }

          document.getElementById('rating-summary').textContent = summaryText(data.average, data.count);
          paint(value);
          buttons.forEach((b) => (b.disabled = true));
          showThankYouModal(value);
        } catch (err) {
          console.error('Failed to submit rating', err);
          submitting = false;
        }
      });
    });
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
          <div id="rating-container"></div>
          <div id="related-container"></div>
        </article>
      `;

      wireShareButton(post);
      renderRating(post);

      const relatedHtml = await loadRelated(post);
      document.getElementById('related-container').innerHTML = relatedHtml;
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p class="error-state">Lama soo rarin karin maqaalkan. Fadlan mar kale isku day.</p>';
    }
  }

  loadPost();
})();
