#!/usr/bin/env node
/**
 * ATLAS INVEST LAB — gerador do snapshot de mercado (data/market.json).
 *
 * Roda no GitHub Actions (ver .github/workflows/pages.yml) a cada publicação
 * e em horários agendados. Busca, do lado do servidor, os dados que o navegador
 * não consegue buscar diretamente por falta de CORS (Yahoo Finance) e também
 * guarda uma cópia dos indicadores do Banco Central como fallback.
 *
 * Sem dependências: Node 20+ (fetch nativo).
 * Uso local:  node scripts/fetch-market.mjs  [arquivo-de-saída]
 * (atrás de proxy: NODE_USE_ENV_PROXY=1 node scripts/fetch-market.mjs)
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const OUT = resolve(process.argv[2] || 'data/market.json');
const UA = 'Mozilla/5.0 (compatible; AtlasInvestLab/1.0; +https://github.com/)';

// Ativos buscados no Yahoo Finance (histórico diário OHLC + cotação).
const YAHOO = {
  IBOV:   { symbol: '^BVSP',    name: 'Ibovespa' },
  SPX:    { symbol: '^GSPC',    name: 'S&P 500' },
  NASDAQ: { symbol: '^IXIC',    name: 'Nasdaq Composite' },
  DOW:    { symbol: '^DJI',     name: 'Dow Jones' },
  USDBRL: { symbol: 'USDBRL=X', name: 'Dólar comercial' },
  EURBRL: { symbol: 'EURBRL=X', name: 'Euro' },
  GBPBRL: { symbol: 'GBPBRL=X', name: 'Libra' },
  BTC:    { symbol: 'BTC-USD',  name: 'Bitcoin' },
  ETH:    { symbol: 'ETH-USD',  name: 'Ethereum' },
};

// Séries do SGS / Banco Central.
const BCB = {
  selic:   432,    // Meta Selic definida pelo Copom (% a.a.)
  cdi:     4389,   // CDI anualizado base 252 (% a.a.)
  ipca:    433,    // IPCA variação mensal (%)
  ipca12:  13522,  // IPCA acumulado 12 meses (%)
  ptaxUsd: 1,      // Dólar PTAX venda (R$)
  ptaxEur: 21619,  // Euro PTAX venda (R$)
};

async function getJSON(url, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

const round = (v, d) => (v == null || !Number.isFinite(v) ? null : Number(v.toFixed(d)));
const decimalsFor = (price) => (price < 20 ? 4 : 2);

async function yahoo(key, { symbol, name }) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d&includePrePost=false`;
  const j = await getJSON(url);
  const res = j?.chart?.result?.[0];
  if (!res) throw new Error(j?.chart?.error?.description || 'resposta vazia');
  const m = res.meta;
  const q = res.indicators.quote[0];
  const d = decimalsFor(m.regularMarketPrice);
  const candles = [];
  for (let i = 0; i < res.timestamp.length; i++) {
    const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
    if ([o, h, l, c].some((x) => x == null || !Number.isFinite(x))) continue;
    // Data do pregão no fuso da bolsa (evita "pular" um dia por causa do UTC).
    const day = new Date((res.timestamp[i] + (m.gmtoffset || 0)) * 1000).toISOString().slice(0, 10);
    const row = [day, round(o, d), round(h, d), round(l, d), round(c, d)];
    if (candles.length && candles[candles.length - 1][0] === day) candles[candles.length - 1] = row;
    else candles.push(row);
  }
  const price = m.regularMarketPrice;
  const change = m.fulldayChange ?? null;
  const prevClose = change != null ? price - change : null;
  const period = m.currentTradingPeriod?.regular;
  const nowSec = Date.now() / 1000;
  const open = period ? nowSec >= period.start && nowSec <= period.end : null;
  return {
    key, name, symbol,
    currency: m.currency,
    price: round(price, d),
    prevClose: round(prevClose, d),
    changePct: round(m.regularMarketChangePercent ?? (prevClose ? ((price / prevClose) - 1) * 100 : null), 3),
    high: round(m.regularMarketDayHigh, d),
    low: round(m.regularMarketDayLow, d),
    high52: round(m.fiftyTwoWeekHigh, d),
    low52: round(m.fiftyTwoWeekLow, d),
    time: new Date(m.regularMarketTime * 1000).toISOString(),
    marketOpen: open,
    // Com o mercado aberto, o último candle diário ainda está se formando.
    lastCandlePartial: open === true,
    tradingPeriod: period ? { start: new Date(period.start * 1000).toISOString(), end: new Date(period.end * 1000).toISOString() } : null,
    exchangeTz: m.exchangeTimezoneName,
    source: 'Yahoo Finance',
    candles, // [data, abertura, máxima, mínima, fechamento]
  };
}

function brDateToISO(s) {
  const [dd, mm, yyyy] = s.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

async function bcb(code, sinceDays) {
  const end = new Date();
  const start = new Date(end.getTime() - sinceDays * 86400000);
  const fmt = (d) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados?formato=json&dataInicial=${fmt(start)}&dataFinal=${fmt(end)}`;
  const j = await getJSON(url);
  const today = end.toISOString().slice(0, 10);
  return j
    .map((r) => [brDateToISO(r.data), Number(r.valor)])
    .filter(([dt, v]) => dt <= today && Number.isFinite(v)) // a série 432 traz datas futuras (meta vigente)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

async function main() {
  const out = { generatedAt: new Date().toISOString(), assets: {}, macro: {}, errors: [] };

  await Promise.all(Object.entries(YAHOO).map(async ([key, cfg]) => {
    try { out.assets[key] = await yahoo(key, cfg); }
    catch (e) { out.errors.push(`${key}: ${e.message}`); }
  }));

  const spans = { selic: 800, cdi: 400, ipca: 800, ipca12: 800, ptaxUsd: 760, ptaxEur: 760 };
  await Promise.all(Object.entries(BCB).map(async ([key, code]) => {
    try { out.macro[key] = { code, source: 'Banco Central (SGS)', series: await bcb(code, spans[key]) }; }
    catch (e) { out.errors.push(`bcb ${key}: ${e.message}`); }
  }));

  const ok = Object.keys(out.assets).length + Object.keys(out.macro).length;
  if (ok === 0) {
    console.error('Nenhuma fonte respondeu; snapshot não foi gravado.', out.errors);
    process.exit(1);
  }
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));
  console.log(`Snapshot gravado em ${OUT}: ${Object.keys(out.assets).length} ativos, ${Object.keys(out.macro).length} séries BCB.`);
  if (out.errors.length) console.warn('Falhas:', out.errors.join(' | '));
}

main().catch((e) => { console.error(e); process.exit(1); });
