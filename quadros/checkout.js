/* Lumen Arts physical checkout. Amounts and availability are authoritative on the server. */
(() => {
  'use strict';
  const API = 'https://lumen-digital-checkout.ccoliveira1.workers.dev/api/quadros';
  const STORAGE_KEY = 'lumen:quadros:checkout:v1';
  const FINISHES = {
    'box-no-glass': { label: 'Caixa sem vidro', family: 'box' },
    'box-glass': { label: 'Caixa com vidro', family: 'box' },
    'canvas-frame': { label: 'Canvas com moldura', family: 'canvas' },
    infinity: { label: 'Borda infinita', family: 'infinity' },
  };
  const COLORS = { Preto: 'Preto', Branco: 'Branco', Crua: 'Crua', Tabaco: 'Tabaco', Freijo: 'Freijó' };
  const TERMINAL = new Set(['approved', 'rejected', 'cancelled', 'refunded', 'manual_review']);
  const SCREENS = ['unavailable', 'shipping', 'details', 'review', 'payment', 'status'];
  const state = { config: null, catalog: null, art: null, selection: null, quote: null, shipping: null, order: null, saved: null,
    createKey: null, paymentKey: null, createPayload: null, createStarted: false, busy: false, submitting: false,
    sdk: null, builder: null, paymentController: null, statusController: null, statusPaymentId: null,
    pix: null, poll: null, pollCount: 0, refreshing: false, disposed: false };
  const $ = id => document.getElementById(id);
  const text = (id, value) => { $(id).textContent = String(value ?? ''); };
  const money = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  const digits = value => String(value || '').replace(/\D/g, '');
  const validCents = value => Number.isSafeInteger(value) && value >= 0 && value <= 100000000;
  const uuid = () => {
    if (!window.crypto?.randomUUID) throw new Error('BROWSER_UNSUPPORTED');
    return window.crypto.randomUUID();
  };
  const isUUID = value => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  function notice(message = '', error = false) {
    text('checkout-notice', message);
    $('checkout-notice').classList.toggle('is-error', error);
  }
  function screen(name, focus = false) {
    SCREENS.forEach(key => { $(key + '-screen').hidden = key !== name; });
    const step = ['details'].includes(name) ? 'details' : ['review', 'payment', 'status'].includes(name) ? 'payment' : 'shipping';
    const order = ['shipping', 'details', 'payment'];
    document.querySelectorAll('[data-step]').forEach(el => {
      if (el.dataset.step === step && name !== 'unavailable') el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
      el.classList.toggle('is-complete', name !== 'unavailable' && order.indexOf(el.dataset.step) < order.indexOf(step));
    });
    if (focus) {
      const heading = $(name + '-screen').querySelector('h2');
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      if (window.innerWidth < 651) $(name + '-screen').scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(API + path, {
        method: options.method || 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store',
        headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) },
        body: options.body ? JSON.stringify(options.body) : undefined, signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error('API_REQUEST_FAILED'), {
        code: typeof data.error === 'string' ? data.error : typeof data.code === 'string' ? data.code : '',
        httpStatus: response.status,
      });
      return data;
    } finally { clearTimeout(timer); }
  }
  function safeAsset(path) {
    if (typeof path !== 'string' || !/^assets\/[a-zA-Z0-9_.-]+\.(webp|png|jpg|jpeg)$/.test(path)) return null;
    return new URL(path, window.location.href).href;
  }
  function readSelection(product, params) {
    if (!product || product.status !== 'configured') return null;
    const size = params.get('tamanho') || '';
    const finish = params.get('acabamento') || '';
    const color = params.get('cor') || '';
    if (!state.catalog.sizes.includes(size) || !FINISHES[finish]) return null;
    const family = FINISHES[finish].family;
    if (family === 'infinity') return color === '' && product.native?.infinity ? { size, finish, color: '' } : null;
    return COLORS[color] && product.native?.[family]?.[color] ? { size, finish, color } : null;
  }
  function selectionLabel(selection = state.selection, art = state.art) {
    if (!selection) return '';
    const [short, long] = selection.size.split('x');
    return (art?.orientation === 'horizontal' ? long + ' × ' + short : short + ' × ' + long) + ' cm';
  }
  function updateConsultation() {
    const message = state.art ? [
      'Olá! Quero confirmar os detalhes desta obra:',
      'Obra: ' + state.art.name,
      'Referência: ' + (state.art.id || state.art.key),
      state.selection ? 'Tamanho: ' + selectionLabel() : '',
      state.selection ? 'Acabamento: ' + FINISHES[state.selection.finish].label : '',
      state.selection?.color ? 'Cor: ' + COLORS[state.selection.color] : '',
      'Gostaria de confirmar o valor total, o enquadramento e a entrega antes do pedido.',
    ].filter(Boolean).join('\n') : 'Olá! Gostaria de ajuda para escolher meu quadro Lumen Arts.';
    const url = new URL('https://wa.me/5511978230487'); url.searchParams.set('text', message);
    $('consultation-link').href = url.href;
  }
  function renderArtwork() {
    const art = state.art;
    if (!art) return updateConsultation();
    text('artwork-name', art.name);
    text('artwork-collection', art.collection);
    text('artwork-reference', 'Referência ' + (art.id || art.key));
    const link = new URL('./', window.location.href); link.searchParams.set('obra', art.key);
    $('back-to-art').href = link.href;
    let image = art.images?.editorial || art.native?.cover;
    if (state.selection) {
      const family = FINISHES[state.selection.finish]?.family;
      image = family === 'infinity' ? art.native?.infinity : art.native?.[family]?.[state.selection.color];
      image ||= art.images?.editorial;
      text('selection-size', selectionLabel());
      text('selection-finish', FINISHES[state.selection.finish].label);
      text('selection-color', state.selection.color ? COLORS[state.selection.color] : 'Sem moldura');
    }
    const src = safeAsset(image);
    if (src) { $('artwork-image').src = src; $('artwork-image').alt = art.name + ' — visualização da sua escolha'; $('artwork-image').hidden = false; }
    updateConsultation();
  }
  function unavailable(message, title) {
    notice('');
    text('unavailable-title', title || 'Vamos cuidar dos próximos detalhes.');
    text('unavailable-copy', message || 'Esta configuração está em consulta. Confirme com a Lumen Arts o valor, o acabamento e a entrega antes de fechar o pedido.');
    screen('unavailable');
  }
  function readSaved() {
    try {
      const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!value || !/^[a-zA-Z0-9_-]{8,100}$/.test(value.orderId) || !/^[a-zA-Z0-9._-]{32,512}$/.test(value.accessToken) || !isUUID(value.paymentKey)) return null;
      return { orderId: value.orderId, accessToken: value.accessToken, paymentKey: value.paymentKey };
    } catch { return null; }
  }
  function persistSaved(value) {
    const safe = { orderId: value.orderId, accessToken: value.accessToken, paymentKey: value.paymentKey };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    if (sessionStorage.getItem(STORAGE_KEY) !== JSON.stringify(safe)) throw new Error('RECOVERY_STORAGE_UNAVAILABLE');
    state.saved = safe;
  }
  function storageReady() {
    try { const key = STORAGE_KEY + ':check'; sessionStorage.setItem(key, '1'); sessionStorage.removeItem(key); return true; }
    catch { return false; }
  }
  function readySelection() {
    return state.config?.checkoutEnabled === true && state.config?.currency === 'BRL' &&
      typeof state.config.publicKey === 'string' && state.config.publicKey.length > 10 &&
      Array.isArray(state.config.readySelections) && state.config.readySelections.some(item =>
        item.artworkKey === state.art?.key && item.size === state.selection?.size && item.finish === state.selection?.finish &&
        (item.color || '') === state.selection?.color && validCents(item.priceCents) && item.priceCents > 0);
  }
  function timeNote(quote = state.quote, shipping = state.shipping) {
    if (!shipping) return '';
    const days = Number.isInteger(quote?.productionDays) && quote.productionDays > 0 ? quote.productionDays : null;
    return (days ? 'Produção estimada: ' + days + ' dias úteis após confirmação do pagamento. ' : 'O prazo de produção precisa ser confirmado. ') +
      'Transporte estimado: ' + shipping.deadlineDays + ' dias úteis após a postagem. Os períodos são contados separadamente.';
  }
  function shippingPrices() {
    if (!state.quote || !state.shipping) return;
    text('quote-product-price', money(state.quote.productPriceCents));
    text('quote-shipping-price', money(state.shipping.costCents));
    text('quote-total', money(state.shipping.totalCents));
    text('shipping-time-note', timeNote());
  }
  function validateQuote(data) {
    if (!data || !/^[a-zA-Z0-9_-]{8,120}$/.test(String(data.quoteId || '')) ||
      !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= Date.now() ||
      data.artwork?.key !== state.art.key || data.selection?.size !== state.selection.size ||
      data.selection?.finish !== state.selection.finish || (data.selection?.color || '') !== state.selection.color ||
      !validCents(data.productPriceCents) || data.productPriceCents < 1 ||
      !Number.isInteger(data.productionDays) || data.productionDays < 1 ||
      !Array.isArray(data.shipping) || !data.shipping.length) throw new Error('INVALID_QUOTE');
    for (const option of data.shipping) {
      if (typeof option.id !== 'string' || option.id.length > 150 || !option.id ||
        !validCents(option.costCents) || !validCents(option.totalCents) || option.totalCents !== data.productPriceCents + option.costCents ||
        !Number.isInteger(option.deadlineDays) || option.deadlineDays < 1 || typeof option.label !== 'string') throw new Error('INVALID_QUOTE');
    }
    return data;
  }
  function quoteExpired() { return !state.quote || Date.parse(state.quote.expiresAt) <= Date.now(); }
  async function quoteDelivery(event) {
    event.preventDefault();
    if (state.busy || !readySelection() || !$('shipping-form').reportValidity()) return;
    state.busy = true; $('quote-button').disabled = true; $('cep').disabled = true; $('shipping-result').hidden = true;
    notice('Consultando a entrega para a sua escolha…');
    try {
      const cep = digits($('cep').value);
      const result = validateQuote(await request('/quote', { method: 'POST', body: { artworkKey: state.art.key, ...state.selection, cep } }));
      state.quote = { ...result, cep }; state.shipping = result.shipping[0]; state.createKey = uuid(); state.createStarted = false; state.createPayload = null;
      const elements = result.shipping.map((option, index) => {
        const label = document.createElement('label'); label.className = 'shipping-option';
        const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'shipping'; radio.value = option.id; radio.checked = index === 0;
        const description = document.createElement('span'); description.textContent = option.label;
        const detail = document.createElement('small'); detail.textContent = option.deadlineDays + ' dias úteis de transporte, após a postagem'; description.append(detail);
        const amount = document.createElement('strong'); amount.textContent = money(option.costCents);
        radio.addEventListener('change', () => { state.shipping = option; shippingPrices(); });
        label.append(radio, description, amount); return label;
      });
      $('shipping-options').replaceChildren(...elements); shippingPrices(); $('shipping-result').hidden = false; notice('');
    } catch (error) {
      state.quote = null; state.shipping = null;
      notice(error.httpStatus === 503 || error.httpStatus === 409
        ? 'Ainda não conseguimos confirmar a entrega desta configuração. Fale com a Lumen Arts para concluir sua consulta.'
        : 'Não foi possível consultar a entrega agora. Confira o CEP e tente novamente.', true);
    } finally { state.busy = false; $('quote-button').disabled = false; $('cep').disabled = false; }
  }
  function continueDetails() {
    if (quoteExpired()) { $('shipping-result').hidden = true; notice('A cotação expirou. Calcule a entrega novamente para conferir o valor atualizado.', true); return; }
    $('address-cep').value = state.quote.cep.replace(/^(\d{5})(\d{3})$/, '$1-$2');
    notice(''); screen('details', true);
  }
  function detailsPayload() {
    const get = id => $(id).value.trim();
    return {
      quoteId: state.quote.quoteId, shippingId: state.shipping.id,
      buyer: { name: get('buyer-name'), email: get('buyer-email'), phone: digits(get('buyer-phone')), document: digits(get('buyer-document')) },
      address: { street: get('address-street'), number: get('address-number'), complement: get('address-complement'), district: get('address-district'), city: get('address-city'), state: get('address-state') },
    };
  }
  function reviewDetails(event) {
    event.preventDefault();
    if (!$('details-form').reportValidity() || state.createStarted) return;
    if (quoteExpired()) { screen('shipping', true); $('shipping-result').hidden = true; notice('A cotação expirou. Consulte a entrega novamente antes de continuar.', true); return; }
    const payload = detailsPayload();
    if (![11, 14].includes(payload.buyer.document.length) || ![10, 11, 12, 13].includes(payload.buyer.phone.length)) {
      notice('Confira o CPF ou CNPJ e o telefone com DDD.', true); return;
    }
    state.createPayload = payload;
    text('review-address', [
      payload.buyer.name, payload.address.street + ', ' + payload.address.number + (payload.address.complement ? ' · ' + payload.address.complement : ''),
      payload.address.district + ' · ' + payload.address.city + ' / ' + payload.address.state,
      'CEP ' + $('address-cep').value,
    ].join('\n'));
    text('review-contact', payload.buyer.email + ' · ' + payload.buyer.phone);
    text('review-product-price', money(state.quote.productPriceCents));
    text('review-shipping-price', money(state.shipping.costCents));
    text('review-total', money(state.shipping.totalCents));
    text('review-time-note', timeNote());
    $('review-confirm').checked = false; notice(''); screen('review', true);
  }
  async function createOrder() {
    if (state.busy || state.order || !state.createPayload) return;
    if (!$('review-confirm').checked) { notice('Confirme os detalhes do pedido antes de escolher a forma de pagamento.', true); $('review-confirm').focus(); return; }
    if (!state.createStarted && quoteExpired()) { screen('shipping', true); $('shipping-result').hidden = true; notice('A cotação expirou. Calcule a entrega novamente.', true); return; }
    if (!storageReady()) { notice('Seu navegador não permitiu salvar a referência deste pedido. Habilite o armazenamento do site para continuar com segurança.', true); return; }
    state.busy = true; state.createStarted = true; $('create-order-button').disabled = true; $('edit-details').disabled = true;
    notice('Preparando seu pedido para o pagamento…');
    try {
      state.paymentKey ||= uuid();
      const data = await request('/orders', { method: 'POST', headers: { 'x-idempotency-key': state.createKey }, body: state.createPayload });
      if (!data.orderId || !data.accessToken || data.currency !== 'BRL' || data.totalCents !== state.shipping.totalCents) throw new Error('INVALID_ORDER');
      persistSaved({ orderId: data.orderId, accessToken: data.accessToken, paymentKey: state.paymentKey });
      state.order = { ...data, artwork: state.quote.artwork, selection: state.quote.selection, productPriceCents: state.quote.productPriceCents,
        shipping: state.shipping, productionDays: state.quote.productionDays, paymentAttempted: false };
      state.createPayload = null;
      $('details-form').reset(); text('review-address', ''); text('review-contact', '');
      await refreshOrder({ allowPayment: true, focus: true });
    } catch (error) {
      if (error.httpStatus === 400 && error.code === 'INVALID_CUSTOMER_OR_ADDRESS') {
        state.createStarted = false; state.createPayload = null; $('edit-details').disabled = false;
        screen('details', true); notice('Confira o nome completo, o CPF ou CNPJ e o endereço antes de continuar.', true);
      } else if (['QUOTE_EXPIRED', 'OFFER_CHANGED', 'CHECKOUT_MODE_CHANGED'].includes(error.code)) {
        state.createStarted = false; state.createPayload = null; state.quote = null; state.shipping = null; $('edit-details').disabled = false;
        $('shipping-result').hidden = true; screen('shipping', true); notice('A cotação precisa ser atualizada. Calcule a entrega novamente para conferir os detalhes.', true);
      } else {
        notice('Não foi possível concluir a abertura do pedido. Tente novamente neste botão; a mesma referência será usada.', true);
      }
    } finally { state.busy = false; $('create-order-button').disabled = false; }
  }
  async function loadSDK() {
    if (state.sdk) return state.sdk;
    if (!state.config?.publicKey) throw new Error('PAYMENT_NOT_AVAILABLE');
    state.sdk = new Promise((resolve, reject) => {
      if (typeof window.MercadoPago === 'function') return resolve();
      const script = document.createElement('script'); script.src = 'https://sdk.mercadopago.com/js/v2'; script.async = true;
      const timer = setTimeout(() => reject(new Error('SDK_TIMEOUT')), 18000);
      script.onload = () => { clearTimeout(timer); typeof window.MercadoPago === 'function' ? resolve() : reject(new Error('SDK_UNAVAILABLE')); };
      script.onerror = () => { clearTimeout(timer); reject(new Error('SDK_UNAVAILABLE')); }; document.head.append(script);
    }).catch(error => { state.sdk = null; throw error; });
    return state.sdk;
  }
  async function bricks() {
    await loadSDK();
    if (!state.builder) state.builder = new window.MercadoPago(state.config.publicKey, { locale: 'pt-BR' }).bricks();
    return state.builder;
  }
  async function unmountPayment() {
    if (state.paymentController) { const controller = state.paymentController; state.paymentController = null; try { await controller.unmount(); } catch {} }
    $('payment-brick').replaceChildren();
  }
  async function mountPayment() {
    const order = state.order;
    if (!order || order.status !== 'awaiting_payment' || order.paymentAttempted || state.config?.checkoutEnabled !== true ||
      Date.parse(order.expiresAt) <= Date.now() || !validCents(order.totalCents) || order.currency !== 'BRL') throw new Error('PAYMENT_NOT_AVAILABLE');
    if (state.paymentController) return;
    text('payment-total', money(order.totalCents)); text('payment-order-reference', 'Pedido ' + order.orderId);
    screen('payment'); notice('Carregando as formas de pagamento…');
    const factory = await bricks();
    const methods = {};
    if (state.config.paymentMethods?.includes('credit_card')) methods.creditCard = 'all';
    if (state.config.paymentMethods?.includes('pix')) methods.bankTransfer = 'all';
    methods.maxInstallments = Number.isInteger(state.config.maxInstallments) ? Math.min(12, Math.max(1, state.config.maxInstallments)) : 1;
    state.paymentController = await factory.create('payment', 'payment-brick', {
      initialization: { amount: order.totalCents / 100 },
      customization: { paymentMethods: methods, visual: { style: { theme: 'default' } } },
      callbacks: {
        onReady: () => notice(''),
        onError: () => notice('Não foi possível carregar esta forma de pagamento. Atualize a página para retomar o mesmo pedido.', true),
        onSubmit: ({ formData }) => submitPayment(formData),
      },
    });
  }
  async function submitPayment(formData) {
    if (state.submitting || !state.saved || !formData || typeof formData !== 'object') throw new Error('Pedido em processamento.');
    state.submitting = true;
    notice('Conferindo seu pagamento. Aguarde a confirmação antes de tentar novamente.');
    try {
      persistSaved(state.saved);
      const result = await request('/payments', { method: 'POST',
        headers: { 'x-order-access': state.saved.accessToken, 'x-idempotency-key': state.saved.paymentKey },
        body: { orderId: state.saved.orderId, formData } });
      state.pix = result.pix || null;
      setTimeout(() => refreshOrder({ focus: true }).catch(() => {}), 0);
      return;
    } catch {
      screen('status'); text('status-title', 'Estamos conferindo seu pagamento.');
      text('status-description', 'A resposta ainda não chegou. Consulte o status deste pedido antes de iniciar outro pagamento.');
      text('status-order-reference', 'Pedido ' + state.saved.orderId);
      text('status-total', validCents(state.order?.totalCents) ? money(state.order.totalCents) : '—');
      notice('O resultado está em verificação. Nenhuma nova tentativa será enviada automaticamente.');
      setTimeout(() => refreshOrder().catch(() => {}), 1200);
      throw new Error('Pagamento em verificação. Consulte o status do pedido.');
    }
  }
  function statusCopy(order) {
    switch (order.status) {
      case 'approved': return ['Pagamento confirmado.', 'Seu pedido foi registrado. A Lumen Arts acompanhará os próximos passos da produção e da entrega.'];
      case 'pending': return ['Aguardando o pagamento.', 'Assim que o pagamento for confirmado, o status deste pedido será atualizado.'];
      case 'rejected': return ['O pagamento não foi aprovado.', 'Você pode conferir os dados e escolher novamente. Esta tentativa não será repetida automaticamente.'];
      case 'cancelled': return ['Pagamento cancelado.', 'Este pedido não está confirmado. Fale com a Lumen Arts se precisar de ajuda para escolher novamente.'];
      case 'refunded': return ['Reembolso registrado.', 'O provedor registrou o reembolso deste pagamento. Fale com a Lumen Arts para acompanhar os detalhes.'];
      case 'manual_review': return ['Seu pedido está em conferência.', 'Nossa equipe precisa conferir os dados do pagamento. Não faça outra tentativa para este pedido.'];
      case 'awaiting_payment': return ['Seu pedido está salvo.', 'O pagamento ainda não foi confirmado.'];
      default: return ['Estamos conferindo seu pagamento.', 'A confirmação ainda está sendo processada. Aguarde ou atualize o status deste pedido.'];
    }
  }
  function renderPix() {
    const pix = state.pix;
    $('pix-fallback').hidden = true;
    if (!pix || typeof pix.qrCode !== 'string' || !pix.qrCode || pix.qrCode.length > 20000 || !['pending', 'processing'].includes(state.order?.status)) return;
    $('pix-code').value = pix.qrCode;
    $('pix-image').hidden = true;
    if (typeof pix.qrCodeBase64 === 'string' && pix.qrCodeBase64.length < 500000 && /^[A-Za-z0-9+/=\s]+$/.test(pix.qrCodeBase64)) {
      $('pix-image').src = 'data:image/png;base64,' + pix.qrCodeBase64.replace(/\s/g, '');
      $('pix-image').hidden = false;
    }
    $('pix-fallback').hidden = false;
  }
  async function mountStatus() {
    const id = String(state.order?.paymentId || '');
    if (!/^\d{1,30}$/.test(id) || !state.config?.publicKey || state.statusPaymentId === id) { renderPix(); return; }
    try {
      const factory = await bricks();
      if (state.statusController) { try { await state.statusController.unmount(); } catch {} }
      $('status-brick').hidden = false; state.statusPaymentId = id;
      state.statusController = await factory.create('statusScreen', 'status-brick', {
        initialization: { paymentId: id },
        customization: { visual: { style: { theme: 'default' } } },
        callbacks: { onReady: () => { $('pix-fallback').hidden = true; }, onError: () => { $('status-brick').hidden = true; renderPix(); } },
      });
    } catch { $('status-brick').hidden = true; state.statusPaymentId = null; renderPix(); }
  }
  function schedulePoll() {
    clearTimeout(state.poll);
    if (state.disposed || document.hidden || TERMINAL.has(state.order?.status) || state.order?.status === 'awaiting_payment' || state.pollCount >= 10) return;
    state.poll = setTimeout(() => { state.pollCount += 1; refreshOrder().catch(() => {}); }, 5000);
  }
  async function refreshOrder({ allowPayment = false, focus = false } = {}) {
    if (!state.saved || state.refreshing || state.disposed) return;
    state.refreshing = true; $('refresh-status').disabled = true;
    try {
      const order = await request('/orders/' + encodeURIComponent(state.saved.orderId), { headers: { 'x-order-access': state.saved.accessToken } });
      if (order.orderId !== state.saved.orderId || order.currency !== 'BRL' || !validCents(order.totalCents) || !order.status) throw new Error('INVALID_STATUS');
      state.order = order; state.paymentKey = state.saved.paymentKey; state.pix = order.pix || state.pix;
      const product = state.catalog?.products?.find(item => item.key === order.artwork?.key);
      if (product && order.selection && FINISHES[order.selection.finish]) { state.art = product; state.selection = order.selection; renderArtwork(); }
      if (allowPayment && order.status === 'awaiting_payment' && order.paymentAttempted === false && state.config?.checkoutEnabled === true && Date.parse(order.expiresAt) > Date.now()) {
        state.submitting = false;
        try { await mountPayment(); if (focus) $('payment-title').scrollIntoView({ block: 'nearest' }); }
        catch { screen('status'); text('status-title', 'Seu pedido está salvo.'); text('status-description', 'Não conseguimos abrir o pagamento agora. Atualize a página para retomar este mesmo pedido.'); text('status-total', money(order.totalCents)); text('status-order-reference', 'Pedido ' + order.orderId); notice('Pagamento indisponível no momento.', true); }
        return;
      }
      await unmountPayment();
      const [title, description] = statusCopy(order);
      text('status-title', title); text('status-description', description);
      text('status-order-reference', 'Pedido ' + order.orderId); text('status-total', money(order.totalCents));
      const help = new URL('https://wa.me/5511978230487'); help.searchParams.set('text', 'Olá! Gostaria de acompanhar meu pedido Lumen Arts ' + order.orderId + '.'); $('status-help').href = help.href;
      $('restart-checkout').hidden = !['approved', 'rejected', 'cancelled', 'refunded'].includes(order.status);
      $('restart-checkout').textContent = order.status === 'approved' ? 'Voltar às coleções' : 'Escolher novamente';
      screen('status', focus); notice('');
      if (order.status === 'awaiting_payment' && order.paymentAttempted === false) {
        text('status-description', Date.parse(order.expiresAt) <= Date.now()
          ? 'O prazo deste pedido expirou. Fale com a Lumen Arts para confirmar uma nova cotação.'
          : 'O pedido foi salvo e ainda não houve pagamento. A finalização está indisponível no momento.');
      }
      if (['pending', 'processing'].includes(order.status)) await mountStatus();
      else { $('status-brick').hidden = true; $('pix-fallback').hidden = true; }
      schedulePoll();
    } catch {
      screen('status');
      text('status-title', 'Seu pedido está em conferência.');
      text('status-description', 'Não conseguimos consultar o status agora. Mantenha esta página e atualize a consulta antes de tentar pagar novamente.');
      text('status-order-reference', 'Pedido ' + state.saved.orderId);
      text('status-total', validCents(state.order?.totalCents) ? money(state.order.totalCents) : '—');
      notice('Consulta temporariamente indisponível. Seu acesso ao pedido foi preservado.', true);
    } finally { state.refreshing = false; $('refresh-status').disabled = false; }
  }
  async function init() {
    $('shipping-form').addEventListener('submit', quoteDelivery);
    $('continue-details').addEventListener('click', continueDetails);
    $('details-form').addEventListener('submit', reviewDetails);
    $('edit-delivery').addEventListener('click', () => { if (!state.createStarted) { screen('shipping', true); notice(''); } });
    $('edit-details').addEventListener('click', () => { if (!state.createStarted) { screen('details', true); notice(''); } });
    $('create-order-button').addEventListener('click', createOrder);
    $('refresh-status').addEventListener('click', () => { state.pollCount = 0; refreshOrder({ allowPayment: true }); });
    $('restart-checkout').addEventListener('click', () => { if (['approved', 'rejected', 'cancelled', 'refunded'].includes(state.order?.status)) { try { sessionStorage.removeItem(STORAGE_KEY); } catch {} } });
    $('copy-pix').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('pix-code').value); text('copy-pix', 'Código copiado'); }
      catch { $('pix-code').focus(); $('pix-code').select(); notice('Selecione e copie o código Pix exibido.'); }
    });
    $('cep').addEventListener('input', () => {
      $('cep').value = digits($('cep').value).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
      state.quote = null; state.shipping = null; $('shipping-result').hidden = true;
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clearTimeout(state.poll);
      else if (state.saved && state.order?.status !== 'awaiting_payment' && !TERMINAL.has(state.order?.status)) refreshOrder().catch(() => {});
    });
    window.addEventListener('pagehide', () => { state.disposed = true; clearTimeout(state.poll); });
    window.addEventListener('pageshow', event => { if (event.persisted) { state.disposed = false; if (state.saved) refreshOrder({ allowPayment: true }).catch(() => {}); } });
    const results = await Promise.allSettled([
      fetch('./catalog.json', { credentials: 'same-origin', cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('CATALOG_UNAVAILABLE'); return r.json(); }),
      request('/config'),
    ]);
    if (results[0].status === 'fulfilled' && Array.isArray(results[0].value.products) && Array.isArray(results[0].value.sizes)) state.catalog = results[0].value;
    if (results[1].status === 'fulfilled') state.config = results[1].value;
    $('test-notice').hidden = !(state.config?.checkoutEnabled === true && state.config?.mode === 'TEST');
    const params = new URLSearchParams(window.location.search);
    state.art = state.catalog?.products.find(item => item.key === params.get('obra')) || null;
    state.selection = readSelection(state.art, params); renderArtwork();
    state.saved = readSaved();
    if (state.saved) { await refreshOrder({ allowPayment: true }); return; }
    if (!state.art) { unavailable('Escolha uma obra nas coleções para conferir tamanho, acabamento e entrega.', 'O primeiro passo é a sua escolha.'); return; }
    if (!state.selection) { unavailable('Confira as opções desta obra na coleção. A configuração solicitada ainda não está disponível para compra.'); return; }
    if (!readySelection()) { unavailable(); return; }
    if (!storageReady()) { unavailable('Seu navegador está impedindo a recuperação de pedidos. Habilite o armazenamento do site ou fale com a Lumen Arts para continuar.'); return; }
    notice(''); screen('shipping');
  }
  init().catch(() => unavailable('Não conseguimos carregar os detalhes agora. Fale com a Lumen Arts para confirmar sua escolha.'));
})();
