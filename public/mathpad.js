/* Maths keyboard for theory answers. The calculator itself lives in calcui.js. */
/* ---------- user interface (browser only) ---------- */
if (typeof document !== 'undefined') (() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const save = (k, v) => { try { localStorage.setItem(k, v); } catch {} }, load = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const MATHY = /math|physic|chem|further|statist|account|econ|science|calcul/i;

  let lastTA = null, kbOpen = false, ctx = null;   // ctx = { label, box } while a quiz is on screen

  /* put text into the answer box at the cursor */
  function insert(ta, text, back = 0) {
    if (!ta) return; const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a;
    ta.value = ta.value.slice(0, a) + text + ta.value.slice(b);
    const pos = a + text.length - back; ta.setSelectionRange(pos, pos); ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function backspace(ta) {
    if (!ta) return; let a = ta.selectionStart ?? 0; const b = ta.selectionEnd ?? a;
    if (a === b) { if (!a) return; ta.value = ta.value.slice(0, a - 1) + ta.value.slice(b); a--; } else ta.value = ta.value.slice(0, a) + ta.value.slice(b);
    ta.setSelectionRange(a, a); ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const move = (ta, d) => { if (!ta) return; const p = Math.max(0, Math.min(ta.value.length, (ta.selectionStart ?? 0) + d)); ta.setSelectionRange(p, p); };

  /* ---------- keyboard: same key layout as the Casio fx-991ES PLUS (SHIFT and ALPHA included) ---------- */
  const K = (l, a, sl, sa, al, aa, c) => ({ l, a, sl, sa, al, aa, c });
  const KEYS = [
    [K('SHIFT', 'cmd:shift', '', '', '', '', 'shift fn'), K('ALPHA', 'cmd:alpha', '', '', '', '', 'alpha fn'), K('◀', 'cmd:left', '', 'cmd:home', '', '', 'fn'), K('▶', 'cmd:right', '', 'cmd:end', '', '', 'fn'), K('▲', 'cmd:up', '', '', '', '', 'fn'), K('▼', 'cmd:down', '', '', '', '', 'fn')],
    [K('CALC', '=', 'SOLVE', '≈', '=', '=', 'fn'), K('∫', '∫(', 'd/dx', 'd/dx(', '', '', 'fn'), K('x⁻¹', '⁻¹', 'x!', '!', '', '', 'fn'), K('a/b', '/', 'a b/c', ' ', '', '', 'fn'), K('√', '√(', '³√', '³√(', '', '', 'fn'), K('x²', '²', 'x³', '³', '', '', 'fn')],
    [K('^', '^', 'ˣ√', 'ˣ√(', '', '', 'fn'), K('log', 'log(', '10ˣ', '10^(', '', '', 'fn'), K('ln', 'ln(', 'eˣ', 'e^(', '', '', 'fn'), K('(−)', '-', '', '', 'A', 'A', 'fn'), K('° ′ ″', 'cmd:dms', '►DMS', '►DMS', 'B', 'B', 'fn'), K('hyp', 'cmd:hyp', '', '', 'C', 'C', 'fn hyp')],
    [K('sin', 'cmd:sin', 'sin⁻¹', 'cmd:asin', 'D', 'D', 'fn'), K('cos', 'cmd:cos', 'cos⁻¹', 'cmd:acos', 'E', 'E', 'fn'), K('tan', 'cmd:tan', 'tan⁻¹', 'cmd:atan', 'F', 'F', 'fn'), K('STO', '→', 'RCL', 'Ans', '', '', 'fn'), K('ENG', '×10^', 'i', 'i', '', '', 'fn'), K('(', '(', 'Abs', 'Abs(', '', '', 'fn')],
    [K(')', ')', 'Σ', 'Σ(', 'X', 'X', 'fn'), K('S⇔D', '≈', 'DRG►', 'ʳ', '', '', 'fn'), K(',', ',', '', '', 'Y', 'Y', 'fn'), K('M+', 'M+', 'M−', 'M−', 'M', 'M', 'fn'), K('Pol', 'Pol(', 'Rec', 'Rec(', '', '', 'fn'), K('Ran#', 'Ran#', 'RanInt', 'RanInt(', '', '', 'fn')],
    [K('7', '7', 'CONST', 'cmd:const', '', '', 'num'), K('8', '8', 'CONV', '→', '', '', 'num'), K('9', '9', 'CLR', 'cmd:ac', '', '', 'num'), K('DEL', 'bs', 'INS', 'bs', '', '', 'del'), K('AC', 'cmd:ac', 'OFF', 'cmd:off', '', '', 'del'), K('nCr', 'nCr', 'nPr', 'nPr', '', '', 'fn')],
    [K('4', '4', 'MATRIX', '[', '', '', 'num'), K('5', '5', 'VECTOR', ']', '', '', 'num'), K('6', '6', '', '', '', '', 'num'), K('×', '×', '·', '·', '', '', 'op'), K('÷', '÷', '/', '/', '', '', 'op'), K('Rnd', 'Rnd(', 'Int', 'Int(', '', '', 'fn')],
    [K('1', '1', 'STAT', 'x̄', '', '', 'num'), K('2', '2', 'CMPLX', 'σ', '', '', 'num'), K('3', '3', 'BASE-N', 'Σ', '', '', 'num'), K('+', '+', 'GCD', 'GCD(', '', '', 'op'), K('−', '-', 'LCM', 'LCM(', '', '', 'op'), K('Fact', 'Fact(', 'Intg', 'Intg(', '', '', 'fn')],
    [K('0', '0', 'Ran#', 'Ran#', '', '', 'num'), K('.', '.', '', ':', '', '', 'num'), K('×10ˣ', '×10^', 'π', 'π', 'e', 'e', 'fn'), K('Ans', 'Ans', 'PreAns', 'PreAns', '', '', 'fn'), K('=', '=', '', '', '', '', 'eq'), K('π', 'π', 'e', 'e', '', '', 'fn')]
  ];
  const SYMS = [
    ['<', '>', '≤', '≥', '≠', '≈'], ['±', '∞', 'θ', 'α', 'β', 'Δ'], ['∠', '△', '⊥', '∥', '≅', '∝'], ['∪', '∩', '∈', '∉', '⊂', '∅'], ['ℝ', 'ℤ', 'ℕ', 'ℚ', '|', '%'],
    ['{', '}', '[', ']', '°', '∴'], ['→', '⇒', '⇔', ':', ';', '!'], ['x', 'y', 'z', 'a', 'b', 'c'], ['n', 'm', 'k', 'h', 'r', 't'], ['p', 'q', 'u', 'v', 'w', 'd']
  ];
  const CONSTS = (window.CalcEngine && window.CalcEngine.CONSTS) || [];
  const pad = mk('div', 'mathpad'); pad.hidden = true; pad.setAttribute('role', 'group'); pad.setAttribute('aria-label', 'Maths keyboard');
  const grid = mk('div', 'cx-pad mp-pad'), bar = mk('div', 'mp-bar'); pad.append(grid, bar);
  let page = 'fx', rep, shift = false, alpha = false, hyp = false;
  const lineBounds = ta => { const v = ta.value, p = ta.selectionStart ?? v.length; const s = v.lastIndexOf('\n', p - 1) + 1; let e = v.indexOf('\n', p); if (e < 0) e = v.length; return [s, e]; };
  function moveLine(ta, d) { const v = ta.value, p = ta.selectionStart ?? 0, [s, e] = lineBounds(ta), col = p - s; if (d < 0) { if (!s) return ta.setSelectionRange(0, 0); const ps = v.lastIndexOf('\n', s - 2) + 1; ta.setSelectionRange(Math.min(ps + col, s - 1), Math.min(ps + col, s - 1)); } else { if (e >= v.length) return ta.setSelectionRange(v.length, v.length); let ne = v.indexOf('\n', e + 1); if (ne < 0) ne = v.length; const q = Math.min(e + 1 + col, ne); ta.setSelectionRange(q, q); } }
  function dmsMark(ta) { const v = ta.value, p = ta.selectionStart ?? v.length; let i = p - 1; while (i >= 0 && /[0-9.]/.test(v[i])) i--; const prev = i >= 0 ? v[i] : ''; return prev === '°' ? '′' : prev === '′' ? '″' : '°'; }
  function clearLine(ta) { const v = ta.value, [s, e] = lineBounds(ta); ta.value = v.slice(0, s) + v.slice(e); ta.setSelectionRange(s, s); ta.dispatchEvent(new Event('input', { bubbles: true })); }
  function act(val) {
    const ta = lastTA; if (!ta) return;
    if (val === 'shift') { shift = !shift; alpha = false; return syncMods(); }
    if (val === 'alpha') { alpha = !alpha; shift = false; return syncMods(); }
    const wasShift = shift; shift = false; alpha = false;
    if (val === 'bs') backspace(ta);
    else if (val.startsWith('cmd:')) {
      const c = val.slice(4);
      if (c === 'left') move(ta, -1); else if (c === 'right') move(ta, 1); else if (c === 'home') ta.setSelectionRange(lineBounds(ta)[0], lineBounds(ta)[0]); else if (c === 'end') ta.setSelectionRange(lineBounds(ta)[1], lineBounds(ta)[1]);
      else if (c === 'up') moveLine(ta, -1); else if (c === 'down') moveLine(ta, 1);
      else if (c === 'ac') clearLine(ta); else if (c === 'off') closeKb(true);
      else if (c === 'hyp') hyp = true;
      else if (c === 'dms') insert(ta, dmsMark(ta));
      else if (c === 'const') constList();
      else if (/^a?(sin|cos|tan)$/.test(c)) { insert(ta, (c[0] === 'a' && c.length === 4 ? c.slice(1) + '⁻¹' + (hyp ? 'h' : '') : c + (hyp ? 'h' : '')) + '('); hyp = false; }
    } else { insert(ta, val); hyp = false; }
    syncMods();
  }
  function syncMods() { $$('.k.shift', pad).forEach(b => b.classList.toggle('on', shift)); $$('.k.alpha', pad).forEach(b => b.classList.toggle('on', alpha)); $$('.k.hyp', pad).forEach(b => b.classList.toggle('on', hyp)); pad.classList.toggle('is-shift', shift); pad.classList.toggle('is-alpha', alpha); }
  function hook(b, val, repeat) {
    b.addEventListener('pointerdown', e => { e.preventDefault(); act(val); if (repeat) { clearTimeout(rep); rep = setTimeout(function again() { act(val); rep = setTimeout(again, 70); }, 380); } });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => clearTimeout(rep)));
    b.addEventListener('click', e => { if (e.detail === 0) act(val); });   // keyboard users (Enter or Space)
  }
  function barKey(label, val, cls, aria) {
    const b = mk('button', 'mk bar ' + (cls || ''), label); b.type = 'button'; b.setAttribute('aria-label', aria || label);
    const go = () => { if (val === 'page') { page = page === 'fx' ? 'sym' : 'fx'; draw(); } else if (val === 'abc') setMode(false); else if (val === 'calc') openCalc(); else if (val === 'done') closeKb(true); else if (val === 'space') insert(lastTA, ' '); else if (val === 'enter') insert(lastTA, '\n'); else if (val === 'bs') backspace(lastTA); };
    b.addEventListener('pointerdown', e => { e.preventDefault(); go(); if (val === 'bs') { clearTimeout(rep); rep = setTimeout(function again() { go(); rep = setTimeout(again, 70); }, 380); } });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => clearTimeout(rep)));
    b.addEventListener('click', e => { if (e.detail === 0) go(); });
    return b;
  }
  function draw() {
    grid.innerHTML = ''; bar.innerHTML = ''; shift = alpha = hyp = false;
    if (page === 'fx') KEYS.forEach(r => r.forEach(k => {
      const b = mk('button', 'k ' + k.c); b.type = 'button'; b.setAttribute('aria-label', k.l + (k.sl ? ', shift ' + k.sl : '') + (k.al ? ', alpha ' + k.al : ''));
      if (k.sl) b.append(mk('i', 'sl', k.sl)); if (k.al) b.append(mk('i', 'al', k.al)); b.append(mk('span', 'kl', k.l));
      const rpt = k.a === 'bs'; const shifted = () => (shift && k.sa) ? k.sa : (alpha && k.aa) ? k.aa : (shift || alpha) ? null : k.a;
      b.addEventListener('pointerdown', e => { e.preventDefault(); const v = (k.a === 'cmd:shift' || k.a === 'cmd:alpha') ? k.a.slice(4) : shifted(); if (v == null) { shift = alpha = false; syncMods(); return; } act(v); if (rpt) { clearTimeout(rep); rep = setTimeout(function again() { act('bs'); rep = setTimeout(again, 70); }, 380); } });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => clearTimeout(rep)));
      b.addEventListener('click', e => { if (e.detail === 0) { const v = (k.a === 'cmd:shift' || k.a === 'cmd:alpha') ? k.a.slice(4) : shifted(); if (v != null) act(v); } });
      grid.append(b);
    }));
    else SYMS.forEach(r => r.forEach(sy => { const b = mk('button', 'k num', ''); b.type = 'button'; b.append(mk('span', 'kl', sy)); b.setAttribute('aria-label', sy); hook(b, sy); grid.append(b); }));
    [['ABC', 'abc', 'wide'], [page === 'fx' ? 'Symbols' : 'f(x)', 'page', 'wide'], ['🧮', 'calc', '', 'Calculator'], ['space', 'space', 'space'], ['⏎', 'enter', '', 'New line'], ['⌫', 'bs', '', 'Backspace'], ['Done', 'done', 'done']].forEach(([l, v, c, a]) => bar.append(barKey(l, v, c, a)));
  }
  function constList() {
    let o = $('.mp-ov', pad); if (o) o.remove(); o = mk('div', 'mp-ov'); const t = mk('div', 'mp-ovh'); t.append(mk('b', null, 'CONST: physical constants')); const x = mk('button', 'mk bar', '✕'); x.type = 'button'; x.addEventListener('pointerdown', e => { e.preventDefault(); o.remove(); }); t.append(x); o.append(t);
    CONSTS.forEach(([sy, name, v], i) => { const b = mk('button', 'mp-li'); b.type = 'button'; b.append(mk('b', null, String(i + 1).padStart(2, '0') + '  ' + sy), mk('span', null, name), mk('small', null, String(v))); b.addEventListener('pointerdown', e => { e.preventDefault(); insert(lastTA, sy); o.remove(); }); o.append(b); });
    pad.append(o);
  }
  draw(); document.body.append(pad);

  function openKb() {
    closeCalc(); kbOpen = true; pad.hidden = false; document.body.classList.add('kp'); fab.hidden = true;
    setTimeout(() => lastTA && lastTA.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
  }
  function closeKb(blur) { kbOpen = false; pad.hidden = true; document.body.classList.remove('kp'); if (blur && lastTA) lastTA.blur(); syncFab(); }

  /* ---------- per-answer-box switch between the normal and the maths keyboard ---------- */
  const modeFor = label => { const p = load('kbpref'); return p ? p === 'math' : MATHY.test(label || ''); };
  function applyMode(ta, math) {
    ta.dataset.kb = math ? 'math' : 'abc'; ta.setAttribute('inputmode', math ? 'none' : 'text');
    const t = ta.parentElement && $('.kbtoggle', ta.parentElement); if (t) t.textContent = math ? '⌨ Switch to normal keyboard' : '√ Switch to maths keyboard';
  }
  function setMode(math) {
    save('kbpref', math ? 'math' : 'abc');
    const ta = lastTA; $$('textarea.ans').forEach(x => { if (!x.disabled) applyMode(x, math); });
    if (!math) closeKb(false); if (ta && !ta.disabled) { ta.blur(); setTimeout(() => { ta.focus(); }, 30); }
  }
  function attach(ta, label) {
    const row = mk('div', 'kbrow'), t = mk('button', 'kbtoggle'); t.type = 'button';
    t.onclick = () => setMode(ta.dataset.kb !== 'math'); row.append(t);
    const c = mk('button', 'kbcalc', '🧮 Calculator'); c.type = 'button'; c.onclick = () => { lastTA = ta; openCalc(); }; row.append(c);
    ta.after(row); applyMode(ta, modeFor(label));
    ta.addEventListener('focus', () => { lastTA = ta; if (ta.dataset.kb === 'math') openKb(); else closeKb(false); });
    ta.addEventListener('blur', () => setTimeout(() => { if (kbOpen && document.activeElement !== lastTA && !pad.contains(document.activeElement) && !($$('textarea.ans').includes(document.activeElement))) closeKb(false); }, 180));
  }

    /* ---------- calculator hooks (calcui.js) ---------- */
  const calcOpen = () => !!(window.Calc && window.Calc.isOpen());
  function openCalc() { closeKb(false); if (window.Calc) window.Calc.open(lastTA); fab.hidden = true; }
  function closeCalc() { if (window.Calc) window.Calc.close(); syncFab(); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !calcOpen() && kbOpen) closeKb(true); });

/* ---------- floating calculator button while a maths quiz is on screen ---------- */
  const fab = mk('button', 'calcfab', '🧮'); fab.type = 'button'; fab.hidden = true; fab.setAttribute('aria-label', 'Open calculator'); fab.onclick = openCalc; document.body.append(fab);
  function visible(box) { return !!(box && box.offsetParent !== null && box.querySelector('.q')); }
  function syncFab() { fab.hidden = !(ctx && MATHY.test(ctx.label) && visible(ctx.box) && !kbOpen && !calcOpen()); if (!visible(ctx && ctx.box)) { if (kbOpen) closeKb(false); } }
  setInterval(syncFab, 500);

  window.MathPad = { attach, setContext(label, box) { ctx = label == null ? null : { label, box }; syncFab(); } };
})();
