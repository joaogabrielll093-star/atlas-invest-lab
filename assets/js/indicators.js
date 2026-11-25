/**
 * ATLAS INVEST LAB — indicadores técnicos.
 * Funções puras, sem dependências. Funcionam no navegador (window.AtlasIndicators)
 * e no Node (module.exports) para os testes automatizados.
 *
 * Convenção: todas as funções recebem um array de números e devolvem um array
 * do mesmo tamanho, com `null` nas posições em que ainda não há dados suficientes.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AtlasIndicators = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Média móvel simples. */
  function sma(values, period) {
    const out = new Array(values.length).fill(null);
    if (period <= 0) return out;
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i];
      if (i >= period) sum -= values[i - period];
      if (i >= period - 1) out[i] = sum / period;
    }
    return out;
  }

  /**
   * Média móvel exponencial.
   * Semente = SMA dos `period` primeiros valores (padrão de mercado),
   * depois EMA_t = (P_t − EMA_{t−1}) · k + EMA_{t−1}, com k = 2 / (period + 1).
   * O primeiro valor válido aparece no índice period − 1.
   */
  function ema(values, period) {
    const out = new Array(values.length).fill(null);
    if (period <= 0 || values.length < period) return out;
    const k = 2 / (period + 1);
    let seed = 0;
    for (let i = 0; i < period; i++) seed += values[i];
    let prev = seed / period;
    out[period - 1] = prev;
    for (let i = period; i < values.length; i++) {
      prev = (values[i] - prev) * k + prev;
      out[i] = prev;
    }
    return out;
  }

  /**
   * RSI de Wilder.
   * Média inicial de ganhos/perdas = média simples das `period` primeiras
   * variações; depois suavização de Wilder: avg = (avg·(n−1) + atual) / n.
   * O primeiro valor válido aparece no índice `period` (precisa de period+1 preços).
   */
  function rsi(values, period = 14) {
    const out = new Array(values.length).fill(null);
    if (values.length <= period) return out;
    let gain = 0, loss = 0;
    for (let i = 1; i <= period; i++) {
      const ch = values[i] - values[i - 1];
      if (ch > 0) gain += ch; else loss -= ch;
    }
    let avgGain = gain / period;
    let avgLoss = loss / period;
    const calc = () => (avgLoss === 0 ? (avgGain === 0 ? 50 : 100) : 100 - 100 / (1 + avgGain / avgLoss));
    out[period] = calc();
    for (let i = period + 1; i < values.length; i++) {
      const ch = values[i] - values[i - 1];
      avgGain = (avgGain * (period - 1) + (ch > 0 ? ch : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (ch < 0 ? -ch : 0)) / period;
      out[i] = calc();
    }
    return out;
  }

  /**
   * Volatilidade histórica anualizada (desvio-padrão amostral dos retornos
   * logarítmicos diários das últimas `window` sessões × √periodsPerYear), em %.
   */
  function annualizedVolatility(values, window = 21, periodsPerYear = 252) {
    if (values.length < window + 1) return null;
    const slice = values.slice(-(window + 1));
    const rets = [];
    for (let i = 1; i < slice.length; i++) rets.push(Math.log(slice[i] / slice[i - 1]));
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
    return Math.sqrt(variance) * Math.sqrt(periodsPerYear) * 100;
  }

  /** Variação percentual entre o último valor e o valor `n` posições antes. */
  function changeOver(values, n) {
    if (values.length <= n) return null;
    const a = values[values.length - 1 - n];
    const b = values[values.length - 1];
    return a ? (b / a - 1) * 100 : null;
  }

  /** Leitura textual (neutra) da situação técnica atual. */
  function trendReading(closes) {
    const e9 = ema(closes, 9), e21 = ema(closes, 21), r = rsi(closes, 14);
    const i = closes.length - 1;
    if (i < 21 || e9[i] == null || e21[i] == null || r[i] == null) return null;
    const trend = e9[i] > e21[i] ? 'alta' : e9[i] < e21[i] ? 'baixa' : 'lateral';
    let crossedAgo = null;
    for (let j = i; j > 21; j--) {
      if (e9[j - 1] == null) break;
      const before = Math.sign(e9[j - 1] - e21[j - 1]);
      const after = Math.sign(e9[j] - e21[j]);
      if (before !== after && after !== 0) { crossedAgo = i - j; break; }
    }
    const rsiZone = r[i] >= 70 ? 'sobrecompra' : r[i] <= 30 ? 'sobrevenda' : 'neutra';
    return { trend, ema9: e9[i], ema21: e21[i], rsi: r[i], rsiZone, crossedAgo };
  }

  return { sma, ema, rsi, annualizedVolatility, changeOver, trendReading };
});
