/* Commerce Feed Doctor — local-first validation core */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CommerceFeedDoctor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const OPENAI_REQUIRED = ['id','title','description','link','image_link','availability','price','brand'];
  const GOOGLE_REQUIRED = ['id','title','description','link','image_link','availability','price'];
  const AVAIL = new Set(['in_stock','out_of_stock','preorder','backorder']);
  const HEADER_ALIASES = {
    item_id:'id', product_id:'id', productid:'id',
    url:'link', product_url:'link',
    image:'image_link', image_url:'image_link', main_image:'image_link',
    product_title:'title', name:'title',
    product_description:'description',
    qty:'quantity', stock:'quantity', inventory:'quantity', inventory_quantity:'quantity'
  };

  function normalizeHeader(value) {
    let h = String(value ?? '').trim().toLowerCase()
      .replace(/^g:/,'').replace(/[\s-]+/g,'_').replace(/[^a-z0-9_]/g,'');
    return HEADER_ALIASES[h] || h;
  }

  function detectDelimiter(text) {
    const sample = String(text || '').split(/\r?\n/).find(x => x.trim()) || '';
    const candidates = ['\t',';',','];
    let best = ',', score = -1;
    for (const d of candidates) {
      let count = 0, quoted = false;
      for (let i=0;i<sample.length;i++) {
        const c = sample[i];
        if (c === '"') quoted = !quoted;
        else if (!quoted && c === d) count++;
      }
      if (count > score) { score = count; best = d; }
    }
    return best;
  }

  function parseDelimited(text, delimiter) {
    text = String(text ?? '').replace(/^\uFEFF/, '');
    delimiter = delimiter || detectDelimiter(text);
    const rows = []; let row = [], field = '', quoted = false;
    for (let i=0;i<text.length;i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i+1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else {
        if (c === '"') quoted = true;
        else if (c === delimiter) { row.push(field); field=''; }
        else if (c === '\n') { row.push(field.replace(/\r$/,'')); rows.push(row); row=[]; field=''; }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field.replace(/\r$/,'')); rows.push(row); }
    const nonempty = rows.filter(r => r.some(v => String(v).trim() !== ''));
    if (!nonempty.length) return { headers:[], originalHeaders:[], rows:[], delimiter };
    const originalHeaders = nonempty[0].map(v => String(v).trim());
    const headers = originalHeaders.map(normalizeHeader);
    const data = nonempty.slice(1).map((r, index) => {
      const obj = { __row: index + 2 };
      headers.forEach((h,i) => { if (h) obj[h] = String(r[i] ?? '').trim(); });
      return obj;
    });
    return { headers, originalHeaders, rows:data, delimiter };
  }

  function isHttpUrl(v) {
    try { const u = new URL(v); return (u.protocol === 'http:' || u.protocol === 'https:') && !u.username && !u.password; }
    catch { return false; }
  }

  function parseMoney(v) {
    const m = String(v || '').trim().match(/^(\d+(?:\.\d{1,2})?)\s+([A-Z]{3})$/);
    if (!m) return null;
    return { amount:Number(m[1]), currency:m[2] };
  }

  function finding(severity, row, field, code, message) {
    return { severity, row, field, code, message };
  }

  function validateCommon(parsed, target) {
    const findings = [], rows = parsed.rows, headers = parsed.headers;
    const required = target === 'openai' ? OPENAI_REQUIRED : GOOGLE_REQUIRED;
    for (const h of required) if (!headers.includes(h)) findings.push(finding('error', null, h, 'missing_column', 'Missing required column: ' + h));
    const ids = new Map();
    for (const r of rows) {
      for (const h of required) if (!String(r[h] || '').trim()) findings.push(finding('error', r.__row, h, 'missing_value', 'Required value is empty: ' + h));
      if (r.id) {
        if (ids.has(r.id)) findings.push(finding('error', r.__row, 'id', 'duplicate_id', 'Duplicate id "' + r.id + '" (first seen on row ' + ids.get(r.id) + ')'));
        else ids.set(r.id, r.__row);
      }
      if (r.link && !isHttpUrl(r.link)) findings.push(finding('error', r.__row, 'link', 'invalid_url', 'Product link must be a valid HTTP/HTTPS URL.'));
      if (r.image_link && !isHttpUrl(r.image_link)) findings.push(finding('error', r.__row, 'image_link', 'invalid_image_url', 'Image link must be a valid HTTP/HTTPS URL.'));
      if (r.availability && !AVAIL.has(r.availability)) findings.push(finding('error', r.__row, 'availability', 'invalid_availability', 'Use in_stock, out_of_stock, preorder, or backorder.'));
      if (r.price) {
        const p = parseMoney(r.price);
        if (!p || p.amount <= 0) findings.push(finding('error', r.__row, 'price', 'invalid_price', 'Use a positive amount plus ISO currency, e.g. 79.99 USD.'));
      }
      if (r.sale_price) {
        const p = parseMoney(r.price), s = parseMoney(r.sale_price);
        if (!s || !p || s.currency !== p.currency || s.amount <= 0 || s.amount >= p.amount) findings.push(finding('error', r.__row, 'sale_price', 'invalid_sale_price', 'Sale price must be positive, same currency, and lower than regular price.'));
      }
      if (r.title && r.title.length > 150) findings.push(finding(target === 'openai' ? 'error' : 'warning', r.__row, 'title', 'title_too_long', 'Title has ' + r.title.length + ' characters; target limit/best-practice is 150.'));
      if (r.description && r.description.length > 5000) findings.push(finding('error', r.__row, 'description', 'description_too_long', 'Description exceeds 5,000 characters.'));
      if (target === 'google') {
        if (!r.brand) findings.push(finding('warning', r.__row, 'brand', 'brand_missing', 'Brand is required for many new products; verify product-specific Google rules.'));
        if (!r.gtin && !r.mpn) findings.push(finding('warning', r.__row, 'gtin/mpn', 'identifier_missing', 'No GTIN or MPN found. Identifier requirements are product-dependent.'));
      }
    }
    return findings;
  }

  function validate(parsed, targets) {
    targets = targets && targets.length ? targets : ['openai'];
    const byTarget = {};
    let all = [];
    for (const t of targets) {
      byTarget[t] = validateCommon(parsed, t);
      all = all.concat(byTarget[t].map(f => Object.assign({}, f, {target:t})));
    }
    const errors = all.filter(f=>f.severity==='error').length;
    const warnings = all.filter(f=>f.severity==='warning').length;
    return { rowCount:parsed.rows.length, headers:parsed.headers, targets, errors, warnings, ready:errors===0, findings:all, byTarget };
  }

  function pickIdField(parsed) {
    for (const k of ['id','sku','offer_id','item_id']) if (parsed.headers.includes(k)) return k;
    return parsed.headers[0] || null;
  }

  function firstPresent(obj, keys) {
    for (const k of keys) if (obj[k] !== undefined && String(obj[k]).trim() !== '') return String(obj[k]).trim();
    return '';
  }

  function compareFeeds(a, b) {
    const idA = pickIdField(a), idB = pickIdField(b);
    if (!idA || !idB) return { error:'Could not identify an ID/SKU column in both files.', rows:[] };
    const mapA = new Map(a.rows.map(r=>[String(r[idA]||'').trim(),r]).filter(x=>x[0]));
    const mapB = new Map(b.rows.map(r=>[String(r[idB]||'').trim(),r]).filter(x=>x[0]));
    const ids = new Set([...mapA.keys(),...mapB.keys()]);
    const diffs = [];
    const fields = [
      ['price',['price','sale_price']],
      ['availability',['availability','status']],
      ['quantity',['quantity','stock','inventory','inventory_quantity']],
      ['title',['title','name']]
    ];
    for (const id of ids) {
      const ra=mapA.get(id), rb=mapB.get(id);
      if (!ra) { diffs.push({id,field:'presence',a:'MISSING',b:'PRESENT',severity:'error'}); continue; }
      if (!rb) { diffs.push({id,field:'presence',a:'PRESENT',b:'MISSING',severity:'error'}); continue; }
      for (const [label,keys] of fields) {
        const va=firstPresent(ra,keys), vb=firstPresent(rb,keys);
        if ((va || vb) && va !== vb) diffs.push({id,field:label,a:va||'—',b:vb||'—',severity:label==='title'?'warning':'error'});
      }
    }
    return { idFieldA:idA, idFieldB:idB, comparedIds:ids.size, differences:diffs.length, rows:diffs };
  }

  function reportCsv(findings) {
    const esc = v => '"' + String(v ?? '').replace(/"/g,'""') + '"';
    return ['target,severity,row,field,code,message'].concat((findings||[]).map(f=>[f.target,f.severity,f.row,f.field,f.code,f.message].map(esc).join(','))).join('\n');
  }

  return { normalizeHeader, detectDelimiter, parseDelimited, validate, compareFeeds, reportCsv, OPENAI_REQUIRED, GOOGLE_REQUIRED };
});