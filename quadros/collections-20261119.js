/* Lumen Arts — restrained collection motion and real finish previews. */
(() => {
  'use strict';

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const observed = new WeakSet();
  const pending = new Set();
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
      pending.delete(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' }) : null;

  function observeContent() {
    pending.forEach(node => {
      if (!node.isConnected || motion.matches) {
        if (node.isConnected) node.classList.add('is-visible');
        observer?.unobserve(node);
        pending.delete(node);
      }
    });
    document.querySelectorAll('.collection-intro__line, .collection-index, .collection-chapter__heading, .collection-story, .collection-feature, .finish-story__copy, .choose-guide .section-heading, .guide-grid article, .invitation').forEach(node => {
      if (observed.has(node)) return;
      observed.add(node);
      node.classList.add('reveal');
      if (!observer || motion.matches) node.classList.add('is-visible');
      else { pending.add(node); observer.observe(node); }
    });
  }

  const tools = document.querySelector('.collection-tools');
  function syncNavigationHeight() {
    if (!tools) return;
    document.documentElement.style.setProperty('--collection-nav-height', `${Math.ceil(tools.getBoundingClientRect().height)}px`);
  }
  if ('ResizeObserver' in window && tools) new ResizeObserver(syncNavigationHeight).observe(tools);
  else window.addEventListener('resize', syncNavigationHeight, { passive: true });

  const toggle = document.querySelector('[data-toggle-search]');
  const panel = document.getElementById('collection-search-panel');
  const search = document.getElementById('catalog-search');
  const orientation = document.getElementById('orientation-filter');
  function syncSearchState() {
    const active = Boolean(search?.value.trim() || (orientation && orientation.value !== 'all'));
    const label = toggle?.querySelector('span');
    if (label) label.textContent = active ? 'Filtros ativos' : 'Buscar uma obra';
    toggle?.classList.toggle('has-filters', active);
  }
  function syncSelectedCollection() {
    const tabs = document.querySelector('.collection-nav .collection-tabs');
    const active = tabs?.querySelector('[aria-pressed="true"]');
    if (!tabs || !active) return;
    const row = tabs.getBoundingClientRect();
    const selected = active.getBoundingClientRect();
    if (selected.left < row.left || selected.right > row.right) {
      tabs.scrollBy({ left: selected.left - row.left - (row.width - selected.width) / 2, behavior: motion.matches ? 'auto' : 'smooth' });
    }
  }
  function setSearchPanel(open, focus = false) {
    if (!panel || !toggle) return;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (focus) (open ? search : toggle)?.focus({ preventScroll: true });
    syncNavigationHeight();
  }
  toggle?.addEventListener('click', () => setSearchPanel(panel.hidden, true));
  search?.addEventListener('input', syncSearchState);
  orientation?.addEventListener('change', syncSearchState);
  panel?.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    setSearchPanel(false, true);
  });

  const preview = document.getElementById('finish-preview-image');
  const caption = document.getElementById('finish-preview-caption');
  const finishes = {
    Preto: { file: 'assets/catalog-67231-native-02.webp', label: 'Preto' },
    Branco: { file: 'assets/catalog-67231-native-03.webp', label: 'Branco' },
    Crua: { file: 'assets/catalog-67231-native-04.webp', label: 'Crua' },
    Tabaco: { file: 'assets/catalog-67231-native-05.webp', label: 'Tabaco' },
    Freijo: { file: 'assets/catalog-67231-native-06.webp', label: 'Freijó' },
  };
  let previewRequest = 0;
  document.querySelectorAll('[data-finish-preview]').forEach(button => {
    button.addEventListener('click', async () => {
      const choice = finishes[button.dataset.finishPreview];
      if (!preview || !choice) return;
      const request = ++previewRequest;
      const image = new Image();
      image.src = choice.file;
      try {
        await image.decode();
        if (request !== previewRequest) return;
        preview.src = choice.file;
        preview.width = image.naturalWidth;
        preview.height = image.naturalHeight;
        preview.alt = `Visualização digital da Pantera Eclipse com moldura caixa na cor ${choice.label}, mostrando a face e a lateral`;
        document.querySelectorAll('[data-finish-preview]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
        const open = document.querySelector('.finish-studio [data-open]');
        if (open) open.dataset.previewColor = button.dataset.finishPreview;
        if (caption) caption.textContent = `Pantera Eclipse · Moldura caixa · ${choice.label}`;
      } catch {
        if (request === previewRequest && caption) caption.textContent = 'Não foi possível carregar esta cor. Abra a obra para comparar os acabamentos.';
      }
    });
  });

  window.addEventListener('lumen:shop', event => {
    if (event.detail?.action === 'catalog_rendered') { observeContent(); syncSearchState(); syncSelectedCollection(); }
  });
  motion.addEventListener?.('change', observeContent);
  observeContent();
  syncSearchState();
  syncNavigationHeight();
})();
