/* Scientific calculator screen: Casio fx-991ES PLUS style (SHIFT / ALPHA keys, 8 modes, setup menu).
   The maths lives in calcengine.js. */
(() => {
const E = window.CalcEngine; if (!E) return;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const btn = (c, x, f) => { const b = h('button', c, x); b.type = 'button'; if (f) b.onclick = f; return b; };
const load = () => { try { return JSON.parse(localStorage.getItem('calc2') || '{}'); } catch { return {}; } };
const keep = () => { try { localStorage.setItem('calc2', JSON.stringify({ setup: S.setup, vars: Object.fromEntries(Object.entries(S.vars).map(([k, v]) => [k, v.v ?? v.re ?? 0])), hist: S.hist.slice(0, 20).map(x => ({ a: x.atoms, r: x.res })) })); } catch {} };

const DISP = { 'sqrt(': '√(', 'cbrt(': '³√(', 'asin(': 'sin⁻¹(', 'acos(': 'cos⁻¹(', 'atan(': 'tan⁻¹(', 'asinh(': 'sinh⁻¹(', 'acosh(': 'cosh⁻¹(', 'atanh(': 'tanh⁻¹(', 'pow10(': '10^(', 'exp(': 'e^(', '*': '×', '/': '÷', 'deriv(': 'd/dx(', 'integ(': '∫(', 'sum(': 'Σ(', 'logb(': 'log_b(', 'ᵈ': '°', 'ᴇ': '×10^', '⌐': ' ', 'pol(': 'Pol(', 'rec(': 'Rec(', 'intg(': 'Intg(', 'int(': 'Int(', 'rnd(': 'Rnd(', 'ranint(': 'RanInt(', 'abs(': 'Abs(', 'gcd(': 'GCD(', 'lcm(': 'LCM(', 'fact(': 'Fact(', 'conj(': 'Conj(', 'arg(': 'Arg(', 're(': 'Re(', 'im(': 'Im(' };
const atom = (s, d) => ({ s, d: d || DISP[s] || s });
const OPS = new Set(['+', '-', '*', '/', '^', '²', '³', '⁻¹', '!', '%', 'ˣ√', 'nCr', 'nPr', '⁄', 'and', 'or', 'xor', 'xnor']);
const VARS = 'ABCDEFXYM'.split('');
const MODES = [['COMP', 'comp', 'Calculations'], ['CMPLX', 'cmplx', 'Complex numbers'], ['STAT', 'stat', 'Statistics & regression'], ['BASE-N', 'base', 'Binary, octal, hex'], ['EQN', 'eqn', 'Equations'], ['MATRIX', 'matrix', 'Matrices'], ['VECTOR', 'vector', 'Vectors'], ['TABLE', 'table', 'f(x) table']];

const saved = load();
const S = {
  open: false, mode: 'comp', shift: false, alpha: false, hyp: false, atoms: [], caret: 0, done: false, hist: [], hpos: -1, ta: null, base: 10, eng: false, engOff: 0, dec: false, last: null, lastStr: '', err: '',
  setup: Object.assign({ angle: 'deg', fmt: 'norm1', digits: 0, mixed: false, polar: false, freq: false }, saved.setup || {}),
  vars: {}, ans: null, preans: null,
  stat: { type: '1var', rows: [{ x: '', y: '', f: '1' }] }, eqn: { type: 'sim2', c: {} }, mat: { A: [['', ''], ['', '']], B: [['', ''], ['', '']], C: [['', ''], ['', '']], Ans: null }, vec: { A: ['', ''], B: ['', ''], C: ['', ''], Ans: null }, tab: null
};
Object.entries(saved.vars || {}).forEach(([k, v]) => { S.vars[k] = E.V(v); });
S.hist = (saved.hist || []).map(x => ({ atoms: x.a, res: x.r }));

/* ---------- panel skeleton ---------- */
const root = h('div', 'cx'); root.hidden = true; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Scientific calculator');
const head = h('div', 'cx-head'), ttl = h('b', null, 'fx-991ES PLUS'), modeB = btn('cx-top', 'COMP', () => menu('mode')), setB = btn('cx-top', 'SETUP', () => menu('setup')), angB = btn('cx-top cx-ang', 'D', () => { S.setup.angle = { deg: 'rad', rad: 'gra', gra: 'deg' }[S.setup.angle]; keep(); status(); }), xB = btn('cx-top cx-x', '✕', () => close());
modeB.setAttribute('aria-label', 'Mode menu'); setB.setAttribute('aria-label', 'Setup menu'); xB.setAttribute('aria-label', 'Close calculator'); angB.setAttribute('aria-label', 'Angle unit');
head.append(ttl, modeB, setB, angB, xB);
const stat = h('div', 'cx-stat'), body = h('div', 'cx-body'), foot = h('div', 'cx-foot');
const useB = btn('btn sm cx-use', 'Use result in my answer', () => useResult());
foot.append(useB);
root.append(head, stat, body, foot); document.body.append(root);

function status() {
  const a = { deg: 'D', rad: 'R', gra: 'G' }[S.setup.angle]; angB.textContent = a;
  const items = [S.shift && 'S', S.alpha && 'A', S.hyp && 'hyp', S.mode !== 'comp' && S.mode.toUpperCase(), S.vars.M && S.vars.M.v !== 0 && 'M', S.setup.fmt !== 'norm1' && (S.setup.fmt === 'fix' ? 'Fix' : S.setup.fmt === 'sci' ? 'Sci' : 'Norm2'), S.setup.mixed && 'a b/c'].filter(Boolean);
  stat.innerHTML = ''; items.forEach(t => stat.append(h('span', 'cx-flag' + (t === 'S' ? ' s' : t === 'A' ? ' a' : ''), t)));
  modeB.textContent = (MODES.find(m => m[1] === S.mode) || MODES[0])[0];
  $$('.k.shift', root).forEach(b => b.classList.toggle('on', S.shift)); $$('.k.alpha', root).forEach(b => b.classList.toggle('on', S.alpha));
  root.classList.toggle('is-shift', S.shift); root.classList.toggle('is-alpha', S.alpha);
}

/* ---------- number display ---------- */
function fst() { return { fmt: S.setup.fmt, digits: S.setup.digits, mixed: S.setup.mixed, polar: S.setup.polar, angle: S.setup.angle, dec: S.dec, eng: S.eng, engOff: S.engOff }; }
const show = (v, p) => E.fmtVal(v, Object.assign(fst(), p !== undefined ? { polar: p } : {}));
function env() { return E.makeEnv({ mode: S.mode === 'cmplx' ? 'cmplx' : 'comp', angle: S.setup.angle, vars: S.vars, ans: S.ans, preans: S.preans }); }
const src = () => S.atoms.map(a => a.s).join('');

/* ---------- screen (expression + result) ---------- */
let exprEl, resEl, histEl;
function drawScreen() {
  exprEl.innerHTML = '';
  const put = (t, cls) => { const s = h('span', cls, t); exprEl.append(s); };
  S.atoms.forEach((a, i) => { if (i === S.caret) exprEl.append(h('i', 'cx-caret')); put(a.d); });
  if (S.caret >= S.atoms.length) exprEl.append(h('i', 'cx-caret'));
  if (!S.atoms.length) exprEl.dataset.empty = '1'; else delete exprEl.dataset.empty;
  const sc = exprEl.querySelector('.cx-caret'); if (sc && sc.scrollIntoView) { try { exprEl.scrollLeft = Math.max(0, sc.offsetLeft - exprEl.clientWidth + 24); } catch {} }
  resEl.className = 'cx-res' + (S.err ? ' bad' : ''); resEl.innerHTML = '';
  if (S.err) resEl.textContent = S.err;
  else if (S.last && S.last.multi) S.last.multi.forEach(([l, v]) => resEl.append(h('div', 'cx-line', l + ' = ' + show(v))));
  else if (S.last && S.last.text) resEl.textContent = S.last.text;
  else if (S.last && S.last.val) resEl.textContent = (S.last.pre || '') + show(S.last.val, S.last.polar) + (S.last.note ? '  (' + S.last.note + ')' : '');
  else resEl.textContent = S.lastStr || '0';
  histEl.innerHTML = ''; S.hist.slice(0, 4).forEach(x => { const b = btn('cx-h', x.atoms.map(a => a.d).join('') + ' = ' + x.res); b.onclick = () => { S.atoms = x.atoms.map(a => ({ ...a })); S.caret = S.atoms.length; S.done = false; S.err = ''; drawScreen(); }; histEl.append(b); });
}

/* ---------- inserting ---------- */
function insert(a) {
  if (S.done) { S.done = false; if (OPS.has(a.s) && S.ans) { S.atoms = [atom('Ans')]; S.caret = 1; } else { S.atoms = []; S.caret = 0; } }
  S.err = ''; S.last = null; S.lastStr = ''; S.eng = false; S.engOff = 0; S.dec = false;
  S.atoms.splice(S.caret, 0, a); S.caret++;
}
function clearAll() { S.atoms = []; S.caret = 0; S.done = false; S.err = ''; S.last = null; S.lastStr = ''; S.eng = false; S.engOff = 0; S.dec = false; }

/* ---------- evaluating ---------- */
function runExpr() {
  S.err = ''; if (!S.atoms.length) return;
  const text = src();
  try {
    if (S.mode === 'base') return runBase(text);
    if (S.mode === 'table') return runTable(text);
    if (text.includes('=') ) throw new Error('Syntax ERROR');
    const e = env(), r = E.calculate(text, e, fst());
    let res;
    if (r.set) Object.entries(r.set).forEach(([k, v]) => { S.vars[k] = v; });
    if (r.multi) { S.last = { multi: r.multi }; res = r.multi.map(([l, v]) => l + '=' + show(v)).join(' '); S.preans = S.ans; S.ans = r.multi[0][1]; }
    else if (r.text && !r.val) { S.last = { text: r.text }; res = r.text; }
    else { S.dec = false; S.preans = S.ans; S.ans = r.val; S.eng = !!r.eng; S.engOff = 0; S.last = r.text ? { text: r.text } : { val: r.val, polar: r.polar }; res = r.text || show(r.val, r.polar); S.lastStr = res; }
    S.hist.unshift({ atoms: S.atoms.map(a => ({ ...a })), res }); S.hist = S.hist.slice(0, 30); S.hpos = -1; S.done = true; keep();
  } catch (x) { S.err = x.message || 'Math ERROR'; if (/Syntax/.test(S.err)) S.err = 'Syntax ERROR'; }
}
function runBase(text) {
  const v = E.baseEval(text, S.base); S.ans = E.int(v); S.preans = null;
  const f = b => E.baseStr(v, b); S.last = { text: null, multi: null }; S.lastStr = S.base === 10 ? String(v) : f(S.base);
  S.baseView = { 16: f(16), 10: String(v), 8: f(8), 2: f(2) }; S.hist.unshift({ atoms: S.atoms.map(a => ({ ...a })), res: S.lastStr }); S.done = true;
}
function runTable(text) { S.tabF = text; tableForm(); }

/* ---------- picking variable / constants / conversions ---------- */
function overlay(title, build) {
  let o = $('.cx-ov', root); if (o) o.remove();
  o = h('div', 'cx-ov'); const t = h('div', 'cx-ovh'); t.append(h('b', null, title), btn('cx-ovx', '✕', () => o.remove())); o.append(t); build(o, () => o.remove()); root.scrollTop = 0; root.append(o); return o;
}
function menu(kind) {
  if (kind === 'mode') overlay('MODE', (o, close) => {
    const g = h('div', 'cx-modes'); MODES.forEach(([n, id, d], i) => { const b = btn('cx-mode' + (S.mode === id ? ' on' : ''), '', () => { setMode(id); close(); }); b.append(h('b', null, (i + 1) + '  ' + n), h('small', null, d)); g.append(b); }); o.append(g);
  });
  else overlay('SETUP', (o, close) => {
    const seg = (label, opts, get, set) => { const r = h('div', 'cx-set'); r.append(h('span', null, label)); const g = h('div', 'cx-seg'); opts.forEach(([t, v]) => g.append(btn(get() === v ? 'on' : '', t, () => { set(v); keep(); status(); drawAll(); $$('.cx-seg button', r).forEach((bb, ii) => bb.classList.toggle('on', opts[ii][1] === get())); }))); r.append(g); return r; };
    o.append(seg('Angle unit', [['Degree', 'deg'], ['Radian', 'rad'], ['Gradian', 'gra']], () => S.setup.angle, v => S.setup.angle = v));
    o.append(seg('Number format', [['Norm 1', 'norm1'], ['Norm 2', 'norm2'], ['Fix', 'fix'], ['Sci', 'sci']], () => S.setup.fmt, v => { S.setup.fmt = v; if ((v === 'fix' || v === 'sci') && !S.setup.digits) S.setup.digits = v === 'fix' ? 3 : 4; }));
    const dr = h('div', 'cx-set'); dr.append(h('span', null, 'Fix / Sci digits (0–9)')); const di = h('input'); di.type = 'number'; di.min = 0; di.max = 9; di.inputMode = 'numeric'; di.value = S.setup.digits; di.oninput = () => { S.setup.digits = Math.max(0, Math.min(9, parseInt(di.value) || 0)); keep(); drawAll(); }; dr.append(di); o.append(dr);
    o.append(seg('Fraction display', [['d/c (7/2)', false], ['a b/c (3 1/2)', true]], () => S.setup.mixed, v => S.setup.mixed = v));
    o.append(seg('Complex result', [['a+bi', false], ['r∠θ', true]], () => S.setup.polar, v => S.setup.polar = v));
    o.append(seg('Statistics frequency', [['Off', false], ['On', true]], () => S.setup.freq, v => { S.setup.freq = v; }));
    o.append(btn('btn sm', 'Done', () => { close(); drawAll(); }));
  });
}
function varPicker(title, pick) { overlay(title, (o, close) => { const g = h('div', 'cx-vars'); VARS.forEach(v => { const cur = S.vars[v]; g.append(btn('cx-var', '', () => { close(); pick(v); })); g.lastChild.append(h('b', null, v), h('small', null, cur ? show(cur) : '0')); }); o.append(g); }); }
function constPicker() {
  overlay('CONST — physical constants', (o, close) => {
    const g = h('div', 'cx-list'); E.CONSTS.forEach(([s, n, v], i) => { const b = btn('cx-li', '', () => { close(); insert({ s: '(' + String(v).replace('e', 'ᴇ') + ')', d: s }); drawAll(); }); b.append(h('b', null, String(i + 1).padStart(2, '0') + '  ' + s), h('span', null, n), h('small', null, String(v))); g.append(b); }); o.append(g);
  });
}
function convPicker() {
  overlay('CONV — unit conversion', (o, close) => {
    o.append(h('p', 'cx-note', 'Enter a value first, then choose the conversion.'));
    const g = h('div', 'cx-list'); E.CONV.forEach(([n, f], i) => { g.append(btn('cx-li', '', () => { close(); doConv(n, f); })); g.lastChild.append(h('b', null, String(i + 1).padStart(2, '0') + '  ' + n)); }); o.append(g);
  });
}
function doConv(name, f) {
  try { let v; if (S.atoms.length && !S.done) { const r = E.calculate(src(), env(), fst()); v = r.val.v; } else if (S.ans) v = S.ans.v; else throw new Error('Syntax ERROR'); const out = E.V(f(v)); S.preans = S.ans; S.ans = out; S.last = { val: out, note: name }; S.lastStr = show(out) + '  (' + name + ')'; S.err = ''; S.done = true; }
  catch (x) { S.err = x.message; } drawAll();
}
function drgPicker() { overlay('DRG►', (o, close) => { [['° (degree)', 'ᵈ'], ['ʳ (radian)', 'ʳ'], ['ᵍ (gradian)', 'ᵍ']].forEach(([t, s]) => o.append(btn('cx-li', t, () => { close(); insert(atom(s, s === 'ᵈ' ? '°' : s)); drawAll(); }))); }); }
function clrPicker() {
  overlay('CLR', (o, close) => {
    [['Clear memory (A–F, X, Y, M, Ans)', () => { S.vars = {}; S.ans = null; S.preans = null; }], ['Clear history', () => { S.hist = []; }], ['Reset setup', () => { S.setup = { angle: 'deg', fmt: 'norm1', digits: 0, mixed: false, polar: false, freq: false }; }], ['Clear everything', () => { S.vars = {}; S.ans = null; S.preans = null; S.hist = []; S.setup = { angle: 'deg', fmt: 'norm1', digits: 0, mixed: false, polar: false, freq: false }; clearAll(); }]]
      .forEach(([t, f]) => o.append(btn('cx-li', t, () => { f(); keep(); close(); drawAll(); })));
  });
}

/* ---------- CALC / SOLVE / memory ---------- */
function usedVars() { const used = new Set(); S.atoms.forEach(a => { if (a.s.length === 1 && VARS.includes(a.s)) used.add(a.s); }); return [...used]; }
function doCalc() {
  if (S.mode !== 'comp' || !S.atoms.length) return; const vs = usedVars();
  const go = () => { const text = src(); try { const parts = text.split('='); const e = env(); if (parts.length > 1) { const l = E.calculate(parts[0], e, fst()).val, r = E.calculate(parts.slice(1).join('='), e, fst()).val; S.last = { multi: [['Left', l], ['Right', r]] }; S.err = ''; } else { const r = E.calculate(text, e, fst()); S.preans = S.ans; S.ans = r.val; S.last = { val: r.val }; S.lastStr = show(r.val); S.err = ''; S.done = true; } } catch (x) { S.err = x.message; } drawAll(); };
  if (!vs.length) return go();
  overlay('CALC — enter values', (o, close) => {
    const inp = {}; vs.forEach(v => { const r = h('label', 'cx-set'); r.append(h('span', null, v + ' =')); const i = h('input'); i.inputMode = 'decimal'; i.value = S.vars[v] ? E.fmtFloat(S.vars[v].v, {}) : '0'; inp[v] = i; r.append(i); o.append(r); });
    o.append(btn('btn sm', '=', () => { try { vs.forEach(v => { S.vars[v] = E.calculate(inp[v].value.replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'π') || '0', env(), fst()).val; }); keep(); close(); go(); } catch (x) { S.err = x.message; close(); drawAll(); } }));
  });
}
function doSolve() {
  if (S.mode !== 'comp' || !S.atoms.length) return;
  overlay('SOLVE — X = ?', (o, close) => {
    o.append(h('p', 'cx-note', 'Type the equation with = (ALPHA then CALC). Enter a starting guess for X.'));
    const r = h('label', 'cx-set'); r.append(h('span', null, 'X guess')); const i = h('input'); i.inputMode = 'decimal'; i.value = S.vars.X ? E.fmtFloat(S.vars.X.v, {}) : '0'; r.append(i); o.append(r);
    o.append(btn('btn sm', 'Solve', () => { close(); try { const g = E.calculate(i.value || '0', env(), fst()).val.v; const s = E.solve(src(), env(), g); S.vars.X = E.V(s.x); S.last = { multi: [['X', E.V(s.x)], ['L−R', E.V(Math.abs(s.r) < 1e-9 ? 0 : s.r)]] }; S.err = ''; S.done = true; keep(); } catch (x) { S.err = x.message; } drawAll(); }));
  });
}
function memAdd(sign) {
  try { let v; if (S.atoms.length && !S.done) v = E.calculate(src(), env(), fst()).val; else if (S.ans) v = S.ans; else return; const m = S.vars.M || E.int(0); S.vars.M = sign > 0 ? E.R.add(m, v.v !== undefined ? v : E.V(v.re)) : E.R.sub(m, v.v !== undefined ? v : E.V(v.re)); S.err = ''; S.last = { val: S.vars.M, pre: 'M = ' }; S.lastStr = 'M = ' + show(S.vars.M); S.done = true; keep(); }
  catch (x) { S.err = x.message; } drawAll();
}

/* ---------- table mode ---------- */
function tableForm() {
  overlay('TABLE — f(X)', (o, close) => {
    o.append(h('p', 'cx-note', 'f(X) = ' + S.atoms.map(a => a.d).join('')));
    const f = {}; [['Start', '1'], ['End', '5'], ['Step', '1']].forEach(([l, d]) => { const r = h('label', 'cx-set'); r.append(h('span', null, l)); const i = h('input'); i.inputMode = 'decimal'; i.value = (S.tab && S.tab[l]) || d; f[l] = i; r.append(i); o.append(r); });
    o.append(btn('btn sm', 'Make table', () => {
      try { const e = env(), val = k => E.calculate(f[k].value || '0', e, fst()).val.v; const a = val('Start'), b = val('End'), st = val('Step'); if (st === 0 || (b - a) / st < 0 || (b - a) / st > 29) throw new Error('Range ERROR (max 30 rows)');
        S.tab = { Start: f.Start.value, End: f.End.value, Step: f.Step.value }; const ast = E.parse(S.tabF), rows = [];
        for (let k = 0; k <= Math.round((b - a) / st); k++) { const x = a + k * st; let y; try { y = E.evalAst(ast, e, { X: E.V(x) }).v; } catch { y = NaN; } rows.push([x, y]); }
        S.tabRows = rows; S.err = ''; close(); drawAll();
      } catch (x) { S.err = x.message; close(); drawAll(); }
    }));
  });
}

/* ---------- result to the answer box ---------- */
function useResult() {
  const ta = S.ta; if (!ta || ta.disabled) return; let t = '';
  if (S.baseView) t = S.lastStr; else if (S.last && S.last.val) t = show(S.last.val); else if (S.last && S.last.multi) t = S.last.multi.map(([l, v]) => l + ' = ' + show(v)).join(', '); else if (S.last && S.last.text) t = S.last.text; else if (S.lastStr) t = S.lastStr;
  if (!t) return; t = t.replace(/\s+\(.*\)$/, '');
  const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a; ta.value = ta.value.slice(0, a) + t + ta.value.slice(b); const p = a + t.length; ta.setSelectionRange(p, p); ta.dispatchEvent(new Event('input', { bubbles: true })); close(); ta.focus();
}

/* ---------- keypad ---------- */
const K = (l, a, sl, sa, al, aa, c) => ({ l, a, sl, sa, al, aa, c });
const ROWS = [
  [K('SHIFT', 'cmd:shift', '', '', '', '', 'shift fn'), K('ALPHA', 'cmd:alpha', '', '', '', '', 'alpha fn'), K('◀', 'cmd:left', '', 'cmd:home', '', '', 'fn'), K('▶', 'cmd:right', '', 'cmd:end', '', '', 'fn'), K('▲', 'cmd:up', '', '', '', '', 'fn'), K('▼', 'cmd:down', '', '', '', '', 'fn')],
  [K('CALC', 'cmd:calc', 'SOLVE', 'cmd:solve', '=', 'a:=', 'fn'), K('∫', 'a:integ(', 'd/dx', 'a:deriv(', '', '', 'fn'), K('x⁻¹', 'a:⁻¹', 'x!', 'a:!', '', '', 'fn'), K('a/b', 'a:⁄', 'a b/c', 'a:⌐', '', '', 'fn'), K('√', 'a:sqrt(', '³√', 'a:cbrt(', '', '', 'fn'), K('x²', 'a:²', 'x³', 'a:³', '', '', 'fn')],
  [K('^', 'a:^', 'ˣ√', 'a:ˣ√', '', '', 'fn'), K('log', 'a:log(', '10ˣ', 'a:pow10(', '', '', 'fn'), K('ln', 'a:ln(', 'eˣ', 'a:exp(', '', '', 'fn'), K('(−)', 'a:-', '', '', 'A', 'a:A', 'fn'), K('° ′ ″', 'cmd:dms', '►DMS', 'a:►DMS', 'B', 'a:B', 'fn'), K('hyp', 'cmd:hyp', '', '', 'C', 'a:C', 'fn')],
  [K('sin', 'cmd:sin', 'sin⁻¹', 'cmd:asin', 'D', 'a:D', 'fn'), K('cos', 'cmd:cos', 'cos⁻¹', 'cmd:acos', 'E', 'a:E', 'fn'), K('tan', 'cmd:tan', 'tan⁻¹', 'cmd:atan', 'F', 'a:F', 'fn'), K('STO', 'cmd:sto', 'RCL', 'cmd:rcl', '', '', 'fn'), K('ENG', 'cmd:eng', 'i', 'a:i', '', '', 'fn'), K('(', 'a:(', 'Abs', 'a:abs(', '', '', 'fn')],
  [K(')', 'a:)', 'Σ', 'a:sum(', 'X', 'a:X', 'fn'), K('S⇔D', 'cmd:sd', 'DRG►', 'cmd:drg', '', '', 'fn'), K(',', 'a:,', '', '', 'Y', 'a:Y', 'fn'), K('M+', 'cmd:mplus', 'M−', 'cmd:mminus', 'M', 'a:M', 'fn'), K('Pol', 'a:pol(', 'Rec', 'a:rec(', '', '', 'fn'), K('Ran#', 'a:Ran#', 'RanInt', 'a:ranint(', '', '', 'fn')],
  [K('7', 'a:7', 'CONST', 'cmd:const', '', '', 'num'), K('8', 'a:8', 'CONV', 'cmd:conv', '', '', 'num'), K('9', 'a:9', 'CLR', 'cmd:clr', '', '', 'num'), K('DEL', 'cmd:del', 'INS', 'cmd:del', '', '', 'del'), K('AC', 'cmd:ac', 'OFF', 'cmd:close', '', '', 'del'), K('nCr', 'a:nCr', 'nPr', 'a:nPr', '', '', 'fn')],
  [K('4', 'a:4', 'MATRIX', 'cmd:mode:matrix', '', '', 'num'), K('5', 'a:5', 'VECTOR', 'cmd:mode:vector', '', '', 'num'), K('6', 'a:6', '', '', '', '', 'num'), K('×', 'a:*', '', '', '', '', 'op'), K('÷', 'a:/', '', '', '', '', 'op'), K('Rnd', 'a:rnd(', 'Int', 'a:int(', '', '', 'fn')],
  [K('1', 'a:1', 'STAT', 'cmd:mode:stat', '', '', 'num'), K('2', 'a:2', 'CMPLX', 'cmd:mode:cmplx', '', '', 'num'), K('3', 'a:3', 'BASE-N', 'cmd:mode:base', '', '', 'num'), K('+', 'a:+', 'GCD', 'a:gcd(', '', '', 'op'), K('−', 'a:-', 'LCM', 'a:lcm(', '', '', 'op'), K('Fact', 'a:fact(', 'Intg', 'a:intg(', '', '', 'fn')],
  [K('0', 'a:0', 'Ran#', 'a:Ran#', '', '', 'num'), K('.', 'a:.', '', '', '', '', 'num'), K('×10ˣ', 'a:ᴇ', 'π', 'a:π', 'e', 'a:e', 'fn'), K('Ans', 'a:Ans', 'PreAns', 'a:PreAns', '', '', 'fn'), K('=', 'cmd:eq', '', '', '', '', 'eq'), K('π', 'a:π', 'e', 'a:e', '', '', 'fn')]
];
function press(k) {
  const layer = S.shift ? k.sa : S.alpha ? k.aa : k.a; const wasMod = k.a === 'cmd:shift' || k.a === 'cmd:alpha';
  if (!layer) { if (!wasMod) { S.shift = false; S.alpha = false; } status(); return; }
  if (!wasMod) { S.shift = false; S.alpha = false; }
  if (layer.startsWith('a:')) { let s = layer.slice(2); if (s === '►DMS') { insertSuffix('►DMS'); } else { if (S.hyp) S.hyp = false; insert(atom(s)); } }
  else cmd(layer.slice(4), k);
  drawAll();
}
function insertSuffix(s) { if (S.done) { S.done = false; if (S.ans) { S.atoms = [atom('Ans')]; } } S.atoms.push({ s, d: s }); S.caret = S.atoms.length; S.err = ''; }
function cmd(c) {
  const sh = S.shift; // (already cleared by press)
  switch (c) {
    case 'shift': S.shift = !S.shift; S.alpha = false; return;
    case 'alpha': S.alpha = !S.alpha; S.shift = false; return;
    case 'left': S.caret = Math.max(0, S.caret - 1); S.done = false; return; case 'right': S.caret = Math.min(S.atoms.length, S.caret + 1); S.done = false; return;
    case 'home': S.caret = 0; return; case 'end': S.caret = S.atoms.length; return;
    case 'up': { if (S.hpos < S.hist.length - 1) { S.hpos++; recall(); } return; } case 'down': { if (S.hpos > 0) { S.hpos--; recall(); } else if (S.hpos === 0) { S.hpos = -1; clearAll(); } return; }
    case 'del': if (S.done) { S.done = false; S.caret = S.atoms.length; } if (S.caret > 0) { S.atoms.splice(S.caret - 1, 1); S.caret--; } S.err = ''; return;
    case 'ac': clearAll(); S.hyp = false; S.baseView = null; S.tabRows = null; return;
    case 'close': close(); return;
    case 'eq': runExpr(); return;
    case 'hyp': S.hyp = true; return;
    case 'sin': case 'cos': case 'tan': insert(atom((S.hyp ? '' : '') + c + (S.hyp ? 'h' : '') + '(')); S.hyp = false; return;
    case 'asin': case 'acos': case 'atan': insert(atom(c + (S.hyp ? 'h' : '') + '(')); S.hyp = false; return;
    case 'dms': dmsKey(); return;
    case 'sd': S.dec = !S.dec; return;
    case 'eng': if (S.last && S.last.val && S.last.val.v !== undefined) { if (!S.eng) { S.eng = true; S.engOff = 0; } else S.engOff += 1; S.dec = true; } return;
    case 'sto': storePick(); return; case 'rcl': varPicker('RCL — recall variable', v => { insert(atom(v)); drawAll(); }); return;
    case 'mplus': memAdd(1); return; case 'mminus': memAdd(-1); return;
    case 'calc': doCalc(); return; case 'solve': doSolve(); return;
    case 'const': constPicker(); return; case 'conv': convPicker(); return; case 'clr': clrPicker(); return; case 'drg': drgPicker(); return;
    default: if (c.startsWith('mode:')) setMode(c.slice(5));
  }
}
function recall() { const x = S.hist[S.hpos]; if (!x) return; S.atoms = x.atoms.map(a => ({ ...a })); S.caret = S.atoms.length; S.done = false; S.err = ''; S.last = null; S.lastStr = ''; }
function dmsKey() {
  let i = S.caret - 1; while (i >= 0 && /^[0-9.]$/.test(S.atoms[i].s)) i--;
  const prev = i >= 0 ? S.atoms[i].s : ''; const nx = prev === '°' ? '′' : prev === '′' ? '″' : '°'; insert(atom(nx));
}
function storePick() {
  let v = null;
  try { if (S.atoms.length && !S.done) v = E.calculate(src(), env(), fst()).val; else v = S.ans; } catch (x) { S.err = x.message; drawAll(); return; }
  if (!v) return; varPicker('STO — store ' + show(v) + ' in…', k => { S.vars[k] = v.v !== undefined ? v : E.V(v.re); keep(); S.last = { val: v, note: '→ ' + k }; S.lastStr = show(v) + '  → ' + k; S.err = ''; S.done = true; drawAll(); });
}

/* ---------- body layouts ---------- */
function drawAll() { status(); if (!root.hidden) render(); }
function render() {
  const keepScroll = body.scrollTop; body.innerHTML = '';
  const m = S.mode;
  if (m === 'stat') statUI(); else if (m === 'eqn') eqnUI(); else if (m === 'matrix') matUI(); else if (m === 'vector') vecUI(); else exprUI();
  body.scrollTop = keepScroll; useB.hidden = !(S.ta && !S.ta.disabled && ['comp', 'cmplx', 'base', 'table'].includes(S.mode));
  status();
}
function exprUI() {
  const scr = h('div', 'cx-screen'); exprEl = h('div', 'cx-expr'); resEl = h('div', 'cx-res'); exprEl.setAttribute('aria-label', 'Expression'); resEl.setAttribute('aria-live', 'polite'); scr.append(exprEl, resEl);
  if (S.mode === 'base') {
    const row = h('div', 'cx-extra'); [['DEC', 10], ['HEX', 16], ['BIN', 2], ['OCT', 8]].forEach(([t, b]) => row.append(btn(S.base === b ? 'on' : '', t, () => { S.base = b; if (S.baseView && S.ans) S.lastStr = ({ 16: S.baseView[16], 10: S.baseView[10], 8: S.baseView[8], 2: S.baseView[2] })[b]; drawAll(); })));
    [['and', 'and'], ['or', 'or'], ['xor', 'xor'], ['xnor', 'xnor'], ['Not', 'Not('], ['Neg', 'Neg(']].forEach(([t, s]) => row.append(btn('lg', t, () => { insert(atom(s)); drawAll(); })));
    body.append(scr, row);
    if (S.base === 16) { const hx = h('div', 'cx-extra'); 'ABCDEF'.split('').forEach(d => hx.append(btn('hx', d, () => { insert(atom(d)); drawAll(); }))); body.append(hx); }
    histEl = h('div', 'cx-hist'); body.append(histEl);
    if (S.baseView) { const t = h('div', 'cx-basev'); [['HEX', 16], ['DEC', 10], ['OCT', 8], ['BIN', 2]].forEach(([n, b]) => { const r = h('div'); r.append(h('b', null, n), h('span', null, S.baseView[b])); t.append(r); }); body.append(t); }
  } else {
    body.append(scr);
    if (S.mode === 'cmplx') {
      const row = h('div', 'cx-extra'); [['i', 'i'], ['Abs', 'abs('], ['Arg', 'arg('], ['Conj', 'conj('], ['Re', 're('], ['Im', 'im(']].forEach(([t, s]) => row.append(btn('lg', t, () => { insert(atom(s)); drawAll(); })));
      [['►r∠θ', '►r∠θ'], ['►a+bi', '►a+bi']].forEach(([t, s]) => row.append(btn('lg', t, () => { insertSuffix(s); drawAll(); }))); body.append(row);
    }
    if (S.mode === 'table') body.append(h('p', 'cx-note', 'TABLE: type f(X) with the ALPHA key for X, then press =.'));
    histEl = h('div', 'cx-hist'); body.append(histEl);
    if (S.mode === 'table' && S.tabRows) { const t = h('table', 'cx-table'); const tr = h('tr'); tr.append(h('th', null, 'X'), h('th', null, 'f(X)')); t.append(tr); S.tabRows.forEach(([x, y]) => { const r = h('tr'); r.append(h('td', null, E.fmtFloat(x, fst())), h('td', null, Number.isNaN(y) ? 'ERROR' : E.fmtFloat(y, fst()))); t.append(r); }); body.append(t); }
  }
  const pad = h('div', 'cx-pad'); ROWS.forEach(r => r.forEach(k => {
    const b = h('button', 'k ' + k.c); b.type = 'button'; b.setAttribute('aria-label', k.l + (k.sl ? ', shift ' + k.sl : '') + (k.al ? ', alpha ' + k.al : ''));
    if (k.sl) b.append(h('i', 'sl', k.sl)); if (k.al) b.append(h('i', 'al', k.al)); b.append(h('span', 'kl', k.l));
    b.onclick = () => press(k); pad.append(b);
  })); body.append(pad);
  drawScreen();
}

/* ---- small form helpers for the data modes ---- */
const cellVal = t => { t = String(t).trim(); if (t === '') return NaN; try { return E.calculate(t.replace(/×/g, '*').replace(/÷/g, '/'), E.makeEnv({ angle: S.setup.angle }), {}).val.v; } catch { return NaN; } };
function field(val, set, ph, w) { const i = h('input', 'cx-in'); i.type = 'text'; i.inputMode = 'decimal'; i.value = val; if (ph) i.placeholder = ph; if (w) i.style.width = w; i.oninput = () => set(i.value); i.autocomplete = 'off'; return i; }
const seg = (opts, cur, pick) => { const g = h('div', 'cx-seg wrap'); opts.forEach(([t, v]) => g.append(btn(cur === v ? 'on' : '', t, () => { pick(v); }))); return g; };
const fnum = (x, d) => E.smart(x, Object.assign(fst(), { dec: S.dec }));

function statUI() {
  const st = S.stat, two = st.type !== '1var';
  body.append(h('div', 'cx-title', 'STAT'));
  body.append(seg([['1-VAR', '1var'], ['A+BX', 'lin'], ['_+CX²', 'quad'], ['ln X', 'ln'], ['e^X', 'exp'], ['A·B^X', 'ab'], ['A·X^B', 'pow'], ['1/X', 'inv']], st.type, v => { st.type = v; st.out = null; render(); }));
  const tbl = h('div', 'cx-grid3'); tbl.style.gridTemplateColumns = `28px repeat(${1 + (two ? 1 : 0) + (S.setup.freq ? 1 : 0)}, 1fr)`;
  tbl.append(h('b', 'hd', '#'), h('b', 'hd', 'X')); if (two) tbl.append(h('b', 'hd', 'Y')); if (S.setup.freq) tbl.append(h('b', 'hd', 'FREQ'));
  st.rows.forEach((r, i) => { tbl.append(h('span', 'rn', String(i + 1)), field(r.x, v => r.x = v)); if (two) tbl.append(field(r.y, v => r.y = v)); if (S.setup.freq) tbl.append(field(r.f, v => r.f = v)); });
  body.append(tbl);
  const bar = h('div', 'cx-row'); bar.append(btn('btn sm', '+ Row', () => { st.rows.push({ x: '', y: '', f: '1' }); render(); }), btn('btn sm ghost', '− Row', () => { if (st.rows.length > 1) st.rows.pop(); render(); }), btn('btn sm ghost', 'Clear data', () => { st.rows = [{ x: '', y: '', f: '1' }]; st.out = null; render(); }), btn('btn sm', 'Calculate', () => {
    try { const rows = st.rows.map(r => ({ x: cellVal(r.x), y: cellVal(r.y), f: S.setup.freq ? cellVal(r.f) : 1 })).filter(r => !Number.isNaN(r.x)); st.out = E.statCalc(rows, st.type); st.err = ''; } catch (x) { st.out = null; st.err = x.message; } render();
  })); body.append(bar);
  if (st.err) body.append(h('p', 'cx-bad', st.err));
  if (st.out) {
    const o = st.out, L = [['n', o.n], ['x̄', o.mx], ['Σx', o.sx], ['Σx²', o.sx2], ['σx (population)', o.sigx], ['sx (sample)', o.sdx], ['min X', o.min], ['Q1', o.q1], ['Med', o.med], ['Q3', o.q3], ['max X', o.max]];
    if (two) { L.push(['ȳ', o.my], ['Σy', o.sy], ['Σy²', o.sy2], ['Σxy', o.sxy], ['σy', o.sigy], ['sy', o.sdy], ['a', o.a], ['b', o.b]); if (st.type === 'quad') L.push(['c', o.c]); else L.push(['r', o.r]); }
    const tb = h('div', 'cx-results'); L.forEach(([k, v]) => { tb.append(h('b', null, k), h('span', null, v === undefined || Number.isNaN(v) ? '—' : fnum(v))); }); body.append(tb);
    if (two) {
      const est = h('div', 'cx-est'); const xi = field('', () => {}, 'x'), yo = h('b', null, ''), yi = field('', () => {}, 'y'), xo = h('b', null, '');
      xi.oninput = () => { const x = cellVal(xi.value); yo.textContent = Number.isNaN(x) ? '' : 'ŷ = ' + fnum(E.statPredict(o, st.type, x)); };
      yi.oninput = () => { const y = cellVal(yi.value); xo.textContent = Number.isNaN(y) ? '' : 'x̂ = ' + (E.statInverse(o, st.type, y).map(fnum).join(' or ') || 'no real value'); };
      est.append(h('span', null, 'Estimate ŷ from x:'), xi, yo, h('span', null, 'Estimate x̂ from y:'), yi, xo); body.append(est);
    }
  }
}
function eqnUI() {
  const q = S.eqn; body.append(h('div', 'cx-title', 'EQN'));
  body.append(seg([['2 unknowns', 'sim2'], ['3 unknowns', 'sim3'], ['ax²+bx+c=0', 'quad'], ['ax³+bx²+cx+d=0', 'cubic']], q.type, v => { q.type = v; q.out = null; render(); }));
  const names = { sim2: ['a₁', 'b₁', 'c₁', 'a₂', 'b₂', 'c₂'], sim3: ['a₁', 'b₁', 'c₁', 'd₁', 'a₂', 'b₂', 'c₂', 'd₂', 'a₃', 'b₃', 'c₃', 'd₃'], quad: ['a', 'b', 'c'], cubic: ['a', 'b', 'c', 'd'] }[q.type];
  const hint = { sim2: 'a₁x + b₁y = c₁  and  a₂x + b₂y = c₂', sim3: 'a₁x + b₁y + c₁z = d₁  (three equations)', quad: 'ax² + bx + c = 0', cubic: 'ax³ + bx² + cx + d = 0' }[q.type]; body.append(h('p', 'cx-note', hint));
  const g = h('div', 'cx-grid3'); g.style.gridTemplateColumns = q.type === 'sim3' ? 'repeat(4, 1fr)' : q.type === 'sim2' ? 'repeat(3, 1fr)' : `repeat(${names.length}, 1fr)`;
  names.forEach(n => { const w = h('label', 'cx-cell'); w.append(h('small', null, n), field(q.c[q.type + n] || '', v => q.c[q.type + n] = v, '0')); g.append(w); }); body.append(g);
  const bar = h('div', 'cx-row'); bar.append(btn('btn sm', 'Solve', () => {
    const n = names.map(k => cellVal(q.c[q.type + k] ?? '0')).map(x => Number.isNaN(x) ? 0 : x); let out = [];
    try {
      if (q.type === 'sim2') { const s = E.gauss([[n[0], n[1], n[2]], [n[3], n[4], n[5]]]); if (!s) throw new Error('No unique solution'); out = [['x', s[0]], ['y', s[1]]]; }
      else if (q.type === 'sim3') { const s = E.gauss([[n[0], n[1], n[2], n[3]], [n[4], n[5], n[6], n[7]], [n[8], n[9], n[10], n[11]]]); if (!s) throw new Error('No unique solution'); out = [['x', s[0]], ['y', s[1]], ['z', s[2]]]; }
      else { const rs = E.polyRoots(n); out = rs.map((r, i) => ['x' + (i + 1), r]); const D = q.type === 'quad' ? n[1] * n[1] - 4 * n[0] * n[2] : null; if (D !== null) out.push(['Δ', D]); }
      q.out = out; q.err = '';
    } catch (x) { q.out = null; q.err = x.message; } render();
  })); body.append(bar);
  if (q.err) body.append(h('p', 'cx-bad', q.err));
  if (q.out) { const tb = h('div', 'cx-results'); q.out.forEach(([k, v]) => tb.append(h('b', null, k), h('span', null, typeof v === 'number' ? fnum(v) : E.fmtComplex(v, Object.assign(fst(), { polar: false }))))); body.append(tb); }
}
const matText = (M) => M.map(r => r.map(x => fnum(x)).join('  ')).join('\n');
function matGrid(M, readOnly, set) { const g = h('div', 'cx-mat'); g.style.gridTemplateColumns = `repeat(${M[0].length}, 1fr)`; M.forEach((r, i) => r.forEach((x, j) => { if (readOnly) g.append(h('span', 'cx-mc', typeof x === 'number' ? fnum(x) : x)); else g.append(field(x, v => M[i][j] = v, '0')); })); return g; }
function matUI() {
  const m = S.mat; body.append(h('div', 'cx-title', 'MATRIX'));
  ['A', 'B', 'C'].forEach(n => {
    const box = h('div', 'cx-box'); const top = h('div', 'cx-row'); top.append(h('b', null, 'Mat' + n));
    const dimSel = (lbl, cur, pick) => { const s = h('select'); [1, 2, 3].forEach(k => { const o = h('option', null, k); o.value = k; if (k === cur) o.selected = true; s.append(o); }); s.onchange = () => pick(+s.value); const w = h('label', 'cx-dim'); w.append(h('small', null, lbl), s); return w; };
    top.append(dimSel('rows', m[n].length, k => { while (m[n].length < k) m[n].push(Array(m[n][0].length).fill('')); m[n].length = k; render(); }), dimSel('cols', m[n][0].length, k => { m[n].forEach(r => { while (r.length < k) r.push(''); r.length = k; }); render(); })); box.append(top, matGrid(m[n], false)); body.append(box);
  });
  const get = id => { if (id === 'Ans') { if (!m.Ans) throw new Error('No MatAns yet'); return m.Ans; } return m[id].map(r => r.map(x => { const v = cellVal(x === '' ? '0' : x); if (Number.isNaN(v)) throw new Error('Syntax ERROR'); return v; })); };
  const sel = (id) => { const s = h('select', 'cx-sel'); ['A', 'B', 'C', 'Ans'].forEach(k => { const o = h('option', null, 'Mat' + k); o.value = k; s.append(o); }); s.id = id; return s; };
  const l = sel('mL'), r = sel('mR'); r.value = 'B'; const sc = field('', () => {}, 'k'); sc.style.width = '60px';
  const row = h('div', 'cx-row'); row.append(l, r, h('small', null, 'k ='), sc); body.append(row);
  const out = h('div', 'cx-results big'); const res = () => { out.innerHTML = ''; };
  const run = f => { res(); try { const x = f(); if (typeof x === 'number') { out.append(h('b', null, 'Result'), h('span', null, fnum(x))); } else { m.Ans = x; out.append(h('b', null, 'MatAns')); out.append(matGrid(x, true)); } } catch (e) { out.append(h('p', 'cx-bad', e.message)); } };
  const ops = h('div', 'cx-row wrap'); [['L + R', () => E.Mx.add(get(l.value), get(r.value))], ['L − R', () => E.Mx.sub(get(l.value), get(r.value))], ['L × R', () => E.Mx.mul(get(l.value), get(r.value))], ['k × L', () => E.Mx.scale(get(l.value), cellVal(sc.value))], ['det L', () => E.Mx.det(get(l.value))], ['Trn L', () => E.Mx.trn(get(l.value))], ['L⁻¹', () => E.Mx.inv(get(l.value))], ['L²', () => E.Mx.pow(get(l.value), 2)], ['L³', () => E.Mx.pow(get(l.value), 3)]].forEach(([t, f]) => ops.append(btn('btn sm', t, () => run(f)))); body.append(ops, out);
}
function vecUI() {
  const v = S.vec; body.append(h('div', 'cx-title', 'VECTOR'));
  ['A', 'B', 'C'].forEach(n => { const box = h('div', 'cx-box'), top = h('div', 'cx-row'); top.append(h('b', null, 'Vct' + n), seg([['2D', 2], ['3D', 3]], v[n].length, k => { while (v[n].length < k) v[n].push(''); v[n].length = k; render(); })); const g = h('div', 'cx-mat'); g.style.gridTemplateColumns = `repeat(${v[n].length}, 1fr)`; v[n].forEach((x, i) => g.append(field(x, val => v[n][i] = val, '0'))); box.append(top, g); body.append(box); });
  const get = id => { if (id === 'Ans') { if (!v.Ans) throw new Error('No VctAns yet'); return v.Ans; } return v[id].map(x => { const n = cellVal(x === '' ? '0' : x); if (Number.isNaN(n)) throw new Error('Syntax ERROR'); return n; }); };
  const sel = id => { const s = h('select', 'cx-sel'); ['A', 'B', 'C', 'Ans'].forEach(k => { const o = h('option', null, 'Vct' + k); o.value = k; s.append(o); }); return s; };
  const l = sel(), r = sel(); r.value = 'B'; const sc = field('', () => {}, 'k'); sc.style.width = '60px'; const row = h('div', 'cx-row'); row.append(l, r, h('small', null, 'k ='), sc); body.append(row);
  const out = h('div', 'cx-results big');
  const run = f => { out.innerHTML = ''; try { const x = f(); if (typeof x === 'number') out.append(h('b', null, 'Result'), h('span', null, fnum(x))); else { v.Ans = x; out.append(h('b', null, 'VctAns'), h('span', null, '(' + x.map(t => fnum(t)).join(', ') + ')')); } } catch (e) { out.append(h('p', 'cx-bad', e.message)); } };
  const ops = h('div', 'cx-row wrap'); [['L + R', () => E.Vc.add(get(l.value), get(r.value))], ['L − R', () => E.Vc.sub(get(l.value), get(r.value))], ['k × L', () => E.Vc.scale(get(l.value), cellVal(sc.value))], ['L · R', () => E.Vc.dot(get(l.value), get(r.value))], ['L × R', () => E.Vc.cross(get(l.value), get(r.value))], ['Abs L', () => E.Vc.abs(get(l.value))], ['Ang(L,R)', () => E.Vc.ang(get(l.value), get(r.value), S.setup.angle)], ['UnitV(L)', () => E.Vc.unit(get(l.value))]].forEach(([t, f]) => ops.append(btn('btn sm', t, () => run(f)))); body.append(ops, out);
}

/* ---------- mode switch, hardware keys, open / close ---------- */
function setMode(id) { S.mode = id; S.shift = S.alpha = S.hyp = false; clearAll(); S.baseView = null; S.tabRows = null; S.base = 10; const o = $('.cx-ov', root); if (o) o.remove(); drawAll(); }
function open(ta) { S.ta = ta || S.ta; S.open = true; root.hidden = false; document.body.classList.add('cx-on'); render(); }
function close() { S.open = false; root.hidden = true; document.body.classList.remove('cx-on'); const o = $('.cx-ov', root); if (o) o.remove(); keep(); }
document.addEventListener('keydown', e => {
  if (!S.open) return; if (e.key === 'Escape') { const o = $('.cx-ov', root); if (o) o.remove(); else close(); return; }
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName) && root.contains(document.activeElement)) return;
  if (S.mode === 'stat' || S.mode === 'eqn' || S.mode === 'matrix' || S.mode === 'vector') return;
  const k = e.key; let a = null;
  if (/^[0-9.]$/.test(k)) a = atom(k); else if (k === '+') a = atom('+'); else if (k === '-') a = atom('-'); else if (k === '*') a = atom('*'); else if (k === '/') a = atom('/'); else if (k === '^') a = atom('^'); else if (k === '(' || k === ')' || k === ',') a = atom(k);
  if (a) { insert(a); drawAll(); e.preventDefault(); } else if (k === 'Enter' || k === '=') { cmd('eq'); drawAll(); e.preventDefault(); } else if (k === 'Backspace') { cmd('del'); drawAll(); e.preventDefault(); } else if (k === 'ArrowLeft') { cmd('left'); drawAll(); } else if (k === 'ArrowRight') { cmd('right'); drawAll(); } else if (k === 'ArrowUp') { cmd('up'); drawAll(); } else if (k === 'ArrowDown') { cmd('down'); drawAll(); }
});
window.Calc = { open, close, isOpen: () => S.open, _state: S };
})();
