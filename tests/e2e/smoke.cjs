/**
 * Teste de ponta a ponta (navegador real, APIs reais).
 * Requer Playwright:  npm i -D playwright && npx playwright install chromium
 * Uso:  python3 -m http.server 8765  (em outro terminal, na raiz do projeto)
 *       node tests/e2e/smoke.cjs [http://localhost:8765/] [pasta-de-screenshots]
 */
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:8765/';
const SHOTS = process.argv[3] || null;
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined;

const results = [];
function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail });
  console.log(`${cond ? 'PASSOU' : 'FALHOU'}  ${name}${detail ? '  — ' + detail : ''}`);
}
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true }); };

async function waitLoaded(page) {
  await page.waitForFunction(() => {
    const s = document.querySelector('#status');
    return s && !s.classList.contains('loading') && /(ok|warn|err)/.test(s.className);
  }, null, { timeout: 45000 });
}

(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ proxy });

  // ---------------- Desktop ----------------
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|blocked by CORS policy/.test(m.text())) errors.push(m.text()); });

  // 1. Abertura
  await page.goto(BASE);
  await waitLoaded(page);
  const heroPrice = await page.textContent('#usd-hero .big');
  check('1. Painel abre e mostra o dólar', /R\$\s*\d/.test(heroPrice || ''), heroPrice);
  const cards = await page.$$eval('.card.asset', (els) => els.map((e) => e.querySelector('.px').textContent.trim()));
  check('1. Cartões de ativos com cotação', cards.length === 8 && cards.every((t) => /\d/.test(t)), cards.join(' | '));
  const macro = await page.$$eval('#macro .card', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  check('1. Selic, CDI e IPCA exibidos', macro.length >= 4, macro.join(' | '));
  const sources = await page.evaluate(() => Object.fromEntries(Object.entries(Atlas.data.SOURCES).map(([k, s]) => [k, s.ok === null ? 'não consultada' : s.ok ? 'ok' : 'falha: ' + s.error])));
  console.log('      fontes:', JSON.stringify(sources));
  const fresh = await page.$$eval('.fresh', (els) => els.map((e) => e.textContent));
  check('1. Cada cotação tem selo de horário/tipo', fresh.length >= 9 && fresh.every((t) => /(Ao vivo|Atraso|Com atraso|Fechamento|PTAX|Desatualizado|Último dado)/.test(t)), fresh.slice(0, 4).join(' | '));
  await shot(page, 'desktop-painel');

  // 2. Atualização
  const before = await page.evaluate(() => Atlas.data.SOURCES.bcb.at);
  await page.waitForTimeout(1100);
  await page.click('#btn-refresh');
  await page.waitForFunction(() => !document.querySelector('#btn-refresh').classList.contains('spin'), null, { timeout: 45000 });
  const after = await page.evaluate(() => Atlas.data.SOURCES.bcb.at);
  check('2. Botão atualizar busca dados novamente', after && after !== before, `${before} → ${after}`);

  // 3. Gráficos
  const svgs = await page.$$eval('#hero-chart svg path.series, #macro-chart svg path.series', (e) => e.length);
  check('3. Gráficos do painel desenhados', svgs >= 3, `${svgs} séries`);
  const box = await page.$('#hero-chart svg');
  const bb = await box.boundingBox();
  await page.mouse.move(bb.x + bb.width * 0.6, bb.y + bb.height / 2);
  const tip = await page.textContent('#hero-chart .tip');
  check('3. Cursor do gráfico mostra data e valor', /\d{2}\/\d{2}\/\d{4}/.test(tip || ''), (tip || '').trim());

  // 4. Indicadores (tela x cálculo independente no próprio navegador)
  await page.click('a[data-view="analise"]');
  await page.click('#an-assets button[data-k="USDBRL"]');
  await page.waitForSelector('#an-chart svg');
  const ind = await page.evaluate(() => {
    const a = Atlas.data.model().assets.USDBRL;
    const cl = a.candles.map((c) => c.close);
    // EMA e RSI recalculados aqui de forma independente
    const k9 = 2 / 10; let e9 = cl.slice(0, 9).reduce((x, y) => x + y) / 9; for (let i = 9; i < cl.length; i++) e9 = (cl[i] - e9) * k9 + e9;
    let g = 0, l = 0; for (let i = 1; i <= 14; i++) { const d = cl[i] - cl[i - 1]; d > 0 ? (g += d) : (l -= d); }
    g /= 14; l /= 14; for (let i = 15; i < cl.length; i++) { const d = cl[i] - cl[i - 1]; g = (g * 13 + Math.max(d, 0)) / 14; l = (l * 13 + Math.max(-d, 0)) / 14; }
    const rsi = 100 - 100 / (1 + g / l);
    const shown = [...document.querySelectorAll('#an-stats .stat')].map((s) => s.textContent);
    return { e9, rsi, shown, lib9: AtlasIndicators.ema(cl, 9).pop(), libR: AtlasIndicators.rsi(cl, 14).pop() };
  });
  check('4. EMA 9 confere com cálculo independente', Math.abs(ind.e9 - ind.lib9) < 1e-9, `${ind.e9.toFixed(4)}`);
  check('4. RSI 14 confere com cálculo independente', Math.abs(ind.rsi - ind.libR) < 1e-9, `${ind.rsi.toFixed(2)}`);
  const rsiShown = ind.shown.find((t) => t.startsWith('RSI 14'));
  check('4. RSI exibido na tela', rsiShown && rsiShown.includes(ind.rsi.toFixed(1).replace('.', ',')), rsiShown);
  const rsiSvg = await page.$$eval('#an-rsi path.series', (e) => e.length);
  check('4. Gráfico de RSI desenhado', rsiSvg === 1);
  await shot(page, 'desktop-analise');

  // 5. Backtest
  await page.click('a[data-view="backtest"]');
  await page.waitForFunction(() => document.querySelectorAll('#bt-asset option[value="USDBRL"]').length === 1);
  for (const key of ['USDBRL', 'IBOV', 'BTC']) {
    await page.selectOption('#bt-asset', key);
    await page.click('#bt-form button[type="submit"]');
    await page.waitForSelector('#bt-results:not([hidden])');
    const k = await page.$$eval('#bt-kpis .stat', (els) => Object.fromEntries(els.map((e) => [e.querySelector('.k').textContent, e.querySelector('.v').textContent])));
    const err = await page.isVisible('#bt-error');
    check(`5. Backtest ${key}`, !err && k['Capital inicial'] && k['Capital final'] && k['Drawdown máximo'] && k['Profit factor'], `final ${k['Capital final']} · retorno ${k['Retorno da estratégia']} · B&H ${k['Buy and hold']} · ops ${k['Operações encerradas']} · acerto ${k['Taxa de acerto']} · PF ${k['Profit factor']} · DD ${k['Drawdown máximo']}`);
  }
  const markers = await page.$$eval('#bt-price .marker', (e) => e.length);
  check('5. Operações marcadas no gráfico', markers > 0, `${markers} marcadores`);
  await page.fill('#bt-capital', '0');
  await page.click('#bt-form button[type="submit"]');
  check('5. Validação de parâmetros inválidos', await page.isVisible('#bt-error'), await page.textContent('#bt-error'));
  await page.fill('#bt-capital', '10.000');
  await shot(page, 'desktop-backtest');

  // 6. Diário + persistência
  await page.click('a[data-view="diario"]');
  await page.click('#j-new');
  await page.fill('#j-asset', 'usdbrl');
  await page.fill('#j-entry', '5,4321');
  await page.fill('#j-qty', '1000');
  await page.fill('#j-exit', '5,6000');
  await page.fill('#j-exitdate', await page.inputValue('#j-date'));
  await page.fill('#j-fees', '2,50');
  await page.fill('#j-setup', 'EMA 9 x 21');
  await page.click('#j-form button[type="submit"]');
  await page.click('#j-new');
  await page.fill('#j-asset', 'BTC');
  await page.selectOption('#j-currency', 'USD');
  await page.fill('#j-entry', '58000');
  await page.fill('#j-qty', '0,05');
  await page.click('#j-form button[type="submit"]');
  const items = await page.$$eval('.trade', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ')));
  check('6. Operações registradas', items.length === 2 && items.some((t) => /R\$ 165,40/.test(t)) && items.some((t) => /EM ABERTO/.test(t)), items.join(' || '));
  await page.reload();
  await waitLoaded(page);
  const afterReload = await page.$$eval('.trade', (e) => e.length);
  check('6/9. Diário continua salvo após recarregar a página', afterReload === 2, `${afterReload} operações`);
  check('9. Aba atual mantida após recarregar', await page.isVisible('#view-diario'));

  // 7. CSV, backup e restauração
  const [csvDl] = await Promise.all([page.waitForEvent('download'), page.click('#j-csv')]);
  const csvPath = await csvDl.path();
  const csv = fs.readFileSync(csvPath, 'utf8');
  check('7. CSV exportado', csv.startsWith('﻿') && csv.split('\r\n').length === 3 && csv.includes('USDBRL'), csvDl.suggestedFilename());
  const [jsDl] = await Promise.all([page.waitForEvent('download'), page.click('#j-backup')]);
  const jsPath = path.join(path.dirname(csvPath), 'backup.json');
  await jsDl.saveAs(jsPath);
  const backup = JSON.parse(fs.readFileSync(jsPath, 'utf8'));
  check('7. Backup JSON gerado', backup.format === 'atlas-invest-lab-backup' && backup.trades.length === 2, jsDl.suggestedFilename());
  // apaga uma operação e restaura
  page.once('dialog', () => {});
  await page.click('.trade [data-act="del"]');
  await page.click('#dialog-actions button.danger');
  check('7. Exclusão com confirmação', (await page.$$eval('.trade', (e) => e.length)) === 1);
  await page.setInputFiles('#j-restore', jsPath);
  await page.click('#dialog-actions button.primary'); // "Juntar"
  await page.waitForFunction(() => document.querySelectorAll('.trade').length === 2);
  check('7. Restauração do backup (juntar)', true, '2 operações após restaurar');
  await shot(page, 'desktop-diario');

  check('Sem erros de JavaScript no console (desktop)', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // ---------------- iPhone ----------------
  const ip = await browser.newContext({ ...devices['iPhone 13'] });
  const mp = await ip.newPage();
  const mErrors = [];
  mp.on('pageerror', (e) => mErrors.push(e.message));
  await mp.goto(BASE);
  await waitLoaded(mp);
  for (const v of ['painel', 'analise', 'backtest', 'diario']) {
    await mp.click(`.tabs a[data-view="${v}"]`);
    await mp.waitForTimeout(300);
    if (v === 'backtest') { await mp.click('#bt-form button[type="submit"]'); await mp.waitForSelector('#bt-results:not([hidden])'); }
    if (v === 'diario') await mp.click('#j-new');
    const over = await mp.evaluate(() => {
      const w = document.documentElement.clientWidth;
      const bad = [...document.querySelectorAll('body *')].filter((el) => {
        if (el.closest('.table-wrap, .chips.scroll, dialog')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > w + 1 || r.left < -1);
      }).map((el) => el.tagName + '.' + el.className).slice(0, 5);
      return { scroll: document.documentElement.scrollWidth, w, bad };
    });
    check(`8. iPhone: aba ${v} sem rolagem horizontal nem elementos cortados`, over.scroll <= over.w && over.bad.length === 0, `${over.scroll}px / ${over.w}px ${over.bad.join(', ')}`);
    await shot(mp, 'iphone-' + v);
  }
  const fontOk = await mp.$$eval('input:not([type=hidden]):not([type=file]):not([type=checkbox]), select', (els) => els.every((e) => parseFloat(getComputedStyle(e).fontSize) >= 16));
  check('8. Campos com fonte ≥ 16px (sem zoom automático no iPhone)', fontOk);
  const tabsVisible = await mp.evaluate(() => { const r = document.querySelector('.tabs').getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.height >= 60; });
  check('8. Barra de abas fixa e visível no iPhone', tabsVisible);
  check('Sem erros de JavaScript no console (iPhone)', mErrors.length === 0, mErrors.join(' | '));
  await ip.close();

  // ---------------- APIs fora do ar ----------------
  // a) com dados salvos de uma visita anterior
  const off = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const op = await off.newPage();
  const oErrors = [];
  op.on('pageerror', (e) => oErrors.push(e.message));
  await op.goto(BASE);
  await waitLoaded(op);
  await op.waitForTimeout(600); // grava o cache
  await off.route(/^https:\/\//, (r) => r.abort());
  await off.route(/data\/market\.json/, (r) => r.abort());
  await op.evaluate(() => {
    // simula que a última atualização foi há 2 horas
    const c = JSON.parse(localStorage.getItem('atlas.cache.v1'));
    const old = new Date(Date.now() - 2 * 3600e3).toISOString();
    for (const k of ['awesome', 'binance', 'gecko']) if (c[k]) c[k].at = old;
    localStorage.setItem('atlas.cache.v1', JSON.stringify(c));
  });
  await op.reload();
  await waitLoaded(op);
  const status = await op.textContent('#status-text');
  const heroOff = await op.textContent('#usd-hero .big').catch(() => null);
  const labels = await op.$$eval('.fresh', (e) => e.map((x) => x.textContent));
  check('10. API fora do ar: mostra último dado válido salvo', /R\$\s*\d/.test(heroOff || '') && /indispon|falha|salvos/i.test(status), `status "${status}", dólar ${heroOff}`);
  check('10. Dados antigos identificados (não aparecem como atuais)', !labels.some((t) => t.startsWith('Ao vivo')), labels.slice(0, 3).join(' | '));
  await shot(op, 'offline-com-cache');
  await off.close();

  // b) primeira visita, tudo fora do ar
  const off2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await off2.route(/^https:\/\//, (r) => r.abort());
  await off2.route(/data\/market\.json/, (r) => r.abort());
  const op2 = await off2.newPage();
  op2.on('pageerror', (e) => oErrors.push(e.message));
  await op2.goto(BASE);
  await waitLoaded(op2);
  const txt = await op2.textContent('main');
  check('10. API fora do ar sem cache: avisa "indisponível", sem valores inventados', /indispon/i.test(txt) && !/R\$\s*\d/.test(await op2.textContent('#view-painel')), (await op2.textContent('#status-text')));
  await shot(op2, 'offline-sem-cache');
  await off2.close();
  check('Sem erros de JavaScript com APIs fora do ar', oErrors.length === 0, oErrors.join(' | '));

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} verificações passaram.`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
