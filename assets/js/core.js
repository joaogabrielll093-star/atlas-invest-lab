/**
 * ATLAS INVEST LAB — utilitários compartilhados: formatação pt-BR,
 * armazenamento local seguro, datas e pequenos helpers de DOM.
 */
(function (root) {
  'use strict';
  const Atlas = (root.Atlas = root.Atlas || {});

  // ---------- Armazenamento local (nunca quebra a página) ----------
  const store = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { console.warn('Falha ao salvar no armazenamento local', key, e); return false; }
    },
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignora */ } },
  };

  // ---------- Formatação ----------
  const nfCache = {};
  function nf(min, max) {
    const k = min + ':' + max;
    return nfCache[k] || (nfCache[k] = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max }));
  }
  function num(v, dec = 2) {
    if (v == null || !Number.isFinite(v)) return '—';
    return nf(dec, dec).format(v);
  }
  function decFor(v) { return Math.abs(v) < 20 ? 4 : 2; }
  const CUR = { BRL: 'R$', USD: 'US$', EUR: '€' };
  function money(v, cur = 'BRL', dec) {
    if (v == null || !Number.isFinite(v)) return '—';
    const d = dec == null ? 2 : dec;
    const s = nf(d, d).format(Math.abs(v));
    return (v < 0 ? '−' : '') + (CUR[cur] || cur) + ' ' + s;
  }
  function price(v, unit) {
    if (v == null || !Number.isFinite(v)) return '—';
    if (unit === 'pts') return num(v, 0) + ' pts';
    return money(v, unit, decFor(v));
  }
  function pct(v, dec = 2, signed = true) {
    if (v == null || !Number.isFinite(v)) return '—';
    const s = nf(dec, dec).format(Math.abs(v)) + '%';
    if (!signed) return (v < 0 ? '−' : '') + s;
    return (v > 0 ? '+' : v < 0 ? '−' : '') + s;
  }
  function signClass(v) { return v > 0 ? 'up' : v < 0 ? 'down' : 'flat'; }

  // ---------- Datas ----------
  const pad = (n) => String(n).padStart(2, '0');
  function toDate(x) { return x instanceof Date ? x : new Date(x); }
  function dateBR(x) { // 'YYYY-MM-DD' ou Date → dd/mm/aaaa
    if (!x) return '—';
    if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) { const [y, m, d] = x.split('-'); return `${d}/${m}/${y}`; }
    const d = toDate(x); if (isNaN(d)) return '—';
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
  function shortDate(iso) { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y.slice(2)}`; }
  function dateTimeBR(x) {
    const d = toDate(x); if (isNaN(d)) return '—';
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return sameDay ? `hoje ${hm}` : `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${hm}`;
  }
  function ago(x) {
    const ms = Date.now() - toDate(x).getTime();
    if (!Number.isFinite(ms)) return '—';
    const m = Math.round(ms / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return `há ${m} min`;
    const h = Math.round(m / 60);
    if (h < 48) return `há ${h} h`;
    return `há ${Math.round(h / 24)} dias`;
  }
  function todayISO() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

  // Aceita "1.234,56", "1234,56", "1234.56", "1,234.56"
  function parseNum(s) {
    if (typeof s === 'number') return s;
    if (s == null) return NaN;
    let t = String(s).trim().replace(/\s|R\$|US\$|%/g, '');
    if (!t) return NaN;
    const lc = t.lastIndexOf(','), ld = t.lastIndexOf('.');
    if (lc > ld) t = t.replace(/\./g, '').replace(',', '.');
    else if (ld > lc && lc >= 0) t = t.replace(/,/g, '');
    else if (lc < 0 && /^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ''); // "10.000" = dez mil (pt-BR)
    return Number(t);
  }

  // ---------- DOM ----------
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function toast(msg, type = 'info', ms = 3200) {
    const host = $('#toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms);
  }
  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  /** Diálogo de confirmação acessível. Resolve com o valor do botão escolhido (ou null). */
  function ask({ title, text, buttons }) {
    return new Promise((resolve) => {
      const dlg = $('#dialog');
      $('#dialog-title', dlg).textContent = title;
      $('#dialog-text', dlg).textContent = text;
      const box = $('#dialog-actions', dlg);
      box.innerHTML = '';
      const finish = (v) => { dlg.close(); resolve(v); };
      buttons.forEach((b) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn ' + (b.kind || '');
        btn.textContent = b.label;
        btn.addEventListener('click', () => finish(b.value));
        box.appendChild(btn);
      });
      dlg.addEventListener('cancel', () => resolve(null), { once: true });
      dlg.showModal();
    });
  }

  Atlas.store = store;
  Atlas.fmt = { num, money, price, pct, signClass, dateBR, shortDate, dateTimeBR, ago, todayISO, parseNum, decFor };
  Atlas.dom = { $, $$, esc, toast, download, ask };
})(typeof self !== 'undefined' ? self : this);
