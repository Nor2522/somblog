// Shared helpers used by main.js and post.js.
window.SomBlog = (function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  // Somali relative time, e.g. "3 maalmood kahor", "2 bilood kahor".
  function relativeTime(dateStr) {
    const then = new Date(dateStr).getTime();
    if (Number.isNaN(then)) return '';
    const now = Date.now();
    const diffSec = Math.max(0, Math.floor((now - then) / 1000));

    if (diffSec < 60) return 'Hadda';
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return mins === 1 ? '1 daqiiqo kahor' : `${mins} daqiiqo kahor`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours === 1 ? '1 saac kahor' : `${hours} saac kahor`;
    const days = Math.floor(hours / 24);
    if (days < 30) return days === 1 ? '1 maalin kahor' : `${days} maalmood kahor`;
    const months = Math.floor(days / 30);
    if (months < 12) return months === 1 ? '1 bil kahor' : `${months} bilood kahor`;
    const years = Math.floor(months / 12);
    return years === 1 ? '1 sano kahor' : `${years} sano kahor`;
  }

  // Posts carry a server-computed `readingMinutes` field; this just formats it.
  function formatReadingMinutes(minutes) {
    const m = Number(minutes) || 1;
    return m === 1 ? '1 daqiiqo' : `${m} daqiiqo`;
  }

  // ---- small inline icon set (no external icon font needed) ----
  const icons = {
    calendar:
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    clock:
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    book:
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    share:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
    arrowUp:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    sun:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  };

  function renderPostCard(post) {
    const img = post.coverImage
      ? `<img class="card-image" src="${escapeHtml(post.coverImage)}" alt="" loading="lazy">`
      : '';
    const category = post.category
      ? `<span class="category-label">${escapeHtml(post.category)}</span>`
      : '';
    return `
      <article class="post-card">
        ${img}
        <div class="card-body">
          <div class="card-meta">${category}<span class="meta-item">${icons.calendar} ${relativeTime(post.createdAt)}</span></div>
          <h3><a href="post.html?slug=${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a></h3>
          ${post.excerpt ? `<p class="card-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
          <div class="card-footer">
            <a class="read-link" href="post.html?slug=${encodeURIComponent(post.slug)}">${icons.book} Akhri</a>
            <span class="meta-item">${icons.clock} ${formatReadingMinutes(post.readingMinutes)}</span>
          </div>
        </div>
      </article>
    `;
  }

  return { escapeHtml, relativeTime, formatReadingMinutes, renderPostCard, icons };
})();
