/**
 * ATLAS INVEST LAB — motor de backtest.
 *
 * Estratégia: cruzamento EMA rápida × EMA lenta com filtro de RSI, somente compra (long).
 *
 * Regras de execução (sem look-ahead):
 *  - Os sinais são calculados com o FECHAMENTO do candle t (EMAs e RSI até t).
 *  - A ordem é executada na ABERTURA do candle t+1, com slippage contra o operador.
 *  - Entrada: EMA rápida cruza ACIMA da lenta em t (estava ≤ em t−1 e ficou > em t)
 *    e RSI(t) está entre rsiEntryMin e rsiEntryMax. Só entra se estiver fora do mercado.
 *  - Saída: EMA rápida cruza ABAIXO da lenta em t, ou (opcional) RSI(t) ≥ rsiExit.
 *  - Depois de uma saída, só reentra com um NOVO cruzamento de alta (sem reentrada repetida).
 *  - Taxa (% por lado) é cobrada sobre o valor financeiro na entrada e na saída.
 *  - O patrimônio é marcado a mercado no fechamento de cada candle.
 *  - Posição aberta no fim: avaliada pelo valor de liquidação no último fechamento
 *    (já descontando taxa e slippage de saída) e identificada como "aberta".
 *  - Buy and Hold: compra na abertura do primeiro candle negociável (mesmo ponto de
 *    partida da estratégia) com os mesmos custos, liquidado no último fechamento.
 */
(function (root, factory) {
  const ind = typeof module !== 'undefined' && module.exports ? require('./indicators.js') : root.AtlasIndicators;
  const api = factory(ind);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AtlasBacktest = api;
})(typeof self !== 'undefined' ? self : this, function (ind) {
  'use strict';

  const DEFAULTS = {
    capital: 10000,
    feePct: 0.1,        // % por lado
    slippagePct: 0.05,  // % por execução
    fast: 9,
    slow: 21,
    rsiPeriod: 14,
    rsiEntryMin: 0,
    rsiEntryMax: 70,
    rsiExit: 0,         // 0 = desligado
  };

  /**
   * @param {Array<{date:string,open:number,high:number,low:number,close:number}>} candles
   * @param {object} opts
   */
  function run(candles, opts = {}) {
    const o = Object.assign({}, DEFAULTS, opts);
    validate(candles, o);

    const closes = candles.map((c) => c.close);
    const ef = ind.ema(closes, o.fast);
    const es = ind.ema(closes, o.slow);
    const r = ind.rsi(closes, o.rsiPeriod);
    const fee = o.feePct / 100;
    const slip = o.slippagePct / 100;
    const n = candles.length;

    // Primeiro índice em que existe sinal válido (precisa de t−1 com EMAs definidas e RSI).
    let firstSignal = -1;
    for (let i = 1; i < n; i++) {
      if (ef[i - 1] != null && es[i - 1] != null && r[i] != null) { firstSignal = i; break; }
    }
    if (firstSignal < 0 || firstSignal + 1 >= n) {
      throw new Error(`Dados insuficientes: são necessários pelo menos ${Math.max(o.slow, o.rsiPeriod + 1) + 2} candles.`);
    }
    // Primeiro candle em que uma ordem pode ser executada. `tradeFrom` permite passar
    // candles extras só para aquecer os indicadores antes do período simulado.
    const startIdx = Math.max(firstSignal + 1, o.tradeFrom || 0);
    if (startIdx >= n) throw new Error('Período curto demais para a simulação.');

    let cash = o.capital;
    let qty = 0;
    let pending = null; // 'buy' | 'sell' — ordem a executar na abertura do próximo candle
    let current = null; // operação aberta
    const trades = [];
    const equity = [];
    let barsInMarket = 0;

    for (let i = startIdx - 1; i < n; i++) {
      const c = candles[i];

      // 1) Executa a ordem pendente (sinal do candle anterior) na abertura deste candle.
      if (pending === 'buy' && qty === 0) {
        const price = c.open * (1 + slip);
        const invested = cash;
        const costs = invested * fee;
        qty = (invested - costs) / price;
        current = { entryDate: c.date, entryIndex: i, entryPrice: price, invested, entryFee: costs, signalDate: candles[i - 1].date };
        cash = 0;
      } else if (pending === 'sell' && qty > 0) {
        const price = c.open * (1 - slip);
        const gross = qty * price;
        const costs = gross * fee;
        cash = gross - costs;
        closeTrade(current, c.date, i, price, cash, costs, current.exitReason);
        trades.push(current);
        current = null;
        qty = 0;
      }
      pending = null;

      // 2) Marca a mercado no fechamento.
      const eq = qty > 0 ? qty * c.close : cash;
      if (i >= startIdx) equity.push({ date: c.date, equity: eq });
      if (qty > 0 && i >= startIdx) barsInMarket++;

      // 3) Gera sinal com dados até o fechamento deste candle (executa no próximo).
      if (i < n - 1 && i >= firstSignal) {
        const crossUp = ef[i - 1] <= es[i - 1] && ef[i] > es[i];
        const crossDown = ef[i - 1] >= es[i - 1] && ef[i] < es[i];
        if (qty === 0) {
          if (crossUp && r[i] >= o.rsiEntryMin && r[i] <= o.rsiEntryMax) pending = 'buy';
        } else if (crossDown) {
          pending = 'sell'; current.exitReason = 'Cruzamento de baixa das EMAs';
        } else if (o.rsiExit > 0 && r[i] >= o.rsiExit) {
          pending = 'sell'; current.exitReason = `RSI ≥ ${o.rsiExit}`;
        }
      }
    }

    // Posição aberta no fim: valor de liquidação no último fechamento.
    const last = candles[n - 1];
    let openTrade = null;
    let finalCapital = cash;
    if (qty > 0) {
      const price = last.close * (1 - slip);
      const gross = qty * price;
      const costs = gross * fee;
      finalCapital = gross - costs;
      openTrade = Object.assign({}, current);
      closeTrade(openTrade, last.date, n - 1, price, finalCapital, costs, 'Em aberto (avaliada no último fechamento)');
      openTrade.open = true;
    }

    // Sinal atual (gerado no último fechamento, valeria para o próximo pregão).
    const li = n - 1;
    let nextSignal = null;
    if (ef[li - 1] != null && es[li - 1] != null && r[li] != null) {
      const up = ef[li - 1] <= es[li - 1] && ef[li] > es[li];
      const down = ef[li - 1] >= es[li - 1] && ef[li] < es[li];
      if (qty === 0 && up && r[li] >= o.rsiEntryMin && r[li] <= o.rsiEntryMax) nextSignal = 'compra';
      else if (qty > 0 && (down || (o.rsiExit > 0 && r[li] >= o.rsiExit))) nextSignal = 'venda';
    }

    // Buy and Hold com os mesmos custos e mesmo ponto de partida.
    const bhStart = candles[startIdx];
    const bhQty = (o.capital * (1 - fee)) / (bhStart.open * (1 + slip));
    const bhFinal = bhQty * last.close * (1 - slip) * (1 - fee);
    const bhCurve = [];
    for (let i = startIdx; i < n; i++) bhCurve.push({ date: candles[i].date, equity: bhQty * candles[i].close });

    // Na curva, o último ponto usa o valor de liquidação para bater com o capital final.
    if (equity.length) equity[equity.length - 1].equity = finalCapital;
    if (bhCurve.length) bhCurve[bhCurve.length - 1].equity = bhFinal;

    const closed = trades;
    const wins = closed.filter((t) => t.pnl > 0);
    const losses = closed.filter((t) => t.pnl <= 0);
    const grossProfit = wins.reduce((a, t) => a + t.pnl, 0);
    const grossLoss = -losses.reduce((a, t) => a + t.pnl, 0);
    const totalFees = closed.reduce((a, t) => a + t.fees, 0) + (openTrade ? openTrade.fees : 0);

    const years = yearsBetween(bhStart.date, last.date);
    return {
      params: o,
      period: { start: bhStart.date, end: last.date, bars: n - startIdx, years },
      initialCapital: o.capital,
      finalCapital,
      returnPct: (finalCapital / o.capital - 1) * 100,
      cagrPct: years > 0.25 ? (Math.pow(finalCapital / o.capital, 1 / years) - 1) * 100 : null,
      trades: closed,
      openTrade,
      numTrades: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRatePct: closed.length ? (wins.length / closed.length) * 100 : null,
      grossProfit,
      grossLoss,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : null),
      avgTradePct: closed.length ? closed.reduce((a, t) => a + t.pnlPct, 0) / closed.length : null,
      totalFees,
      maxDrawdownPct: maxDrawdown(equity.map((e) => e.equity)),
      exposurePct: equity.length ? (barsInMarket / equity.length) * 100 : 0,
      equity,
      buyHold: {
        finalCapital: bhFinal,
        returnPct: (bhFinal / o.capital - 1) * 100,
        maxDrawdownPct: maxDrawdown(bhCurve.map((e) => e.equity)),
        equity: bhCurve,
      },
      nextSignal,
      series: { emaFast: ef, emaSlow: es, rsi: r },
      startIndex: startIdx,
    };
  }

  function closeTrade(t, date, idx, price, proceeds, exitFee, reason) {
    t.exitDate = date;
    t.exitIndex = idx;
    t.exitPrice = price;
    t.proceeds = proceeds;
    t.fees = t.entryFee + exitFee;
    t.pnl = proceeds - t.invested;
    t.pnlPct = (proceeds / t.invested - 1) * 100;
    t.bars = idx - t.entryIndex;
    t.exitReason = reason;
  }

  /** Drawdown máximo (%, número negativo ou 0) de uma curva de patrimônio. */
  function maxDrawdown(curve) {
    let peak = -Infinity, mdd = 0;
    for (const v of curve) {
      if (v > peak) peak = v;
      const dd = peak > 0 ? (v / peak - 1) * 100 : 0;
      if (dd < mdd) mdd = dd;
    }
    return mdd;
  }

  function yearsBetween(a, b) {
    return (Date.parse(b) - Date.parse(a)) / (365.25 * 86400000);
  }

  function validate(candles, o) {
    if (!Array.isArray(candles) || candles.length === 0) throw new Error('Sem dados históricos para simular.');
    if (!(o.capital > 0)) throw new Error('O capital inicial deve ser maior que zero.');
    if (!(o.feePct >= 0 && o.feePct < 10)) throw new Error('Taxa inválida (use entre 0% e 10% por lado).');
    if (!(o.slippagePct >= 0 && o.slippagePct < 10)) throw new Error('Slippage inválido (use entre 0% e 10%).');
    if (!(o.fast >= 2 && o.slow > o.fast)) throw new Error('A EMA lenta deve ter período maior que a EMA rápida.');
    if (!(o.rsiEntryMax > o.rsiEntryMin)) throw new Error('Faixa de RSI de entrada inválida.');
    for (const c of candles) {
      if (![c.open, c.high, c.low, c.close].every((x) => typeof x === 'number' && x > 0)) {
        throw new Error(`Candle inválido em ${c.date}.`);
      }
    }
  }

  return { run, maxDrawdown, DEFAULTS };
});
