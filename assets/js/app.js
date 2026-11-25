/**
 * ATLAS INVEST LAB — interface: navegação, painel, análise, backtest, diário e configurações.
 */
(function () {
  'use strict';
  const { fmt, dom, store, data, chart, journal } = window.Atlas;
  const ind = window.AtlasIndicators;
  const BT = window.AtlasBacktest;
  const { $, $$, esc, toast } = dom;

  const VERSION = '2.0.0';
  const SETTINGS_KEY = 'atlas.settings.v1';
  const settings = Object.assign({ refreshSec: 60, token: '' }, store.get(SETTINGS_KEY, {}));
  const ui = Object.assign({ heroRange: 63, anKey: 'USDBRL', anRange: 126, ema9: true, ema21: true, btAsset: 'USDBRL' }, store.get('atlas.ui.v1', {}));
  const saveUI = () => store.set('atlas.ui.v1', ui);

  let M = data.model();
  let view = 'painel';
  let loading = false;

  // ------------------------------------------------------------------ helpers
  const ccyOf = (a) => (a.unit === 'pts' ? (a.key === 'IBOV' ? 'BRL' : 'USD') : a.unit);
  function px(a, v) {
    if (v == null || !Number.isFinite(v)) return '—';
    if (a.unit === 'pts') return fmt.num(v, v >= 100000 ? 0 : 2) + ' pts';
    if (a.unit === 'BRL') return fmt.money(v, 'BRL', 4);
    return fmt.money(v, a.unit, 2);
  }
  const badge = (v, suffix = '') => `<span class="badge ${fmt.signClass(v)}">${v > 0 ? '▲' : v < 0 ? '▼' : '■'} ${fmt.pct(v, 2, false).replace('−', '')}${suffix}</span>`;
  const freshTag = (f) => `<span class="fresh ${f.level}" title="${esc(f.label)}">${esc(f.label)}</span>`;
  const closes = (a) => a.candles.map((c) => c.close);
  function chgOver(a, n) { return ind.changeOver(closes(a), n); }
  const monthBR = (iso) => { const [y, m] = iso.split('-'); return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][+m - 1] + '/' + y; };

  // ------------------------------------------------------------------ navegação
  function setView(v) {
    if (!['painel', 'analise', 'backtest', 'diario'].includes(v)) v = 'painel';
    view = v;
    $$('.view').forEach((s) => (s.hidden = s.id !== 'view-' + v));
    $$('.tabs a').forEach((a) => (a.dataset.view === v ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
    renderView();
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', () => setView(location.hash.slice(1)));

  function renderView() {
    if (view === 'painel') renderDashboard();
    else if (view === 'analise') renderAnalysis();
    else if (view === 'backtest') renderBacktestForm();
    else if (view === 'diario') renderJournal();
  }

  // ------------------------------------------------------------------ status
  function renderStatus() {
    const el = $('#status'), txt = $('#status-text');
    el.className = 'status';
    if (loading && !M.hasAnyData) { el.classList.add('loading'); txt.textContent = 'Carregando dados…'; return; }
    const srcs = Object.values(M.sources).filter((s) => s.ok !== null);
    // A CoinGecko só é consultada quando a Binance falha; não conta como problema se a Binance estiver ok.
    const failed = Object.entries(M.sources).filter(([k, s]) => s.ok === false && !(k === 'gecko' && M.sources.binance.ok));
    if (!navigator.onLine) { el.classList.add('err'); txt.textContent = M.hasAnyData ? 'Sem conexão · dados salvos' : 'Sem conexão'; return; }
    if (loading) el.classList.add('loading');
    if (!srcs.length) { txt.textContent = M.hasAnyData ? 'Dados salvos' : 'Carregando…'; return; }
    const lastOk = srcs.filter((s) => s.at).map((s) => s.at).sort().pop();
    if (failed.length === 0) { el.classList.add('ok'); txt.textContent = 'Atualizado ' + (lastOk ? fmt.dateTimeBR(lastOk) : ''); }
    else if (failed.length < srcs.length) { el.classList.add('warn'); txt.textContent = `${failed.length} fonte${failed.length > 1 ? 's' : ''} com falha`; }
    else { el.classList.add('err'); txt.textContent = M.hasAnyData ? 'Fontes indisponíveis · dados salvos' : 'Fontes indisponíveis'; }
  }

  function renderSources() {
    const rows = Object.entries(M.sources).map(([k, s]) => {
      const st = s.ok === true ? 'ok' : s.ok === false ? 'err' : '';
      let detail = s.ok === true ? `Funcionando · última resposta ${fmt.dateTimeBR(s.at)}` : s.ok === false ? `Falha: ${s.error}${s.at ? ' · última resposta ' + fmt.dateTimeBR(s.at) : ''}` : 'Ainda não consultada';
      if (k === 'gecko' && s.ok === null) detail = 'Reserva: usada só se a Binance falhar';
      if (k === 'snapshot' && M.snapshotAt) detail += ` · arquivo gerado ${fmt.dateTimeBR(M.snapshotAt)} (${fmt.ago(M.snapshotAt)})`;
      return `<div class="src-row"><i class="dot ${st}"></i><b>${esc(s.label)}</b><span>${esc(detail)}</span></div>`;
    });
    $('#sources-body').innerHTML = rows.join('');
  }

  // ------------------------------------------------------------------ painel
  function renderDashboard() {
    renderHero();
    renderMacro();
    const groups = { fx: '#g-fx', br: '#g-br', world: '#g-world', crypto: '#g-crypto' };
    for (const [g, sel] of Object.entries(groups)) {
      const list = Object.values(M.assets).filter((a) => a.group === g && a.key !== 'USDBRL');
      $(sel).innerHTML = list.map(assetCard).join('');
    }
  }

  function assetCard(a) {
    const q = a.quote;
    if (!q) {
      return `<button type="button" class="card asset" data-asset="${a.key}" aria-label="${esc(a.name)}: indisponível">
        <div class="name">${esc(a.name)}</div><div></div>
        <div class="px unavailable">${loading ? 'Carregando…' : 'Indisponível'}</div><div></div>
        <div class="meta">${freshTag(a.fresh)}</div></button>`;
    }
    const sp = a.candles.length ? chart.spark(closes(a).slice(-63)) : '';
    const extra = a.priceBRL ? `<span class="num">≈ ${fmt.money(a.priceBRL, 'BRL', 0)}</span>` : (q.changeLabel ? '' : '');
    return `<button type="button" class="card asset" data-asset="${a.key}" aria-label="${esc(a.name)} ${px(a, q.price)}, variação ${fmt.pct(q.changePct)}">
      <div class="name">${esc(a.name)}</div>
      <div class="chg">${badge(q.changePct, q.changeLabel ? ` <small>${q.changeLabel}</small>` : '')}</div>
      <div class="px">${px(a, q.price)}</div>
      <div class="spark-wrap">${sp}</div>
      <div class="meta">${freshTag(a.fresh)}${extra}</div>
    </button>`;
  }

  function renderHero() {
    const a = M.assets.USDBRL;
    const host = $('#usd-hero');
    if (!a.quote && !a.candles.length) {
      host.innerHTML = loading ? '<div class="skeleton tall"></div>' : `<div class="label">Dólar comercial · USD/BRL</div><p class="empty">Cotação indisponível no momento. Verifique a conexão e toque em atualizar.</p>`;
      return;
    }
    const q = a.quote || {};
    const ptax = M.macro && M.macro.ptaxUsd;
    const cl = closes(a);
    const vol = ind.annualizedVolatility(cl, 21);
    host.innerHTML = `
      <div class="hero-grid">
        <div>
          <div class="hero-top"><span class="label">Dólar comercial · USD/BRL</span>${freshTag(a.fresh)}</div>
          <div class="big">${px(a, q.price)}</div>
          <div class="row">${q.changePct != null ? badge(q.changePct) : ''}
            ${q.prevClose ? `<span class="muted small">Fech. anterior ${px(a, q.prevClose)}</span>` : ''}</div>
          <dl class="kv">
            <div><dt>Máx. / mín. do dia</dt><dd>${q.high ? fmt.num(q.high, 4) + ' / ' + fmt.num(q.low, 4) : '—'}</dd></div>
            <div><dt>PTAX (BCB)</dt><dd>${ptax ? fmt.num(ptax.value, 4) + ' <small class="muted">' + fmt.dateBR(ptax.date).slice(0, 5) + '</small>' : '—'}</dd></div>
            <div><dt>Variação 1 mês</dt><dd class="${fmt.signClass(chgOver(a, 21))}">${fmt.pct(chgOver(a, 21))}</dd></div>
            <div><dt>Variação 12 meses</dt><dd class="${fmt.signClass(chgOver(a, 252))}">${fmt.pct(chgOver(a, 252))}</dd></div>
            <div><dt>Máx. 52 semanas</dt><dd>${fmt.num(a.high52, 4)}</dd></div>
            <div><dt>Mín. 52 semanas</dt><dd>${fmt.num(a.low52, 4)}</dd></div>
            <div><dt>Volatilidade 21d</dt><dd>${vol != null ? fmt.pct(vol, 1, false) + ' a.a.' : '—'}</dd></div>
            <div><dt>Fonte</dt><dd class="small">${esc(q.source || '—')}</dd></div>
          </dl>
        </div>
        <div>
          <div class="toolbar"><div class="chips" id="hero-range" role="group" aria-label="Período do gráfico">
            ${[[21, '1M'], [63, '3M'], [126, '6M'], [252, '1A']].map(([n, l]) => `<button type="button" data-r="${n}" class="${ui.heroRange === n ? 'on' : ''}">${l}</button>`).join('')}
          </div><a href="#analise" class="small" data-goto="USDBRL">Análise completa →</a></div>
          <div id="hero-chart" class="chart-box" style="height:210px"></div>
          <p class="muted small">Histórico diário: ${esc(a.histSource || '—')}. A PTAX é a taxa oficial calculada pelo Banco Central; o dólar comercial é negociado ao longo do dia.</p>
        </div>
      </div>`;
    drawHeroChart();
  }

  function drawHeroChart() {
    const a = M.assets.USDBRL;
    const box = $('#hero-chart');
    if (!box) return;
    const c = a.candles.slice(-ui.heroRange);
    if (c.length < 2) { box.innerHTML = '<p class="empty">Histórico indisponível.</p>'; return; }
    chart.line(box, {
      dates: c.map((x) => x.date), height: 210,
      series: [{ values: c.map((x) => x.close), color: '#4f8cff', label: 'USD/BRL', area: true, width: 1.8 }],
      yFormat: (v) => fmt.num(v, 2), tooltipFormat: (v) => fmt.num(v, 4), ariaLabel: 'Gráfico do dólar',
    });
  }

  function renderMacro() {
    const m = M.macro;
    const host = $('#macro');
    if (!m) {
      host.innerHTML = loading ? '<div class="skeleton"></div>'.repeat(4) : '<p class="empty" style="grid-column:1/-1">Indicadores do Banco Central indisponíveis no momento.</p>';
      $('#macro-chart').innerHTML = '';
      return;
    }
    const card = (k, v, d, title) => `<div class="card" title="${esc(title || '')}"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
    const items = [];
    if (m.selic) items.push(card('Selic (meta)', fmt.pct(m.selic.value, 2, false) + ' <small>a.a.</small>', `desde ${fmt.dateBR(m.selic.since)}`, 'Meta da taxa Selic definida pelo Copom'));
    if (m.cdi) items.push(card('CDI', fmt.pct(m.cdi.value, 2, false) + ' <small>a.a.</small>', `em ${fmt.dateBR(m.cdi.date)}`, 'CDI anualizado (base 252)'));
    if (m.ipca) items.push(card('IPCA do mês', `<span class="${m.ipca.value > 0 ? '' : 'up'}">${fmt.pct(m.ipca.value, 2)}</span>`, `ref. ${monthBR(m.ipca.date)}`));
    if (m.ipca12) items.push(card('IPCA 12 meses', fmt.pct(m.ipca12.value, 2, false), `até ${monthBR(m.ipca12.date)}`));
    if (m.realRate != null) items.push(card('Juro real', fmt.pct(m.realRate, 2, false) + ' <small>a.a.</small>', 'Selic ÷ IPCA 12m (ex-post)', 'Aproximação: (1+Selic)/(1+IPCA 12 meses) − 1'));
    host.innerHTML = items.join('');
    $('#macro-chart-note').textContent = (m.fromSnapshot ? 'Cópia do servidor · ' : 'Atualizado ') + fmt.dateTimeBR(m.fetchedAt);

    if (m.ipca12 && m.selic) {
      const months = m.ipca12.series.slice(-24);
      const selicAt = (iso) => { // último valor da Selic até o fim do mês
        const end = iso.slice(0, 7) + '-31';
        let v = null; for (const [d, x] of m.selic.series) { if (d <= end) v = x; else break; } return v;
      };
      const sel = months.map(([d]) => selicAt(d));
      chart.line($('#macro-chart'), {
        dates: months.map(([d]) => d), height: 200,
        series: [
          { values: sel, color: '#e9b949', label: 'Selic (meta)' },
          { values: months.map(([, v]) => v), color: '#f2555a', label: 'IPCA 12m' },
        ],
        yFormat: (v) => fmt.num(v, 1) + '%', tooltipFormat: (v) => fmt.num(v, 2) + '%', ariaLabel: 'Selic e IPCA 12 meses',
      });
    }
  }

  // ------------------------------------------------------------------ análise
  function renderAnalysis() {
    const list = Object.values(M.assets);
    if (!M.assets[ui.anKey]) ui.anKey = 'USDBRL';
    $('#an-assets').innerHTML = list.map((a) => `<button type="button" role="tab" data-k="${a.key}" aria-selected="${a.key === ui.anKey}">${esc(a.short)}</button>`).join('');
    $$('#an-range button').forEach((b) => b.classList.toggle('on', +b.dataset.r === ui.anRange));
    $('#an-ema9').checked = ui.ema9; $('#an-ema21').checked = ui.ema21;

    const a = M.assets[ui.anKey];
    const q = a.quote;
    $('#an-head').innerHTML = `<div><h2>${esc(a.name)}</h2>${freshTag(a.fresh)}</div>
      <div style="text-align:right"><div class="px">${q ? px(a, q.price) : '—'}</div>${q && q.changePct != null ? badge(q.changePct, q.changeLabel ? ` <small>${q.changeLabel}</small>` : '') : ''}</div>`;

    const cl = closes(a);
    if (cl.length < 30) {
      $('#an-chart').innerHTML = `<p class="empty">${loading ? 'Carregando histórico…' : 'Histórico insuficiente ou indisponível para este ativo.'}</p>`;
      $('#an-rsi').innerHTML = ''; $('#an-stats').innerHTML = ''; $('#an-reading').innerHTML = ''; $('#an-source').textContent = '';
      return;
    }
    // Indicadores calculados no histórico completo e depois recortados (aquecimento correto).
    const e9 = ind.ema(cl, 9), e21 = ind.ema(cl, 21), r = ind.rsi(cl, 14);
    const n = Math.min(ui.anRange, cl.length);
    const from = cl.length - n;
    const dates = a.candles.slice(from).map((c) => c.date);
    const series = [{ values: cl.slice(from), color: '#4f8cff', label: 'Fechamento', area: true, width: 1.8 }];
    if (ui.ema9) series.push({ values: e9.slice(from), color: '#e9b949', label: 'EMA 9', width: 1.3 });
    if (ui.ema21) series.push({ values: e21.slice(from), color: '#b07cff', label: 'EMA 21', width: 1.3 });
    const dec = a.unit === 'BRL' ? 4 : 2;
    const c1 = chart.line($('#an-chart'), {
      dates, height: 280, series,
      yFormat: (v) => fmt.num(v, a.unit === 'BRL' ? 2 : v >= 1000 ? 0 : 2), tooltipFormat: (v) => fmt.num(v, dec), ariaLabel: 'Gráfico de preço de ' + a.name,
    });
    const c2 = chart.line($('#an-rsi'), {
      dates, height: 110, hideX: true, yDomain: [0, 100],
      series: [{ values: r.slice(from), color: '#22c55e', label: 'RSI 14', width: 1.4 }],
      refLines: [{ y: 70, color: '#f2555a' }, { y: 30, color: '#22c55e' }],
      yFormat: (v) => fmt.num(v, 0), tooltipFormat: (v) => fmt.num(v, 1), ariaLabel: 'RSI 14',
    });
    chart.link(c1, c2);

    $('#an-source').textContent = `Histórico diário: ${a.histSource}${a.lastPartial ? ' · o último candle ainda está em formação' : ''}. Cotação: ${q ? q.source : '—'}.`;

    const slice = a.candles.slice(from);
    const hi = Math.max(...slice.map((c) => c.high ?? c.close)), lo = Math.min(...slice.map((c) => c.low ?? c.close));
    const vol = ind.annualizedVolatility(cl, 21);
    const stat = (k, v, s, cls = '') => `<div class="stat"><div class="k">${k}</div><div class="v ${cls}">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
    const per = (nn) => { const v = chgOver(a, nn); return stat(`Variação ${nn === 21 ? '1 mês' : nn === 63 ? '3 meses' : '12 meses'}`, fmt.pct(v), '', fmt.signClass(v)); };
    $('#an-stats').innerHTML = [
      per(21), per(63), per(252),
      stat('Volatilidade 21d', vol != null ? fmt.pct(vol, 1, false) : '—', 'anualizada'),
      stat('Máxima do período', fmt.num(hi, dec)), stat('Mínima do período', fmt.num(lo, dec)),
      stat('EMA 9 / EMA 21', `${fmt.num(e9[e9.length - 1], dec)}`, `EMA 21: ${fmt.num(e21[e21.length - 1], dec)}`),
      stat('RSI 14', fmt.num(r[r.length - 1], 1), r[r.length - 1] >= 70 ? 'sobrecompra' : r[r.length - 1] <= 30 ? 'sobrevenda' : 'zona neutra'),
    ].join('');

    const t = ind.trendReading(cl);
    if (t) {
      const cls = t.trend === 'alta' ? 'up' : t.trend === 'baixa' ? 'down' : 'flat';
      const crossTxt = t.crossedAgo != null ? (t.crossedAgo === 0 ? 'O cruzamento aconteceu no último pregão.' : `O último cruzamento das médias foi há ${t.crossedAgo} pregão${t.crossedAgo > 1 ? 'ões' : ''}.`) : '';
      const rsiTxt = t.rsiZone === 'sobrecompra' ? 'RSI acima de 70: movimento de alta esticado; correções ficam mais prováveis, mas não são garantidas.'
        : t.rsiZone === 'sobrevenda' ? 'RSI abaixo de 30: movimento de queda esticado; repiques ficam mais prováveis, mas não são garantidos.'
          : 'RSI em zona neutra (entre 30 e 70).';
      let ctx = '';
      if (a.key === 'USDBRL') ctx = '<p>Dólar em alta significa real perdendo poder de compra frente à moeda americana. Ter parte do patrimônio dolarizado reduz a exposição a esse risco, mas o câmbio também pode cair.</p>';
      $('#an-reading').innerHTML = `<div class="reading"><div class="card-head"><h3>Leitura técnica</h3><span class="muted small">não é recomendação</span></div>
        <p>Tendência de curto prazo: <span class="tag ${cls}">${t.trend}</span> — EMA 9 ${t.trend === 'alta' ? 'acima' : 'abaixo'} da EMA 21. ${crossTxt}</p>
        <p>${rsiTxt} (RSI 14 = ${fmt.num(t.rsi, 1)})</p>${ctx}
        <p class="muted small">Indicadores descrevem o comportamento passado do preço e falham com frequência. Use como apoio, não como decisão.</p>
        <div class="form-actions"><button type="button" class="btn" data-bt="${a.key}" ${a.hasOHLC ? '' : 'disabled'}>Simular backtest neste ativo</button></div></div>`;
    } else $('#an-reading').innerHTML = '';
  }

  // ------------------------------------------------------------------ backtest
  function btAssets() { return Object.values(M.assets).filter((a) => a.hasOHLC && a.candles.length > 60); }
  function renderBacktestForm() {
    const sel = $('#bt-asset');
    const list = btAssets();
    const cur = sel.value || ui.btAsset;
    sel.innerHTML = list.length ? list.map((a) => `<option value="${a.key}">${esc(a.name)}</option>`).join('') : '<option value="">Carregando histórico…</option>';
    if (list.some((a) => a.key === cur)) sel.value = cur;
  }

  function readBtForm() {
    const n = (id) => fmt.parseNum($(id).value);
    return {
      capital: n('#bt-capital'), feePct: n('#bt-fee'), slippagePct: n('#bt-slip'),
      rsiEntryMax: n('#bt-rsimax'), rsiEntryMin: n('#bt-rsimin'), rsiExit: n('#bt-rsiexit'),
      fast: Math.round(n('#bt-fast')), slow: Math.round(n('#bt-slow')),
    };
  }

  function runBacktest() {
    const err = $('#bt-error');
    err.hidden = true;
    const a = M.assets[$('#bt-asset').value];
    if (!a || !a.hasOHLC) { err.textContent = 'Histórico com abertura e fechamento indisponível para este ativo.'; err.hidden = false; return; }
    ui.btAsset = a.key; saveUI();
    const opts = readBtForm();
    for (const [k, v] of Object.entries(opts)) if (!Number.isFinite(v)) { err.textContent = 'Preencha todos os campos com números válidos.'; err.hidden = false; return; }
    if (opts.rsiEntryMax > 100 || opts.rsiEntryMin < 0 || opts.rsiExit < 0 || opts.rsiExit > 100) { err.textContent = 'Os valores de RSI devem ficar entre 0 e 100.'; err.hidden = false; return; }

    let candles = a.candles.slice();
    if (a.lastPartial && candles.length) candles.pop(); // não usa o candle em formação
    const period = +$('#bt-period').value;
    const warm = Math.max(60, opts.slow * 3);
    let tradeFrom = 0;
    if (period > 0 && candles.length > period + warm) {
      candles = candles.slice(candles.length - period - warm);
      tradeFrom = warm;
    }
    let res;
    try { res = BT.run(candles, Object.assign(opts, { tradeFrom })); }
    catch (e) { err.textContent = e.message; err.hidden = false; return; }
    renderBacktestResults(a, candles, res);
  }

  function renderBacktestResults(a, candles, res) {
    const ccy = ccyOf(a);
    const m = (v) => fmt.money(v, ccy, 2);
    const stat = (k, v, s, cls = '') => `<div class="stat"><div class="k">${k}</div><div class="v ${cls}">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
    const pf = res.profitFactor === Infinity ? '∞ (sem perdas)' : res.profitFactor == null ? '—' : fmt.num(res.profitFactor, 2);
    $('#bt-kpis').innerHTML = [
      stat('Capital inicial', m(res.initialCapital), `${fmt.dateBR(res.period.start)} a ${fmt.dateBR(res.period.end)}`),
      stat('Capital final', m(res.finalCapital), res.openTrade ? 'inclui posição aberta' : '', fmt.signClass(res.finalCapital - res.initialCapital)),
      stat('Retorno da estratégia', fmt.pct(res.returnPct), res.cagrPct != null ? `${fmt.pct(res.cagrPct)} ao ano` : '', fmt.signClass(res.returnPct)),
      stat('Buy and hold', fmt.pct(res.buyHold.returnPct), `final ${m(res.buyHold.finalCapital)}`, fmt.signClass(res.buyHold.returnPct)),
      stat('Operações encerradas', String(res.numTrades), res.openTrade ? '+ 1 em aberto' : `${res.wins} ganhos · ${res.losses} perdas`),
      stat('Taxa de acerto', res.winRatePct == null ? '—' : fmt.pct(res.winRatePct, 1, false), res.numTrades ? `${res.wins} de ${res.numTrades}` : 'sem operações encerradas'),
      stat('Profit factor', pf, 'lucro bruto ÷ prejuízo bruto'),
      stat('Drawdown máximo', fmt.pct(res.maxDrawdownPct, 2), `buy and hold: ${fmt.pct(res.buyHold.maxDrawdownPct, 2)}`, 'down'),
      stat('Resultado médio', res.avgTradePct == null ? '—' : fmt.pct(res.avgTradePct), 'por operação encerrada', fmt.signClass(res.avgTradePct)),
      stat('Tempo posicionado', fmt.pct(res.exposurePct, 0, false), 'dos pregões do período'),
      stat('Custos pagos', m(res.totalFees), `taxa ${fmt.num(res.params.feePct, 2)}% + slippage ${fmt.num(res.params.slippagePct, 2)}%`),
      stat('Sinal no último fechamento', res.nextSignal ? (res.nextSignal === 'compra' ? 'Cruzamento de alta' : 'Cruzamento de baixa') : 'Nenhum', res.nextSignal ? 'simulação executaria na próxima abertura' : `dados até ${fmt.dateBR(res.period.end)}`),
    ].join('');

    const dates = res.equity.map((e) => e.date);
    const ce = chart.line($('#bt-equity'), {
      dates, height: 240,
      series: [
        { values: res.equity.map((e) => e.equity), color: '#4f8cff', label: 'Estratégia', width: 1.8 },
        { values: res.buyHold.equity.map((e) => e.equity), color: '#a9b4ca', label: 'Buy and hold', width: 1.2, dash: '4 3' },
      ],
      yFormat: (v) => fmt.num(v, 0), tooltipFormat: (v) => m(v), ariaLabel: 'Curva de patrimônio',
    });
    const off = res.startIndex;
    const slice = candles.slice(off);
    const markers = [];
    for (const t of res.trades.concat(res.openTrade ? [res.openTrade] : [])) {
      markers.push({ index: t.entryIndex - off, type: 'buy', label: `Compra ${fmt.dateBR(t.entryDate)} @ ${fmt.num(t.entryPrice, 4)}` });
      if (!t.open) markers.push({ index: t.exitIndex - off, type: 'sell', label: `Venda ${fmt.dateBR(t.exitDate)} @ ${fmt.num(t.exitPrice, 4)}` });
    }
    const dec = a.unit === 'BRL' ? 4 : 2;
    const cp = chart.line($('#bt-price'), {
      dates: slice.map((c) => c.date), height: 240, markers,
      series: [
        { values: slice.map((c) => c.close), color: '#4f8cff', label: 'Fechamento', width: 1.5 },
        { values: res.series.emaFast.slice(off), color: '#e9b949', label: `EMA ${res.params.fast}`, width: 1.1 },
        { values: res.series.emaSlow.slice(off), color: '#b07cff', label: `EMA ${res.params.slow}`, width: 1.1 },
      ],
      yFormat: (v) => fmt.num(v, a.unit === 'BRL' ? 2 : v >= 1000 ? 0 : 2), tooltipFormat: (v) => fmt.num(v, dec), ariaLabel: 'Preço com operações',
    });
    chart.link(ce, cp);

    const all = res.trades.concat(res.openTrade ? [res.openTrade] : []);
    $('#bt-trades-note').textContent = all.length ? `${all.length} operação(ões)` : '';
    $('#bt-trades').innerHTML = all.length ? `<thead><tr><th>#</th><th>Entrada</th><th>Preço</th><th>Saída</th><th>Preço</th><th>Pregões</th><th>Resultado</th><th>%</th><th>Motivo da saída</th></tr></thead><tbody>` +
      all.map((t, i) => `<tr class="${t.open ? 'open' : ''}"><td>${i + 1}</td><td>${fmt.dateBR(t.entryDate)}</td><td>${fmt.num(t.entryPrice, dec)}</td><td>${t.open ? 'aberta' : fmt.dateBR(t.exitDate)}</td><td>${fmt.num(t.exitPrice, dec)}</td><td>${t.bars}</td><td class="${fmt.signClass(t.pnl)}">${m(t.pnl)}</td><td class="${fmt.signClass(t.pnl)}">${fmt.pct(t.pnlPct)}</td><td style="text-align:left">${esc(t.exitReason)}</td></tr>`).join('') + '</tbody>'
      : '<tbody><tr><td class="empty">Nenhuma operação no período com esses parâmetros.</td></tr></tbody>';
    $('#bt-results').hidden = false;
    $('#bt-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ------------------------------------------------------------------ diário
  let jList = journal.load();
  let jFilter = 'all';

  function persistJournal() {
    try { journal.save(jList); return true; }
    catch (e) { toast(e.message, 'error', 5000); return false; }
  }

  function renderJournal() {
    const st = journal.stats(jList);
    const stat = (k, v, s, cls = '') => `<div class="stat"><div class="k">${k}</div><div class="v ${cls}">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
    const cur = Object.entries(st.byCurrency);
    const resStat = cur.length ? cur.map(([c, x]) => stat(`Resultado (${c})`, fmt.money(x.pnl, c, 2), `${x.count} encerrada(s)`, fmt.signClass(x.pnl))).join('') : stat('Resultado', '—', 'nenhuma operação encerrada');
    $('#j-stats').innerHTML = stat('Operações', String(st.total), `${st.open} aberta(s)`) + stat('Taxa de acerto', st.winRate == null ? '—' : fmt.pct(st.winRate, 1, false), `${st.closed} encerrada(s)`) + resStat;

    const q = ($('#j-search').value || '').trim().toUpperCase();
    const list = journal.sorted(jList).filter((t) => {
      const r = journal.result(t);
      if (jFilter === 'open' && !r.open) return false;
      if (jFilter === 'closed' && r.open) return false;
      return !q || t.asset.includes(q) || (t.setup || '').toUpperCase().includes(q) || (t.notes || '').toUpperCase().includes(q);
    });
    $('#j-asset-list').innerHTML = Array.from(new Set(jList.map((t) => t.asset).concat(data.ASSETS.map((a) => a.key)))).map((x) => `<option value="${esc(x)}">`).join('');
    if (!jList.length) { $('#j-list').innerHTML = '<p class="empty">Nenhuma operação registrada ainda. Toque em “+ Nova operação” para começar.</p>'; return; }
    if (!list.length) { $('#j-list').innerHTML = '<p class="empty">Nenhuma operação encontrada com esse filtro.</p>'; return; }
    const dec = (v) => (Math.abs(v) < 20 ? 4 : 2);
    $('#j-list').innerHTML = list.map((t) => {
      const r = journal.result(t);
      return `<article class="card trade" data-id="${esc(t.id)}">
        <div><span class="t-asset">${esc(t.asset)}</span><span class="t-side ${t.side}">${t.side === 'short' ? 'Venda' : 'Compra'}</span></div>
        <div class="t-res ${r.open ? '' : fmt.signClass(r.pnl)}">${r.open ? '<span class="open-tag">EM ABERTO</span>' : fmt.money(r.pnl, t.currency, 2)}</div>
        <div class="t-line">${fmt.dateBR(t.date)} · ${fmt.num(t.qty, t.qty % 1 ? 4 : 0)} × ${fmt.num(t.entry, dec(t.entry))}${r.open ? '' : ` → ${fmt.num(t.exit, dec(t.exit))}${t.exitDate ? ' em ' + fmt.dateBR(t.exitDate) : ''}`}</div>
        <div class="t-line" style="text-align:right">${r.open ? '' : `<span class="${fmt.signClass(r.pnlPct)}">${fmt.pct(r.pnlPct)}</span>`}${t.fees ? ` · custos ${fmt.money(t.fees, t.currency, 2)}` : ''}</div>
        ${t.setup || t.notes ? `<div class="t-notes">${t.setup ? '<b>' + esc(t.setup) + '</b>' + (t.notes ? ' — ' : '') : ''}${esc(t.notes)}</div>` : ''}
        <div class="t-actions"><button type="button" class="btn small" data-act="edit">Editar</button><button type="button" class="btn small danger" data-act="del">Excluir</button></div>
      </article>`;
    }).join('');
  }

  function openJournalForm(t) {
    const f = $('#j-form');
    f.hidden = false;
    $('#j-form-title').textContent = t ? 'Editar operação' : 'Nova operação';
    $('#j-id').value = t ? t.id : '';
    $('#j-asset').value = t ? t.asset : '';
    $('#j-side').value = t ? t.side : 'long';
    $('#j-date').value = t ? t.date : fmt.todayISO();
    const nn = (v) => (v == null ? '' : String(v).replace('.', ','));
    $('#j-entry').value = t ? nn(t.entry) : '';
    $('#j-qty').value = t ? nn(t.qty) : '';
    $('#j-currency').value = t ? t.currency : 'BRL';
    $('#j-exitdate').value = t && t.exitDate ? t.exitDate : '';
    $('#j-exit').value = t ? nn(t.exit) : '';
    $('#j-fees').value = t ? nn(t.fees) : '0';
    $('#j-setup').value = t ? t.setup : '';
    $('#j-notes').value = t ? t.notes : '';
    $('#j-error').hidden = true;
    updatePreview();
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('#j-asset').focus({ preventScroll: true }), 250);
  }

  function readJournalForm() {
    const num = (id) => { const v = $(id).value.trim(); return v === '' ? null : journal.toNum(v); };
    return {
      id: $('#j-id').value || undefined,
      asset: $('#j-asset').value.trim().toUpperCase(),
      side: $('#j-side').value,
      date: $('#j-date').value || null,
      entry: num('#j-entry'), qty: num('#j-qty'),
      currency: $('#j-currency').value,
      exitDate: $('#j-exitdate').value || null,
      exit: num('#j-exit'), fees: num('#j-fees') || 0,
      setup: $('#j-setup').value.trim(), notes: $('#j-notes').value.trim(),
    };
  }

  function updatePreview() {
    const t = readJournalForm();
    const r = journal.result(t);
    $('#j-preview').textContent = t.entry > 0 && t.qty > 0
      ? (r.open ? `Valor de entrada: ${fmt.money(t.entry * t.qty, t.currency, 2)} · operação em aberto` : `Resultado: ${fmt.money(r.pnl, t.currency, 2)} (${fmt.pct(r.pnlPct)})`)
      : '';
  }

  function saveJournalForm(ev) {
    ev.preventDefault();
    const t = readJournalForm();
    const errs = journal.validate(t);
    if (errs.length) { $('#j-error').textContent = errs.join(' '); $('#j-error').hidden = false; return; }
    if (!t.id) delete t.id;
    journal.upsert(jList, t);
    if (persistJournal()) {
      $('#j-form').hidden = true;
      toast(t.id ? 'Operação atualizada.' : 'Operação registrada.', 'success');
      renderJournal();
    }
  }

  async function restoreBackup(file) {
    let parsed;
    try { parsed = journal.parseBackup(await file.text()); }
    catch (e) { toast(e.message, 'error', 5000); return; }
    if (!parsed.trades.length) { toast('O arquivo não contém operações válidas.', 'error'); return; }
    const choice = jList.length ? await dom.ask({
      title: 'Restaurar backup',
      text: `O arquivo tem ${parsed.trades.length} operação(ões)${parsed.skipped ? ` (${parsed.skipped} ignorada(s) por dados incompletos)` : ''}. Você já tem ${jList.length} registrada(s) neste aparelho.`,
      buttons: [{ label: 'Cancelar', value: null }, { label: 'Substituir tudo', value: 'replace', kind: 'danger' }, { label: 'Juntar', value: 'merge', kind: 'primary' }],
    }) : 'replace';
    if (!choice) return;
    const before = jList;
    if (choice === 'replace') jList = parsed.trades;
    else jList = journal.merge(jList, parsed.trades).list;
    if (!persistJournal()) { jList = before; return; }
    toast(`Backup restaurado: ${jList.length} operação(ões) no diário.`, 'success');
    renderJournal();
  }

  // ------------------------------------------------------------------ eventos
  function bind() {
    document.addEventListener('click', (ev) => {
      const card = ev.target.closest('[data-asset]');
      if (card) { ui.anKey = card.dataset.asset; saveUI(); location.hash = 'analise'; return; }
      const go = ev.target.closest('[data-goto]');
      if (go) { ui.anKey = go.dataset.goto; saveUI(); }
      const bt = ev.target.closest('[data-bt]');
      if (bt) { ui.btAsset = bt.dataset.bt; saveUI(); location.hash = 'backtest'; setTimeout(() => { $('#bt-asset').value = bt.dataset.bt; runBacktest(); }, 0); return; }
      const hr = ev.target.closest('#hero-range button');
      if (hr) { ui.heroRange = +hr.dataset.r; saveUI(); $$('#hero-range button').forEach((b) => b.classList.toggle('on', b === hr)); drawHeroChart(); return; }
      const cl = ev.target.closest('[data-close]');
      if (cl) cl.closest('dialog').close();
    });
    $('#an-assets').addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; ui.anKey = b.dataset.k; saveUI(); renderAnalysis(); });
    $('#an-range').addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; ui.anRange = +b.dataset.r; saveUI(); renderAnalysis(); });
    $('#an-ema9').addEventListener('change', (e) => { ui.ema9 = e.target.checked; saveUI(); renderAnalysis(); });
    $('#an-ema21').addEventListener('change', (e) => { ui.ema21 = e.target.checked; saveUI(); renderAnalysis(); });

    $('#bt-form').addEventListener('submit', (e) => { e.preventDefault(); runBacktest(); });

    $('#j-new').addEventListener('click', () => openJournalForm(null));
    $('#j-cancel').addEventListener('click', () => { $('#j-form').hidden = true; });
    $('#j-form').addEventListener('submit', saveJournalForm);
    $('#j-form').addEventListener('input', updatePreview);
    $('#j-filter').addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      jFilter = b.dataset.f; $$('#j-filter button').forEach((x) => x.classList.toggle('on', x === b)); renderJournal();
    });
    $('#j-search').addEventListener('input', renderJournal);
    $('#j-list').addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-act]'); if (!b) return;
      const id = b.closest('[data-id]').dataset.id;
      const t = jList.find((x) => x.id === id);
      if (!t) return;
      if (b.dataset.act === 'edit') openJournalForm(t);
      else {
        const ok = await dom.ask({ title: 'Excluir operação', text: `Excluir ${t.asset} de ${fmt.dateBR(t.date)}? Essa ação não pode ser desfeita.`, buttons: [{ label: 'Cancelar', value: false }, { label: 'Excluir', value: true, kind: 'danger' }] });
        if (!ok) return;
        jList = jList.filter((x) => x.id !== id);
        if (persistJournal()) { toast('Operação excluída.'); renderJournal(); }
      }
    });
    $('#j-csv').addEventListener('click', () => {
      if (!jList.length) { toast('Não há operações para exportar.'); return; }
      dom.download(`atlas-diario-${fmt.todayISO()}.csv`, journal.toCSV(jList), 'text/csv;charset=utf-8');
      toast('CSV exportado.', 'success');
    });
    $('#j-backup').addEventListener('click', () => {
      dom.download(`atlas-backup-${fmt.todayISO()}.json`, journal.backup(jList, { app: 'Atlas Invest Lab', appVersion: VERSION, settings: { refreshSec: settings.refreshSec } }), 'application/json');
      toast(`Backup gerado com ${jList.length} operação(ões).`, 'success');
    });
    $('#j-restore').addEventListener('change', (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) restoreBackup(f); });

    $('#btn-refresh').addEventListener('click', () => refresh(true));
    $('#status').addEventListener('click', () => { renderSources(); $('#sources').showModal(); });
    $('#btn-settings').addEventListener('click', () => {
      $('#set-refresh').value = String(settings.refreshSec);
      $('#set-token').value = settings.token || '';
      $('#app-version').textContent = `Versão ${VERSION} · diário com ${jList.length} operação(ões) salvas neste aparelho.`;
      $('#settings').showModal();
    });
    $('#settings-form').addEventListener('submit', () => {
      settings.refreshSec = +$('#set-refresh').value;
      settings.token = $('#set-token').value.trim();
      store.set(SETTINGS_KEY, settings);
      schedule();
      toast('Configurações salvas.', 'success');
      refresh(true);
    });
    $('#set-clear').addEventListener('click', () => {
      data.clearCache(); M = data.model(); renderAll(); $('#settings').close();
      toast('Cache de cotações apagado. Buscando dados novos…'); refresh(true);
    });

    window.addEventListener('online', () => { renderStatus(); refresh(true); });
    window.addEventListener('offline', renderStatus);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(false); });
    let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(renderView, 200); });
  }

  // ------------------------------------------------------------------ atualização
  function renderAll() { renderStatus(); renderView(); }

  async function refresh(force) {
    if (loading) return;
    loading = true;
    $('#btn-refresh').classList.add('spin');
    renderStatus();
    try { M = await data.refresh({ force, token: settings.token }); }
    catch (e) { console.error(e); }
    finally {
      loading = false;
      $('#btn-refresh').classList.remove('spin');
      // Não redesenha formulários em uso: só a aba visível e sem atrapalhar a digitação.
      const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      renderStatus();
      if (!(typing && (view === 'diario' || view === 'backtest'))) renderView();
    }
  }

  let timer = null;
  function schedule() {
    clearInterval(timer);
    if (settings.refreshSec > 0) timer = setInterval(() => { if (!document.hidden && navigator.onLine) refresh(false); }, settings.refreshSec * 1000);
  }

  // ------------------------------------------------------------------ início
  bind();
  setView(location.hash.slice(1) || 'painel');
  refresh(true);
  schedule();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* app funciona sem o SW */ });
  }
})();
