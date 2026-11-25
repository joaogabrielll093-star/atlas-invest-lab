/**
 * ATLAS INVEST LAB — camada de dados.
 *
 * Fontes (todas públicas, sem chave obrigatória):
 *  - Banco Central do Brasil (SGS): Selic, CDI, IPCA, PTAX — direto do navegador (CORS liberado).
 *  - AwesomeAPI: câmbio comercial em tempo quase real (USD, EUR, GBP). Chave opcional.
 *  - Binance (data-api.binance.vision, dados públicos): BTC e ETH ao vivo e histórico diário.
 *  - CoinGecko: reserva para BTC/ETH caso a Binance falhe.
 *  - Snapshot próprio (data/market.json): gerado no servidor pelo GitHub Actions a partir do
 *    Yahoo Finance (Ibovespa, S&P 500, Nasdaq, Dow Jones, câmbio e cripto, com histórico OHLC).
 *    O Yahoo não permite acesso direto pelo navegador (sem CORS), por isso o snapshot.
 *
 * Regras: nada é inventado. Cada cotação carrega fonte, horário e tipo
 * (ao vivo / com atraso / fechamento). Quando uma fonte falha, usa-se o último
 * dado válido salvo localmente, sempre identificado como tal.
 */
(function (root) {
  'use strict';
  const Atlas = root.Atlas;
  const { store } = Atlas;

  const CACHE_KEY = 'atlas.cache.v1';

  const ASSETS = [
    { key: 'USDBRL', name: 'Dólar comercial', short: 'USD/BRL', group: 'fx', unit: 'BRL', live: 'awesome', awesome: 'USDBRL', ptax: 'ptaxUsd' },
    { key: 'EURBRL', name: 'Euro', short: 'EUR/BRL', group: 'fx', unit: 'BRL', live: 'awesome', awesome: 'EURBRL', ptax: 'ptaxEur' },
    { key: 'GBPBRL', name: 'Libra esterlina', short: 'GBP/BRL', group: 'fx', unit: 'BRL', live: 'awesome', awesome: 'GBPBRL' },
    { key: 'IBOV', name: 'Ibovespa', short: 'IBOV', group: 'br', unit: 'pts' },
    { key: 'SPX', name: 'S&P 500', short: 'S&P 500', group: 'world', unit: 'pts' },
    { key: 'NASDAQ', name: 'Nasdaq', short: 'Nasdaq', group: 'world', unit: 'pts' },
    { key: 'DOW', name: 'Dow Jones', short: 'Dow Jones', group: 'world', unit: 'pts' },
    { key: 'BTC', name: 'Bitcoin', short: 'BTC', group: 'crypto', unit: 'USD', live: 'binance', binance: 'BTCUSDT', gecko: 'bitcoin' },
    { key: 'ETH', name: 'Ethereum', short: 'ETH', group: 'crypto', unit: 'USD', live: 'binance', binance: 'ETHUSDT', gecko: 'ethereum' },
  ];
  const BY_KEY = Object.fromEntries(ASSETS.map((a) => [a.key, a]));

  const BCB_SERIES = {
    selic: { code: 432, days: 800, label: 'Selic (meta)' },
    cdi: { code: 4389, days: 400, label: 'CDI' },
    ipca: { code: 433, days: 800, label: 'IPCA mensal' },
    ipca12: { code: 13522, days: 800, label: 'IPCA 12 meses' },
    ptaxUsd: { code: 1, days: 760, label: 'PTAX dólar' },
    ptaxEur: { code: 21619, days: 760, label: 'PTAX euro' },
  };

  // Estado das fontes, exibido no painel "Fontes de dados".
  const SOURCES = {
    snapshot: { label: 'Índices e histórico (Yahoo Finance via snapshot)', ok: null, at: null, error: null },
    awesome: { label: 'Câmbio ao vivo (AwesomeAPI)', ok: null, at: null, error: null },
    binance: { label: 'Cripto ao vivo (Binance)', ok: null, at: null, error: null },
    gecko: { label: 'Cripto reserva (CoinGecko)', ok: null, at: null, error: null },
    bcb: { label: 'Indicadores (Banco Central – SGS)', ok: null, at: null, error: null },
  };

  const cache = Object.assign({ snapshot: null, awesome: null, binance: null, binanceHist: null, gecko: null, bcb: null }, store.get(CACHE_KEY, {}));
  let saveTimer = null;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set(CACHE_KEY, cache), 300);
  }

  async function fetchJSON(url, { timeout = 12000 } = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      if (!r.ok) {
        const err = new Error(r.status === 429 ? 'limite de requisições atingido' : `HTTP ${r.status}`);
        err.status = r.status;
        throw err;
      }
      return await r.json();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('tempo esgotado');
      if (e instanceof TypeError) throw new Error('sem conexão ou bloqueado');
      throw e;
    } finally { clearTimeout(t); }
  }

  function mark(src, ok, error) {
    const s = SOURCES[src];
    s.ok = ok;
    s.error = ok ? null : (error && error.message) || String(error);
    if (ok) { s.at = new Date().toISOString(); s.fails = 0; s.retryAt = 0; }
    else {
      // Espera crescente antes de tentar de novo (1, 2, 4, 8… até 15 min) para não insistir em fonte fora do ar.
      s.fails = (s.fails || 0) + 1;
      s.retryAt = Date.now() + Math.min(15, Math.pow(2, s.fails - 1)) * 60000;
    }
  }
  const canTry = (src, force) => force || !SOURCES[src].retryAt || Date.now() >= SOURCES[src].retryAt;

  // ---------------- Fontes individuais ----------------

  async function loadSnapshot() {
    try {
      // Arredonda para 2 min: evita cache antigo do navegador/CDN sem gerar uma URL por segundo.
      const j = await fetchJSON(`data/market.json?v=${Math.floor(Date.now() / 120000)}`);
      if (!j || !j.assets) throw new Error('arquivo inválido');
      cache.snapshot = { at: new Date().toISOString(), data: j };
      mark('snapshot', true); persist();
    } catch (e) { mark('snapshot', false, e); }
  }

  async function loadAwesome(token) {
    try {
      const pairs = ASSETS.filter((a) => a.awesome).map((a) => a.awesome.slice(0, 3) + '-' + a.awesome.slice(3)).join(',');
      const q = token ? `?token=${encodeURIComponent(token)}` : '';
      const j = await fetchJSON(`https://economia.awesomeapi.com.br/json/last/${pairs}${q}`);
      if (!j || j.status) throw new Error(j && j.message ? j.message : 'resposta inválida');
      cache.awesome = { at: new Date().toISOString(), data: j };
      mark('awesome', true); persist();
    } catch (e) { mark('awesome', false, e); }
  }

  async function loadBinance() {
    try {
      const syms = ASSETS.filter((a) => a.binance).map((a) => a.binance);
      const j = await fetchJSON(`https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(syms))}`);
      if (!Array.isArray(j)) throw new Error('resposta inválida');
      cache.binance = { at: new Date().toISOString(), data: j };
      mark('binance', true); persist();
      return true;
    } catch (e) { mark('binance', false, e); return false; }
  }

  async function loadBinanceHistory() {
    try {
      const out = {};
      await Promise.all(ASSETS.filter((a) => a.binance).map(async (a) => {
        const k = await fetchJSON(`https://data-api.binance.vision/api/v3/klines?symbol=${a.binance}&interval=1d&limit=760`);
        out[a.key] = k.map((r) => [new Date(r[0]).toISOString().slice(0, 10), +r[1], +r[2], +r[3], +r[4]]);
      }));
      cache.binanceHist = { at: new Date().toISOString(), data: out };
      persist();
    } catch (e) { /* o histórico do snapshot serve de reserva */ }
  }

  async function loadGecko() {
    try {
      const ids = ASSETS.filter((a) => a.gecko).map((a) => a.gecko).join(',');
      const j = await fetchJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`);
      cache.gecko = { at: new Date().toISOString(), data: j };
      mark('gecko', true); persist();
    } catch (e) { mark('gecko', false, e); }
  }

  function brToISO(s) { const [d, m, y] = s.split('/'); return `${y}-${m}-${d}`; }
  async function loadBCB() {
    const end = new Date();
    const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const today = Atlas.fmt.todayISO();
    const results = {};
    let fails = 0, lastErr = null;
    await Promise.all(Object.entries(BCB_SERIES).map(async ([key, cfg]) => {
      try {
        const start = new Date(end.getTime() - cfg.days * 86400000);
        const j = await fetchJSON(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${cfg.code}/dados?formato=json&dataInicial=${fmt(start)}&dataFinal=${fmt(end)}`, { timeout: 20000 });
        if (!Array.isArray(j)) throw new Error('resposta inválida');
        results[key] = j.map((r) => [brToISO(r.data), Number(r.valor)])
          .filter(([d, v]) => d <= today && Number.isFinite(v)) // a série da meta Selic traz datas futuras
          .sort((a, b) => (a[0] < b[0] ? -1 : 1));
      } catch (e) { fails++; lastErr = e; }
    }));
    if (Object.keys(results).length) {
      cache.bcb = { at: new Date().toISOString(), data: Object.assign({}, cache.bcb && cache.bcb.data, results) };
      persist();
    }
    if (fails === 0) mark('bcb', true);
    else mark('bcb', false, new Error(`${fails} série(s) indisponível(is): ${lastErr && lastErr.message}`));
  }

  // ---------------- Montagem do modelo exibido ----------------

  const SNAP_STALE_MS = 3 * 3600 * 1000;    // snapshot com mais de 3 h é considerado desatualizado
  const LIVE_FRESH_MS = { fx: 20 * 60000, crypto: 10 * 60000 };

  function candlesFrom(rows) {
    return (rows || []).map((r) => ({ date: r[0], open: r[1], high: r[2], low: r[3], close: r[4] }));
  }

  /** Define o selo de atualização de uma cotação. */
  function freshness(q, group, now = Date.now()) {
    if (!q) return { level: 'none', label: 'Indisponível' };
    const t = Date.parse(q.time);
    if (q.kind === 'live') {
      const fetchedAge = now - Date.parse(q.fetchedAt);
      if (fetchedAge > (LIVE_FRESH_MS[group] || 20 * 60000)) return { level: 'stale', label: `Último dado válido · ${Atlas.fmt.dateTimeBR(q.time)}` };
      return { level: 'live', label: `Ao vivo · ${Atlas.fmt.dateTimeBR(q.time)}` };
    }
    if (q.kind === 'official') return { level: 'close', label: `PTAX oficial · ${Atlas.fmt.dateBR(q.time)}` };
    // Snapshot (Yahoo via servidor)
    const snapAge = now - Date.parse(q.fetchedAt);
    if (snapAge > SNAP_STALE_MS) return { level: 'stale', label: `Desatualizado · ${Atlas.fmt.dateTimeBR(q.time)}` };
    if (q.marketOpen) {
      const lag = Math.max(0, Math.round((now - t) / 60000));
      return { level: 'delayed', label: lag <= 1 ? `Com atraso · ${Atlas.fmt.dateTimeBR(q.time)}` : `Atraso ~${lag} min · ${Atlas.fmt.dateTimeBR(q.time)}` };
    }
    return { level: 'close', label: `Fechamento · ${Atlas.fmt.dateTimeBR(q.time)}` };
  }

  function buildAsset(meta, usdbrl) {
    const snap = cache.snapshot && cache.snapshot.data.assets && cache.snapshot.data.assets[meta.key];
    const snapAt = cache.snapshot && (cache.snapshot.data.generatedAt || cache.snapshot.at);
    let quote = null;

    // 1) Fonte ao vivo
    if (meta.live === 'awesome' && cache.awesome) {
      const r = cache.awesome.data[meta.awesome];
      if (r) {
        const price = +r.bid;
        const pctCh = +r.pctChange;
        quote = {
          price, changePct: pctCh, high: +r.high, low: +r.low,
          prevClose: price / (1 + pctCh / 100),
          time: new Date(+r.timestamp * 1000).toISOString(), fetchedAt: cache.awesome.at,
          source: 'AwesomeAPI', kind: 'live',
        };
      }
    }
    if (meta.live === 'binance') {
      const b = cache.binance && cache.binance.data.find((x) => x.symbol === meta.binance);
      const g = cache.gecko && cache.gecko.data[meta.gecko];
      const bAt = b ? Date.parse(cache.binance.at) : 0, gAt = g ? Date.parse(cache.gecko.at) : 0;
      if (b && bAt >= gAt) {
        quote = {
          price: +b.lastPrice, changePct: +b.priceChangePercent, high: +b.highPrice, low: +b.lowPrice,
          prevClose: +b.openPrice, changeLabel: '24 h',
          time: new Date(b.closeTime).toISOString(), fetchedAt: cache.binance.at,
          source: `Binance (${meta.short}/USDT)`, kind: 'live',
        };
      } else if (g) {
        quote = {
          price: g.usd, changePct: g.usd_24h_change, changeLabel: '24 h',
          time: new Date(g.last_updated_at * 1000).toISOString(), fetchedAt: cache.gecko.at,
          source: 'CoinGecko', kind: 'live',
        };
      }
    }
    // Só usa o ao vivo se não estiver muito velho; senão, o snapshot pode ser mais recente.
    if (quote && snap && Date.parse(snap.time) > Date.parse(quote.time) + 30 * 60000) quote = null;

    // 2) Snapshot do servidor
    if (!quote && snap) {
      quote = {
        price: snap.price, changePct: snap.changePct, high: snap.high, low: snap.low, prevClose: snap.prevClose,
        changeLabel: meta.group === 'crypto' ? 'dia (UTC)' : null,
        time: snap.time, fetchedAt: snapAt, marketOpen: snap.marketOpen, source: 'Yahoo Finance', kind: 'snapshot',
      };
    }

    // 3) PTAX oficial do Banco Central (fechamento) como último recurso para moedas
    if (!quote && meta.ptax && cache.bcb && cache.bcb.data[meta.ptax]) {
      const s = cache.bcb.data[meta.ptax];
      if (s.length >= 2) {
        const [d, v] = s[s.length - 1], prev = s[s.length - 2][1];
        quote = { price: v, changePct: (v / prev - 1) * 100, prevClose: prev, time: d, fetchedAt: cache.bcb.at, source: 'Banco Central (PTAX)', kind: 'official' };
      }
    }

    // Histórico diário
    let candles = [], histSource = null, lastPartial = false;
    if (meta.binance && cache.binanceHist && cache.binanceHist.data[meta.key]) {
      candles = candlesFrom(cache.binanceHist.data[meta.key]);
      histSource = 'Binance'; lastPartial = true; // o candle diário de hoje (UTC) ainda está aberto
    } else if (snap && snap.candles) {
      candles = candlesFrom(snap.candles);
      histSource = 'Yahoo Finance'; lastPartial = !!snap.lastCandlePartial;
    } else if (meta.ptax && cache.bcb && cache.bcb.data[meta.ptax]) {
      candles = cache.bcb.data[meta.ptax].map(([d, v]) => ({ date: d, close: v }));
      histSource = 'Banco Central (PTAX)';
    }
    const hasOHLC = candles.length > 0 && candles[0].open != null;

    const a = Object.assign({}, meta, {
      quote,
      fresh: freshness(quote, meta.group),
      candles, histSource, hasOHLC, lastPartial,
      high52: snap ? snap.high52 : null, low52: snap ? snap.low52 : null,
    });
    if (meta.group === 'crypto' && quote && usdbrl) a.priceBRL = quote.price * usdbrl;
    return a;
  }

  function lastOf(series) { return series && series.length ? series[series.length - 1] : null; }

  function buildMacro() {
    const src = (cache.bcb && cache.bcb.data) || (cache.snapshot && cache.snapshot.data.macro && Object.fromEntries(
      Object.entries(cache.snapshot.data.macro).map(([k, v]) => [k, v.series])));
    const at = cache.bcb ? cache.bcb.at : (cache.snapshot && cache.snapshot.data.generatedAt);
    if (!src) return null;
    const pick = (k) => {
      const s = src[k]; const l = lastOf(s);
      return l ? { value: l[1], date: l[0], series: s } : null;
    };
    const m = { selic: pick('selic'), cdi: pick('cdi'), ipca: pick('ipca'), ipca12: pick('ipca12'), ptaxUsd: pick('ptaxUsd'), ptaxEur: pick('ptaxEur'), fetchedAt: at, fromSnapshot: !cache.bcb };
    if (m.selic && m.ipca12) m.realRate = ((1 + m.selic.value / 100) / (1 + m.ipca12.value / 100) - 1) * 100;
    // Selic: data em que a meta atual passou a valer
    if (m.selic) {
      const s = m.selic.series; let i = s.length - 1;
      while (i > 0 && s[i - 1][1] === m.selic.value) i--;
      m.selic.since = s[i][0];
    }
    return m;
  }

  function model() {
    const usd = buildAsset(BY_KEY.USDBRL);
    const usdbrl = usd.quote ? usd.quote.price : null;
    const assets = {};
    for (const meta of ASSETS) assets[meta.key] = meta.key === 'USDBRL' ? usd : buildAsset(meta, usdbrl);
    return {
      assets, macro: buildMacro(), sources: SOURCES,
      snapshotAt: cache.snapshot ? cache.snapshot.data.generatedAt : null,
      hasAnyData: !!(cache.snapshot || cache.awesome || cache.binance || cache.bcb || cache.gecko),
    };
  }

  // ---------------- Agendamento ----------------
  const last = { live: 0, snapshot: 0, bcb: 0, hist: 0 };
  async function refresh({ force = false, token = '' } = {}) {
    const now = Date.now();
    const jobs = [];
    if (force || now - last.snapshot > 5 * 60000) { last.snapshot = now; jobs.push(loadSnapshot()); }
    if (force || now - last.bcb > 60 * 60000) { last.bcb = now; jobs.push(loadBCB()); }
    if (force || now - last.hist > 30 * 60000) { last.hist = now; jobs.push(loadBinanceHistory()); }
    last.live = now;
    if (canTry('awesome', force)) jobs.push(loadAwesome(token));
    if (canTry('binance', force)) jobs.push(loadBinance().then((ok) => { if (!ok && canTry('gecko', force)) return loadGecko(); }));
    else if (canTry('gecko', force)) jobs.push(loadGecko());
    await Promise.all(jobs);
    return model();
  }

  function clearCache() {
    for (const k of Object.keys(cache)) cache[k] = null;
    store.remove(CACHE_KEY);
    Object.values(SOURCES).forEach((s) => { s.ok = null; s.at = null; s.error = null; });
    Object.keys(last).forEach((k) => (last[k] = 0));
  }

  Atlas.data = { ASSETS, BY_KEY, SOURCES, refresh, model, freshness, clearCache, _cache: cache };
})(typeof self !== 'undefined' ? self : this);
