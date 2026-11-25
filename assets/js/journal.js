/**
 * ATLAS INVEST LAB — diário de operações (lógica e persistência).
 * Os dados ficam no localStorage do navegador, na chave `atlas.journal.v1`.
 * Backup/restauração em JSON e exportação em CSV (padrão Excel pt-BR: ";" e vírgula decimal).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.Atlas = root.Atlas || {}; root.Atlas.journal = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const KEY = 'atlas.journal.v1';
  const BACKUP_FORMAT = 'atlas-invest-lab-backup';
  const SCHEMA = 1;

  function storage() {
    try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
  }

  function uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function toNum(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    let t = String(v).trim().replace(/\s|R\$|US\$/g, '');
    const lc = t.lastIndexOf(','), ld = t.lastIndexOf('.');
    if (lc > ld) t = t.replace(/\./g, '').replace(',', '.');
    else if (ld > lc && lc >= 0) t = t.replace(/,/g, '');
    else if (lc < 0 && /^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ''); // "1.000" = mil (pt-BR)
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  function toISODate(v) {
    if (!v) return null;
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const d = new Date(s);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  }

  /** Normaliza um registro (aceita nomes de campo em português e inglês). */
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const pick = (...keys) => { for (const k of keys) if (raw[k] !== undefined && raw[k] !== '') return raw[k]; return undefined; };
    const sideRaw = String(pick('side', 'direction', 'direcao', 'direção', 'tipo', 'lado') || 'long').toLowerCase();
    const side = /short|venda|vend|sell/.test(sideRaw) ? 'short' : 'long';
    const t = {
      id: String(pick('id') || uid()),
      date: toISODate(pick('date', 'data', 'entryDate', 'dataEntrada')) || null,
      exitDate: toISODate(pick('exitDate', 'dataSaida', 'dataSaída')) || null,
      asset: String(pick('asset', 'ativo', 'symbol', 'ticker') || '').trim().toUpperCase(),
      side,
      entry: toNum(pick('entry', 'entrada', 'precoEntrada', 'entryPrice')),
      exit: toNum(pick('exit', 'saida', 'saída', 'precoSaida', 'exitPrice')),
      qty: toNum(pick('qty', 'quantidade', 'qtd', 'quantity')),
      fees: toNum(pick('fees', 'taxas', 'custos', 'taxa')) || 0,
      currency: /usd|us\$|d[oó]lar/i.test(String(pick('currency', 'moeda') || '')) ? 'USD' : 'BRL',
      setup: String(pick('setup', 'estrategia', 'estratégia', 'strategy') || '').trim(),
      notes: String(pick('notes', 'obs', 'observacoes', 'observações', 'notas') || '').trim(),
      createdAt: pick('createdAt') || new Date().toISOString(),
      updatedAt: pick('updatedAt') || new Date().toISOString(),
    };
    if (!t.asset || t.entry == null || t.qty == null || !t.date) return null;
    return t;
  }

  /** Resultado financeiro (moeda da operação) e percentual. Operação aberta → null. */
  function result(t) {
    if (t.exit == null || t.entry == null || t.qty == null) return { pnl: null, pnlPct: null, open: true };
    const dir = t.side === 'short' ? -1 : 1;
    const pnl = (t.exit - t.entry) * t.qty * dir - (t.fees || 0);
    const base = t.entry * t.qty;
    return { pnl, pnlPct: base ? (pnl / base) * 100 : null, open: false };
  }

  function validate(t) {
    const errs = [];
    if (!t.asset) errs.push('Informe o ativo.');
    if (!t.date) errs.push('Informe a data de entrada.');
    if (!(t.entry > 0)) errs.push('Preço de entrada deve ser maior que zero.');
    if (!(t.qty > 0)) errs.push('Quantidade deve ser maior que zero.');
    if (t.exit != null && !(t.exit > 0)) errs.push('Preço de saída deve ser maior que zero.');
    if (t.fees != null && t.fees < 0) errs.push('Taxas não podem ser negativas.');
    if (t.exitDate && t.date && t.exitDate < t.date) errs.push('A data de saída é anterior à de entrada.');
    if (t.exitDate && t.exit == null) errs.push('Informe o preço de saída (ou apague a data de saída).');
    return errs;
  }

  function load() {
    const s = storage();
    if (!s) return [];
    try {
      const raw = JSON.parse(s.getItem(KEY) || '[]');
      const list = Array.isArray(raw) ? raw : Array.isArray(raw.trades) ? raw.trades : [];
      return list.map(normalize).filter(Boolean);
    } catch (e) { return []; }
  }

  function save(list) {
    const s = storage();
    if (!s) throw new Error('Armazenamento local indisponível neste navegador (modo privado?).');
    s.setItem(KEY, JSON.stringify(list));
  }

  function upsert(list, trade) {
    const now = new Date().toISOString();
    const i = list.findIndex((x) => x.id === trade.id);
    if (i >= 0) list[i] = Object.assign({}, list[i], trade, { updatedAt: now });
    else list.push(Object.assign({}, trade, { id: trade.id || uid(), createdAt: now, updatedAt: now }));
    return list;
  }

  function sorted(list) {
    return list.slice().sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1));
  }

  function stats(list) {
    const byCur = {};
    let open = 0;
    for (const t of list) {
      const r = result(t);
      if (r.open) { open++; continue; }
      const c = (byCur[t.currency] = byCur[t.currency] || { pnl: 0, wins: 0, losses: 0, grossWin: 0, grossLoss: 0, count: 0 });
      c.pnl += r.pnl; c.count++;
      if (r.pnl > 0) { c.wins++; c.grossWin += r.pnl; } else { c.losses++; c.grossLoss -= r.pnl; }
    }
    const closed = Object.values(byCur).reduce((a, c) => a + c.count, 0);
    const wins = Object.values(byCur).reduce((a, c) => a + c.wins, 0);
    return { total: list.length, open, closed, winRate: closed ? (wins / closed) * 100 : null, byCurrency: byCur };
  }

  // ---------- CSV ----------
  function csvNum(v, d = 8) {
    if (v == null || !Number.isFinite(v)) return '';
    return String(+v.toFixed(d)).replace('.', ',');
  }
  function csvCell(s) {
    const t = String(s ?? '');
    return /[;"\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }
  function toCSV(list) {
    const head = ['Data entrada', 'Data saída', 'Ativo', 'Direção', 'Preço entrada', 'Preço saída', 'Quantidade', 'Taxas', 'Moeda', 'Resultado', 'Resultado %', 'Status', 'Setup', 'Observações'];
    const rows = sorted(list).map((t) => {
      const r = result(t);
      return [t.date, t.exitDate || '', t.asset, t.side === 'short' ? 'Venda (short)' : 'Compra (long)', csvNum(t.entry), csvNum(t.exit), csvNum(t.qty), csvNum(t.fees, 2),
        t.currency, csvNum(r.pnl, 2), csvNum(r.pnlPct, 2), r.open ? 'Aberta' : 'Encerrada', t.setup, t.notes].map(csvCell).join(';');
    });
    return '﻿' + [head.join(';')].concat(rows).join('\r\n'); // BOM: acentos corretos no Excel
  }

  // ---------- Backup ----------
  function backup(list, extra = {}) {
    return JSON.stringify(Object.assign({ format: BACKUP_FORMAT, schema: SCHEMA, exportedAt: new Date().toISOString(), trades: list }, extra), null, 2);
  }

  /** Lê um backup (formato próprio ou lista simples). Devolve { trades, skipped, settings }. */
  function parseBackup(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('O arquivo não é um JSON válido.'); }
    let list;
    if (Array.isArray(data)) list = data;
    else if (data && Array.isArray(data.trades)) list = data.trades;
    else if (data && Array.isArray(data.journal)) list = data.journal;
    else if (data && Array.isArray(data.operacoes)) list = data.operacoes;
    else throw new Error('Não encontrei operações neste arquivo.');
    const trades = list.map(normalize).filter(Boolean);
    return { trades, skipped: list.length - trades.length, settings: data && data.settings ? data.settings : null };
  }

  function merge(current, incoming) {
    const map = new Map(current.map((t) => [t.id, t]));
    let added = 0, updated = 0;
    for (const t of incoming) {
      if (map.has(t.id)) { updated++; map.set(t.id, Object.assign({}, map.get(t.id), t)); }
      else { added++; map.set(t.id, t); }
    }
    return { list: Array.from(map.values()), added, updated };
  }

  return { KEY, normalize, result, validate, load, save, upsert, sorted, stats, toCSV, backup, parseBackup, merge, toNum };
});
