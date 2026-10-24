/* Papelería Creativa | Meta Pixel | Privacy-aware first-party attribution
   Pixel 2027176034652640. No Purchase on landing: Hotmart owns purchases. */
(function () {
  'use strict';
  const PIXEL_ID = '2027176034652640';
  const PRODUCT_ID = '8782565';
  const PRICE_USD = 6.90;
  const CHECKOUT = 'https://pay.hotmart.com/I108140299Q?checkoutMode=10';
  const KEY = 'papeleria_meta_consent_v1';
  const safeRead = () => { try { return localStorage.getItem(KEY); } catch (_) { return null; } };
  const safeSave = (choice) => { try { localStorage.setItem(KEY, choice); } catch (_) {} };
  let isGranted = safeRead() === 'granted';
  let started = false;
  let banner = null;

  function readAttribution() {
    const from = new URLSearchParams(location.search);
    const allow = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    const out = new URL(CHECKOUT);
    for (const k of allow) {
      const val = from.get(k);
      if (val && /^[\w.\- ]{1,100}$/.test(val)) out.searchParams.set(k, val);
    }
    const source = (out.searchParams.get('utm_source') || 'landing').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0,20) || 'landing';
    out.searchParams.set('sck', 'pc_' + source);
    // Never forward or store ad click IDs before explicit marketing consent.
    if (isGranted) {
      const incoming = from.get('fbclid') || '';
      const validIncoming = /^[\w.\-]{1,500}$/.test(incoming);
      if (validIncoming) {
        try { sessionStorage.setItem('papeleria_meta_fbclid_v1', incoming); } catch (_) {}
      }
      let click = validIncoming ? incoming : '';
      if (!click) {
        try { click = sessionStorage.getItem('papeleria_meta_fbclid_v1') || ''; } catch (_) {}
      }
      // Meta sets _fbc on eligible visits. Use its click ID only as a fallback.
      if (!click) {
        const cookie = document.cookie.split('; ').find(v => v.startsWith('_fbc='));
        const fbc = cookie ? cookie.slice(5) : '';
        const match = /^fb\.1\.\d+\.([\w.\-]{1,500})$/.exec(fbc);
        if (match) click = match[1];
      }
      if (/^[\w.\-]{1,500}$/.test(click)) out.searchParams.set('fbclid', click);
    }
    return out.href;
  }

  function setCheckoutLinks() {
    const next = readAttribution();
    document.querySelectorAll('a.grid-button').forEach(function (link) {
      if (!/^https:\/\/pay\.hotmart\.com\/I108140299Q(?:\?|$)/.test(link.href)) return;
      if (link.href !== next) link.href = next;
      link.rel = 'nofollow noopener noreferrer';
    });
  }

  function installPixel() {
    if (!isGranted || started) return;
    started = true;
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    if (typeof fbq !== 'function') return;
    fbq('consent', 'grant');
    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');
    fbq('track', 'ViewContent', {
      content_name: 'Papelería Creativa - Plantillas Editables en Canva',
      content_type: 'product',
      content_ids: [PRODUCT_ID],
      value: PRICE_USD,
      currency: 'USD'
    });
  }

  function trackCheckoutClick(link) {
    if (!isGranted || typeof window.fbq !== 'function') return;
    window.fbq('trackCustom', 'CheckoutClick', {
      content_ids: [PRODUCT_ID],
      content_type: 'product',
      content_name: 'Papelería Creativa',
      currency: 'USD',
      value: PRICE_USD,
      button_id: String(link.id || 'cta').slice(0, 48),
      checkout_provider: 'hotmart'
    });
  }

  function paintStyle() {
    if (document.getElementById('pc-meta-consent-style')) return;
    const style = document.createElement('style');
    style.id = 'pc-meta-consent-style';
    style.textContent = [
      '#pc-meta-consent-banner{position:fixed;left:18px;bottom:18px;z-index:2147483000;box-sizing:border-box;max-width:420px;width:calc(100vw - 36px);padding:17px 18px;background:#fff;color:#232323;border:1px solid #ddd;border-radius:13px;box-shadow:0 8px 35px rgba(0,0,0,.18);font:14px/1.45 system-ui,-apple-system,sans-serif;text-align:left}',
      '#pc-meta-consent-banner strong{display:block;font-size:15px;margin-bottom:5px}',
      '#pc-meta-consent-banner p{margin:0 0 13px;font-size:13px}',
      '#pc-meta-consent-banner .pc-choices{display:flex;gap:10px;flex-wrap:wrap}',
      '#pc-meta-consent-banner button{font:600 13px system-ui,sans-serif;border-radius:7px;padding:9px 15px;cursor:pointer;border:1px solid #177c35;background:#177c35;color:#fff}',
      '#pc-meta-consent-banner button.pc-decline{background:#fff;color:#242424;border-color:#b5b5b5}',
      '#pc-meta-consent-settings{position:fixed;left:18px;bottom:14px;z-index:2147482999;padding:5px 9px;border-radius:5px;background:#fff;color:#444;box-shadow:0 2px 8px rgba(0,0,0,.15);border:1px solid #ddd;font:11px system-ui,sans-serif;cursor:pointer}',
      '@media(max-width:520px){#pc-meta-consent-banner{left:10px;bottom:10px;width:calc(100vw - 20px);padding:15px}#pc-meta-consent-settings{left:10px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function makeBanner() {
    if (banner) return;
    banner = document.createElement('section');
    banner.id = 'pc-meta-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Preferencias de privacidad');
    banner.innerHTML = '<strong>Tu privacidad importa</strong><p>Con tu permiso, usamos el píxel de Meta para medir las visitas y los clics de compra, y mejorar nuestros anuncios. Puedes rechazarlo sin perder acceso al contenido.</p><div class="pc-choices"><button type="button" class="pc-accept">Aceptar medición</button><button type="button" class="pc-decline">Rechazar</button></div>';
    banner.querySelector('.pc-accept').addEventListener('click', function () { choose('granted'); });
    banner.querySelector('.pc-decline').addEventListener('click', function () { choose('denied'); });
    document.body.appendChild(banner);
    banner.hidden = true;
  }

  function choose(choice) {
    isGranted = choice === 'granted';
    safeSave(choice);
    banner.hidden = true;
    if (choice === 'granted') { if (started && typeof window.fbq === 'function') window.fbq('consent', 'grant'); else installPixel(); }
    else {
      try { sessionStorage.removeItem('papeleria_meta_fbclid_v1'); } catch (_) {}
      if (started && typeof window.fbq === 'function') window.fbq('consent', 'revoke');
    }
    setCheckoutLinks();
  }

  function init() {
    paintStyle();
    makeBanner();
    const settings = document.createElement('button');
    settings.type = 'button';
    settings.id = 'pc-meta-consent-settings';
    settings.textContent = 'Privacidad';
    settings.setAttribute('aria-label', 'Cambiar preferencias de cookies');
    settings.addEventListener('click', function () { banner.hidden = false; });
    document.body.appendChild(settings);
    if (safeRead() === null) banner.hidden = false;
    if (isGranted) installPixel();
    setCheckoutLinks();

    document.addEventListener('click', function (event) {
      const target = event.target && event.target.closest ? event.target.closest('a.grid-button') : null;
      if (!target || !/^https:\/\/pay\.hotmart\.com\/I108140299Q(?:\?|$)/.test(target.href)) return;
      // Handle hydrated CTA links, keep the official checkoutMode parameter and UTMs.
      target.href = readAttribution();
      trackCheckoutClick(target); // Never fires Purchase or InitiateCheckout from the landing.
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
