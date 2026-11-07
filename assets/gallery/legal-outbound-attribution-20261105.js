/* Lumen Arts - preserva somente UTMs explícitas, sem cookies. */
(() => {
  'use strict';
  const query = new URLSearchParams(location.search);
  const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  const values = [];
  for (const key of allowed) {
    const value = String(query.get(key) || '').trim();
    if (/^[A-Za-z0-9_.-]{1,64}$/.test(value)) values.push([key, value]);
  }
  const lang = query.get('lang');
  const locale = lang === 'pt' || lang === 'en' ? lang : null;
  const bundleLink = document.querySelector('a[data-legal-bundle-referral]');
  if (bundleLink) {
    try {
      const target = new URL(bundleLink.href, location.href);
      if (target.origin === 'https://juridica.lumenanima.com' && target.pathname === '/') {
        for (const [key, value] of values) target.searchParams.set(key, value);
        if (!target.searchParams.has('utm_term')) target.searchParams.set('utm_term', 'owned_legal_gallery');
        bundleLink.href = target.toString();
      }
    } catch (_) { /* Preserve the valid static link. */ }
  }
  if (values.length === 0 && !locale) return;
  document.querySelectorAll('#legal-digital-shop a[href^="/checkout-artwork.html?"]').forEach(link => {
    try {
      const dest = new URL(link.getAttribute('href'), location.origin);
      if (dest.origin !== location.origin || dest.pathname !== '/checkout-artwork.html') return;
      if (locale) dest.searchParams.set('lang', locale);
      for (const [key, value] of values) dest.searchParams.set(key, value);
      link.setAttribute('href', dest.pathname + dest.search);
    } catch (_) { /* Links do checkout devem continuar funcionando sem UTMs. */ }
  });
})();