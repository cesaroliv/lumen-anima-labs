/* Lumen Arts — catalogue and server-authorized checkout discovery. No analytics requests. */
(() => {
  'use strict';

  const COLLECTION_PAGE_SIZE = 6;
  const CHECKOUT_API = 'https://lumen-digital-checkout.ccoliveira1.workers.dev/api/quadros';
  const COLLECTIONS = [
    {
      name: 'Obsidian Regalia', slug: 'obsidian-regalia', theme: 'obsidian',
      statement: 'O contraste que faz o olhar ficar.',
      description: 'Panteras, leões e figuras ornamentais em preto e dourado. Composições para dar destaque à parede e descobrir novos detalhes de perto.',
      featured: ['catalog-67231', 'catalog-67232'],
    },
    {
      name: 'Gesso e Ouro', slug: 'gesso-e-ouro', theme: 'gesso',
      statement: 'Clareza nas formas. Dourado nos detalhes.',
      description: 'Flores, curvas e referências de arquitetura em tons claros. Luz e sombra desenham a aparência de relevo de cada imagem.',
      featured: ['catalog-67219', 'catalog-67218'],
    },
    {
      name: 'Justiça Dourada', slug: 'justica-dourada', theme: 'justica',
      statement: 'Uma escolha com significado.',
      description: 'Balanças, figuras clássicas e símbolos do Direito. Encontre a imagem que representa algo para você e para o espaço que está criando.',
      featured: ['catalog-67246', 'catalog-67248'],
    },
    {
      name: 'Arte Black', slug: 'arte-black', theme: 'black',
      statement: 'O preto como ponto de partida.',
      description: 'Animais e símbolos emergem do fundo escuro em detalhes de aparência metálica. Da águia à rosa negra, o contraste transforma a imagem em presença.',
      featured: ['black-aguia', 'black-rosa-negra'],
    },
  ];
  const STORAGE_KEY = 'lumen:shop:favorites:v1';
  const HISTORY_KEY = '__lumenShopArt';
  const HISTORY_OWNER = `shop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const COLORS = [
    { key: 'Preto', label: 'Preto' },
    { key: 'Branco', label: 'Branco' },
    { key: 'Crua', label: 'Crua' },
    { key: 'Tabaco', label: 'Tabaco' },
    { key: 'Freijo', label: 'Freijó' },
  ];
  // The native supplier screen still has unresolved square-size mismatches.
  const MANUAL_SALE_HOLDS = new Set([67253, 67257]);
  const FINISHES = [
    { key: 'box-no-glass', label: 'Caixa sem vidro', family: 'box' },
    { key: 'box-glass', label: 'Caixa com vidro', family: 'box' },
    { key: 'canvas-frame', label: 'Canvas com moldura', family: 'canvas' },
    { key: 'infinity', label: 'Borda infinita', family: 'infinity' },
  ];
  const state = {
    products: [], byKey: new Map(), sizes: [], whatsapp: '', ready: false, loading: false, commerce: null,
    favorites: readFavorites(), collectionVisible: new Map(), activeKey: null, opener: null,
    selections: new Map(), gallery: 'editorial', previousOverflow: null,
    filters: { collection: 'all', mood: 'all', orientation: 'all', query: '', saved: false },
  };
  let ui = {};
  let liveRegion;
  let searchTimer;
  let reflowFrame;
  const cardCache = new Map();
  const decodedDimensions = new Map();

  function plain(value, max = 500) {
    return typeof value === 'string' || typeof value === 'number'
      ? String(value).trim().slice(0, max) : '';
  }

  function fold(value) {
    return plain(value, 5000).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function isAll(value) {
    return ['', '*', 'all', 'todos', 'todas', 'tudo'].includes(fold(value));
  }

  function strings(value) {
    return (Array.isArray(value) ? value : [value]).map(item => plain(item)).filter(Boolean);
  }

  function safeImageURL(value) {
    const raw = plain(value, 12000);
    if (!raw || raw.startsWith('#')) return '';
    try {
      const url = new URL(raw, document.baseURI);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  }

  function parseFavorites(value) {
    try {
      const parsed = JSON.parse(value || '[]');
      return new Set(Array.isArray(parsed)
        ? parsed.filter(key => typeof key === 'string' && key.length <= 200).slice(0, 2000)
        : []);
    } catch { return new Set(); }
  }

  function readFavorites() {
    try { return parseFavorites(window.localStorage.getItem(STORAGE_KEY)); }
    catch { return new Set(); }
  }

  function persistFavorites() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.favorites]));
      return true;
    } catch { return false; }
  }

  // Event details deliberately exclude search text, phone numbers, messages and other PII.
  function emit(action, details = {}) {
    window.dispatchEvent(new CustomEvent('lumen:shop', {
      detail: Object.freeze({ action, ...details }),
    }));
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setText(node, value) { if (node) node.textContent = value; }
  function setHidden(node, hidden) { if (node) node.hidden = hidden; }

  function announce(text) {
    if (!liveRegion) return;
    liveRegion.textContent = '';
    window.requestAnimationFrame(() => { liveRegion.textContent = text; });
  }

  function activeProduct() { return state.byKey.get(state.activeKey); }

  function productURL(key) {
    const url = new URL(window.location.href);
    url.searchParams.set('obra', key);
    return url.href;
  }

  function historyObject() {
    return history.state && typeof history.state === 'object' && !Array.isArray(history.state)
      ? { ...history.state } : {};
  }

  function updateProductURL(key, replace = false) {
    try {
      const next = historyObject();
      const previous = next[HISTORY_KEY];
      next[HISTORY_KEY] = {
        owner: HISTORY_OWNER,
        pushed: replace ? Boolean(previous?.owner === HISTORY_OWNER && previous.pushed) : true,
      };
      history[replace ? 'replaceState' : 'pushState'](next, '', productURL(key));
    } catch { /* The catalogue remains usable when history changes are restricted. */ }
  }

  function clearProductURL() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('obra');
      const next = historyObject();
      delete next[HISTORY_KEY];
      history.replaceState(next, '', url.href);
    } catch { /* No navigation is required to close the dialog. */ }
  }

  function normalizeColorMap(value) {
    const output = {};
    if (!value || typeof value !== 'object' || Array.isArray(value)) return output;
    for (const color of COLORS) {
      const found = Object.keys(value).find(key => fold(key) === fold(color.key));
      const url = found ? safeImageURL(value[found]) : '';
      if (url) output[color.key] = url;
    }
    return output;
  }

  function imageDimension(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 && number <= 100000 ? Math.round(number) : 0;
  }

  // Photo approval is independent from whether an artwork can be purchased.
  function normalizeApprovedPreviews(value) {
    const seen = new Set();
    return (Array.isArray(value) ? value : []).slice(0, 20).flatMap((photo, index) => {
      if (photo?.previewApproved !== true) return [];
      const src = safeImageURL(photo.image);
      const label = plain(photo.label || photo.association, 160);
      if (!src || !label || seen.has(src)) return [];
      seen.add(src);
      return [{ key: `preview-${index}`, src, label, defaultPreview: photo.defaultPreview === true }];
    });
  }

  function normalizeProduct(value) {
    if (!value || typeof value !== 'object') return null;
    const key = plain(value.key, 200);
    const name = plain(value.name, 300);
    if (!key || !name) return null;
    const width = Number(value.width);
    const height = Number(value.height);
    const orientation = ['horizontal', 'vertical', 'square'].includes(value.orientation)
      ? value.orientation : (width === height ? 'square' : width > height ? 'horizontal' : 'vertical');
    const images = value.images || {};
    const native = value.native || {};
    const product = {
      key, id: plain(value.id, 200), name,
      collection: plain(value.collection, 200),
      mood: strings(value.mood), tags: strings(value.tags),
      description: plain(value.description, 6000),
      status: value.status === 'configured' ? 'configured' : 'preparation',
      orientation,
      framing: normalizeFraming(value.framing),
      images: {
        editorial: safeImageURL(images.editorial),
        editorialSmall: safeImageURL(images.editorialSmall),
        original: safeImageURL(images.original),
        editorialWidth: imageDimension(images.editorialWidth),
        editorialHeight: imageDimension(images.editorialHeight),
        editorialSmallWidth: imageDimension(images.editorialSmallWidth),
        editorialSmallHeight: imageDimension(images.editorialSmallHeight),
      },
      native: {
        cover: safeImageURL(native.cover),
        box: normalizeColorMap(native.box),
        canvas: normalizeColorMap(native.canvas),
        infinity: safeImageURL(native.infinity),
        approvedPreviews: normalizeApprovedPreviews(native.gallery),
      },
    };
    product.searchText = fold([
      product.name, product.id, product.collection, product.description,
      ...product.mood, ...product.tags,
    ].join(' '));
    return product;
  }

  function normalizeSizes(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).flatMap(value => {
      const match = plain(value).match(/^(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)$/i);
      if (!match) return [];
      const dimensions = match.slice(1).map(part => Number(part.replace(',', '.'))).sort((a, b) => a - b);
      if (dimensions.some(number => !Number.isFinite(number) || number <= 0 || number > 1000)) return [];
      const key = dimensions.join('x');
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ key, short: dimensions[0], long: dimensions[1] }];
    });
  }

  function framingPosition(value) {
    const match = plain(value).match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
    return match && match.slice(1).every(part => Number(part) <= 100) ? match[0] : '50% 50%';
  }

  function normalizeFraming(value) {
    if (!value || value.layoutApproved !== true) return null;
    const sizes = normalizeSizes(value.sizes);
    if (!sizes.length || !Array.isArray(value.layouts)) return null;
    const position = framingPosition(value.objectPosition);
    const layouts = sizes.flatMap(size => {
      const layout = value.layouts.find(item => item?.size === size.key);
      const width = Number(layout?.widthCm), height = Number(layout?.heightCm);
      if (!Number.isFinite(width) || !Number.isFinite(height) ||
        Math.min(width, height) !== size.short || Math.max(width, height) !== size.long) return [];
      return [{ size: size.key, width, height, objectPosition: framingPosition(layout.objectPosition || position) }];
    });
    if (layouts.length !== sizes.length) return null;
    return {
      sizes: sizes.map(size => size.key), layouts, objectPosition: position,
      preferredSize: sizes.find(size => size.key === value.preferredSize)?.key || sizes[0].key,
      nativePreviewAvailable: value.nativePreviewAvailable !== false,
    };
  }

  function nativePreviewAvailable(product) {
    return product.framing?.nativePreviewAvailable !== false;
  }

  function availableSizes(product) {
    if (product.status !== 'configured' || !product.framing) return [];
    return product.framing.sizes.map(key => state.sizes.find(size => size.key === key)).filter(Boolean);
  }

  function normalizeWhatsApp(value) {
    let phone = plain(value, 300);
    if (/^https?:\/\//i.test(phone)) {
      try {
        const url = new URL(phone);
        if (url.hostname === 'wa.me' || url.hostname === 'www.wa.me') phone = url.pathname.slice(1);
        else if (url.hostname === 'api.whatsapp.com') phone = url.searchParams.get('phone') || '';
        else return '';
      } catch { return ''; }
    }
    if (!/^[+\d\s().-]+$/.test(phone)) return '';
    const digits = phone.replace(/\D/g, '');
    return /^[1-9]\d{7,14}$/.test(digits) ? digits : '';
  }

  function columnsForWidth(width) { return width > 1100 ? 3 : 2; }

  function gridColumns() { return columnsForWidth(window.innerWidth || document.documentElement.clientWidth); }

  function preferredRatio(product) {
    const images = product.images;
    const sources = [
      [images.editorialSmall, images.editorialSmallWidth, images.editorialSmallHeight],
      [images.editorial, images.editorialWidth, images.editorialHeight],
      [images.original, 0, 0], [nativePreviewAvailable(product) ? product.native.cover : '', 0, 0],
    ];
    for (const [url, width, height] of sources) {
      if (!url) continue;
      const decoded = decodedDimensions.get(url);
      if (decoded) return decoded.width / decoded.height;
      if (width && height) return width / height;
      // An unknown source stays neutral until its real dimensions are decoded.
      return 1;
    }
    return 1;
  }

  function rowGeometry(ratios, columns) {
    const safe = ratios.map(ratio => Number.isFinite(ratio) && ratio > 0 ? ratio : 1);
    return {
      template: safe.map(ratio => `${ratio}fr`).join(' '),
      maxWidth: columns === 1 || safe.length >= columns
        ? 100 : Math.min(100, safe.reduce((sum, ratio) => sum + ratio, 0) / (columns * 1.05) * 100),
    };
  }

  function updateRowRatios(row) {
    if (!row) return;
    const ratios = [...row.children].map(card => {
      const image = card.querySelector('.product-card__image');
      return Number(image?.dataset.ratio) || preferredRatio(state.byKey.get(card.dataset.key));
    });
    const geometry = rowGeometry(ratios, gridColumns());
    row.style.gridTemplateColumns = geometry.template;
    row.style.setProperty('--row-template', geometry.template);
    row.style.setProperty('--row-max-width', `${geometry.maxWidth}%`);
    row.style.maxWidth = `${geometry.maxWidth}%`;
  }

  function updateRelatedRatios() {
    if (!ui.related) return;
    const ratios = [...ui.related.querySelectorAll('.related-card img')]
      .map(image => Number(image.dataset.ratio) || 1);
    ui.related.style.gridTemplateColumns = (window.innerWidth || document.documentElement.clientWidth) <= 760
      ? '1fr' : rowGeometry(ratios, 3).template;
  }

  function cardImage(product, { large = false } = {}) {
    const images = product.images;
    const editorial = [images.editorial, 'editorial', images.editorialWidth, images.editorialHeight];
    const small = [images.editorialSmall, 'editorial', images.editorialSmallWidth, images.editorialSmallHeight];
    const options = [
      ...(large ? [editorial, small] : [small, editorial]),
      [images.original, 'original', 0, 0],
      [nativePreviewAvailable(product) ? product.native.cover : '', 'native', 0, 0],
    ].filter(([src]) => src);
    const image = el('img', large ? 'collection-feature__image' : 'product-card__image');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.style.width = '100%';
    image.style.height = 'auto';
    image.style.aspectRatio = 'auto';
    let index = 0;
    let currentSource = '';
    function setDimensions(width, height) {
      if (width && height) {
        image.width = width;
        image.height = height;
        image.dataset.ratio = String(width / height);
      } else {
        image.removeAttribute('width');
        image.removeAttribute('height');
        image.dataset.ratio = '1';
      }
      updateRowRatios(image.closest('.product-row'));
      if (image.closest('.related-card')) updateRelatedRatios();
    }
    function useNext() {
      const item = options[index++];
      if (!item) {
        image.hidden = true;
        if (image.parentNode && !image.parentNode.querySelector('.image-unavailable')) {
          image.parentNode.append(el('span', 'image-unavailable', 'Imagem indisponível'));
        }
        return;
      }
      currentSource = item[0];
      const decoded = decodedDimensions.get(currentSource);
      setDimensions(decoded?.width || item[2], decoded?.height || item[3]);
      image.hidden = false;
      image.alt = item[1] === 'editorial'
        ? `Ambientação ilustrativa da obra ${product.name}`
        : item[1] === 'original' ? `Arte ${product.name}, composição completa`
          : `Visualização digital da obra ${product.name}`;
      image.src = currentSource;
    }
    image.addEventListener('load', () => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      decodedDimensions.set(currentSource, dimensions);
      setDimensions(dimensions.width, dimensions.height);
    });
    image.addEventListener('error', useNext);
    useNext();
    return image;
  }

  function createCard(product) {
    const card = el('article', 'product-card');
    card.dataset.key = product.key;
    card.dataset.collectionName = product.collection;
    const open = el('a', 'product-card__open');
    open.href = productURL(product.key);
    open.dataset.open = product.key;
    open.setAttribute('aria-label', `Ver obra ${product.name}`);
    const media = el('div', 'product-card__media');
    media.append(cardImage(product));
    const content = el('div', 'product-card__content');
    const badge = el('span', 'product-card__badge', product.status === 'configured' ? 'Visualize em 3D' : 'Em preparação');
    badge.dataset.status = product.status;
    const title = el('h3', 'product-card__title');
    const titleLink = el('a', 'product-card__title-link', product.name);
    titleLink.href = productURL(product.key);
    titleLink.dataset.open = product.key;
    title.append(titleLink);
    content.append(
      el('p', 'product-card__collection', product.collection),
      title,
      badge,
    );
    open.append(media);
    const save = el('button', 'product-card__save');
    save.type = 'button';
    save.dataset.save = product.key;
    updateSaveButton(save, product);
    card.append(open, content, save);
    return card;
  }

  function updateSaveButton(button, product, longLabel = false) {
    if (!button || !product) return;
    const saved = state.favorites.has(product.key);
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', `${saved ? 'Remover' : 'Salvar'} ${product.name} ${saved ? 'dos' : 'nos'} favoritos`);
    button.classList.toggle('is-saved', saved);
    button.textContent = longLabel ? (saved ? 'Salvo nos favoritos' : 'Salvar obra') : (saved ? '♥' : '♡');
  }

  function filteredProducts() {
    const filters = state.filters;
    const terms = fold(filters.query).split(/\s+/).filter(Boolean);
    return state.products.filter(product =>
      (isAll(filters.collection) || fold(product.collection) === fold(filters.collection)) &&
      (isAll(filters.mood) || product.mood.some(mood => fold(mood) === fold(filters.mood))) &&
      (isAll(filters.orientation) || product.orientation === filters.orientation) &&
      (!filters.saved || state.favorites.has(product.key)) &&
      terms.every(term => product.searchText.includes(term)));
  }

  function updateFilterButtons() {
    for (const type of ['collection', 'mood']) {
      document.querySelectorAll(`[data-${type}]`).forEach(button => {
        const value = button.dataset[type];
        const selected = isAll(value) && isAll(state.filters[type]) || fold(value) === fold(state.filters[type]);
        button.setAttribute('aria-pressed', String(selected));
        button.classList.toggle('is-active', selected);
      });
    }
    if (ui.savedOnly) {
      ui.savedOnly.setAttribute('aria-pressed', String(state.filters.saved));
      ui.savedOnly.classList.toggle('is-active', state.filters.saved);
    }
  }

  function collectionConfig(name) {
    const known = COLLECTIONS.find(item => fold(item.name) === fold(name));
    if (known) return known;
    return {
      name, slug: fold(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'outras-obras',
      theme: 'additional', statement: 'Encontre a sua próxima escolha.',
      description: 'Explore as obras desta coleção e veja cada composição em detalhe.', featured: [],
    };
  }

  function collectionGroups(products) {
    const byCollection = new Map();
    products.forEach(product => {
      if (!byCollection.has(product.collection)) byCollection.set(product.collection, []);
      byCollection.get(product.collection).push(product);
    });
    const orderedNames = [
      ...COLLECTIONS.map(item => item.name),
      ...byCollection.keys(),
    ].filter((name, index, names) => names.indexOf(name) === index);
    return orderedNames.filter(name => byCollection.has(name)).map(name => ({
      config: collectionConfig(name), products: byCollection.get(name),
    }));
  }

  function hasSpecificFilters() {
    return Boolean(plain(state.filters.query) || state.filters.saved
      || !isAll(state.filters.mood) || !isAll(state.filters.orientation));
  }

  function createCollectionFeature(product, placement) {
    const figure = el('figure', `collection-feature collection-feature--${placement}`);
    figure.dataset.featuredKey = product.key;
    const open = el('a', 'collection-feature__open');
    open.href = productURL(product.key);
    open.dataset.open = product.key;
    open.setAttribute('aria-label', `Ver obra ${product.name}`);
    open.append(cardImage(product, { large: true }));
    const caption = el('figcaption', 'collection-feature__caption');
    const label = el('span', 'collection-feature__label');
    label.append(el('span', 'collection-feature__name', product.name));
    if (product.status !== 'configured') label.append(el('span', 'collection-feature__status', 'Em preparação'));
    const action = el('a', 'collection-feature__action', 'Ver obra ↗');
    action.href = productURL(product.key);
    action.dataset.open = product.key;
    action.setAttribute('aria-label', `Ver obra ${product.name}`);
    caption.append(label, action);
    figure.append(open, caption);
    return figure;
  }

  function createCollectionChapter(config, products, compact) {
    const chapter = el('section', `collection-chapter collection-chapter--${config.theme}${compact ? ' collection-chapter--compact' : ''}`);
    chapter.id = `colecao-${config.slug}`;
    chapter.dataset.collectionChapter = config.name;
    chapter.dataset.collectionSlug = config.slug;
    chapter.setAttribute('aria-labelledby', `collection-title-${config.slug}`);
    const index = COLLECTIONS.findIndex(item => item.name === config.name);
    const heading = el('header', 'collection-chapter__heading');
    const number = el('p', 'collection-chapter__index', `COLEÇÃO ${String(index < 0 ? COLLECTIONS.length + 1 : index + 1).padStart(2, '0')}`);
    const title = el('h2', 'collection-chapter__title', config.name);
    title.id = `collection-title-${config.slug}`;
    const count = el('p', 'collection-chapter__count', `${products.length} ${products.length === 1 ? 'obra' : 'obras'}${compact ? ' na seleção' : ''}`);
    heading.append(number, title, count);
    chapter.append(heading);

    if (!compact) {
      const opening = el('div', 'collection-opening');
      const story = el('div', 'collection-story');
      const configured = products.filter(product => product.status === 'configured').length;
      const availability = configured === products.length
        ? 'Explore as obras e compare os acabamentos na ficha de cada uma.'
        : configured === 0
          ? 'Coleção em preparação. Salve suas favoritas para encontrá-las depois.'
          : `${configured} obras com acabamentos para consultar. As demais estão em preparação.`;
      const jump = el('a', 'collection-chapter__jump', 'Explorar as obras ↓');
      jump.href = `#obras-${config.slug}`;
      story.append(
        el('h3', 'collection-chapter__statement', config.statement),
        el('p', 'collection-chapter__description', config.description),
        jump,
        el('p', 'collection-chapter__meta', availability),
      );
      opening.append(story);
      const chosen = [];
      for (const key of config.featured) {
        const product = products.find(item => item.key === key);
        if (product && !chosen.includes(product)) chosen.push(product);
      }
      for (const product of products) {
        if (chosen.length >= 2) break;
        if (!chosen.includes(product)) chosen.push(product);
      }
      chosen.slice(0, 2).forEach((product, position) => {
        opening.append(createCollectionFeature(product, position ? 'secondary' : 'primary'));
      });
      chapter.append(opening);
    }

    const visible = state.collectionVisible.get(config.name) || COLLECTION_PAGE_SIZE;
    const shown = products.slice(0, visible);
    const gallery = el('div', 'collection-gallery');
    gallery.id = `obras-${config.slug}`;
    const galleryHeading = el('header', 'collection-gallery__heading');
    galleryHeading.append(
      el('h3', 'collection-gallery__title', compact ? 'Obras encontradas' : 'As obras da coleção'),
      el('p', 'collection-gallery__count', `${shown.length} de ${products.length} ${products.length === 1 ? 'obra' : 'obras'}`),
    );
    const grid = el('div', 'collection-products');
    grid.id = `collection-products-${config.slug}`;
    grid.setAttribute('aria-label', `Obras de ${config.name}`);
    const columns = gridColumns();
    for (let offset = 0; offset < shown.length; offset += columns) {
      const row = el('div', 'product-row');
      shown.slice(offset, offset + columns).forEach(product => {
        let card = cardCache.get(product.key);
        if (!card) { card = createCard(product); cardCache.set(product.key, card); }
        updateSaveButton(card.querySelector('[data-save]'), product);
        row.append(card);
      });
      updateRowRatios(row);
      grid.append(row);
    }
    gallery.append(galleryHeading, grid);
    const remaining = products.length - shown.length;
    const footer = el('div', 'collection-gallery__footer');
    if (remaining > 0) {
      const next = Math.min(COLLECTION_PAGE_SIZE, remaining);
      const expand = el('button', 'collection-expand', `Ver mais ${next} ${next === 1 ? 'obra' : 'obras'}`);
      expand.type = 'button';
      expand.dataset.expandCollection = config.name;
      expand.setAttribute('aria-controls', grid.id);
      expand.setAttribute('aria-expanded', String(shown.length > COLLECTION_PAGE_SIZE));
      footer.append(expand, el('p', 'collection-gallery__remaining', `${remaining} ${remaining === 1 ? 'obra para explorar' : 'obras para explorar'} em ${config.name}.`));
    } else {
      footer.append(el('p', 'collection-gallery__complete', compact ? 'Todas as obras desta seleção estão acima.' : 'Você chegou ao fim desta coleção.'));
    }
    gallery.append(footer);
    chapter.append(gallery);
    return { chapter, shown: shown.length };
  }

  function renderGrid() {
    if (!ui.grid || !state.ready) return;
    const products = filteredProducts();
    const groups = collectionGroups(products);
    const compact = hasSpecificFilters();
    const focused = document.activeElement;
    const preserveFocus = ui.grid.contains(focused);
    const fragment = document.createDocumentFragment();
    let shownCount = 0;
    groups.forEach(({ config, products: collectionProducts }) => {
      const result = createCollectionChapter(config, collectionProducts, compact);
      shownCount += result.shown;
      fragment.append(result.chapter);
    });
    if (!products.length) {
      const empty = el('div', 'catalog-empty');
      empty.append(el('p', '', state.filters.saved
        ? 'Nenhuma obra salva corresponde aos filtros.'
        : 'Nenhuma obra corresponde aos filtros.'));
      const clear = el('button', 'option-button', 'Limpar filtros');
      clear.type = 'button';
      clear.dataset.clearCatalog = '';
      empty.append(clear);
      fragment.append(empty);
    }
    ui.grid.classList.add('collection-chapters');
    ui.grid.dataset.view = compact ? 'filtered' : 'collections';
    ui.grid.replaceChildren(fragment);
    if (preserveFocus && focused?.isConnected && document.activeElement !== focused) focused.focus({ preventScroll: true });
    ui.grid.setAttribute('aria-busy', 'false');
    const filterContext = [!isAll(state.filters.mood) ? state.filters.mood : '', state.filters.saved ? 'minha seleção' : ''].filter(Boolean);
    const countLabel = products.length
      ? `${shownCount} de ${products.length} ${products.length === 1 ? 'obra' : 'obras'} · ${groups.length} ${groups.length === 1 ? 'coleção' : 'coleções'}`
      : '0 obras';
    setText(ui.count, countLabel + (filterContext.length ? ` · ${filterContext.join(' · ')}` : ''));
    if (ui.loadMore) { ui.loadMore.hidden = true; ui.loadMore.disabled = true; }
    updateFilterButtons();
    emit('catalog_rendered', { resultCount: products.length, collectionCount: groups.length, shown: shownCount, compact });
  }

  function expandCollection(name) {
    const products = filteredProducts().filter(product => product.collection === name);
    if (!products.length) return;
    const previous = Math.min(state.collectionVisible.get(name) || COLLECTION_PAGE_SIZE, products.length);
    state.collectionVisible.set(name, previous + COLLECTION_PAGE_SIZE);
    renderGrid();
    const config = collectionConfig(name);
    const chapter = document.getElementById(`colecao-${config.slug}`);
    const firstNew = chapter?.querySelectorAll('.product-card__open')[previous];
    if (firstNew) {
      firstNew.focus({ preventScroll: true });
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      firstNew.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }
    const shown = Math.min(previous + COLLECTION_PAGE_SIZE, products.length);
    announce(`${shown} de ${products.length} obras de ${name} exibidas.`);
    emit('load_more', { collection: name, shown, resultCount: products.length });
  }

  function syncCollectionAnchor() {
    if (!state.ready || state.activeKey) return;
    const hash = window.location.hash.slice(1);
    const config = COLLECTIONS.find(item => `colecao-${item.slug}` === hash);
    if (!config) return;
    // Direct chapter links reveal the complete collection context; product URLs stay independent.
    if (hasSpecificFilters() || !isAll(state.filters.collection)) resetFilters();
    window.requestAnimationFrame(() => {
      const chapter = document.getElementById(hash);
      if (!chapter) return;
      chapter.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  }

  function resetFilters() {
    state.filters = { collection: 'all', mood: 'all', orientation: 'all', query: '', saved: false };
    state.collectionVisible.clear();
    if (ui.search) ui.search.value = '';
    if (ui.orientation) {
      const allOption = [...ui.orientation.options].find(option => isAll(option.value));
      ui.orientation.value = allOption ? allOption.value : '';
    }
    renderGrid();
    emit('filters_cleared', { resultCount: filteredProducts().length });
    announce('Filtros removidos.');
  }

  function setFilter(type, value) {
    if (!state.ready) return;
    state.filters[type] = value;
    state.collectionVisible.clear();
    renderGrid();
    emit('filter_changed', { filter: type, resultCount: filteredProducts().length });
    if (type === 'mood' || type === 'saved' || type === 'collection') {
      scrollToCatalog(type === 'collection' && !isAll(value) ? value : null);
    }
  }

  function scrollToCatalog(collection = null) {
    const chapter = collection
      ? document.getElementById(`colecao-${collectionConfig(collection).slug}`) : null;
    const target = chapter || ui.grid;
    if (!target) return;
    const focusTarget = chapter?.querySelector('.collection-chapter__title') || target;
    if (!focusTarget.hasAttribute('tabindex')) focusTarget.tabIndex = -1;
    if (target === ui.grid && !target.hasAttribute('aria-label')) {
      target.setAttribute('aria-label', 'Obras por coleção');
    }
    focusTarget.focus({ preventScroll: true });
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  }

  function findDataNode(container, attribute, value) {
    return container ? [...container.querySelectorAll(`[${attribute}]`)]
      .find(node => node.getAttribute(attribute) === value) : null;
  }

  function refreshFavoriteButtons(key = null) {
    for (const [cardKey, card] of cardCache) {
      if (key !== null && cardKey !== key) continue;
      updateSaveButton(card.querySelector('[data-save]'), state.byKey.get(cardKey));
    }
  }

  function setFavorite(key, desired, source = 'card') {
    const product = state.byKey.get(key);
    if (!product) return;
    const focused = document.activeElement;
    const restoreCard = focused?.getAttribute?.('data-save') === key;
    if (desired) state.favorites.add(key); else state.favorites.delete(key);
    const persisted = persistFavorites();
    if (state.filters.saved) renderGrid(); else refreshFavoriteButtons(key);
    if (state.activeKey === key) {
      updateSaveButton(ui.save, product, true);
      updateAction(product);
    }
    if (restoreCard) {
      const target = findDataNode(ui.grid, 'data-save', key) || ui.savedOnly || ui.search;
      target?.focus({ preventScroll: true });
    }
    announce(`${product.name} ${desired ? 'salvo nos' : 'removido dos'} favoritos.${persisted ? '' : ' A preferência foi mantida apenas nesta sessão.'}`);
    emit('favorite_changed', { key, saved: desired, source, persisted });
  }

  function availableColors(product, finishKey) {
    const finish = FINISHES.find(item => item.key === finishKey);
    if (!finish || finish.family === 'infinity') return [];
    return COLORS.filter(color => Boolean(product.native[finish.family][color.key]));
  }

  function availableFinishes(product) {
    if (product.status !== 'configured') return [];
    return FINISHES.filter(finish => finish.family === 'infinity'
      ? Boolean(product.native.infinity) : Object.keys(product.native[finish.family]).length > 0);
  }

  function selectionFor(product) {
    if (product.status !== 'configured') return null;
    const finishes = availableFinishes(product);
    const saved = state.selections.get(product.key) || {};
    const finish = finishes.find(item => item.key === saved.finish)?.key || finishes[0]?.key || '';
    const colors = availableColors(product, finish);
    const color = colors.find(item => item.key === saved.color)?.key || colors[0]?.key || '';
    const sizes = availableSizes(product);
    const size = sizes.find(item => item.key === saved.size)?.key
      || sizes.find(item => item.key === product.framing?.preferredSize)?.key || sizes[0]?.key || '';
    const selected = { finish, color, size };
    state.selections.set(product.key, selected);
    return selected;
  }

  function applyPreviewSelection(product, preview) {
    if (product.status !== 'configured' || (!preview?.finish && !preview?.color)) return false;
    const selected = selectionFor(product);
    const finish = availableFinishes(product).find(item => item.key === preview.finish);
    const color = availableColors(product, finish?.key || selected.finish)
      .find(item => item.key === preview.color);
    if (!finish && !color) return false;
    state.selections.set(product.key, {
      ...selected,
      ...(finish ? { finish: finish.key } : {}),
      ...(color ? { color: color.key } : {}),
    });
    selectionFor(product);
    return true;
  }

  function dimensionsFor(product, selected) {
    if (!availableSizes(product).some(size => size.key === selected?.size)) return null;
    const layout = product.framing.layouts.find(item => item.size === selected.size);
    if (!layout) return null;
    const { width, height, objectPosition } = layout;
    return { width, height, objectPosition, label: `${width} × ${height} cm` };
  }

  function colorLabel(key) { return COLORS.find(color => color.key === key)?.label || ''; }

  function selectedNative(product, selected) {
    if (!nativePreviewAvailable(product)) return '';
    const finish = FINISHES.find(item => item.key === selected?.finish);
    if (!finish) return product.native.cover;
    if (finish.family === 'infinity') return product.native.infinity;
    return product.native[finish.family][selected.color] || product.native.cover;
  }

  function galleryItems(product) {
    const selected = selectionFor(product);
    const items = [];
    const editorial = product.images.editorial || product.images.editorialSmall;
    if (editorial) items.push({
      key: 'editorial', label: 'Ambientação', src: editorial,
      thumbnail: product.images.editorialSmall || editorial,
      alt: `Ambientação ilustrativa da obra ${product.name}`,
      caption: 'Ambientação ilustrativa. A proporção no ambiente não substitui as medidas da opção selecionada.',
    });
    if (product.images.original) items.push({
      key: 'original', label: 'Arte completa', src: product.images.original,
      thumbnail: product.images.original,
      alt: `Arte digital ${product.name}, composição completa`,
      caption: 'Arte digital completa. Esta imagem não é uma fotografia da impressão física.',
    });
    const dimensions = dimensionsFor(product, selected);
    if (product.images.original && dimensions) items.push({
      key: 'framing', label: 'No seu tamanho', src: product.images.original,
      thumbnail: product.images.original, dimensions,
      alt: `${product.name} — enquadramento em ${dimensions.label}`,
      caption: `Enquadramento da arte em ${dimensions.label}.`,
    });
    const native = product.status === 'configured' ? selectedNative(product, selected) : '';
    if (native) {
      const finish = FINISHES.find(item => item.key === selected?.finish);
      const frameDescription = finish ? `${finish.label}${selected.color ? `, ${colorLabel(selected.color)}` : ''}` : 'Acabamento';
      items.push({
        key: 'native', label: 'Acabamento', src: native, thumbnail: native,
        alt: `Visualização digital de ${product.name}: ${frameDescription}`,
        caption: finish?.family === 'box'
          ? 'Referência de acabamento, com proporção ilustrativa. O vidro não é demonstrado nesta imagem.'
          : 'Referência de acabamento, com proporção ilustrativa. Veja o enquadramento em “No seu tamanho”.',
      });
    }
    if (product.status === 'preparation' && nativePreviewAvailable(product)) {
      for (const photo of product.native.approvedPreviews) items.push({
        key: photo.key, label: photo.label, src: photo.src, thumbnail: photo.src,
        alt: `Visualização digital de ${product.name}: ${photo.label}`,
        caption: `Simulação digital — ${photo.label}. Medidas e disponibilidade em preparação.`,
      });
    }
    if (product.status === 'configured' && nativePreviewAvailable(product) && product.native.cover) items.push({
      key: 'cover', label: 'Vista no ambiente', src: product.native.cover, thumbnail: product.native.cover,
      alt: `Visualização digital de ${product.name} no ambiente`,
      caption: 'Simulação digital no ambiente, com proporção ilustrativa. Confira as medidas e o acabamento da opção escolhida.',
    });
    const lead = product.status === 'preparation'
      ? product.native.approvedPreviews.find(photo => photo.defaultPreview)?.key : '';
    const leadIndex = lead ? items.findIndex(item => item.key === lead) : -1;
    if (leadIndex > 0) items.unshift(items.splice(leadIndex, 1)[0]);
    return items;
  }

  function renderGallery(product) {
    const items = galleryItems(product);
    const selected = items.find(item => item.key === state.gallery) || items[0];
    state.gallery = selected?.key || '';
    if (ui.image) {
      ui.image.onerror = () => {
        ui.image.hidden = true;
        setText(ui.caption, 'Não foi possível carregar esta imagem. Escolha outra visualização.');
      };
      ui.image.hidden = !selected;
      const dimensions = selected?.dimensions;
      const wrap = ui.image.closest('.art-image-wrap');
      wrap?.classList.toggle('is-framing', Boolean(dimensions));
      if (dimensions) wrap?.style.setProperty('--framing-ratio', String(dimensions.width / dimensions.height));
      else wrap?.style.removeProperty('--framing-ratio');
      ui.image.style.objectFit = dimensions ? 'cover' : 'contain';
      ui.image.style.objectPosition = dimensions?.objectPosition || '50% 50%';
      ui.image.decoding = 'async';
      if (selected) {
        ui.image.alt = selected.alt;
        ui.image.src = selected.src;
      } else {
        ui.image.removeAttribute('src');
        ui.image.alt = '';
      }
    }
    setText(ui.caption, selected?.caption || 'Prévia indisponível no momento.');
    if (ui.thumbnails) {
      const fragment = document.createDocumentFragment();
      items.forEach(item => {
        const button = el('button', 'thumbnail-button');
        button.type = 'button';
        button.dataset.gallery = item.key;
        button.setAttribute('aria-label', `Ver ${item.label.toLowerCase()}`);
        button.setAttribute('aria-pressed', String(item.key === state.gallery));
        button.classList.toggle('is-active', item.key === state.gallery);
        const image = el('img');
        image.src = item.thumbnail;
        image.alt = '';
        image.loading = 'lazy';
        image.decoding = 'async';
        if (item.dimensions) {
          image.classList.add('framing-thumbnail');
          image.style.aspectRatio = `${item.dimensions.width} / ${item.dimensions.height}`;
          image.style.objectPosition = item.dimensions.objectPosition;
        }
        image.addEventListener('error', () => { image.hidden = true; }, { once: true });
        button.append(image, el('span', 'thumbnail-button__label', item.label));
        fragment.append(button);
      });
      ui.thumbnails.replaceChildren(fragment);
    }
  }

  function optionButton(label, attribute, value, selected) {
    const button = el('button', 'option-button', label);
    button.type = 'button';
    button.setAttribute(attribute, value);
    button.setAttribute('aria-pressed', String(selected));
    button.classList.toggle('is-active', selected);
    return button;
  }

  function renderOptions(product) {
    const configured = product.status === 'configured';
    const selected = selectionFor(product);
    const finishes = availableFinishes(product);
    if (ui.sizes) {
      const buttons = configured ? availableSizes(product).map(size => {
        const dimensions = dimensionsFor(product, { size: size.key });
        return optionButton(dimensions.label, 'data-size', size.key, selected.size === size.key);
      }) : [];
      ui.sizes.replaceChildren(...buttons);
      ui.sizes.hidden = !buttons.length;
    }
    if (ui.frames) {
      ui.frames.replaceChildren(...finishes.map(finish => optionButton(
        finish.label, 'data-finish', finish.key, selected?.finish === finish.key,
      )));
      ui.frames.hidden = !finishes.length;
    }
    if (ui.colors) {
      const colors = configured ? availableColors(product, selected.finish) : [];
      ui.colors.replaceChildren(...colors.map(color => {
        const button = optionButton(color.label, 'data-color', color.key, selected.color === color.key);
        button.classList.add('color-option');
        return button;
      }));
      ui.colors.hidden = !colors.length;
    }
    // Optional wrappers let the HTML hide legends along with empty option groups.
    document.querySelectorAll('[data-art-variant-section]').forEach(node => { node.hidden = !configured; });
    document.querySelectorAll('[data-art-color-section]').forEach(node => {
      node.hidden = !configured || !availableColors(product, selected?.finish).length;
    });
    const finish = FINISHES.find(item => item.key === selected?.finish);
    const materials = !configured
      ? 'Esta obra está em preparação. Medidas e acabamentos serão informados após conferência.'
      : finish?.family === 'box'
        ? `${finish.label}. A visualização digital da caixa não demonstra o vidro. Materiais e acabamento final serão confirmados na consulta.`
        : finish?.family === 'canvas'
          ? 'Canvas com moldura. Materiais e acabamento final serão confirmados na consulta.'
          : finish?.family === 'infinity'
            ? 'Borda infinita. Acabamento das laterais e enquadramento final serão confirmados na consulta.'
            : 'As opções de acabamento ainda precisam ser conferidas. Consulte os detalhes antes de decidir.';
    setText(ui.materials, materials);
    renderSummary(product);
  }

  function renderSummary(product) {
    const selected = selectionFor(product);
    const dimensions = dimensionsFor(product, selected);
    const finish = FINISHES.find(item => item.key === selected?.finish);
    if (product.status === 'configured') {
      const parts = [dimensions ? `${dimensions.label} nominais` : 'Tamanho a confirmar'];
      parts.push(finish?.label || 'Acabamento a confirmar');
      if (selected?.color) parts.push(colorLabel(selected.color));
      setText(ui.summary, parts.join(' · '));
      setText(ui.availability, 'Seleção para consulta. Valor, entrega e enquadramento serão confirmados antes do pedido.');
    } else {
      setText(ui.summary, 'Salve esta obra para encontrá-la depois.');
      setText(ui.availability, 'Em preparação. Ainda sem opções de compra ou prazo confirmado.');
    }
    setText(ui.measureWidth, dimensions ? `${dimensions.width} cm · largura` : '');
    setText(ui.measureHeight, dimensions ? `${dimensions.height} cm · altura` : '');
    setHidden(ui.measureWidth, !dimensions);
    setHidden(ui.measureHeight, !dimensions);
    if (ui.measureShape) {
      ui.measureShape.hidden = !dimensions;
      if (dimensions) {
        ui.measureShape.style.aspectRatio = `${dimensions.width} / ${dimensions.height}`;
        ui.measureShape.style.width = `${dimensions.width / 150 * 90}%`;
        ui.measureShape.style.height = `${dimensions.height / 150 * 90}%`;
        ui.measureShape.setAttribute('role', 'img');
        ui.measureShape.setAttribute('aria-label', `Referência nominal: ${dimensions.width} cm de largura por ${dimensions.height} cm de altura. Não representa as dimensões externas da moldura.`);
        ui.measureShape.setAttribute('title', 'Referência nominal. Dimensões externas e enquadramento a confirmar.');
      }
    }
    document.querySelectorAll('[data-art-measure-section]').forEach(node => { node.hidden = !dimensions; });
    ui.dialog?.querySelectorAll('.consultation-note').forEach(node => { node.hidden = product.status !== 'configured'; });
    updateAction(product);
  }

  // Order assistance never charges a customer: the exact total is confirmed by a human first.
  function manualSaleAvailable(product) {
    return product?.status === 'configured' && !MANUAL_SALE_HOLDS.has(Number(product.id)) && !checkoutOffer(product);
  }

  function deliveryCep() {
    return String(ui.manualCep?.value || '').replace(/\D/g, '').slice(0, 8);
  }

  function manualPurchaseURL(product) {
    if (!state.whatsapp) return new URL('/support.html', window.location.origin).href;
    const selected = selectionFor(product);
    const dimensions = dimensionsFor(product, selected);
    const finish = FINISHES.find(item => item.key === selected?.finish);
    const cep = deliveryCep();
    const message = [
      'Olá! Quero comprar um quadro da Lumen Arts. Pode confirmar o valor final e o frete?',
      'Obra: ' + product.name,
      'ID da obra: ' + (product.id || product.key),
      'Tamanho nominal: ' + (dimensions?.label || 'a confirmar'),
      'Acabamento: ' + (finish?.label || 'a confirmar'),
      'Cor: ' + (selected?.color ? colorLabel(selected.color) : finish?.family === 'infinity' ? 'não se aplica' : 'a confirmar'),
      'CEP de entrega: ' + (cep.length === 8 ? cep.slice(0,5) + '-' + cep.slice(5) : 'a confirmar'),
      'Por favor confirme a fabricação, o enquadramento, o preço e o frete antes de cobrar.',
      'Após confirmar o total comigo, envie um link seguro do Mercado Pago para concluir a compra.'
    ].join('\n');
    const url = new URL('https://wa.me/' + state.whatsapp);
    url.searchParams.set('text', message);
    return url.href;
  }
  function consultationURL(product) {
    if (!state.whatsapp) return new URL('/support.html', window.location.origin).href;
    const selected = selectionFor(product);
    const dimensions = dimensionsFor(product, selected);
    const finish = FINISHES.find(item => item.key === selected?.finish);
    const message = [
      'Olá! Gostaria de consultar valor e entrega desta obra:',
      `Obra: ${product.name}`,
      `ID: ${product.id || product.key}`,
      `Tamanho nominal: ${dimensions?.label || 'a confirmar'}`,
      `Acabamento: ${finish?.label || 'a confirmar'}`,
      `Cor: ${selected?.color ? colorLabel(selected.color) : finish?.family === 'infinity' ? 'não se aplica' : 'a confirmar'}`,
      'Gostaria também de confirmar o enquadramento e as dimensões externas antes do pedido.',
    ].join('\n');
    const url = new URL(`https://wa.me/${state.whatsapp}`);
    url.searchParams.set('text', message);
    return url.href;
  }

  function checkoutOffer(product) {
    if (product?.status !== 'configured' || !state.commerce) return null;
    const selected = selectionFor(product);
    return state.commerce.find(offer =>
      offer.artworkKey === product.key && offer.size === selected.size &&
      offer.finish === selected.finish && offer.color === (selected.color || '')) || null;
  }

  function checkoutURL(product) {
    const selected = selectionFor(product);
    const url = new URL('./checkout.html', window.location.href);
    url.searchParams.set('obra', product.key);
    url.searchParams.set('tamanho', selected.size);
    url.searchParams.set('acabamento', selected.finish);
    if (selected.color) url.searchParams.set('cor', selected.color);
    return url.href;
  }

  async function loadCheckoutConfig() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(CHECKOUT_API + '/config', {
        credentials: 'omit', cache: 'no-store', signal: controller.signal,
      });
      if (!response.ok) throw new Error('checkout-unavailable');
      const config = await response.json();
      state.commerce = config.checkoutEnabled === true && config.mode === 'PROD' &&
        config.currency === 'BRL' && Array.isArray(config.readySelections)
        ? config.readySelections.filter(offer => offer && typeof offer.artworkKey === 'string' &&
          typeof offer.size === 'string' && typeof offer.finish === 'string' &&
          typeof offer.color === 'string' && Number.isSafeInteger(offer.priceCents) && offer.priceCents > 0)
        : null;
    } catch {
      state.commerce = null;
    } finally {
      window.clearTimeout(timeout);
      if (activeProduct()) updateAction(activeProduct());
    }
  }

  function updateAction(product) {
    if (!ui.action) return;
    const offer = checkoutOffer(product);
    const manual = manualSaleAvailable(product);
    setHidden(ui.manualOrder, !manual);
    if (!manual) setHidden(ui.manualError, true);
    let price = document.getElementById('art-checkout-price');
    if (offer) {
      if (!price) {
        price = el('p', 'art-checkout-price');
        price.id = 'art-checkout-price';
        ui.action.before(price);
      }
      price.hidden = false;
      price.textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
        .format(offer.priceCents / 100) + ' · frete calculado no próximo passo';
      ui.action.textContent = 'Comprar este quadro';
      ui.action.dataset.action = 'checkout';
      ui.action.removeAttribute('aria-pressed');
      ui.action.removeAttribute('aria-disabled');
      ui.action.removeAttribute('disabled');
      if ('disabled' in ui.action) ui.action.disabled = false;
      ui.action.setAttribute('aria-label', 'Comprar ' + product.name + ' na configuração selecionada');
      if (ui.action.tagName === 'A') {
        ui.action.href = checkoutURL(product);
        ui.action.removeAttribute('target');
        ui.action.removeAttribute('rel');
        ui.action.removeAttribute('role');
      }
      setText(ui.availability, 'Esta configuração está disponível para compra. Confira a entrega pelo seu CEP no próximo passo.');
      ui.dialog?.querySelectorAll('.consultation-note').forEach(node => { node.hidden = true; });
      return;
    }
    if (price) price.hidden = true;
    ui.dialog?.querySelectorAll('.consultation-note').forEach(node => { node.hidden = product.status !== 'configured'; });
    const configured = product.status === 'configured';
    const saved = state.favorites.has(product.key);
    ui.action.textContent = manual ? 'Quero comprar — confirmar frete' : configured ? 'Consultar disponibilidade' : saved ? 'Salvo para depois' : 'Salvar para depois';
    ui.action.dataset.action = manual ? 'manual' : configured ? 'consult' : 'save';
    ui.action.removeAttribute('disabled');
    if ('disabled' in ui.action) ui.action.disabled = false;
    ui.action.removeAttribute('aria-disabled');
    if (configured) {
      ui.action.removeAttribute('aria-pressed');
      ui.action.setAttribute('aria-label', manual ? 'Solicitar compra de ' + product.name + ' com frete confirmado antes do pagamento' : state.whatsapp
        ? 'Consultar disponibilidade no WhatsApp, abre em nova aba'
        : 'Consultar disponibilidade no suporte');
      if (ui.action.tagName === 'A') {
        ui.action.href = manual ? manualPurchaseURL(product) : consultationURL(product);
        ui.action.target = state.whatsapp ? '_blank' : '_self';
        ui.action.rel = 'noopener noreferrer';
        ui.action.removeAttribute('role');
      }
    } else {
      ui.action.setAttribute('aria-pressed', String(saved));
      ui.action.setAttribute('aria-label', saved ? `${product.name} salvo para depois` : `Salvar ${product.name} para depois`);
      if (ui.action.tagName === 'A') {
        ui.action.removeAttribute('href');
        ui.action.removeAttribute('target');
        ui.action.setAttribute('role', 'button');
        ui.action.tabIndex = 0;
      }
    }
  }

  function renderRelated(product) {
    if (!ui.related) return;
    const ranked = state.products.filter(item => item.key !== product.key && item.collection === product.collection).map((item, index) => ({
      item, index,
      score: (item.collection === product.collection ? 2 : 0) +
        (item.mood.some(mood => product.mood.some(other => fold(other) === fold(mood))) ? 1 : 0),
    })).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 3);
    ui.related.replaceChildren(...ranked.map(({ item }) => {
      const link = el('a', 'related-card');
      link.href = productURL(item.key);
      link.dataset.open = item.key;
      link.setAttribute('aria-label', `Ver obra ${item.name}`);
      link.append(cardImage(item), el('span', 'related-card__name', item.name));
      return link;
    }));
    updateRelatedRatios();
  }

  function renderDialog(product) {
    setText(ui.title, product.name);
    setText(ui.collection, product.collection);
    setText(document.getElementById('art-code'), product.id ? `Referência ${product.id}` : '');
    setText(ui.description, product.description || 'Explore a composição e as referências visuais desta obra.');
    if (ui.dialog) ui.dialog.dataset.status = product.status;
    updateSaveButton(ui.save, product, true);
    renderOptions(product);
    renderGallery(product);
    renderRelated(product);
  }

  function openArt(key, { historyMode = 'push', opener = null, source = 'catalog', preview = null } = {}) {
    const product = state.byKey.get(key);
    if (!product || !ui.dialog) return;
    const wasOpen = Boolean(state.activeKey);
    if (!wasOpen && opener && !ui.dialog.contains(opener)) state.opener = opener;
    if (state.activeKey !== key && ui.manualCep) ui.manualCep.value = '';
    setHidden(ui.manualError, true);
    state.activeKey = key;
    state.gallery = applyPreviewSelection(product, preview)
      ? (nativePreviewAvailable(product) ? 'native' : 'framing')
      : product.status === 'preparation'
        ? product.native.approvedPreviews.find(photo => photo.defaultPreview)?.key || 'editorial'
        : 'editorial';
    renderDialog(product);
    if (historyMode !== 'none') updateProductURL(key, wasOpen || historyMode === 'replace');
    if (state.previousOverflow === null) {
      state.previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    document.documentElement.classList.add('art-dialog-open');
    if (!ui.dialog.open) {
      if (typeof ui.dialog.showModal === 'function') {
        try { ui.dialog.showModal(); }
        catch { ui.dialog.setAttribute('open', ''); }
      } else ui.dialog.setAttribute('open', '');
    }
    ui.dialog.scrollTop = 0;
    const focusTarget = ui.title || ui.dialog.querySelector('[data-close-art]') || ui.dialog;
    if (focusTarget === ui.title) focusTarget.tabIndex = -1;
    focusTarget.focus({ preventScroll: true });
    emit('product_open', { key, status: product.status, source });
  }

  function closeDialogUI(reason = 'button', restoreFocus = true) {
    const key = state.activeKey;
    if (!key && !ui.dialog?.open) return;
    state.activeKey = null;
    if (ui.dialog?.open) {
      if (typeof ui.dialog.close === 'function') ui.dialog.close();
      else ui.dialog.removeAttribute('open');
    }
    if (state.previousOverflow !== null) {
      document.body.style.overflow = state.previousOverflow;
      state.previousOverflow = null;
    }
    document.documentElement.classList.remove('art-dialog-open');
    if (restoreFocus) {
      const target = state.opener?.isConnected && !ui.dialog?.contains(state.opener)
        ? state.opener : findDataNode(ui.grid, 'data-open', key) || ui.search || ui.savedOnly;
      target?.focus({ preventScroll: true });
    }
    state.opener = null;
    if (key) emit('product_close', { key, reason });
  }

  function requestClose(reason = 'button') {
    if (!state.activeKey && !ui.dialog?.open) return;
    const marker = history.state?.[HISTORY_KEY];
    const shouldGoBack = marker?.owner === HISTORY_OWNER && marker.pushed;
    closeDialogUI(reason);
    if (shouldGoBack) history.back(); else clearProductURL();
  }

  function syncFromURL() {
    if (!state.ready) return;
    const key = new URL(window.location.href).searchParams.get('obra');
    if (key && state.byKey.has(key)) openArt(key, { historyMode: 'none', source: 'history' });
    else {
      closeDialogUI('history');
      if (key) {
        clearProductURL();
        announce('Essa obra não foi encontrada. Você pode explorar o catálogo.');
        emit('product_link_unavailable');
      }
    }
  }

  function changeVariant(type, value, focusAttribute) {
    const product = activeProduct();
    if (!product || product.status !== 'configured') return;
    const selected = selectionFor(product);
    if (type === 'finish' && !availableFinishes(product).some(item => item.key === value)) return;
    if (type === 'color' && !availableColors(product, selected.finish).some(item => item.key === value)) return;
    if (type === 'size' && !availableSizes(product).some(item => item.key === value)) return;
    selected[type] = value;
    state.selections.set(product.key, selected);
    selectionFor(product);
    if (type === 'finish' || type === 'color') state.gallery = nativePreviewAvailable(product) ? 'native' : 'framing';
    else if (type === 'size' && product.images.original) state.gallery = 'framing';
    renderOptions(product);
    renderGallery(product);
    findDataNode(ui.dialog, focusAttribute, value)?.focus({ preventScroll: true });
    emit('variant_changed', { key: product.key, variant: type, value });
  }

  function onAction(event) {
    const product = activeProduct();
    if (!product) { event.preventDefault(); return; }
    if (product.status !== 'configured') {
      event.preventDefault();
      setFavorite(product.key, true, 'preparation');
      return;
    }
    if (checkoutOffer(product)) {
      emit('checkout_open', { key: product.key });
      if (ui.action.tagName !== 'A') {
        event.preventDefault();
        window.location.assign(checkoutURL(product));
      }
      return;
    }
    if (manualSaleAvailable(product)) {
      if (deliveryCep().length !== 8) {
        event.preventDefault();
        setHidden(ui.manualError, false);
        ui.manualCep?.focus();
        return;
      }
      setHidden(ui.manualError, true);
      emit('manual_purchase_request', { key: product.key }); // Never collect CEP/PII in analytics.
      const link = manualPurchaseURL(product);
      if (ui.action.tagName === 'A') { ui.action.href = link; return; }
      event.preventDefault();
      if (state.whatsapp) window.open(link, '_blank', 'noopener,noreferrer');
      else window.location.assign(link);
      return;
    }
    emit('consultation_open', { key: product.key, destination: state.whatsapp ? 'whatsapp' : 'support' });
    if (ui.action.tagName !== 'A') {
      event.preventDefault();
      const destination = consultationURL(product);
      if (state.whatsapp) window.open(destination, '_blank', 'noopener,noreferrer');
      else window.location.assign(destination);
    }
  }

  function handleClick(event) {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target) return;
    const expand = target.closest('[data-expand-collection]');
    if (expand) { event.preventDefault(); expandCollection(expand.dataset.expandCollection); return; }
    const save = target.closest('[data-save]');
    if (save) {
      event.preventDefault();
      setFavorite(save.dataset.save, !state.favorites.has(save.dataset.save));
      return;
    }
    const close = target.closest('[data-close-art]');
    if (close && ui.dialog?.contains(close)) {
      event.preventDefault(); requestClose(); return;
    }
    const open = target.closest('[data-open]');
    if (open) {
      if (open.tagName === 'A' && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0)) return;
      event.preventDefault();
      openArt(open.dataset.open, {
        opener: open,
        source: ui.dialog?.contains(open) ? 'related' : 'catalog',
        preview: { finish: open.dataset.previewFinish, color: open.dataset.previewColor },
      });
      return;
    }
    const gallery = target.closest('[data-gallery]');
    if (gallery && ui.thumbnails?.contains(gallery) && activeProduct()) {
      event.preventDefault();
      state.gallery = gallery.dataset.gallery;
      renderGallery(activeProduct());
      findDataNode(ui.thumbnails, 'data-gallery', state.gallery)?.focus({ preventScroll: true });
      emit('gallery_changed', { key: state.activeKey, view: state.gallery });
      return;
    }
    for (const [attribute, type] of [['data-finish', 'finish'], ['data-color', 'color'], ['data-size', 'size']]) {
      const option = target.closest(`[${attribute}]`);
      if (option && ui.dialog?.contains(option)) {
        event.preventDefault(); changeVariant(type, option.getAttribute(attribute), attribute); return;
      }
    }
    for (const type of ['collection', 'mood']) {
      const button = target.closest(`[data-${type}]`);
      if (button) {
        event.preventDefault(); setFilter(type, button.dataset[type]); return;
      }
    }
    if (target.closest('[data-clear-catalog]')) { event.preventDefault(); resetFilters(); }
    if (target.closest('[data-retry-catalog]')) { event.preventDefault(); loadCatalog(); }
  }

  function trapDialogKeys(event) {
    if (!ui.dialog?.open) return;
    if (event.key === 'Escape') {
      event.preventDefault(); requestClose('escape'); return;
    }
    if (event.key !== 'Tab') return;
    const nodes = [...ui.dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, audio[controls], video[controls], [contenteditable="true"], [tabindex]:not([tabindex="-1"])')]
      .filter(node => !node.hidden && !node.closest('[hidden]') && node.getClientRects().length && node.tabIndex >= 0);
    if (!nodes.length) { event.preventDefault(); ui.dialog.focus(); return; }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === ui.title || document.activeElement === ui.dialog)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }

  async function loadCatalog() {
    if (state.loading) return;
    state.loading = true;
    ui.grid.setAttribute('aria-busy', 'true');
    ui.grid.replaceChildren(el('p', 'catalog-loading', 'Carregando obras…'));
    setText(ui.count, 'Carregando catálogo…');
    setHidden(ui.loadMore, true);
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? window.setTimeout(() => controller.abort(), 20000) : null;
    try {
      const response = await fetch('./catalog.json?v=20261120-approved55', { credentials: 'same-origin', signal: controller?.signal });
      if (!response.ok) throw new Error('catalog-request-failed');
      const catalog = await response.json();
      if (!catalog || !Array.isArray(catalog.products)) throw new Error('invalid-catalog');
      const unique = new Map();
      catalog.products.forEach(value => {
        const product = normalizeProduct(value);
        if (product && !unique.has(product.key)) unique.set(product.key, product);
      });
      state.byKey = unique;
      state.products = [...unique.values()];
      state.sizes = normalizeSizes(catalog.sizes);
      state.whatsapp = normalizeWhatsApp(catalog.contact?.whatsapp);
      state.ready = true;
      // Only the server's approved variant list can make a purchase action available.
      renderGrid();
      syncFromURL();
      syncCollectionAnchor();
      emit('catalog_loaded', { productCount: state.products.length });
    } catch {
      state.ready = false;
      const error = el('div', 'catalog-error');
      const retry = el('button', 'option-button', 'Tentar novamente');
      retry.type = 'button';
      retry.dataset.retryCatalog = '';
      error.append(el('p', '', 'Não foi possível carregar o catálogo.'), retry);
      ui.grid.replaceChildren(error);
      ui.grid.setAttribute('aria-busy', 'false');
      setText(ui.count, 'Catálogo indisponível');
      announce('Não foi possível carregar o catálogo. Use Tentar novamente.');
      emit('catalog_error');
    } finally {
      if (timer !== null) window.clearTimeout(timer);
      state.loading = false;
    }
  }

  function arrangeProductLayout() {
    const layout = document.querySelector('.art-layout');
    const gallery = document.querySelector('.art-gallery');
    const details = document.querySelector('.art-details');
    const intro = document.querySelector('.art-intro');
    const measure = document.querySelector('[data-art-measure-section]');
    const summary = document.querySelector('.configuration-summary');
    if (!layout || !gallery || !details || !intro || !measure || !summary) return;
    const mobile = window.matchMedia('(max-width: 760px)');
    function arrange() {
      if (mobile.matches) {
        layout.insertBefore(intro, gallery);
        details.insertBefore(measure, summary);
      } else {
        details.insertBefore(intro, details.firstChild);
        gallery.append(measure);
      }
    }
    arrange();
    mobile.addEventListener?.('change', arrange);
  }

  function init() {
    const ids = {
      grid: 'product-grid', count: 'result-count', loadMore: 'load-more',
      search: 'catalog-search', orientation: 'orientation-filter', savedOnly: 'saved-only', clear: 'clear-filters',
      dialog: 'art-dialog', title: 'art-title', collection: 'art-collection', description: 'art-description',
      image: 'art-image', caption: 'art-caption', thumbnails: 'art-thumbnails', materials: 'art-materials',
      sizes: 'art-size-options', frames: 'art-frame-options', colors: 'art-color-options',
      summary: 'art-summary', availability: 'art-availability', action: 'art-action', save: 'art-save',
      manualOrder: 'art-manual-order', manualCep: 'art-delivery-cep', manualError: 'art-delivery-error',
      related: 'art-related', measureWidth: 'art-measure-width', measureHeight: 'art-measure-height', measureShape: 'art-measure-shape',
    };
    ui = Object.fromEntries(Object.entries(ids).map(([key, id]) => [key, document.getElementById(id)]));
    if (!ui.grid) return;
    arrangeProductLayout();
    liveRegion = document.getElementById('lumen-shop-live');
    if (!liveRegion) {
      liveRegion = el('div', 'sr-only');
      liveRegion.id = 'lumen-shop-live';
      liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;';
      document.body.append(liveRegion);
    }
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    if (ui.count) { ui.count.setAttribute('role', 'status'); ui.count.setAttribute('aria-live', 'polite'); }
    for (const [node, label] of [[ui.sizes, 'Tamanho nominal'], [ui.frames, 'Acabamento'], [ui.colors, 'Cor da moldura'], [ui.thumbnails, 'Visualizações da obra']]) {
      if (node) { node.setAttribute('role', 'group'); node.setAttribute('aria-label', label); }
    }
    document.addEventListener('click', handleClick);
    ui.search?.addEventListener('input', () => {
      state.filters.query = ui.search.value.slice(0, 200);
      state.collectionVisible.clear();
      renderGrid();
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => emit('search_changed', {
        queryLength: state.filters.query.length, resultCount: filteredProducts().length,
      }), 300);
    });
    ui.orientation?.addEventListener('change', () => setFilter('orientation', fold(ui.orientation.value)));
    ui.savedOnly?.addEventListener('click', event => {
      event.preventDefault(); setFilter('saved', !state.filters.saved);
    });
    ui.clear?.addEventListener('click', event => { event.preventDefault(); resetFilters(); });
    ui.save?.addEventListener('click', event => {
      event.preventDefault();
      if (state.activeKey) setFavorite(state.activeKey, !state.favorites.has(state.activeKey), 'dialog');
    });
    ui.action?.addEventListener('click', onAction);
    ui.manualCep?.addEventListener('input', () => {
      const digits = deliveryCep();
      ui.manualCep.value = digits.length > 5 ? digits.slice(0,5) + '-' + digits.slice(5) : digits;
      setHidden(ui.manualError, true);
      const product = activeProduct();
      if (product && manualSaleAvailable(product) && ui.action?.tagName === 'A') ui.action.href = manualPurchaseURL(product);
    });
    ui.action?.addEventListener('keydown', event => {
      if (ui.action.tagName === 'A' && !ui.action.hasAttribute('href') && [' ', 'Enter'].includes(event.key)) {
        event.preventDefault(); ui.action.click();
      }
    });
    if (ui.dialog) {
      ui.dialog.setAttribute('aria-labelledby', 'art-title');
      ui.dialog.setAttribute('aria-modal', 'true');
      ui.dialog.tabIndex = -1;
      if (!ui.dialog.querySelector('[data-close-art]')) {
        const close = el('button', 'art-dialog__close', 'Fechar');
        close.type = 'button';
        close.dataset.closeArt = '';
        ui.dialog.prepend(close);
      }
      ui.dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose('escape'); });
      ui.dialog.addEventListener('close', () => { if (state.activeKey) requestClose('native'); });
      ui.dialog.addEventListener('keydown', trapDialogKeys);
    }
    const scheduleReflow = () => {
      if (reflowFrame) return;
      reflowFrame = window.requestAnimationFrame(() => {
        reflowFrame = null;
        renderGrid();
        updateRelatedRatios();
      });
    };
    if (window.matchMedia) {
      ['(max-width: 760px)', '(max-width: 1100px)'].forEach(query => {
        const media = window.matchMedia(query);
        if (media.addEventListener) media.addEventListener('change', scheduleReflow);
        else media.addListener(scheduleReflow);
      });
    } else {
      let previousColumns = gridColumns();
      window.addEventListener('resize', () => {
        const nextColumns = gridColumns();
        if (nextColumns !== previousColumns) { previousColumns = nextColumns; scheduleReflow(); }
      });
    }
    window.addEventListener('popstate', syncFromURL);
    window.addEventListener('hashchange', syncCollectionAnchor);
    window.addEventListener('storage', event => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      state.favorites = event.key === null ? new Set() : parseFavorites(event.newValue);
      if (state.filters.saved) renderGrid(); else refreshFavoriteButtons();
      if (activeProduct()) { updateSaveButton(ui.save, activeProduct(), true); updateAction(activeProduct()); }
    });
    updateFilterButtons();
    loadCatalog();
    loadCheckoutConfig();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
