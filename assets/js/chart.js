/**
 * ATLAS INVEST LAB — gráficos em SVG, leves e sem dependências.
 * - line(): gráfico de linhas com eixos, várias séries, marcadores, linhas de referência
 *   e cursor (mouse e toque) com tooltip. Vários gráficos podem ser sincronizados.
 * - spark(): minigráfico para os cartões.
 */
(function (root) {
  'use strict';
  const Atlas = root.Atlas;
  const NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function niceTicks(min, max, count) {
    const span = max - min || Math.abs(max) || 1;
    const step0 = span / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
    const ticks = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(+v.toFixed(10));
    return ticks;
  }

  function spark(values, { width = 120, height = 36, className = '' } = {}) {
    const v = values.filter((x) => Number.isFinite(x));
    if (v.length < 2) return '';
    const min = Math.min(...v), max = Math.max(...v), span = max - min || 1;
    const pts = v.map((y, i) => `${((i / (v.length - 1)) * width).toFixed(1)},${(height - 2 - ((y - min) / span) * (height - 4)).toFixed(1)}`);
    const dir = v[v.length - 1] >= v[0] ? 'up' : 'down';
    return `<svg class="spark ${dir} ${className}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">` +
      `<polyline points="${pts.join(' ')}" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
  }

  /**
   * @param {HTMLElement} host
   * @param {object} cfg
   *   dates: string[]  (YYYY-MM-DD)
   *   series: [{ values:number[], color:string, width?:number, label:string, area?:boolean, dash?:string }]
   *   height, yFormat(v), tooltipFormat(v,label), refLines:[{y, color, label}], yDomain:[min,max],
   *   markers:[{ index, type:'buy'|'sell', label }]
   */
  function line(host, cfg) {
    host.innerHTML = '';
    host.classList.add('chart');
    const height = cfg.height || 240;
    const width = Math.max(260, host.clientWidth || 320);
    const pad = { t: 10, r: 58, b: cfg.hideX ? 8 : 24, l: 8 };
    const W = width - pad.l - pad.r, H = height - pad.t - pad.b;
    const n = cfg.dates.length;
    const fmtY = cfg.yFormat || ((v) => Atlas.fmt.num(v, 2));

    let min = Infinity, max = -Infinity;
    for (const s of cfg.series) for (const v of s.values) if (Number.isFinite(v)) { if (v < min) min = v; if (v > max) max = v; }
    if (cfg.yDomain) { min = cfg.yDomain[0]; max = cfg.yDomain[1]; }
    if (!Number.isFinite(min)) { host.innerHTML = '<p class="empty">Sem dados para o gráfico.</p>'; return null; }
    if (!cfg.yDomain) { const p = (max - min) * 0.06 || Math.abs(max) * 0.01 || 1; min -= p; max += p; }

    const x = (i) => pad.l + (n <= 1 ? W / 2 : (i / (n - 1)) * W);
    const y = (v) => pad.t + H - ((v - min) / (max - min)) * H;

    const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'img', 'aria-label': cfg.ariaLabel || 'Gráfico' }, host);

    // grade e eixo Y
    const g = el('g', { class: 'grid' }, svg);
    for (const t of niceTicks(min, max, Math.max(2, Math.round(H / 48)))) {
      if (t < min || t > max) continue;
      el('line', { x1: pad.l, x2: pad.l + W, y1: y(t), y2: y(t) }, g);
      const tx = el('text', { x: pad.l + W + 6, y: y(t) + 4, class: 'axis' }, g);
      tx.textContent = fmtY(t);
    }
    // eixo X: datas espaçadas
    if (!cfg.hideX && n > 1) {
      const labels = Math.max(2, Math.min(6, Math.floor(W / 90)));
      for (let k = 0; k < labels; k++) {
        const i = Math.round((k / (labels - 1)) * (n - 1));
        const tx = el('text', { x: x(i), y: height - 6, class: 'axis', 'text-anchor': k === 0 ? 'start' : k === labels - 1 ? 'end' : 'middle' }, g);
        tx.textContent = Atlas.fmt.shortDate(cfg.dates[i]);
      }
    }
    for (const r of cfg.refLines || []) {
      el('line', { x1: pad.l, x2: pad.l + W, y1: y(r.y), y2: y(r.y), class: 'ref', stroke: r.color || 'currentColor' }, svg);
    }

    // séries
    cfg.series.forEach((s, si) => {
      let d = '', started = false;
      s.values.forEach((v, i) => {
        if (!Number.isFinite(v)) { started = false; return; }
        d += (started ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1);
        started = true;
      });
      if (!d) return;
      if (s.area) {
        const first = s.values.findIndex(Number.isFinite);
        let lastI = s.values.length - 1; while (lastI > 0 && !Number.isFinite(s.values[lastI])) lastI--;
        const gid = 'g' + Math.random().toString(36).slice(2);
        const defs = el('defs', {}, svg);
        const lg = el('linearGradient', { id: gid, x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
        el('stop', { offset: '0%', 'stop-color': s.color, 'stop-opacity': 0.28 }, lg);
        el('stop', { offset: '100%', 'stop-color': s.color, 'stop-opacity': 0 }, lg);
        el('path', { d: `${d}L${x(lastI).toFixed(1)},${pad.t + H}L${x(first).toFixed(1)},${pad.t + H}Z`, fill: `url(#${gid})`, stroke: 'none' }, svg);
      }
      el('path', { d, fill: 'none', stroke: s.color, 'stroke-width': s.width || 1.6, 'stroke-linejoin': 'round', 'stroke-dasharray': s.dash || '', class: 'series s' + si }, svg);
    });

    // marcadores (compra/venda)
    for (const m of cfg.markers || []) {
      const v = cfg.series[0].values[m.index];
      if (!Number.isFinite(v)) continue;
      const cx = x(m.index), cy = y(v);
      const up = m.type === 'buy';
      const tri = up ? `M${cx},${cy + 6} l-5,9 h10 z` : `M${cx},${cy - 6} l-5,-9 h10 z`;
      const p = el('path', { d: tri, class: 'marker ' + m.type }, svg);
      const t = el('title', {}, p); t.textContent = m.label || (up ? 'Compra' : 'Venda');
    }

    // cursor + tooltip
    const cross = el('line', { y1: pad.t, y2: pad.t + H, class: 'cross', visibility: 'hidden' }, svg);
    const dots = cfg.series.map((s) => el('circle', { r: 3.5, fill: s.color, class: 'dot', visibility: 'hidden' }, svg));
    const tip = document.createElement('div');
    tip.className = 'tip'; tip.hidden = true;
    host.appendChild(tip);

    const api = { linked: [], showAt, hide };
    function showAt(i, fromLink) {
      if (i < 0 || i >= n) return;
      const cx = x(i);
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
      let rows = '';
      cfg.series.forEach((s, si) => {
        const v = s.values[i];
        if (Number.isFinite(v)) {
          dots[si].setAttribute('cx', cx); dots[si].setAttribute('cy', y(v)); dots[si].setAttribute('visibility', 'visible');
          rows += `<div><i style="background:${s.color}"></i>${Atlas.dom.esc(s.label)} <b>${(cfg.tooltipFormat || fmtY)(v, s.label)}</b></div>`;
        } else dots[si].setAttribute('visibility', 'hidden');
      });
      tip.innerHTML = `<div class="tip-date">${Atlas.fmt.dateBR(cfg.dates[i])}</div>${rows}`;
      tip.hidden = false;
      const tw = tip.offsetWidth;
      let left = cx + 12;
      if (left + tw > width - 4) left = cx - tw - 12;
      tip.style.left = Math.max(4, left) + 'px';
      tip.style.top = pad.t + 'px';
      if (!fromLink) api.linked.forEach((c) => c && c.showAt(i, true));
    }
    function hide(fromLink) {
      cross.setAttribute('visibility', 'hidden');
      dots.forEach((d) => d.setAttribute('visibility', 'hidden'));
      tip.hidden = true;
      if (!fromLink) api.linked.forEach((c) => c && c.hide(true));
    }
    function idxFromEvent(ev) {
      const rect = svg.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / rect.width) * width;
      return Math.round(((px - pad.l) / W) * (n - 1));
    }
    svg.addEventListener('pointermove', (ev) => showAt(Math.max(0, Math.min(n - 1, idxFromEvent(ev)))));
    svg.addEventListener('pointerdown', (ev) => showAt(Math.max(0, Math.min(n - 1, idxFromEvent(ev)))));
    svg.addEventListener('pointerleave', () => hide());
    return api;
  }

  function link(...charts) {
    charts = charts.filter(Boolean);
    charts.forEach((c) => (c.linked = charts.filter((o) => o !== c)));
  }

  Atlas.chart = { line, spark, link };
})(typeof self !== 'undefined' ? self : this);
