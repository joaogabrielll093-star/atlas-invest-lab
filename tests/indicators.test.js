'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const ind = require('../assets/js/indicators.js');

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b} (tol ${tol})`);

test('SMA básica', () => {
  const r = ind.sma([1, 2, 3, 4, 5], 3);
  assert.deepEqual(r.slice(0, 2), [null, null]);
  close(r[2], 2); close(r[3], 3); close(r[4], 4);
});

test('EMA: semente SMA e recursão k = 2/(n+1)', () => {
  const v = [10, 11, 12, 13, 14, 15];
  const e = ind.ema(v, 3);
  assert.equal(e[0], null); assert.equal(e[1], null);
  close(e[2], 11);                       // SMA(10,11,12)
  close(e[3], (13 - 11) * 0.5 + 11);     // k = 0.5
  close(e[4], (14 - e[3]) * 0.5 + e[3]);
  close(e[5], (15 - e[4]) * 0.5 + e[4]);
});

test('EMA de série constante é a própria constante', () => {
  const e = ind.ema(new Array(50).fill(7), 21);
  for (let i = 20; i < 50; i++) close(e[i], 7);
});

test('EMA com dados insuficientes devolve só null', () => {
  assert.ok(ind.ema([1, 2, 3], 9).every((x) => x === null));
});

// Exemplo clássico de RSI(14) de Wilder (tabela do StockCharts ChartSchool).
const WILDER = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28,
  46.00, 46.03, 46.41, 46.22, 45.64, 46.21, 46.25, 45.71, 46.45, 45.78, 45.35, 44.03, 44.18, 44.22, 44.57, 43.42, 42.66, 43.13];
const WILDER_RSI = [70.53, 66.32, 66.55, 69.41, 66.36, 57.97, 62.93, 63.26, 56.06, 62.38, 54.71, 50.42, 39.99, 41.46, 41.87, 45.46, 37.30, 33.08, 37.77];

test('RSI(14) bate com a tabela de referência de Wilder', () => {
  const r = ind.rsi(WILDER, 14);
  for (let i = 0; i < 14; i++) assert.equal(r[i], null);
  // A tabela publicada arredonda as médias intermediárias a 2 casas, daí a tolerância.
  WILDER_RSI.forEach((ref, k) => close(r[14 + k], ref, 0.1));
  // Conferência exata do primeiro valor: médias simples das 14 primeiras variações.
  let g = 0, l = 0;
  for (let i = 1; i <= 14; i++) { const d = WILDER[i] - WILDER[i - 1]; if (d > 0) g += d; else l -= d; }
  close(r[14], 100 - 100 / (1 + (g / 14) / (l / 14)), 1e-9);
  // Segundo valor: suavização de Wilder.
  const d15 = WILDER[15] - WILDER[14];
  const ag = ((g / 14) * 13 + Math.max(d15, 0)) / 14, al = ((l / 14) * 13 + Math.max(-d15, 0)) / 14;
  close(r[15], 100 - 100 / (1 + ag / al), 1e-9);
});

test('RSI: só altas = 100, só quedas = 0, sem variação = 50', () => {
  const up = Array.from({ length: 20 }, (_, i) => 10 + i);
  const down = Array.from({ length: 20 }, (_, i) => 30 - i);
  assert.equal(ind.rsi(up, 14)[19], 100);
  assert.equal(ind.rsi(down, 14)[19], 0);
  assert.equal(ind.rsi(new Array(20).fill(5), 14)[19], 50);
});

test('Volatilidade anualizada: série com retorno constante tem vol 0', () => {
  const v = Array.from({ length: 30 }, (_, i) => 100 * Math.pow(1.01, i));
  close(ind.annualizedVolatility(v, 21), 0, 1e-6);
});

test('changeOver', () => {
  close(ind.changeOver([100, 110, 121], 2), 21);
  assert.equal(ind.changeOver([1], 5), null);
});
