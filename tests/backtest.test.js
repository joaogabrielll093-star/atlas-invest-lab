'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const bt = require('../assets/js/backtest.js');
const ind = require('../assets/js/indicators.js');

const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

function makeCandles(closes, gap = 0) {
  // abertura = fechamento anterior + gap (permite distinguir preço de abertura e de fechamento)
  return closes.map((c, i) => {
    const open = i === 0 ? c : closes[i - 1] + gap;
    return { date: new Date(Date.UTC(2024, 0, 1) + i * 86400000).toISOString().slice(0, 10), open, high: Math.max(open, c) + 0.5, low: Math.min(open, c) - 0.5, close: c };
  });
}

// queda → alta → queda → alta: gera cruzamentos nos dois sentidos
function wave() {
  const out = [];
  let p = 100;
  const legs = [[40, -0.6], [40, 0.9], [40, -0.8], [40, 0.7]];
  for (const [len, step] of legs) for (let i = 0; i < len; i++) { p += step + Math.sin(i) * 0.3; out.push(+p.toFixed(4)); }
  return out;
}

const NOFILTER = { rsiEntryMax: 100, rsiEntryMin: 0 };

test('ordens executam na abertura do candle SEGUINTE ao sinal', () => {
  const candles = makeCandles(wave(), 0.25);
  const res = bt.run(candles, { ...NOFILTER, feePct: 0, slippagePct: 0 });
  const closes = candles.map((c) => c.close);
  const e9 = ind.ema(closes, 9), e21 = ind.ema(closes, 21);
  assert.ok(res.numTrades >= 1);
  for (const t of [...res.trades, ...(res.openTrade ? [res.openTrade] : [])]) {
    const s = t.entryIndex - 1; // candle do sinal
    assert.ok(e9[s - 1] <= e21[s - 1] && e9[s] > e21[s], 'entrada sem cruzamento de alta no candle anterior');
    close(t.entryPrice, candles[t.entryIndex].open);
    if (!t.open) {
      const x = t.exitIndex - 1;
      assert.ok(e9[x - 1] >= e21[x - 1] && e9[x] < e21[x], 'saída sem cruzamento de baixa no candle anterior');
      close(t.exitPrice, candles[t.exitIndex].open);
      assert.ok(t.exitIndex > t.entryIndex, 'saída no mesmo candle da entrada');
    }
  }
});

test('sem look-ahead: alterar o futuro não muda operações já encerradas', () => {
  const base = makeCandles(wave(), 0.1);
  const a = bt.run(base, NOFILTER);
  const cut = a.trades[0].exitIndex; // primeira operação encerrada
  const altered = base.map((c, i) => (i > cut ? { ...c, open: c.open * 3, high: c.high * 3, low: c.low * 3, close: c.close * 3 } : c));
  const b = bt.run(altered, NOFILTER);
  assert.deepEqual(
    { e: b.trades[0].entryIndex, x: b.trades[0].exitIndex, pnl: b.trades[0].pnl },
    { e: a.trades[0].entryIndex, x: a.trades[0].exitIndex, pnl: a.trades[0].pnl },
  );
});

test('taxas e slippage: conta exata de uma operação', () => {
  const candles = makeCandles(wave(), 0.2);
  const fee = 0.1, slip = 0.05;
  const res = bt.run(candles, { ...NOFILTER, feePct: fee, slippagePct: slip, capital: 10000 });
  const t = res.trades[0];
  const buy = candles[t.entryIndex].open * (1 + slip / 100);
  const qty = (10000 * (1 - fee / 100)) / buy;
  const sell = candles[t.exitIndex].open * (1 - slip / 100);
  const proceeds = qty * sell * (1 - fee / 100);
  close(t.proceeds, proceeds);
  close(t.pnl, proceeds - 10000);
  close(t.fees, 10000 * fee / 100 + qty * sell * fee / 100);
});

test('capital composto: capital final = encadeamento das operações', () => {
  const res = bt.run(makeCandles(wave(), 0.2), NOFILTER);
  let cap = res.initialCapital;
  for (const t of res.trades) { close(t.invested, cap); cap = t.proceeds; }
  if (res.openTrade) { close(res.openTrade.invested, cap); cap = res.openTrade.proceeds; }
  close(res.finalCapital, cap);
  close(res.returnPct, (cap / res.initialCapital - 1) * 100);
});

test('sem reentrada repetida: nunca há duas posições simultâneas e cada entrada exige novo cruzamento', () => {
  const res = bt.run(makeCandles(wave(), 0.2), NOFILTER);
  const all = [...res.trades, ...(res.openTrade ? [res.openTrade] : [])];
  for (let i = 1; i < all.length; i++) assert.ok(all[i].entryIndex > all[i - 1].exitIndex);
});

test('profit factor, taxa de acerto e drawdown', () => {
  const res = bt.run(makeCandles(wave(), 0.2), NOFILTER);
  const gp = res.trades.filter((t) => t.pnl > 0).reduce((a, t) => a + t.pnl, 0);
  const gl = -res.trades.filter((t) => t.pnl <= 0).reduce((a, t) => a + t.pnl, 0);
  if (gl > 0) close(res.profitFactor, gp / gl);
  close(res.winRatePct, (res.wins / res.numTrades) * 100);
  assert.ok(res.maxDrawdownPct <= 0);
  assert.equal(bt.maxDrawdown([100, 120, 90, 130, 117]), (90 / 120 - 1) * 100);
});

test('filtro de RSI bloqueia entradas fora da faixa', () => {
  const candles = makeCandles(wave(), 0.2);
  const res = bt.run(candles, { rsiEntryMin: 0, rsiEntryMax: 1 }); // praticamente impossível
  assert.equal(res.numTrades, 0);
  assert.equal(res.openTrade, null);
  close(res.finalCapital, 10000);
});

test('buy and hold usa o mesmo ponto de partida e os mesmos custos', () => {
  const candles = makeCandles(wave(), 0.2);
  const res = bt.run(candles, { feePct: 0.1, slippagePct: 0.05 });
  const s = candles[res.startIndex], l = candles[candles.length - 1];
  const q = (10000 * 0.999) / (s.open * 1.0005);
  close(res.buyHold.finalCapital, q * l.close * 0.9995 * 0.999);
  assert.equal(res.buyHold.equity[0].date, s.date);
  assert.equal(res.equity[0].date, s.date);
});

test('tradeFrom: candles anteriores só aquecem os indicadores', () => {
  const candles = makeCandles(wave(), 0.2);
  const res = bt.run(candles, { ...NOFILTER, tradeFrom: 60 });
  assert.equal(res.startIndex, 60);
  assert.equal(res.equity[0].date, candles[60].date);
  for (const t of res.trades) assert.ok(t.entryIndex >= 60);
});

test('erros de entrada claros', () => {
  assert.throws(() => bt.run([], {}), /Sem dados/);
  assert.throws(() => bt.run(makeCandles([1, 2, 3, 4, 5]), {}), /insuficientes/);
  assert.throws(() => bt.run(makeCandles(wave()), { capital: 0 }), /capital/);
  assert.throws(() => bt.run(makeCandles(wave()), { fast: 21, slow: 9 }), /EMA lenta/);
});
