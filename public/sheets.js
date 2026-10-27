/* Answer sheets: graph paper, sketch pad, charts, table of values, Venn diagram, number line, reference tables.
   A finished sheet can be attached to a theory answer; the picture is sent with the answer for marking. */
(() => {
const CE = window.CalcEngine;
const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const btn = (c, x, f) => { const b = mk('button', c, x); b.type = 'button'; if (f) b.onclick = f; return b; };
const dpr = Math.min(2, window.devicePixelRatio || 1);
const COLORS = ['#111111', '#1d4ed8', '#dc2626', '#16a34a', '#9333ea', '#ea580c'];
const num = v => { const n = parseFloat(String(v).replace(/−/g, '-')); return Number.isFinite(n) ? n : NaN; };
const fmt = v => String(Number(Number(v).toFixed(6)));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function mkCanvas(w, h) { const c = mk('canvas', 'sh-canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px'; const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return { c, g, w, h }; }
function field(label, input) { const l = mk('label', 'sh-f'); l.append(mk('span', null, label), input); return l; }
function input(val, set, ph, w, mode) { const i = mk('input', 'sh-in'); i.type = 'text'; i.inputMode = mode || 'decimal'; i.value = val; if (ph) i.placeholder = ph; if (w) i.style.width = w; i.autocomplete = 'off'; i.oninput = () => set(i.value); return i; }
function seg(opts, cur, pick) { const g = mk('div', 'sh-seg'); const bs = opts.map(([t, v]) => { const b = btn(cur === v ? 'on' : '', t, () => { bs.forEach((x, k) => x.classList.toggle('on', opts[k][1] === v)); pick(v); }); g.append(b); return b; }); return g; }
function colorRow(get, set) { const r = mk('div', 'sh-colors'); COLORS.forEach(c => { const b = btn('sh-sw' + (get() === c ? ' on' : ''), '', () => { set(c); $$('.sh-sw', r).forEach(x => x.classList.toggle('on', x === b)); }); b.style.background = c; b.setAttribute('aria-label', 'Colour ' + c); r.append(b); }); return r; }
const $$ = (s, r) => [...r.querySelectorAll(s)];
function sec(title, open, ...kids) { const d = mk('details', 'sh-sec'); if (open) d.open = true; d.append(mk('summary', null, title)); const b = mk('div', 'sh-secb'); b.append(...kids); d.append(b); return d; }
function niceScale(min, max, ticks = 5) {
  if (min === max) { max = min + 1; } const span = max - min, raw = span / ticks, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; return { min: Math.floor(min / step + 1e-9) * step, max: Math.ceil(max / step - 1e-9) * step, step };
}
function whiteBg(g, w, h) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
function spline(g, pts, move = true) {                       // smooth curve through points (Catmull-Rom)
  if (pts.length < 2) return; if (move) g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]); }
}
function arrow(g, x1, y1, x2, y2, s = 6) { const a = Math.atan2(y2 - y1, x2 - x1); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - s * Math.cos(a - .4), y2 - s * Math.sin(a - .4)); g.lineTo(x2 - s * Math.cos(a + .4), y2 - s * Math.sin(a + .4)); g.closePath(); g.fillStyle = g.strokeStyle; g.fill(); }
function exprFn(src, angle) {                                // y = f(x) from text typed by the student
  let s = String(src).trim().replace(/^y\s*=\s*/i, '').replace(/(?<![a-z])x(?![a-z])/g, 'X').replace(/−/g, '-').replace(/÷/g, '/').replace(/×/g, '*').replace(/\*\*/g, '^').replace(/\s+/g, '').replace(/\bpi\b/gi, 'π');
  s = s.replace(/(\d)(?=[A-Za-z(π])/g, '$1').replace(/\)X/g, ')*X');
  const ast = CE.parse(s), env = CE.makeEnv({ angle });
  return x => { const v = CE.evalAst(ast, env, { X: CE.V(x) }); return v.v; };
}
const pts2 = a => a.map(p => `(${fmt(p.x)}, ${fmt(p.y)})`).join(', ');

/* ================= GRAPH PAPER ================= */
function graphPane(W) {
  const S = { xmin: -5, xmax: 5, ymin: -5, ymax: 5, xs: 1, ys: 1, snap: 2, tool: 'point', color: COLORS[1], dashed: false, ops: [], cur: [], title: '', xl: 'x', yl: 'y', scale: '', angle: 'deg', label: false, ext: false, hover: null, fe: '' };
  const el = mk('div', 'sh-pane'), H = Math.round(W * 0.98), cv = mkCanvas(W, H), g = cv.g;
  const padL = 32, padR = 16, padT = 24, padB = 28, pw = W - padL - padR, ph = H - padT - padB;
  const X = x => padL + (x - S.xmin) / (S.xmax - S.xmin) * pw, Y = y => padT + (S.ymax - y) / (S.ymax - S.ymin) * ph;
  const ix = px => S.xmin + (px - padL) / pw * (S.xmax - S.xmin), iy = py => S.ymax - (py - padT) / ph * (S.ymax - S.ymin);
  const snap = (v, step) => S.snap ? Math.round(v / (step / S.snap)) * (step / S.snap) : Math.round(v * 100) / 100;
  const ok = () => S.xmax > S.xmin && S.ymax > S.ymin && S.xs > 0 && S.ys > 0 && (S.xmax - S.xmin) / S.xs <= 200 && (S.ymax - S.ymin) / S.ys <= 200;
  function draw() {
    whiteBg(g, W, H); if (!ok()) { g.fillStyle = '#b91c1c'; g.font = '14px sans-serif'; g.fillText('Check the axis numbers.', 20, 40); return; }
    g.lineWidth = .6; for (let k = Math.ceil(S.xmin / S.xs - 1e-9); k * S.xs <= S.xmax + 1e-9; k++) { g.strokeStyle = k % 5 === 0 ? '#8db4e2' : '#cfe0f5'; g.lineWidth = k % 5 === 0 ? 1 : .6; const x = X(k * S.xs); g.beginPath(); g.moveTo(x, padT); g.lineTo(x, padT + ph); g.stroke(); }
    for (let k = Math.ceil(S.ymin / S.ys - 1e-9); k * S.ys <= S.ymax + 1e-9; k++) { g.strokeStyle = k % 5 === 0 ? '#8db4e2' : '#cfe0f5'; g.lineWidth = k % 5 === 0 ? 1 : .6; const y = Y(k * S.ys); g.beginPath(); g.moveTo(padL, y); g.lineTo(padL + pw, y); g.stroke(); }
    const ax = clamp(0, S.xmin, S.xmax), ay = clamp(0, S.ymin, S.ymax); g.strokeStyle = '#000'; g.fillStyle = '#000'; g.lineWidth = 1.6;
    arrow(g, padL, Y(ay), padL + pw + 8, Y(ay)); arrow(g, X(ax), padT + ph, X(ax), padT - 8);
    g.font = '11px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#000';
    const lx = S.xs * Math.max(1, Math.ceil((S.xmax - S.xmin) / S.xs / 10)), ly = S.ys * Math.max(1, Math.ceil((S.ymax - S.ymin) / S.ys / 10));
    for (let k = Math.ceil(S.xmin / lx - 1e-9); k * lx <= S.xmax + 1e-9; k++) { const v = k * lx; if (Math.abs(v) < 1e-9 && ax === 0 && ay === 0) continue; g.textBaseline = 'top'; g.fillText(fmt(v), X(v), Y(ay) + 4); g.beginPath(); g.moveTo(X(v), Y(ay) - 3); g.lineTo(X(v), Y(ay) + 3); g.stroke(); }
    g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let k = Math.ceil(S.ymin / ly - 1e-9); k * ly <= S.ymax + 1e-9; k++) { const v = k * ly; if (Math.abs(v) < 1e-9 && ax === 0 && ay === 0) continue; g.fillText(fmt(v), X(ax) - 5, Y(v)); g.beginPath(); g.moveTo(X(ax) - 3, Y(v)); g.lineTo(X(ax) + 3, Y(v)); g.stroke(); }
    if (ax === 0 && ay === 0) { g.textAlign = 'right'; g.textBaseline = 'top'; g.fillText('O', X(0) - 4, Y(0) + 3); }
    g.font = 'italic bold 13px serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(S.xl, padL + pw - 2, Y(ay) - 12); g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(S.yl, X(ax) + 12, padT + 6);
    if (S.title) { g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(S.title, W / 2, 1); }
    if (S.scale) { g.font = '11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(S.scale, W / 2, H - 1); }
    g.save(); g.beginPath(); g.rect(padL, padT, pw, ph); g.clip();
    const dash = d => g.setLineDash(d ? [7, 5] : []);
    S.ops.forEach(o => {
      g.strokeStyle = g.fillStyle = o.c || '#1d4ed8'; g.lineWidth = 2; dash(o.d);
      if (o.t === 'fn') { try { const f = exprFn(o.e, S.angle); g.beginPath(); let pen = false, prevY = null; for (let i = 0; i <= 500; i++) { const x = S.xmin + (S.xmax - S.xmin) * i / 500; let y; try { y = f(x); } catch { y = NaN; } if (!Number.isFinite(y) || Math.abs(y) > 1e6 || (prevY !== null && Math.abs(Y(y) - Y(prevY)) > ph * 1.5)) { pen = false; prevY = null; if (!Number.isFinite(y)) continue; } if (!pen) { g.moveTo(X(x), Y(y)); pen = true; } else g.lineTo(X(x), Y(y)); prevY = y; } g.stroke(); } catch {} }
      else if (o.t === 'line' || o.t === 'curve') { drawPath(o.pts, o.t === 'curve', o.ext); g.setLineDash([]); o.pts.forEach(p => cross(p.x, p.y)); }
      else if (o.t === 'pt') { cross(o.x, o.y); if (o.l) { g.font = 'bold 12px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText(o.l, X(o.x) + 5, Y(o.y) - 3); } }
      else if (o.t === 'text') { g.font = '13px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(o.s, X(o.x), Y(o.y)); }
    });
    g.setLineDash([]); g.strokeStyle = g.fillStyle = S.color;
    if (S.cur.length) { drawPath(S.cur, S.tool === 'curve', false); S.cur.forEach(p => cross(p.x, p.y)); }
    if (S.hover) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(X(S.hover.x), padT); g.lineTo(X(S.hover.x), padT + ph); g.moveTo(padL, Y(S.hover.y)); g.lineTo(padL + pw, Y(S.hover.y)); g.stroke(); g.setLineDash([]); }
    g.restore();
  }
  function cross(x, y) { const px = X(x), py = Y(y); g.save(); g.lineWidth = 2; g.setLineDash([]); g.beginPath(); g.moveTo(px - 4, py - 4); g.lineTo(px + 4, py + 4); g.moveTo(px + 4, py - 4); g.lineTo(px - 4, py + 4); g.stroke(); g.restore(); }
  function drawPath(p, smooth, ext) {
    if (p.length < 2) return; g.beginPath();
    if (smooth) spline(g, p.map(q => [X(q.x), Y(q.y)]));
    else if (ext && p.length === 2 && (p[0].x !== p[1].x || p[0].y !== p[1].y)) { const dx = p[1].x - p[0].x, dy = p[1].y - p[0].y, t = 1e4; g.moveTo(X(p[0].x - dx * t), Y(p[0].y - dy * t)); g.lineTo(X(p[0].x + dx * t), Y(p[0].y + dy * t)); }
    else { g.moveTo(X(p[0].x), Y(p[0].y)); p.slice(1).forEach(q => g.lineTo(X(q.x), Y(q.y))); }
    g.stroke();
  }
  /* -- pointer -- */
  const status = mk('div', 'sh-status', 'Tap the paper to plot.');
  const where = e => { const r = cv.c.getBoundingClientRect(), px = (e.clientX - r.left) * (W / r.width), py = (e.clientY - r.top) * (H / r.height); return { px, py, x: snap(ix(px), S.xs), y: snap(iy(py), S.ys) }; };
  let down = null;
  cv.c.style.touchAction = 'none';
  cv.c.addEventListener('pointerdown', e => { down = { px: e.clientX, py: e.clientY }; try { cv.c.setPointerCapture(e.pointerId); } catch {} const w = where(e); S.hover = w; status.textContent = `x = ${fmt(w.x)},  y = ${fmt(w.y)}`; draw(); });
  cv.c.addEventListener('pointermove', e => { if (!down && e.pointerType === 'touch') return; const w = where(e); if (w.px < padL || w.px > padL + pw || w.py < padT || w.py > padT + ph) return; S.hover = w; status.textContent = `x = ${fmt(w.x)},  y = ${fmt(w.y)}`; draw(); });
  cv.c.addEventListener('pointerup', e => {
    const moved = down && Math.hypot(e.clientX - down.px, e.clientY - down.py) > 14; down = null; const w = where(e); S.hover = null;
    if (!moved && w.px >= padL - 6 && w.px <= padL + pw + 6 && w.py >= padT - 6 && w.py <= padT + ph + 6) act(w); draw();
  });
  cv.c.addEventListener('pointerleave', () => { if (!down) { S.hover = null; draw(); } });
  function act(w) {
    const p = { x: w.x, y: w.y };
    if (S.tool === 'point') { let l = ''; if (S.label) l = (prompt('Label for this point (for example A)') || '').slice(0, 8); S.ops.push({ t: 'pt', x: p.x, y: p.y, l, c: S.color }); list(); }
    else if (S.tool === 'line' || S.tool === 'curve') { S.cur.push(p); fin.hidden = false; status.textContent = `Point ${S.cur.length} added: (${fmt(p.x)}, ${fmt(p.y)}). Tap “Finish” when done.`; }
    else if (S.tool === 'text') { const s = (prompt('Write the label') || '').slice(0, 40); if (s) { S.ops.push({ t: 'text', x: p.x, y: p.y, s, c: S.color }); list(); } }
    else if (S.tool === 'erase') { let best = -1, bd = 22; S.ops.forEach((o, i) => { const pts = o.t === 'pt' || o.t === 'text' ? [o] : o.pts || []; pts.forEach(q => { const d = Math.hypot(X(q.x) - w.px, Y(q.y) - w.py); if (d < bd) { bd = d; best = i; } }); }); if (best >= 0) { S.ops.splice(best, 1); list(); } }
  }
  /* -- controls -- */
  const rng = mk('div', 'sh-grid4');
  [['x from', 'xmin'], ['x to', 'xmax'], ['y from', 'ymin'], ['y to', 'ymax'], ['x square =', 'xs'], ['y square =', 'ys']].forEach(([l, k]) => rng.append(field(l, input(S[k], v => { const n = num(v); if (!Number.isNaN(n)) { S[k] = n; draw(); } }, '', '100%', 'text'))));
  const tools = seg([['• Point', 'point'], ['／ Line', 'line'], ['〰 Curve', 'curve'], ['A Label', 'text'], ['⌫ Erase', 'erase']], 'point', v => { S.tool = v; if (S.cur.length) finish(true); fin.hidden = true; status.textContent = { point: 'Tap the paper to plot a point.', line: 'Tap points; they are joined with straight lines.', curve: 'Tap points; they are joined with a smooth curve.', text: 'Tap where the label goes.', erase: 'Tap a point, line, curve or label to remove it.' }[v]; });
  const opt = mk('div', 'sh-row'); const snapSel = mk('select'); [['Snap to grid lines', 1], ['Snap to half squares', 2], ['Snap to fifths', 5], ['Snap to tenths', 10], ['No snapping', 0]].forEach(([t, v]) => { const o = mk('option', null, t); o.value = v; if (v === S.snap) o.selected = true; snapSel.append(o); }); snapSel.onchange = () => { S.snap = +snapSel.value; };
  const dashCb = mk('input'); dashCb.type = 'checkbox'; dashCb.onchange = () => { S.dashed = dashCb.checked; }; const lbl = mk('input'); lbl.type = 'checkbox'; lbl.onchange = () => { S.label = lbl.checked; }; const ext = mk('input'); ext.type = 'checkbox'; ext.onchange = () => { S.ext = ext.checked; };
  const ck = (cb, t) => { const l = mk('label', 'sh-ck'); l.append(cb, mk('span', null, t)); return l; };
  opt.append(snapSel, ck(dashCb, 'Dashed'), ck(lbl, 'Ask for point labels'), ck(ext, 'Extend 2-point line'));
  const fin = btn('btn sm', 'Finish line / curve', () => finish(false)); fin.hidden = true;
  function finish(silent) { if (S.cur.length >= 2) S.ops.push({ t: S.tool === 'curve' ? 'curve' : 'line', pts: S.cur.slice(), c: S.color, d: S.dashed, ext: S.ext && S.tool === 'line' && S.cur.length === 2 }); else if (S.cur.length === 1 && !silent) S.ops.push({ t: 'pt', x: S.cur[0].x, y: S.cur[0].y, l: '', c: S.color }); S.cur = []; fin.hidden = true; list(); draw(); }
  const fnRow = mk('div', 'sh-row'); const fnIn = input('', v => { S.fe = v; }, 'y = x^2 - 2x - 3', '100%', 'text'); fnIn.style.flex = '1'; const angSel = seg([['Degrees', 'deg'], ['Radians', 'rad']], 'deg', v => { S.angle = v; draw(); });
  const fnMsg = mk('p', 'sh-hint', 'Type y = … using x. Use brackets for functions: sin(x), sqrt(x), log(x). Then press Plot.');
  const fnBtn = btn('btn sm', 'Plot y = f(x)', () => { try { exprFn(S.fe, S.angle)(1); } catch { fnMsg.textContent = 'That expression could not be read. Example: x^2 - 2x - 3'; fnMsg.classList.add('bad'); return; } fnMsg.classList.remove('bad'); fnMsg.textContent = 'Plotted. Plot another, or change the colour first.'; S.ops.push({ t: 'fn', e: S.fe, c: S.color, d: S.dashed }); list(); draw(); });
  fnRow.append(fnIn, fnBtn);
  const meta = mk('div', 'sh-grid2'); meta.append(field('Title', input('', v => { S.title = v; draw(); }, 'e.g. Graph of y = x² − 2x − 3', '100%', 'text')), field('Scale note', input('', v => { S.scale = v; draw(); }, 'e.g. 2 cm to 1 unit', '100%', 'text')), field('x-axis name', input('x', v => { S.xl = v; draw(); }, '', '100%', 'text')), field('y-axis name', input('y', v => { S.yl = v; draw(); }, '', '100%', 'text')));
  const chips = mk('div', 'sh-chips'); let itemsSec = { firstChild: { textContent: '' } };
  const label = o => o.t === 'pt' ? `${o.l ? o.l + ' ' : ''}(${fmt(o.x)}, ${fmt(o.y)})` : o.t === 'text' ? `“${o.s}”` : o.t === 'fn' ? `y = ${o.e}` : `${o.t === 'curve' ? 'Curve' : 'Line'} ×${o.pts.length}`;
  function list() { chips.innerHTML = ''; itemsSec.firstChild.textContent = `Plotted items (${S.ops.length}) — tap one to remove it`; S.ops.forEach((o, i) => { const b = btn('sh-chip', label(o) + '  ✕', () => { S.ops.splice(i, 1); list(); draw(); }); b.style.borderColor = o.c; chips.append(b); }); draw(); }
  const undo = btn('btn sm ghost', '↶ Undo', () => { if (S.cur.length) S.cur.pop(); else S.ops.pop(); if (!S.cur.length) fin.hidden = true; list(); });
  itemsSec = sec('Plotted items (0) — tap one to remove it', false, chips);
  el.append(cv.c, status, tools, colorRow(() => S.color, c => { S.color = c; draw(); }), (() => { const r = mk('div', 'sh-row'); r.append(fin, undo); return r; })(), sec('Axes and scale', false, rng), sec('Drawing options', false, opt), sec('Draw a curve from a rule', false, fnRow, angSel, fnMsg), sec('Title and axis names', false, meta), itemsSec);
  draw();
  return {
    el, image: () => { S.hover = null; draw(); return cv.c; },
    clear() { S.ops = []; S.cur = []; fin.hidden = true; list(); },
    describe() {
      const p = S.ops.filter(o => o.t === 'pt'), L = S.ops.filter(o => o.t === 'line'), C = S.ops.filter(o => o.t === 'curve'), F = S.ops.filter(o => o.t === 'fn'), T = S.ops.filter(o => o.t === 'text');
      const out = [`Graph paper. x-axis from ${fmt(S.xmin)} to ${fmt(S.xmax)} (1 square = ${fmt(S.xs)}); y-axis from ${fmt(S.ymin)} to ${fmt(S.ymax)} (1 square = ${fmt(S.ys)}).`];
      if (S.title) out.push('Title: ' + S.title); if (S.scale) out.push('Scale: ' + S.scale);
      if (p.length) out.push('Points plotted: ' + p.map(o => (o.l ? o.l : '') + `(${fmt(o.x)}, ${fmt(o.y)})`).join(', ') + '.');
      L.forEach(o => out.push('Straight line' + (o.ext ? ' (extended)' : '') + ' through: ' + pts2(o.pts) + '.')); C.forEach(o => out.push('Smooth curve through: ' + pts2(o.pts) + '.'));
      F.forEach(o => out.push(`Curve drawn from the rule y = ${o.e}.`)); if (T.length) out.push('Labels: ' + T.map(o => `“${o.s}” at (${fmt(o.x)}, ${fmt(o.y)})`).join('; ') + '.');
      if (!S.ops.length) out.push('Nothing plotted yet.'); return out.join('\n');
    },
    empty: () => !S.ops.length, name: 'Graph'
  };
}

/* ================= SKETCH PAD ================= */
function sketchPane(W) {
  const S = { tool: 'pen', color: COLORS[0], w: 2, paper: 'squared', ops: [], cur: null };
  const el = mk('div', 'sh-pane'), H = Math.round(W * 1.05), cv = mkCanvas(W, H), g = cv.g;
  function paper() {
    whiteBg(g, W, H);
    if (S.paper === 'squared') { for (let x = 0; x <= W; x += 20) { g.strokeStyle = (x / 20) % 5 === 0 ? '#8db4e2' : '#d7e6f7'; g.lineWidth = (x / 20) % 5 === 0 ? 1 : .6; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y <= H; y += 20) { g.strokeStyle = (y / 20) % 5 === 0 ? '#8db4e2' : '#d7e6f7'; g.lineWidth = (y / 20) % 5 === 0 ? 1 : .6; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } }
    else if (S.paper === 'dotted') { g.fillStyle = '#9aa7b8'; for (let x = 20; x < W; x += 20) for (let y = 20; y < H; y += 20) g.fillRect(x - 1, y - 1, 2, 2); }
    else if (S.paper === 'lined') { g.strokeStyle = '#cfe0f5'; g.lineWidth = 1; for (let y = 28; y < H; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } }
  }
  function drawOp(o) {
    g.strokeStyle = g.fillStyle = o.c; g.lineWidth = o.w; g.lineCap = g.lineJoin = 'round'; g.setLineDash(o.d ? [8, 6] : []);
    if (o.t === 'pen') { g.beginPath(); if (o.p.length === 1) { g.arc(o.p[0][0], o.p[0][1], o.w / 2, 0, 7); g.fill(); } else { g.moveTo(o.p[0][0], o.p[0][1]); o.p.slice(1).forEach(q => g.lineTo(q[0], q[1])); g.stroke(); } }
    else if (o.t === 'line') { g.beginPath(); g.moveTo(o.a[0], o.a[1]); g.lineTo(o.b[0], o.b[1]); g.stroke(); }
    else if (o.t === 'arrow') arrow(g, o.a[0], o.a[1], o.b[0], o.b[1], 6 + o.w * 2);
    else if (o.t === 'rect') { g.strokeRect(Math.min(o.a[0], o.b[0]), Math.min(o.a[1], o.b[1]), Math.abs(o.b[0] - o.a[0]), Math.abs(o.b[1] - o.a[1])); }
    else if (o.t === 'circ') { g.beginPath(); g.arc(o.a[0], o.a[1], Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]), 0, 7); g.stroke(); }
    else if (o.t === 'text') { g.font = '15px sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(o.s, o.a[0], o.a[1]); }
    g.setLineDash([]);
  }
  function draw() { paper(); S.ops.forEach(drawOp); if (S.cur) drawOp(S.cur); }
  const near = (o, x, y) => {
    const dseg = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l, 0, 1); return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy)); };
    if (o.t === 'pen') return Math.min(...o.p.map((q, i) => i ? dseg(o.p[i - 1], q) : Math.hypot(x - q[0], y - q[1])));
    if (o.t === 'line' || o.t === 'arrow') return dseg(o.a, o.b);
    if (o.t === 'circ') return Math.abs(Math.hypot(x - o.a[0], y - o.a[1]) - Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]));
    if (o.t === 'rect') { const x1 = Math.min(o.a[0], o.b[0]), x2 = Math.max(o.a[0], o.b[0]), y1 = Math.min(o.a[1], o.b[1]), y2 = Math.max(o.a[1], o.b[1]); return Math.min(dseg([x1, y1], [x2, y1]), dseg([x2, y1], [x2, y2]), dseg([x2, y2], [x1, y2]), dseg([x1, y2], [x1, y1])); }
    if (o.t === 'text') return Math.hypot(x - (o.a[0] + o.s.length * 4), y - o.a[1]) - o.s.length * 3;
    return 1e9;
  };
  const pos = e => { const r = cv.c.getBoundingClientRect(); return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (H / r.height)]; };
  cv.c.style.touchAction = 'none'; let drag = false;
  cv.c.addEventListener('pointerdown', e => {
    e.preventDefault(); const p = pos(e); try { cv.c.setPointerCapture(e.pointerId); } catch {}
    if (S.tool === 'text') { const s = (prompt('Write the label') || '').slice(0, 40); if (s) { S.ops.push({ t: 'text', a: p, s, c: S.color, w: 1 }); draw(); } return; }
    if (S.tool === 'erase') { drag = true; erase(p); return; }
    drag = true; S.cur = S.tool === 'pen' ? { t: 'pen', p: [p], c: S.color, w: S.w, d: false } : { t: S.tool, a: p, b: p, c: S.color, w: S.w, d: dashed }; draw();
  });
  cv.c.addEventListener('pointermove', e => { if (!drag) return; const p = pos(e); if (S.tool === 'erase') return erase(p); if (!S.cur) return; if (S.cur.t === 'pen') S.cur.p.push(p); else S.cur.b = p; draw(); });
  const end = () => { if (!drag) return; drag = false; if (S.cur) { const o = S.cur; S.cur = null; if (o.t === 'pen' || Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]) > 3) S.ops.push(o); } draw(); };
  cv.c.addEventListener('pointerup', end); cv.c.addEventListener('pointercancel', end);
  function erase(p) { let best = -1, bd = 14; S.ops.forEach((o, i) => { const d = near(o, p[0], p[1]); if (d < bd) { bd = d; best = i; } }); if (best >= 0) { S.ops.splice(best, 1); draw(); } }
  let dashed = false;
  const tools = seg([['✎ Pen', 'pen'], ['／ Line', 'line'], ['➚ Arrow', 'arrow'], ['▭ Box', 'rect'], ['○ Circle', 'circ'], ['A Label', 'text'], ['⌫ Erase', 'erase']], 'pen', v => { S.tool = v; });
  const dashCb = mk('input'); dashCb.type = 'checkbox'; dashCb.onchange = () => { dashed = dashCb.checked; }; const ckl = mk('label', 'sh-ck'); ckl.append(dashCb, mk('span', null, 'Dashed (lines, boxes, circles)'));
  const row = mk('div', 'sh-row'); row.append(seg([['Squared', 'squared'], ['Dotted', 'dotted'], ['Lined', 'lined'], ['Plain', 'plain']], 'squared', v => { S.paper = v; draw(); }), seg([['Thin', 1.5], ['Medium', 2.5], ['Thick', 4.5]], 1.5 === S.w ? 1.5 : 2.5, v => { S.w = v; }));
  S.w = 2.5;
  const undo = btn('btn sm ghost', '↶ Undo', () => { S.ops.pop(); draw(); });
  el.append(cv.c, tools, colorRow(() => S.color, c => { S.color = c; }), (() => { const r = mk('div', 'sh-row'); r.append(undo); return r; })(), sec('Paper and pen thickness', false, row, ckl), mk('p', 'sh-hint', 'Draw with your finger. Use the Label tool to name parts. The Erase tool removes the whole stroke you touch.'));
  draw();
  return {
    el, image: () => { draw(); return cv.c; }, clear() { S.ops = []; S.cur = null; draw(); }, name: 'Sketch', empty: () => !S.ops.length,
    describe() { const t = S.ops.filter(o => o.t === 'text').map(o => o.s); return 'Hand-drawn diagram (see the picture).' + (t.length ? '\nLabels written: ' + t.join(', ') + '.' : '') + `\nShapes drawn: ${S.ops.length}.`; }
  };
}

/* ================= CHARTS ================= */
function chartPane(W) {
  const S = { type: 'bar', rows: [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }], title: '', xl: '', yl: 'Frequency', start: '0', best: true, guides: true, color: COLORS[1] };
  const el = mk('div', 'sh-pane'), H = Math.round(W * .9), cv = mkCanvas(W, H), g = cv.g;
  const padL = 44, padR = 16, padT = 26, padB = 44, pw = W - padL - padR, ph = H - padT - padB;
  const types = [['Bar chart', 'bar'], ['Histogram', 'hist'], ['Pie chart', 'pie'], ['Line graph', 'line'], ['Freq. polygon', 'poly'], ['Ogive (cum. freq.)', 'ogive'], ['Scatter', 'scatter']];
  const heads = { bar: ['Item', 'Value'], hist: ['Class (e.g. 10-19)', 'Frequency'], pie: ['Item', 'Value'], line: ['Item', 'Value'], poly: ['Class mark (x)', 'Frequency'], ogive: ['Upper boundary', 'Frequency'], scatter: ['x', 'y'] };
  const data = () => S.rows.filter(r => String(r.a).trim() !== '' && !Number.isNaN(num(r.b))).map(r => ({ a: String(r.a).trim(), b: num(r.b), x: num(r.a) }));
  const guide = { text: '' };
  function axes(xlabels, ymax, ystep) {
    g.strokeStyle = '#000'; g.fillStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(padL, padT - 6); g.lineTo(padL, padT + ph); g.lineTo(padL + pw + 6, padT + ph); g.stroke();
    g.font = '11px sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.lineWidth = .5;
    for (let v = 0; v <= ymax + 1e-9; v += ystep) { const y = padT + ph - v / ymax * ph; g.fillText(fmt(v), padL - 5, y); g.strokeStyle = '#d5dde8'; g.beginPath(); g.moveTo(padL, y); g.lineTo(padL + pw, y); g.stroke(); }
    g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(padL, padT + ph); g.lineTo(padL + pw + 6, padT + ph); g.stroke();
    if (S.title) { g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(S.title, W / 2, 4); }
    g.font = '12px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom'; if (S.xl) g.fillText(S.xl, padL + pw / 2, H - 2); if (S.yl) { g.save(); g.translate(11, padT + ph / 2); g.rotate(-Math.PI / 2); g.textBaseline = 'top'; g.fillText(S.yl, 0, -3); g.restore(); }
  }
  function numAxes(xs, ys) { const sx = niceScale(Math.min(...xs), Math.max(...xs), 6), sy = niceScale(Math.min(0, ...ys), Math.max(...ys), 5); axes(null, sy.max, sy.step);
    g.fillStyle = '#000'; g.font = '11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top'; for (let v = sx.min; v <= sx.max + 1e-9; v += sx.step) { const px = padL + (v - sx.min) / (sx.max - sx.min) * pw; g.fillText(fmt(v), px, padT + ph + 4); g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, padT + ph); g.lineTo(px, padT + ph + 3); g.stroke(); }
    return { px: x => padL + (x - sx.min) / (sx.max - sx.min) * pw, py: y => padT + ph - y / sy.max * ph, sx, sy }; }
  function draw() {
    whiteBg(g, W, H); guide.text = ''; const d = data(), t = S.type; g.lineCap = g.lineJoin = 'round';
    if (!d.length) { g.fillStyle = '#6b7280'; g.font = '14px sans-serif'; g.textAlign = 'center'; g.fillText('Enter your data below to draw the chart.', W / 2, H / 2); return; }
    if (t === 'bar' || t === 'hist' || t === 'line') {
      const sy = niceScale(0, Math.max(...d.map(r => r.b), 1), 5); axes(null, sy.max, sy.step); const n = d.length, slot = pw / n;
      g.textAlign = 'center';
      d.forEach((r, i) => { const x0 = padL + i * slot, h = r.b / sy.max * ph;
        if (t === 'line') { const cx = x0 + slot / 2, cy = padT + ph - h; g.strokeStyle = S.color; g.fillStyle = S.color; g.lineWidth = 2; if (i) { const pr = d[i - 1]; g.beginPath(); g.moveTo(x0 - slot / 2, padT + ph - pr.b / sy.max * ph); g.lineTo(cx, cy); g.stroke(); } g.beginPath(); g.arc(cx, cy, 3.5, 0, 7); g.fill(); }
        else { const bw = t === 'hist' ? slot : slot * .6, bx = t === 'hist' ? x0 : x0 + slot * .2; g.fillStyle = S.color + 'cc'; g.fillRect(bx, padT + ph - h, bw, h); g.strokeStyle = '#000'; g.lineWidth = 1; g.strokeRect(bx, padT + ph - h, bw, h); }
        g.fillStyle = '#000'; g.font = '11px sans-serif'; g.textBaseline = 'top'; g.fillText(r.a.length > 9 ? r.a.slice(0, 8) + '…' : r.a, x0 + slot / 2, padT + ph + 5); g.textBaseline = 'bottom'; g.fillText(fmt(r.b), x0 + slot / 2, padT + ph - r.b / sy.max * ph - 4); });
    } else if (t === 'pie') {
      const tot = d.reduce((s, r) => s + Math.max(0, r.b), 0); if (!tot) return; const cx = W * .36, cy = H * .53, rad = Math.min(W * .3, H * .38); let a = -Math.PI / 2; const pal = ['#1d4ed8', '#dc2626', '#16a34a', '#ea580c', '#9333ea', '#0891b2', '#ca8a04', '#db2777', '#4b5563', '#65a30d'];
      if (S.title) { g.fillStyle = '#000'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(S.title, W / 2, 4); }
      d.forEach((r, i) => { const ang = Math.max(0, r.b) / tot * Math.PI * 2; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, rad, a, a + ang); g.closePath(); g.fillStyle = pal[i % pal.length]; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); const m = a + ang / 2; g.fillStyle = '#fff'; g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; if (ang > .3) g.fillText(fmt(Math.round(Math.max(0, r.b) / tot * 3600) / 10) + '°', cx + Math.cos(m) * rad * .65, cy + Math.sin(m) * rad * .65); a += ang; });
      g.textAlign = 'left'; g.textBaseline = 'middle'; g.font = '12px sans-serif'; d.forEach((r, i) => { const y = 40 + i * 20, x = W * .7; g.fillStyle = pal[i % pal.length]; g.fillRect(x - 14, y - 6, 10, 10); g.fillStyle = '#000'; g.fillText(`${r.a.slice(0, 12)} ${fmt(Math.round(r.b / tot * 3600) / 10)}°`, x, y); });
      guide.text = 'Angles: ' + d.map(r => `${r.a} = ${fmt(Math.round(r.b / tot * 3600) / 10)}° (${fmt(Math.round(r.b / tot * 1000) / 10)}%)`).join('; ') + `. Total = ${fmt(tot)}.`;
    } else if (t === 'poly' || t === 'scatter') {
      const dd = d.filter(r => !Number.isNaN(r.x)); if (!dd.length) return; dd.sort((p, q) => p.x - q.x); let xs = dd.map(r => r.x), ys = dd.map(r => r.b);
      if (t === 'poly' && dd.length > 1) { const w = dd[1].x - dd[0].x; xs = [dd[0].x - w, ...xs, dd[dd.length - 1].x + w]; ys = [0, ...ys, 0]; }
      const m = numAxes(xs, ys); g.strokeStyle = S.color; g.fillStyle = S.color; g.lineWidth = 2;
      if (t === 'poly') { g.beginPath(); xs.forEach((x, i) => i ? g.lineTo(m.px(x), m.py(ys[i])) : g.moveTo(m.px(x), m.py(ys[i]))); g.stroke(); }
      dd.forEach(r => { g.beginPath(); g.arc(m.px(r.x), m.py(r.b), 3.5, 0, 7); g.fill(); });
      if (t === 'scatter' && S.best && dd.length > 1) { try { const o = CE.statCalc(dd.map(r => ({ x: r.x, y: r.b, f: 1 })), 'lin'); g.strokeStyle = '#dc2626'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(m.px(m.sx.min), m.py(o.a + o.b * m.sx.min)); g.lineTo(m.px(m.sx.max), m.py(o.a + o.b * m.sx.max)); g.stroke(); guide.text = `Line of best fit (least squares): y = ${fmt(Math.round(o.a * 1e4) / 1e4)} + ${fmt(Math.round(o.b * 1e4) / 1e4)}x, r = ${fmt(Math.round(o.r * 1e4) / 1e4)}.`; } catch {} }
    } else if (t === 'ogive') {
      const dd = d.filter(r => !Number.isNaN(r.x)).sort((p, q) => p.x - q.x); if (!dd.length) return; const x0 = num(S.start); let cum = 0; const pts = []; if (!Number.isNaN(x0)) pts.push({ x: x0, y: 0 }); dd.forEach(r => { cum += r.b; pts.push({ x: r.x, y: cum }); });
      const m = numAxes(pts.map(p => p.x), pts.map(p => p.y)); g.strokeStyle = S.color; g.fillStyle = S.color; g.lineWidth = 2; g.beginPath(); spline(g, pts.map(p => [m.px(p.x), m.py(p.y)])); g.stroke(); pts.forEach(p => { g.beginPath(); g.arc(m.px(p.x), m.py(p.y), 3.5, 0, 7); g.fill(); });
      if (S.guides && cum > 0) { const at = f => { const target = cum * f; for (let i = 1; i < pts.length; i++) if (pts[i].y >= target) { const a = pts[i - 1], b = pts[i]; return a.x + (target - a.y) / ((b.y - a.y) || 1) * (b.x - a.x); } return NaN; }; const q = [['Q1', .25], ['Median', .5], ['Q3', .75]].map(([n, f]) => [n, at(f), cum * f]); g.setLineDash([5, 4]); g.strokeStyle = '#dc2626'; g.lineWidth = 1.2; g.font = '11px sans-serif'; g.fillStyle = '#dc2626'; g.textAlign = 'left'; g.textBaseline = 'bottom';
        q.forEach(([n, x, y]) => { if (Number.isNaN(x)) return; g.beginPath(); g.moveTo(padL, m.py(y)); g.lineTo(m.px(x), m.py(y)); g.lineTo(m.px(x), padT + ph); g.stroke(); g.fillText(n, padL + 4, m.py(y) - 2); }); g.setLineDash([]); guide.text = `Total frequency = ${fmt(cum)}. Reading the curve (straight-line estimate): ` + q.map(([n, x]) => `${n} ≈ ${Number.isNaN(x) ? '?' : fmt(Math.round(x * 100) / 100)}`).join(', ') + '.'; }
    }
  }
  const head = mk('div', 'sh-row'); const tsel = mk('select', 'sh-wide'); types.forEach(([t, v]) => { const o = mk('option', null, t); o.value = v; tsel.append(o); }); tsel.onchange = () => { S.type = tsel.value; build(); draw(); }; head.append(field('Chart type', tsel));
  const meta = mk('div', 'sh-grid2'); meta.append(field('Title', input('', v => { S.title = v; draw(); }, '', '100%', 'text')), field('x-axis name', input('', v => { S.xl = v; draw(); }, '', '100%', 'text')), field('y-axis name', input('Frequency', v => { S.yl = v; draw(); }, '', '100%', 'text')));
  const tbl = mk('div', 'sh-tbl'); const extra = mk('div', 'sh-row');
  function build() {
    tbl.innerHTML = ''; extra.innerHTML = ''; const h = heads[S.type]; tbl.style.gridTemplateColumns = '1fr 1fr 34px'; tbl.append(mk('b', null, h[0]), mk('b', null, h[1]), mk('span'));
    S.rows.forEach((r, i) => { tbl.append(input(r.a, v => { r.a = v; draw(); }, '', '100%', S.type === 'bar' || S.type === 'pie' || S.type === 'line' || S.type === 'hist' ? 'text' : 'decimal'), input(r.b, v => { r.b = v; draw(); }, '', '100%'), btn('sh-del', '✕', () => { if (S.rows.length > 1) S.rows.splice(i, 1); build(); draw(); })); });
    extra.append(btn('btn sm ghost', '+ Row', () => { S.rows.push({ a: '', b: '' }); build(); }), btn('btn sm ghost', 'Clear data', () => { S.rows = [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }]; build(); draw(); }));
    if (S.type === 'ogive') { extra.append(field('Start at x =', input(S.start, v => { S.start = v; draw(); }, '', '70px')), (() => { const c = mk('input'); c.type = 'checkbox'; c.checked = S.guides; c.onchange = () => { S.guides = c.checked; draw(); }; const l = mk('label', 'sh-ck'); l.append(c, mk('span', null, 'Show Q1, median, Q3')); return l; })()); }
    if (S.type === 'scatter') { extra.append((() => { const c = mk('input'); c.type = 'checkbox'; c.checked = S.best; c.onchange = () => { S.best = c.checked; draw(); }; const l = mk('label', 'sh-ck'); l.append(c, mk('span', null, 'Line of best fit')); return l; })()); }
  }
  build();
  el.append(head, cv.c, colorRow(() => S.color, c => { S.color = c; draw(); }), tbl, extra, sec('Title and axis names', false, meta), mk('p', 'sh-hint', 'Type your data. The chart is drawn for you. For a histogram with unequal classes, use bar heights from your own working.'));
  draw();
  return { el, image: () => { draw(); return cv.c; }, clear() { S.rows = [{ a: '', b: '' }, { a: '', b: '' }, { a: '', b: '' }]; build(); draw(); }, name: 'Chart', empty: () => !data().length,
    describe() { const d = data(); return `${types.find(t => t[1] === S.type)[0]}${S.title ? ': ' + S.title : ''}.\nData (${heads[S.type].join(' / ')}): ` + d.map(r => `${r.a} → ${fmt(r.b)}`).join('; ') + '.' + (guide.text ? '\n' + guide.text : ''); } };
}

/* ================= TABLE OF VALUES ================= */
function tablePane(W) {
  const S = { n: 7, xs: [], ys: [], xl: 'x', yl: 'y', from: '-3', to: '3', step: '1', fe: '', angle: 'deg' };
  const el = mk('div', 'sh-pane'); let cv = null;
  const cells = mk('div', 'sh-tcells'); const msg = mk('p', 'sh-hint', 'Fill x from … to …, type the rule for y, then press “Fill y”. You can also type or change any value yourself.');
  function sync(n) { while (S.xs.length < n) { S.xs.push(''); S.ys.push(''); } S.xs.length = n; S.ys.length = n; S.n = n; }
  sync(7);
  function build() {
    cells.innerHTML = ''; cells.style.gridTemplateColumns = `62px repeat(${S.n}, minmax(48px, 1fr))`;
    cells.append(input(S.xl, v => { S.xl = v; draw(); }, '', '100%', 'text')); S.xs.forEach((v, i) => cells.append(input(v, t => { S.xs[i] = t; draw(); }, '', '100%')));
    cells.append(input(S.yl, v => { S.yl = v; draw(); }, '', '100%', 'text')); S.ys.forEach((v, i) => cells.append(input(v, t => { S.ys[i] = t; draw(); }, '', '100%')));
    draw();
  }
  const host = mk('div', 'sh-tcv');
  function draw() {
    const cw = 54, lw = 66, rh = 34, w = lw + S.n * cw + 2, h = rh * 2 + 2; cv = mkCanvas(Math.max(w, 120), h); const g = cv.g; whiteBg(g, cv.w, h); g.strokeStyle = '#000'; g.lineWidth = 1.5; g.font = '15px sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = '#000';
    for (let r = 0; r <= 2; r++) { g.beginPath(); g.moveTo(1, 1 + r * rh); g.lineTo(w - 1, 1 + r * rh); g.stroke(); } for (let c = 0; c <= S.n + 1; c++) { const x = c === 0 ? 1 : lw + (c - 1) * cw + (c === 1 ? 0 : 0); g.beginPath(); g.moveTo(c === 0 ? 1 : lw + (c - 1) * cw, 1); g.lineTo(c === 0 ? 1 : lw + (c - 1) * cw, 1 + 2 * rh); g.stroke(); }
    g.font = 'italic 15px serif'; g.fillText(S.xl, lw / 2, rh / 2 + 1); g.fillText(S.yl, lw / 2, rh * 1.5 + 1); g.font = '15px sans-serif'; S.xs.forEach((v, i) => g.fillText(v, lw + i * cw + cw / 2, rh / 2 + 1)); S.ys.forEach((v, i) => g.fillText(v, lw + i * cw + cw / 2, rh * 1.5 + 1));
    host.innerHTML = ''; host.append(cv.c);
  }
  const top = mk('div', 'sh-grid4'); top.append(field('x from', input(S.from, v => { S.from = v; }, '', '100%', 'text')), field('x to', input(S.to, v => { S.to = v; }, '', '100%', 'text')), field('step', input(S.step, v => { S.step = v; }, '', '100%', 'text')), field('columns', (() => { const s = mk('select'); for (let k = 2; k <= 15; k++) { const o = mk('option', null, k); o.value = k; if (k === S.n) o.selected = true; s.append(o); } s.onchange = () => { sync(+s.value); build(); }; return s; })()));
  const fe = input('', v => { S.fe = v; }, 'y = x^2 - 2x - 3', '100%', 'text');
  const fillX = btn('btn sm ghost', 'Fill x', () => { const a = num(S.from), b = num(S.to), st = num(S.step); if ([a, b, st].some(Number.isNaN) || st === 0 || (b - a) / st < 0) { msg.textContent = 'Check the x numbers.'; return; } const n = Math.min(15, Math.round((b - a) / st) + 1); sync(n); for (let i = 0; i < n; i++) S.xs[i] = fmt(a + i * st); build(); msg.textContent = 'Filled x.'; const sel = top.querySelector('select'); sel.value = n; });
  const fillY = btn('btn sm', 'Fill y from the rule', () => { try { const f = exprFn(S.fe, S.angle); S.ys = S.xs.map(x => { const n = num(x); if (Number.isNaN(n)) return ''; const v = f(n); return Number.isFinite(v) ? fmt(Math.round(v * 1e4) / 1e4) : ''; }); build(); msg.textContent = 'Filled y.'; } catch { msg.textContent = 'That rule could not be read. Example: x^2 - 2x - 3'; } });
  const rows = mk('div', 'sh-row'); rows.append(fillX, fillY, seg([['Degrees', 'deg'], ['Radians', 'rad']], 'deg', v => { S.angle = v; }));
  el.append(host, cells, sec('Fill the table automatically', true, top, field('Rule for y', fe), rows, msg)); build();
  return { el, image: () => { draw(); return cv.c; }, clear() { S.xs = S.xs.map(() => ''); S.ys = S.ys.map(() => ''); build(); }, name: 'Table', empty: () => S.xs.every(v => v === '') && S.ys.every(v => v === ''),
    describe() { return `Table of values.\n${S.xl}: ${S.xs.join(', ')}\n${S.yl}: ${S.ys.join(', ')}`; } };
}

/* ================= VENN DIAGRAM ================= */
function vennPane(W) {
  const S = { n: 2, names: ['A', 'B', 'C'], v: {}, u: 'ξ' };
  const el = mk('div', 'sh-pane'), H = Math.round(W * .82), cv = mkCanvas(W, H), g = cv.g;
  const R2 = [['a', 'Only ' + 'A', .3, .5], ['ab', 'A and B', .5, .5], ['b', 'Only B', .7, .5], ['out', 'Outside', .1, .88]];
  const R3 = [['a', 'Only A', .3, .34], ['b', 'Only B', .7, .34], ['c', 'Only C', .5, .8], ['ab', 'A and B only', .5, .27], ['ac', 'A and C only', .36, .6], ['bc', 'B and C only', .64, .6], ['abc', 'A, B and C', .5, .5], ['out', 'Outside', .08, .9]];
  const regs = () => S.n === 2 ? R2 : R3;
  function draw() {
    whiteBg(g, W, H); g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(8, 8, W - 16, H - 16); g.fillStyle = '#000'; g.font = 'italic bold 15px serif'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(S.u, 14, 12);
    const cols = ['rgba(29,78,216,.18)', 'rgba(220,38,38,.18)', 'rgba(22,163,74,.18)']; const rad = S.n === 2 ? W * .24 : W * .22;
    const cs = S.n === 2 ? [[W * .38, H * .5], [W * .62, H * .5]] : [[W * .4, H * .38], [W * .6, H * .38], [W * .5, H * .58]];
    cs.forEach(([x, y], i) => { g.beginPath(); g.arc(x, y, rad, 0, 7); g.fillStyle = cols[i]; g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.8; g.stroke(); });
    g.fillStyle = '#000'; g.font = 'bold 14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lp = S.n === 2 ? [[W * .27, H * .2], [W * .73, H * .2]] : [[W * .27, H * .12], [W * .73, H * .12], [W * .5, H * .93]]; lp.forEach(([x, y], i) => g.fillText(S.names[i], x, y));
    g.font = '15px sans-serif'; regs().forEach(([k, , fx, fy]) => { const v = S.v[k]; if (v) g.fillText(v, W * fx, H * fy); });
  }
  const names = mk('div', 'sh-grid4'); [0, 1, 2].forEach(i => names.append(field('Set ' + 'ABC'[i] + ' name', input(S.names[i], v => { S.names[i] = v || 'ABC'[i]; draw(); }, '', '100%', 'text')))); names.append(field('Universal set', input(S.u, v => { S.u = v; draw(); }, '', '100%', 'text')));
  const nSel = seg([['2 sets', 2], ['3 sets', 3]], 2, v => { S.n = v; build(); draw(); }); const form = mk('div', 'sh-grid2');
  function build() { form.innerHTML = ''; regs().forEach(([k, t]) => form.append(field(t.replace(/\bA\b/g, S.names[0]).replace(/\bB\b/g, S.names[1]).replace(/\bC\b/g, S.names[2]), input(S.v[k] || '', v => { S.v[k] = v; draw(); }, 'number or elements', '100%', 'text')))); names.style.display = ''; }
  build(); el.append(nSel, cv.c, form, sec('Set names', false, names), mk('p', 'sh-hint', 'Type a number, or the elements (for example 2, 4, 6), into each region.'));
  draw();
  return { el, image: () => { draw(); return cv.c; }, clear() { S.v = {}; build(); draw(); }, name: 'Venn diagram', empty: () => !Object.values(S.v).some(Boolean),
    describe() { return `Venn diagram with ${S.n} sets (${S.names.slice(0, S.n).join(', ')}) in the universal set ${S.u}.\n` + regs().map(([k, t]) => `${t.replace(/\bA\b/g, S.names[0]).replace(/\bB\b/g, S.names[1]).replace(/\bC\b/g, S.names[2])}: ${S.v[k] || '(empty)'}`).join('\n'); } };
}

/* ================= NUMBER LINE ================= */
function linePane(W) {
  const S = { min: '-5', max: '5', step: '1', items: [], op: '>', a: '', b: '', color: COLORS[1], dot: '' };
  const el = mk('div', 'sh-pane'), H = 150, cv = mkCanvas(W, H), g = cv.g, pad = 24;
  const OPS = [['x > a', '>'], ['x ≥ a', '>='], ['x < a', '<'], ['x ≤ a', '<='], ['a < x < b', 'a<x<b'], ['a ≤ x ≤ b', 'a<=x<=b'], ['a < x ≤ b', 'a<x<=b'], ['a ≤ x < b', 'a<=x<b']];
  const label = it => it.t === 'dot' ? `point ${fmt(it.x)}` : { '>': `x > ${fmt(it.a)}`, '>=': `x ≥ ${fmt(it.a)}`, '<': `x < ${fmt(it.a)}`, '<=': `x ≤ ${fmt(it.a)}`, 'a<x<b': `${fmt(it.a)} < x < ${fmt(it.b)}`, 'a<=x<=b': `${fmt(it.a)} ≤ x ≤ ${fmt(it.b)}`, 'a<x<=b': `${fmt(it.a)} < x ≤ ${fmt(it.b)}`, 'a<=x<b': `${fmt(it.a)} ≤ x < ${fmt(it.b)}` }[it.op];
  function draw() {
    whiteBg(g, W, H); const a = num(S.min), b = num(S.max), st = num(S.step); if ([a, b, st].some(Number.isNaN) || b <= a || st <= 0 || (b - a) / st > 60) { g.fillStyle = '#b91c1c'; g.font = '14px sans-serif'; g.fillText('Check the number line numbers.', 20, 40); return; }
    const X = x => pad + (x - a) / (b - a) * (W - 2 * pad), y0 = 78;
    g.strokeStyle = '#000'; g.fillStyle = '#000'; g.lineWidth = 2; arrow(g, pad - 12, y0, W - pad + 12, y0, 8); g.beginPath(); g.moveTo(W - pad + 12, y0); g.lineTo(pad - 12, y0); g.stroke(); arrow(g, W - pad - 8, y0, W - pad + 12, y0, 8); arrow(g, pad + 8, y0, pad - 12, y0, 8);
    g.font = '12px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'top'; g.lineWidth = 1.5; const every = Math.max(1, Math.ceil((b - a) / st / 14)); for (let k = 0, v = a; v <= b + 1e-9; k++, v = a + k * st) { g.beginPath(); g.moveTo(X(v), y0 - 6); g.lineTo(X(v), y0 + 6); g.stroke(); if (k % every === 0) g.fillText(fmt(v), X(v), y0 + 10); }
    S.items.forEach((it, i) => {
      g.strokeStyle = g.fillStyle = it.c; g.lineWidth = 4; const lift = -14 - (i % 4) * 0;
      const circ = (x, open) => { g.beginPath(); g.arc(X(x), y0, 6, 0, 7); g.fillStyle = open ? '#fff' : it.c; g.fill(); g.lineWidth = 2.2; g.strokeStyle = it.c; g.stroke(); g.lineWidth = 4; };
      if (it.t === 'dot') { circ(it.x, false); if (it.l) { g.fillStyle = it.c; g.font = 'bold 13px sans-serif'; g.textBaseline = 'bottom'; g.fillText(it.l, X(it.x), y0 - 12); } return; }
      const o = it.op, lo = o.startsWith('a'), A = it.a, B = it.b;
      g.beginPath();
      if (o === '>' || o === '>=') { g.moveTo(X(A), y0 - 3); g.lineTo(W - pad + 8, y0 - 3); g.stroke(); arrow(g, W - pad - 4, y0 - 3, W - pad + 12, y0 - 3, 9); circ(A, o === '>'); }
      else if (o === '<' || o === '<=') { g.moveTo(X(A), y0 - 3); g.lineTo(pad - 8, y0 - 3); g.stroke(); arrow(g, pad + 4, y0 - 3, pad - 12, y0 - 3, 9); circ(A, o === '<'); }
      else { g.moveTo(X(A), y0 - 3); g.lineTo(X(B), y0 - 3); g.stroke(); circ(A, !o.startsWith('a<=')); circ(B, !o.endsWith('<=b')); }
    });
  }
  const top = mk('div', 'sh-grid4'); top.append(field('from', input(S.min, v => { S.min = v; draw(); }, '', '100%', 'text')), field('to', input(S.max, v => { S.max = v; draw(); }, '', '100%', 'text')), field('step', input(S.step, v => { S.step = v; draw(); }, '', '100%', 'text')));
  const opSel = mk('select'); OPS.forEach(([t, v]) => { const o = mk('option', null, t); o.value = v; opSel.append(o); });
  const aI = input('', v => { S.a = v; }, 'a', '60px'), bI = input('', v => { S.b = v; }, 'b', '60px'); const add = btn('btn sm', 'Draw it', () => { const a = num(S.a), b = num(S.b), op = opSel.value; if (Number.isNaN(a) || (op.includes('b') && Number.isNaN(b))) return; S.items.push({ t: 'ineq', op, a, b, c: S.color }); list(); });
  const ineq = mk('div', 'sh-row'); ineq.append(opSel, aI, bI, add);
  const dI = input('', v => { S.dot = v; }, 'value', '70px'), dl = input('', v => { S.dl = v; }, 'label', '60px', 'text'); const addDot = btn('btn sm ghost', 'Mark point', () => { const x = num(S.dot); if (Number.isNaN(x)) return; S.items.push({ t: 'dot', x, l: (S.dl || '').slice(0, 6), c: S.color }); list(); });
  const dots = mk('div', 'sh-row'); dots.append(dI, dl, addDot);
  const chips = mk('div', 'sh-chips'); function list() { chips.innerHTML = ''; S.items.forEach((it, i) => chips.append(btn('sh-chip', label(it) + '  ✕', () => { S.items.splice(i, 1); list(); }))); draw(); }
  el.append(cv.c, colorRow(() => S.color, c => { S.color = c; }), ineq, chips, sec('Mark single points', false, dots), sec('Range of the number line', false, top), mk('p', 'sh-hint', 'Open circle = the number is not included (< or >). Closed circle = included (≤ or ≥).')); draw();
  return { el, image: () => { draw(); return cv.c; }, clear() { S.items = []; list(); }, name: 'Number line', empty: () => !S.items.length,
    describe() { return `Number line from ${S.min} to ${S.max}.\n` + (S.items.length ? S.items.map(label).join('; ') + '.' : 'Nothing drawn.'); } };
}

/* ================= MODAL ================= */
const PANES = [['graph', '📈 Graph paper', graphPane], ['sketch', '✏️ Sketch pad', sketchPane], ['chart', '📊 Charts', chartPane], ['table', '▦ Table of values', tablePane], ['venn', '◯ Venn diagram', vennPane], ['line', '↔ Number line', linePane], ['ref', '📚 Reference', (w) => window.SheetsRef ? window.SheetsRef(w) : { el: mk('p', null, 'Not available.'), noExport: true }]];
const META = { graph: ['Draw', 'Plot points, lines and curves on graph paper', 'graph function curve line plot coordinates axes straight gradient quadratic'], sketch: ['Draw', 'Freehand diagrams, apparatus, circuits, geometry', 'diagram sketch apparatus circuit geometry construction freehand biology draw'], chart: ['Data', 'Bar, histogram, pie, polygon, ogive, scatter', 'bar histogram pie line graph polygon ogive cumulative frequency scatter best fit chart statistics'], table: ['Data', 'Table of values for a rule y = f(x)', 'table values x y function'], venn: ['Maths', 'Two or three set diagrams', 'venn sets union intersection universal'], line: ['Maths', 'Inequalities and points on a number line', 'number line inequality open closed circle'], ref: ['Reference', 'Periodic table, constants, formulae, tables', 'periodic table elements constants formulae formula trig sin cos tan squares roots reference'] };
let modal = null;
function closeModal() { if (modal) { modal.remove(); modal = null; document.body.classList.remove('sh-on'); } }
function open(ta, add) {
  closeModal(); document.body.classList.add('sh-on');
  const m = modal = mk('div', 'shm'); m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Answer sheets');
  const head = mk('div', 'shm-h'); head.append(mk('b', null, 'Answer sheets'), btn('shm-x', '✕', closeModal)); head.lastChild.setAttribute('aria-label', 'Close');
  const tabs = mk('div', 'shm-pick'), body = mk('div', 'shm-body'), foot = mk('div', 'shm-foot'), msg = mk('p', 'sh-hint shm-msg', '');
  const W = Math.min(520, Math.max(260, (window.innerWidth || 360) - 28)); const made = {}; let cur = null;
  function show(id) {
    cur = id; pickBtn.textContent = PANES.find(p => p[0] === id)[1] + '  ▾'; pickPanel.hidden = true; Object.values(made).forEach(p => p.el.hidden = true);
    if (!made[id]) { made[id] = PANES.find(p => p[0] === id)[2](W - 4); body.append(made[id].el); } made[id].el.hidden = false; foot.hidden = !!made[id].noExport; msg.textContent = ''; body.scrollTop = 0;
  }
  const pickBtn = btn('shm-pickbtn', '', () => { pickPanel.hidden = !pickPanel.hidden; if (!pickPanel.hidden) { q.value = ''; fillList(); q.focus(); } });
  const pickPanel = mk('div', 'shm-pickpanel'); pickPanel.hidden = true; const q = mk('input', 'sh-in'); q.type = 'search'; q.placeholder = 'Search sheets (for example pie, venn, periodic)'; q.setAttribute('aria-label', 'Search sheets'); const lst = mk('div', 'shm-picklist');
  function fillList() { lst.innerHTML = ''; const t = q.value.trim().toLowerCase(); let any = false; ['Draw', 'Data', 'Maths', 'Reference'].forEach(g => { const items = PANES.filter(p => META[p[0]][0] === g && (!t || (p[1] + ' ' + META[p[0]][1] + ' ' + META[p[0]][2]).toLowerCase().includes(t))); if (!items.length) return; any = true; lst.append(mk('h5', null, g)); items.forEach(([id, label]) => { const b = btn('shm-pickitem' + (id === cur ? ' on' : ''), '', () => show(id)); b.append(mk('b', null, label), mk('span', null, META[id][1])); lst.append(b); }); }); if (!any) lst.append(mk('p', 'sh-hint', 'No sheet matches. Try “graph”, “pie” or “table”.')); }
  q.oninput = fillList; pickPanel.append(q, lst); tabs.append(pickBtn, pickPanel);
  const addB = btn('btn sm', '✔ Add to my answer', () => {
    const p = made[cur]; if (!p || p.noExport) return; if (p.empty && p.empty()) { msg.textContent = 'There is nothing on this sheet yet.'; return; }
    const c = p.image(), url = c.toDataURL('image/jpeg', .82); if (!add({ url, img: url.split(',')[1], note: p.describe(), name: p.name })) { msg.textContent = 'You can attach up to 3 sheets to one answer. Remove one first.'; return; } closeModal();
  });
  const dl = btn('btn sm ghost', '⬇ Save picture', () => { const p = made[cur]; if (!p || p.noExport) return; const a = mk('a'); a.href = p.image().toDataURL('image/png'); a.download = (p.name || 'sheet').toLowerCase().replace(/\s+/g, '-') + '.png'; document.body.append(a); a.click(); a.remove(); });
  const clr = btn('btn sm ghost', '🗑 Clear sheet', () => { const p = made[cur]; if (p && p.clear && confirm('Clear this sheet?')) p.clear(); });
  foot.append(addB, dl, clr);
  m.append(head, tabs, body, msg, foot); document.body.append(m); show('graph');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal) closeModal(); });

/* ================= attach to a theory answer ================= */
window.Sheets = {
  attach(ta, onChange) {
    ta._sheets = []; let row = ta.nextElementSibling; if (!row || !row.classList.contains('kbrow')) { row = mk('div', 'kbrow'); ta.after(row); }
    const thumbs = mk('div', 'shthumbs'); row.after(thumbs);
    const redraw = () => { thumbs.innerHTML = ''; ta._sheets.forEach((s, i) => { const f = mk('figure', 'shthumb'); const im = mk('img'); im.src = s.url; im.alt = s.name + ' attached to this answer'; const cap = mk('figcaption', null, s.name); const x = btn('shthumb-x', '✕', () => { if (ta.disabled) return; ta._sheets.splice(i, 1); redraw(); onChange && onChange(ta._sheets); }); x.setAttribute('aria-label', 'Remove ' + s.name); f.append(im, cap, x); thumbs.append(f); }); };
    const b = btn('kbcalc shbtn', '📈 Graph & sheets', () => open(ta, s => {
      if (ta._sheets.length >= 3) return false; ta._sheets.push(s); redraw(); onChange && onChange(ta._sheets);
      if (!ta.value.includes('[' + s.name + ' attached]')) { ta.value = (ta.value ? ta.value.replace(/\s*$/, '\n') : '') + '[' + s.name + ' attached]'; ta.dispatchEvent(new Event('input', { bubbles: true })); } return true;
    }));
    row.append(b);
  }
};
})();
