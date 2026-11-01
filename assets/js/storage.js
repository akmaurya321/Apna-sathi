window.Storage = {
  prefix: 'ameen-sahayak-',

  load(key, fallback) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  },

  save(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  },

  getRecentSites() {
    return this.load('recent-sites', []);
  },

  addRecentSite(siteId) {
    const current = this.getRecentSites();
    const recent = [siteId, ...current.filter((id) => id !== siteId)].slice(0, 3);
    return this.save('recent-sites', recent);
  },

  removeRecentSites(siteIds) {
    const removed = new Set(siteIds);
    const recent = this.getRecentSites().filter((id) => !removed.has(id));
    return this.save('recent-sites', recent);
  }
};
