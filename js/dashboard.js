(function () {
  const tableContainer = document.getElementById('table-container');
  const editorPanel = document.getElementById('editor-panel');
  const editorTitle = document.getElementById('editor-title');
  const postForm = document.getElementById('post-form');
  const editorMsg = document.getElementById('editor-msg');
  const newPostBtn = document.getElementById('new-post-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const logoutLink = document.getElementById('logout-link');
  const adminUsernameEl = document.getElementById('admin-username');

  const postIdField = document.getElementById('post-id');
  const titleField = document.getElementById('title');
  const categoryField = document.getElementById('category');
  const tagsField = document.getElementById('tags');
  const excerptField = document.getElementById('excerpt');
  const coverImageField = document.getElementById('coverImage');
  const contentField = document.getElementById('content');
  const publishedField = document.getElementById('published');

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

  function showEditorMsg(text, type) {
    editorMsg.textContent = text;
    editorMsg.className = 'form-msg ' + type;
  }

  function resetForm() {
    postForm.reset();
    postIdField.value = '';
    publishedField.checked = true;
    editorMsg.textContent = '';
    editorMsg.className = '';
  }

  function openEditorForCreate() {
    resetForm();
    editorTitle.textContent = 'New post';
    editorPanel.classList.remove('hidden');
    titleField.focus();
  }

  function closeEditor() {
    editorPanel.classList.add('hidden');
    resetForm();
  }

  // ---------- auth ----------

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (!data.authenticated) {
        window.location.href = '/admin/login.html';
        return;
      }

      adminUsernameEl.textContent = data.username || '';
    } catch (err) {
      window.location.href = '/admin/login.html';
    }
  }

  logoutLink.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/admin/login.html';
    }
  });

  // ---------- list ----------

  async function loadPosts() {
    tableContainer.innerHTML = '<p class="loading-state">Loading posts...</p>';

    try {
      const res = await fetch('/api/posts');

      if (res.status === 401) {
        window.location.href = '/admin/login.html';
        return;
      }

      if (!res.ok) throw new Error('Request failed');

      const data = await res.json();
      renderTable(data.posts || []);
    } catch (err) {
      console.error(err);
      tableContainer.innerHTML = '<p class="error-state">Could not load posts. Please try again.</p>';
    }
  }

  function renderTable(posts) {
    if (!posts.length) {
      tableContainer.innerHTML = '<p class="empty-state">No posts yet. Click "New post" to write your first one.</p>';
      return;
    }

    const rows = posts
      .map((post) => {
        const statusClass = post.published ? 'published' : 'draft';
        const statusText = post.published ? 'Published' : 'Draft';
        return `
          <tr data-id="${post._id}">
            <td>${escapeHtml(post.title)}</td>
            <td>${escapeHtml(post.category || '-')}</td>
            <td><span class="status-pill ${statusClass}">${statusText}</span></td>
            <td>${formatDate(post.createdAt)}</td>
            <td>
              <div class="row-actions">
                <button type="button" class="edit-btn" data-id="${post._id}">Edit</button>
                <button type="button" class="delete delete-btn" data-id="${post._id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    tableContainer.innerHTML = `
      <table class="post-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    tableContainer.querySelectorAll('.edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => openEditorForEdit(btn.dataset.id));
    });

    tableContainer.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', () => deletePost(btn.dataset.id));
    });
  }

  // ---------- edit ----------

  async function openEditorForEdit(id) {
    resetForm();
    editorTitle.textContent = 'Edit post';
    editorPanel.classList.remove('hidden');

    try {
      const res = await fetch('/api/posts/' + encodeURIComponent(id));
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      const post = data.post;

      postIdField.value = post._id;
      titleField.value = post.title || '';
      categoryField.value = post.category || '';
      tagsField.value = (post.tags || []).join(', ');
      excerptField.value = post.excerpt || '';
      coverImageField.value = post.coverImage || '';
      contentField.value = post.content || '';
      publishedField.checked = !!post.published;

      window.scrollTo({ top: editorPanel.offsetTop - 20, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      showEditorMsg('Could not load this post for editing.', 'error');
    }
  }

  // ---------- delete ----------

  async function deletePost(id) {
    if (!confirm('Delete this post? This cannot be undone.')) return;

    try {
      const res = await fetch('/api/posts/' + encodeURIComponent(id), { method: 'DELETE' });
      if (!res.ok) throw new Error('Request failed');
      loadPosts();
    } catch (err) {
      console.error(err);
      alert('Could not delete this post. Please try again.');
    }
  }

  // ---------- create / update ----------

  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = postIdField.value;
    const payload = {
      title: titleField.value.trim(),
      category: categoryField.value.trim(),
      tags: tagsField.value,
      excerpt: excerptField.value.trim(),
      coverImage: coverImageField.value.trim(),
      content: contentField.value,
      published: publishedField.checked,
    };

    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    showEditorMsg('Saving...', 'success');

    try {
      const res = await fetch(id ? '/api/posts/' + encodeURIComponent(id) : '/api/posts', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        showEditorMsg(data.error || 'Could not save this post.', 'error');
        saveBtn.disabled = false;
        return;
      }

      closeEditor();
      loadPosts();
    } catch (err) {
      console.error(err);
      showEditorMsg('Could not reach the server. Please try again.', 'error');
      saveBtn.disabled = false;
    } finally {
      saveBtn.disabled = false;
    }
  });

  newPostBtn.addEventListener('click', openEditorForCreate);
  cancelBtn.addEventListener('click', closeEditor);

  checkAuth().then(loadPosts);
})();
