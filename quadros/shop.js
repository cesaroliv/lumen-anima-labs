/* Lumen / 3Print — static catalogue interactions. No checkout or analytics requests. */
(() => {
  'use strict';

  const PAGE_SIZE = 12;
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
  const FINISHES = [
    { key: 'box-no-glass', label: 'Caixa sem vidro', family: 'box' },
    { key: 'box-glass', label: 'Caixa com vidro', family: 'box' },
    { key: 'canvas-frame', label: 'Canvas com moldura', family: 'canvas' },
    { key: 'infinity', label: 'Borda infinita', family: 'infinity' },
  ];
  const state = {
    products: [], byKey: new Map(), sizes: [], whatsapp: '', ready: false, loading: false,
    favorites: readFavorites(), visible: PAGE_SIZE, activeKey: null, opener: null,
    selections: new Map(), gallery: 'editorial', previousOverflow: null,
    filters: { collection: 'all', mood: 'all', orientation: 'all', query: '', saved: false },
  };
  let ui = {};
  let liveRegion;
  let searchTimer;

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

  function normalizeProduct(value) {
    if (!value || typeof value !== 'object') return null;
    const key = plain(value.key, 200);
    const name = plain(value.name, 300);
    if (!key || !name) return null;
    const width = Number(value.width);
    const height = Number(value.height);
    const orientation = ['horizontal', 'vertical'].includes(value.orientation)
      ? value.orientation : (width > height ? 'horizontal' : 'vertical');
    const images = value.images || {};
    const native = value.native || {};
    const product = {
      key, id: plain(value.id, 200), name,
      collection: plain(value.collection, 200),
      mood: strings(value.mood), tags: strings(value.tags),
      description: plain(value.description, 6000),
      status: value.status === 'configured' ? 'configured' : 'preparation',
      orientation,
      images: {
        editorial: safeImageURL(images.editorial),
        editorialSmall: safeImageURL(images.editorialSmall),
        original: safeImageURL(images.original),
      },
      native: {
        cover: safeImageURL(native.cover),
        box: normalizeColorMap(native.box),
        canvas: normalizeColorMap(native.canvas),
        infinity: safeImageURL(native.infinity),
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

  function cardImage(product) {
    const options = [
      [product.images.editorialSmall, 'editorial'],
      [product.images.editorial, 'editorial'],
      [product.images.original, 'original'],
      [product.native.cover, 'native'],
    ].filter(([src]) => src);
    const image = el('img', 'product-card__image');
    image.loading = 'lazy';
    image.decoding = 'async';
    image.width = 1000;
    image.height = 800;
    image.style.objectFit = 'contain';
    let index = 0;
    function useNext() {
      const item = options[index++];
      if (!item) {
        image.hidden = true;
        if (image.parentNode && !image.parentNode.querySelector('.image-unavailable')) {
          image.parentNode.append(el('span', 'image-unavailable', 'Imagem indisponível'));
        }
        return;
      }
      image.alt = item[1] === 'editorial'
        ? `Ambientação ilustrativa da obra ${product.name}`
        : item[1] === 'original' ? `Arte ${product.name}, composição completa`
          : `Visualização digital da obra ${product.name}`;
      image.src = item[0];
    }
    image.addEventListener('error', useNext);
    useNext();
    return image;
  }

  function createCard(product) {
    const card = el('article', 'product-card');
    card.dataset.key = product.key;
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

  function renderGrid() {
    if (!ui.grid || !state.ready) return;
    const products = filteredProducts();
    const shown = products.slice(0, state.visible);
    const fragment = document.createDocumentFragment();
    shown.forEach(product => fragment.append(createCard(product)));
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
    ui.grid.replaceChildren(fragment);
    ui.grid.setAttribute('aria-busy', 'false');
    const filterContext = [!isAll(state.filters.mood) ? state.filters.mood : '', state.filters.saved ? 'minha seleção' : ''].filter(Boolean);
    const countLabel = products.length
      ? `${shown.length} de ${products.length} ${products.length === 1 ? 'obra' : 'obras'}`
      : '0 obras';
    setText(ui.count, countLabel + (filterContext.length ? ` · ${filterContext.join(' · ')}` : ''));
    if (ui.loadMore) {
      ui.loadMore.hidden = shown.length >= products.length;
      ui.loadMore.disabled = shown.length >= products.length;
    }
    updateFilterButtons();
  }

  function resetFilters() {
    state.filters = { collection: 'all', mood: 'all', orientation: 'all', query: '', saved: false };
    state.visible = PAGE_SIZE;
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
    state.visible = PAGE_SIZE;
    renderGrid();
    emit('filter_changed', { filter: type, resultCount: filteredProducts().length });
    if (type === 'mood' || type === 'saved') scrollToCatalog();
  }

  function scrollToCatalog() {
    const catalog = document.getElementById('acervo');
    if (!catalog) return;
    const heading = document.getElementById('catalog-title') || catalog;
    if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    catalog.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  }

  function findDataNode(container, attribute, value) {
    return container ? [...container.querySelectorAll(`[${attribute}]`)]
      .find(node => node.getAttribute(attribute) === value) : null;
  }

  function setFavorite(key, desired, source = 'card') {
    const product = state.byKey.get(key);
    if (!product) return;
    const focused = document.activeElement;
    const restoreCard = focused?.getAttribute?.('data-save') === key;
    if (desired) state.favorites.add(key); else state.favorites.delete(key);
    const persisted = persistFavorites();
    renderGrid();
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
    const size = state.sizes.find(item => item.key === saved.size)?.key || state.sizes[0]?.key || '';
    const selected = { finish, color, size };
    state.selections.set(product.key, selected);
    return selected;
  }

  function dimensionsFor(product, selected) {
    const size = state.sizes.find(item => item.key === selected?.size);
    if (!size) return null;
    const width = product.orientation === 'horizontal' ? size.long : size.short;
    const height = product.orientation === 'horizontal' ? size.short : size.long;
    return { width, height, label: `${width} × ${height} cm` };
  }

  function colorLabel(key) { return COLORS.find(color => color.key === key)?.label || ''; }

  function selectedNative(product, selected) {
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
    const native = product.status === 'configured' ? selectedNative(product, selected) : '';
    if (native) {
      const finish = FINISHES.find(item => item.key === selected?.finish);
      const frameDescription = finish ? `${finish.label}${selected.color ? `, ${colorLabel(selected.color)}` : ''}` : 'Acabamento';
      items.push({
        key: 'native', label: 'Acabamento', src: native, thumbnail: native,
        alt: `Visualização digital de ${product.name}: ${frameDescription}`,
        caption: finish?.family === 'box'
          ? 'Visualização digital da moldura caixa. O vidro não é demonstrado nesta imagem. Enquadramento e acabamento final serão confirmados na consulta.'
          : 'Visualização digital do acabamento. Enquadramento final e dimensões externas serão confirmados na consulta.',
      });
    }
    if (product.status === 'configured' && product.native.cover) items.push({
      key: 'cover', label: 'Vista no ambiente', src: product.native.cover, thumbnail: product.native.cover,
      alt: `Visualização digital de ${product.name} no ambiente`,
      caption: 'Simulação digital no ambiente, com proporção ilustrativa. Confira as medidas e o acabamento da opção escolhida.',
    });
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
      ui.image.style.objectFit = 'contain';
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
      const buttons = configured ? state.sizes.map(size => {
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

  function updateAction(product) {
    if (!ui.action) return;
    const configured = product.status === 'configured';
    const saved = state.favorites.has(product.key);
    ui.action.textContent = configured ? 'Consultar valor e entrega' : saved ? 'Salvo para depois' : 'Salvar para depois';
    ui.action.dataset.action = configured ? 'consult' : 'save';
    ui.action.removeAttribute('disabled');
    if ('disabled' in ui.action) ui.action.disabled = false;
    ui.action.removeAttribute('aria-disabled');
    if (configured) {
      ui.action.removeAttribute('aria-pressed');
      ui.action.setAttribute('aria-label', state.whatsapp
        ? 'Consultar valor e entrega no WhatsApp, abre em nova aba'
        : 'Consultar valor e entrega no suporte');
      if (ui.action.tagName === 'A') {
        ui.action.href = consultationURL(product);
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
    const ranked = state.products.filter(item => item.key !== product.key).map((item, index) => ({
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

  function openArt(key, { historyMode = 'push', opener = null, source = 'catalog' } = {}) {
    const product = state.byKey.get(key);
    if (!product || !ui.dialog) return;
    const wasOpen = Boolean(state.activeKey);
    if (!wasOpen && opener && !ui.dialog.contains(opener)) state.opener = opener;
    state.activeKey = key;
    state.gallery = 'editorial';
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
    if (type === 'size' && !state.sizes.some(item => item.key === value)) return;
    selected[type] = value;
    state.selections.set(product.key, selected);
    selectionFor(product);
    if (type === 'finish' || type === 'color') state.gallery = 'native';
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
      openArt(open.dataset.open, { opener: open, source: ui.dialog?.contains(open) ? 'related' : 'catalog' });
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
      const response = await fetch('./catalog.json', { credentials: 'same-origin', signal: controller?.signal });
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
      // commerce.checkoutEnabled never enables billing here: this page is consultation-only.
      renderGrid();
      syncFromURL();
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
      state.visible = PAGE_SIZE;
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
    ui.loadMore?.addEventListener('click', event => {
      event.preventDefault();
      const previous = Math.min(state.visible, filteredProducts().length);
      state.visible += PAGE_SIZE;
      renderGrid();
      const firstNew = ui.grid.querySelectorAll('.product-card__open')[previous];
      if (firstNew) {
        firstNew.focus({ preventScroll: true });
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        firstNew.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
      }
      emit('load_more', { shown: Math.min(state.visible, filteredProducts().length), resultCount: filteredProducts().length });
    });
    ui.save?.addEventListener('click', event => {
      event.preventDefault();
      if (state.activeKey) setFavorite(state.activeKey, !state.favorites.has(state.activeKey), 'dialog');
    });
    ui.action?.addEventListener('click', onAction);
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
    window.addEventListener('popstate', syncFromURL);
    window.addEventListener('storage', event => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      state.favorites = event.key === null ? new Set() : parseFavorites(event.newValue);
      renderGrid();
      if (activeProduct()) { updateSaveButton(ui.save, activeProduct(), true); updateAction(activeProduct()); }
    });
    updateFilterButtons();
    loadCatalog();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
