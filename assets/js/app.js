window.App = {
  state: {
    selectedCategory: null,
    modalMode: '',
    editingId: ''
  },

  init() {
    this.bindEvents();
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((error) => {
          console.warn('Service worker registration failed.', error);
        });
      });
    }
    this.render();
  },

  getSubcategories() {
    return Storage.load('bookmarks-subcategories', []);
  },

  getBookmarks() {
    return Storage.load('bookmarks-links', []);
  },

  save(key, value) {
    if (!Storage.save(key, value)) {
      alert('जानकारी सेव नहीं हो पाई। कृपया browser storage की जगह जाँचें और फिर कोशिश करें।');
      return false;
    }
    return true;
  },

  bindEvents() {
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const openedBookmark = target.closest('[data-open-bookmark]');
      if (openedBookmark && !this.saveRecentSite(openedBookmark.dataset.openBookmark)) return;

      const categoryButton = target.closest('[data-open-category]');
      if (categoryButton) {
        this.state.selectedCategory = categoryButton.dataset.openCategory;
        this.render();
        return;
      }

      if (target.closest('[data-home]')) {
        this.state.selectedCategory = null;
        this.render();
        return;
      }

      const addSubcategory = target.closest('[data-add-subcategory]');
      if (addSubcategory) {
        this.openModal('subcategory', '', addSubcategory.dataset.addSubcategory);
        return;
      }

      const addBookmark = target.closest('[data-add-bookmark]');
      if (addBookmark) {
        this.openModal('bookmark', '', addBookmark.dataset.addBookmark);
        return;
      }

      const editSubcategory = target.closest('[data-edit-subcategory]');
      if (editSubcategory) {
        this.openModal('subcategory', editSubcategory.dataset.editSubcategory);
        return;
      }

      const editBookmark = target.closest('[data-edit-bookmark]');
      if (editBookmark) {
        this.openModal('bookmark', editBookmark.dataset.editBookmark);
        return;
      }

      const deleteSubcategory = target.closest('[data-delete-subcategory]');
      if (deleteSubcategory) {
        this.removeSubcategory(deleteSubcategory.dataset.deleteSubcategory);
        return;
      }

      const deleteBookmark = target.closest('[data-delete-bookmark]');
      if (deleteBookmark) {
        this.removeBookmark(deleteBookmark.dataset.deleteBookmark);
        return;
      }

      if (target.closest('[data-close-modal]')) this.closeModal();
    });

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || form.id !== 'bookmark-form') return;
      event.preventDefault();
      this.submitModal(form);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.closeModal();
    });
  },

  render() {
    const root = document.getElementById('app-content');
    if (!root) return;

    const category = (window.appConfig.categories || []).find(
      (item) => item.id === this.state.selectedCategory
    );

    root.innerHTML = category ? this.renderCategory(category) : this.renderHome();
  },

  renderHome() {
    const categories = window.appConfig.categories || [];
    const subcategories = this.getSubcategories();
    const bookmarks = this.getBookmarks();
    const recentSites = Storage.getRecentSites()
      .map((id) => bookmarks.find((bookmark) => bookmark.id === id))
      .filter(Boolean)
      .slice(0, 3);

    return `
      <section class="recent-section" aria-labelledby="recent-heading">
        <div class="recent-heading">
          <div>
            <p class="eyebrow">QUICK ACCESS</p>
            <h2 id="recent-heading">हाल ही में खोली गई साइटें</h2>
          </div>
          ${recentSites.length ? '<span class="recent-count">हाल की 3</span>' : ''}
        </div>
        ${recentSites.length ? `
          <div class="recent-grid">
            ${recentSites.map((bookmark) => this.renderRecentBookmark(bookmark, subcategories)).join('')}
          </div>
        ` : `
          <p class="recent-empty">आपके खोले गए लिंक यहाँ दिखेंगे।</p>
        `}
      </section>
      <section class="welcome">
        <p class="eyebrow">आपका निजी लिंक संग्रह</p>
        <h2>नमस्कार! आज कौन-सी वेबसाइट खोलनी है?</h2>
        <p>अपनी श्रेणी चुनें। हर श्रेणी में आप अपनी उप-श्रेणी और वेबसाइट लिंक खुद जोड़ सकते हैं।</p>
      </section>
      <section class="category-grid" aria-label="वेबसाइट श्रेणियाँ">
        ${categories.map((category) => `
          <button class="category-card" type="button" data-open-category="${category.id}">
            <span class="category-photo">
              <img src="${this.escapeAttribute(category.image)}" alt="" loading="lazy" decoding="async">
            </span>
            <span class="category-copy">
              <strong>${this.escape(category.title)}</strong>
              <small>${subcategories.filter((item) => item.categoryId === category.id).length} उप-श्रेणियाँ</small>
            </span>
            <span class="arrow" aria-hidden="true">›</span>
          </button>
        `).join('')}
      </section>
      <p class="storage-note">आपके जोड़े गए लिंक इसी browser और device में सेव रहेंगे।</p>
    `;
  },

  renderCategory(category) {
    const subcategories = this.getSubcategories().filter((item) => item.categoryId === category.id);
    const bookmarks = this.getBookmarks();
    return `
      <section class="category-page">
        <div class="page-heading">
          <button class="back-button" type="button" data-home aria-label="मुख्य श्रेणियों पर वापस जाएँ">‹</button>
          <span class="heading-photo">
            <img src="${this.escapeAttribute(category.image)}" alt="" decoding="async">
          </span>
          <div>
            <p class="eyebrow">मुख्य श्रेणी</p>
            <h2>${this.escape(category.title)}</h2>
          </div>
          <button class="primary-btn" type="button" data-add-subcategory="${category.id}">＋ उप-श्रेणी</button>
        </div>
        ${subcategories.length ? `
          <div class="subcategory-list">
            ${subcategories.map((subcategory) => {
              const items = bookmarks.filter((bookmark) => bookmark.subcategoryId === subcategory.id);
              return `
                <section class="subcategory-card">
                  <div class="subcategory-heading">
                    <h3>${this.escape(subcategory.name)}</h3>
                    <div class="button-group">
                      <button class="text-button" type="button" data-edit-subcategory="${subcategory.id}">बदलें</button>
                      <button class="text-button danger" type="button" data-delete-subcategory="${subcategory.id}">हटाएँ</button>
                      <button class="secondary-btn" type="button" data-add-bookmark="${subcategory.id}">＋ लिंक जोड़ें</button>
                    </div>
                  </div>
                  ${items.length ? `
                    <div class="bookmark-list">
                      ${items.map((bookmark) => this.renderBookmark(bookmark)).join('')}
                    </div>
                  ` : '<p class="empty-message">अभी कोई लिंक नहीं है। अपना पहला लिंक जोड़ें।</p>'}
                </section>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <span class="empty-icon">${this.icon('folder')}</span>
            <h3>यह श्रेणी अभी खाली है</h3>
            <p>अपनी जरूरत के अनुसार उप-श्रेणी बनाएँ, फिर उसमें वेबसाइट लिंक जोड़ें।</p>
            <button class="primary-btn" type="button" data-add-subcategory="${category.id}">पहली उप-श्रेणी जोड़ें</button>
          </div>
        `}
      </section>
    `;
  },

  renderBookmark(bookmark) {
    return `
      <article class="bookmark">
        <div class="bookmark-mark">${this.icon('link')}</div>
        <a class="bookmark-link" href="${this.escapeAttribute(bookmark.url)}" target="_blank" rel="noopener noreferrer" data-open-bookmark="${this.escapeAttribute(bookmark.id)}">
          <strong>${this.escape(bookmark.name)}</strong>
          <small>${this.escape(bookmark.url)}</small>
        </a>
        <div class="button-group bookmark-actions">
          <button class="text-button" type="button" data-edit-bookmark="${bookmark.id}">बदलें</button>
          <button class="text-button danger" type="button" data-delete-bookmark="${bookmark.id}">हटाएँ</button>
        </div>
      </article>
    `;
  },

  renderRecentBookmark(bookmark, subcategories) {
    const subcategory = subcategories.find((item) => item.id === bookmark.subcategoryId);
    const category = (window.appConfig.categories || []).find((item) => item.id === subcategory?.categoryId);
    const context = [category?.title, subcategory?.name].filter(Boolean).join(' · ');
    return `
      <a class="recent-card" href="${this.escapeAttribute(bookmark.url)}" target="_blank" rel="noopener noreferrer" data-open-bookmark="${this.escapeAttribute(bookmark.id)}">
        <span class="recent-icon">${this.icon('link')}</span>
        <span class="recent-copy">
          <strong>${this.escape(bookmark.name)}</strong>
          <small>${this.escape(context || bookmark.url)}</small>
        </span>
        <span class="recent-arrow" aria-hidden="true">↗</span>
      </a>
    `;
  },

  saveRecentSite(siteId) {
    if (Storage.addRecentSite(siteId)) return true;
    alert('हाल ही में खोली गई साइट सेव नहीं हो पाई। Browser storage की जगह जाँचें।');
    return false;
  },

  openModal(mode, id = '', categoryId = '') {
    this.state.modalMode = mode;
    this.state.editingId = id;
    const subcategories = this.getSubcategories();
    const subcategory = subcategories.find((item) => item.id === id);
    const bookmark = this.getBookmarks().find((item) => item.id === id);
    const selectedCategory = categoryId || (subcategory && subcategory.categoryId) || '';
    const selectedSubcategory = categoryId || (bookmark && bookmark.subcategoryId) || '';
    const title = mode === 'subcategory'
      ? (subcategory ? 'उप-श्रेणी का नाम बदलें' : 'नई उप-श्रेणी')
      : (bookmark ? 'लिंक का विवरण बदलें' : 'नया वेबसाइट लिंक');

    const fields = mode === 'subcategory' ? `
      <label>उप-श्रेणी का नाम
        <input name="name" type="text" maxlength="80" placeholder="जैसे: नक्शा पोर्टल" value="${this.escapeAttribute(subcategory ? subcategory.name : '')}" required autofocus>
      </label>
      <input type="hidden" name="categoryId" value="${this.escapeAttribute(subcategory ? subcategory.categoryId : selectedCategory)}">
    ` : `
      <label>लिंक का नाम
        <input name="name" type="text" maxlength="100" placeholder="जैसे: भूमि रिकॉर्ड वेबसाइट" value="${this.escapeAttribute(bookmark ? bookmark.name : '')}" required autofocus>
      </label>
      <label>वेबसाइट का पता
        <input name="url" type="url" inputmode="url" placeholder="https://example.com" value="${this.escapeAttribute(bookmark ? bookmark.url : '')}" required>
      </label>
      <input type="hidden" name="subcategoryId" value="${this.escapeAttribute(selectedSubcategory)}">
    `;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="app-modal">
        <section class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-header">
            <h2 id="modal-title">${title}</h2>
            <button class="icon-button" type="button" data-close-modal aria-label="बंद करें">×</button>
          </div>
          <form id="bookmark-form">
            ${fields}
            <div class="modal-actions">
              <button class="secondary-btn" type="button" data-close-modal>रद्द करें</button>
              <button class="primary-btn" type="submit">सेव करें</button>
            </div>
          </form>
        </section>
      </div>
    `);
    const firstInput = document.querySelector('#bookmark-form input[name="name"]');
    if (firstInput) firstInput.focus();
  },

  submitModal(form) {
    const values = Object.fromEntries(new FormData(form).entries());
    const name = String(values.name || '').trim();
    if (!name) return;

    if (this.state.modalMode === 'subcategory') {
      const list = this.getSubcategories();
      if (this.state.editingId) {
        const item = list.find((entry) => entry.id === this.state.editingId);
        if (item) item.name = name;
      } else {
        list.push({
          id: this.createId('folder'),
          categoryId: String(values.categoryId || ''),
          name
        });
      }
      if (!this.save('bookmarks-subcategories', list)) return;
    } else {
      const url = this.normalizeUrl(String(values.url || '').trim());
      if (!url) {
        alert('कृपया सही वेबसाइट पता लिखें।');
        return;
      }
      const list = this.getBookmarks();
      if (this.state.editingId) {
        const item = list.find((entry) => entry.id === this.state.editingId);
        if (item) {
          item.name = name;
          item.url = url;
        }
      } else {
        list.push({
          id: this.createId('link'),
          subcategoryId: String(values.subcategoryId || ''),
          name,
          url
        });
      }
      if (!this.save('bookmarks-links', list)) return;
    }

    this.closeModal();
    this.render();
  },

  removeSubcategory(id) {
    if (!confirm('इस उप-श्रेणी और इसके सभी लिंक हटाने हैं?')) return;
    const subcategories = this.getSubcategories().filter((item) => item.id !== id);
    const removedBookmarkIds = this.getBookmarks()
      .filter((item) => item.subcategoryId === id)
      .map((item) => item.id);
    const bookmarks = this.getBookmarks().filter((item) => item.subcategoryId !== id);
    if (!this.save('bookmarks-subcategories', subcategories)) return;
    if (!this.save('bookmarks-links', bookmarks)) return;
    if (!Storage.removeRecentSites(removedBookmarkIds)) {
      alert('उप-श्रेणी हट गई, लेकिन हालिया सूची अपडेट नहीं हो पाई।');
    }
    this.render();
  },

  removeBookmark(id) {
    if (!confirm('यह लिंक हटाना है?')) return;
    const bookmarks = this.getBookmarks().filter((item) => item.id !== id);
    if (!this.save('bookmarks-links', bookmarks)) return;
    if (!Storage.removeRecentSites([id])) {
      alert('लिंक हट गया, लेकिन हालिया सूची अपडेट नहीं हो पाई।');
    }
    this.render();
  },

  normalizeUrl(value) {
    try {
      const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
      const url = new URL(withProtocol);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  },

  createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  },

  closeModal() {
    const modal = document.getElementById('app-modal');
    if (modal) modal.remove();
    this.state.modalMode = '';
    this.state.editingId = '';
  },

  escape(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  },

  escapeAttribute(value) {
    return this.escape(value);
  },

  icon(name) {
    const paths = {
      link: '<path d="M10 13a3 3 0 0 1 0-4l2-2a3 3 0 0 1 4 4l-1 1M14 11a3 3 0 0 1 0 4l-2 2a3 3 0 0 1-4-4l1-1"/>',
      folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.link}</svg>`;
  }
};

document.addEventListener('DOMContentLoaded', () => window.App.init());
