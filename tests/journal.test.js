'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const j = require('../assets/js/journal.js');

test('resultado de compra, venda (short) e operação aberta', () => {
  assert.deepEqual(j.result({ side: 'long', entry: 5, exit: 5.5, qty: 1000, fees: 10 }).pnl, 490);
  assert.equal(j.result({ side: 'short', entry: 100, exit: 90, qty: 2, fees: 0 }).pnl, 20);
  assert.equal(j.result({ side: 'long', entry: 10, exit: null, qty: 1 }).open, true);
  const r = j.result({ side: 'long', entry: 10, exit: 11, qty: 10, fees: 0 });
  assert.ok(Math.abs(r.pnlPct - 10) < 1e-9);
});

test('normalize aceita campos em português e números pt-BR', () => {
  const t = j.normalize({ ativo: 'petr4', data: '05/03/2026', entrada: '38,50', saida: '1.040,25', quantidade: '100', taxas: '4,90', direcao: 'venda' });
  assert.equal(t.asset, 'PETR4');
  assert.equal(t.date, '2026-03-05');
  assert.equal(t.entry, 38.5);
  assert.equal(t.exit, 1040.25);
  assert.equal(t.fees, 4.9);
  assert.equal(t.side, 'short');
  assert.equal(j.normalize({ ativo: 'X' }), null); // incompleto
});

test('números no padrão brasileiro', () => {
  assert.equal(j.toNum('10.000'), 10000);
  assert.equal(j.toNum('1.234.567,89'), 1234567.89);
  assert.equal(j.toNum('5,4321'), 5.4321);
  assert.equal(j.toNum('5.4321'), 5.4321);
  assert.equal(j.toNum('0,05'), 0.05);
  assert.equal(j.toNum('R$ 2.500,00'), 2500);
  assert.equal(j.toNum('abc'), null);
});

test('validação', () => {
  assert.ok(j.validate({ asset: '', date: null, entry: 0, qty: -1 }).length >= 3);
  assert.deepEqual(j.validate({ asset: 'BTC', date: '2026-01-01', entry: 1, qty: 1, fees: 0, exit: null }), []);
  assert.ok(j.validate({ asset: 'BTC', date: '2026-02-01', exitDate: '2026-01-01', entry: 1, exit: 2, qty: 1 }).length);
});

test('CSV: separador ;, vírgula decimal, BOM e escape de aspas', () => {
  const csv = j.toCSV([{ id: '1', asset: 'USDBRL', side: 'long', date: '2026-01-02', entry: 5.5, exit: 5.6, qty: 1000, fees: 1, currency: 'BRL', setup: 'EMA', notes: 'nota "x"; y', createdAt: 'a' }]);
  assert.ok(csv.startsWith('﻿'));
  const [head, row] = csv.slice(1).split('\r\n');
  assert.equal(head.split(';').length, 14);
  assert.match(row, /5,5;5,6;1000;1;BRL;99;/);
  assert.match(row, /"nota ""x""; y"$/);
});

test('backup → restauração preserva os dados (ida e volta)', () => {
  const list = [j.normalize({ asset: 'BTC', date: '2026-01-01', entry: 50000, qty: 0.1, currency: 'USD', notes: 'teste' })];
  const back = j.parseBackup(j.backup(list));
  assert.deepEqual(back.trades, list);
  assert.equal(back.skipped, 0);
});

test('restauração aceita lista simples e rejeita JSON inválido', () => {
  assert.equal(j.parseBackup('[{"ativo":"VALE3","data":"2026-01-01","entrada":60,"quantidade":10}]').trades.length, 1);
  assert.throws(() => j.parseBackup('{oops'), /JSON válido/);
  assert.throws(() => j.parseBackup('{"a":1}'), /Não encontrei/);
});

test('merge: adiciona novas e atualiza existentes pelo id', () => {
  const a = [{ id: '1', asset: 'A' }, { id: '2', asset: 'B' }];
  const r = j.merge(a, [{ id: '2', asset: 'B2' }, { id: '3', asset: 'C' }]);
  assert.equal(r.added, 1); assert.equal(r.updated, 1);
  assert.equal(r.list.find((x) => x.id === '2').asset, 'B2');
  assert.equal(r.list.length, 3);
});
