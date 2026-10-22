/* Scientific calculator engine modelled on the Casio fx-991ES PLUS.
   Pure functions, no eval(). Works in the browser (window.Calc) and in Node (module.exports). */
(function (g) {
  'use strict';
  const PI = Math.PI;
  class CalcError extends Error { }
  const merr = (m) => new CalcError(m || 'Math ERROR'), serr = () => new CalcError('Syntax ERROR');
  const Z = (r, i = 0) => ({ r, i });
  const real = a => Math.abs(a.i) <= 1e-13 * Math.max(1, Math.abs(a.r));
  const cadd = (a, b) => Z(a.r + b.r, a.i + b.i), csub = (a, b) => Z(a.r - b.r, a.i - b.i), cmul = (a, b) => Z(a.r * b.r - a.i * b.i, a.r * b.i + a.i * b.r);
  const cdiv = (a, b) => { const d = b.r * b.r + b.i * b.i; if (d === 0) throw merr(); return Z((a.r * b.r + a.i * b.i) / d, (a.i * b.r - a.r * b.i) / d); };
  const cabs = a => Math.hypot(a.r, a.i), carg = a => Math.atan2(a.i, a.r);
  const cexp = a => { const m = Math.exp(a.r); return Z(m * Math.cos(a.i), m * Math.sin(a.i)); };
  const cln = a => { if (a.r === 0 && a.i === 0) throw merr(); return Z(Math.log(cabs(a)), carg(a)); };
  const csqrt = a => { const m = cabs(a), r = Math.sqrt((m + a.r) / 2), i = Math.sqrt(Math.max(0, (m - a.r) / 2)); return Z(r, a.i < 0 ? -i : i); };
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  function ratio(y, maxD = 1000) { // small fraction close to y
    if (!isFinite(y)) return null; let h1 = 1, h0 = 0, k1 = 0, k0 = 1, x = Math.abs(y);
    for (let n = 0; n < 40; n++) {
      const a = Math.floor(x), h = a * h1 + h0, k = a * k1 + k0; if (k > maxD) return null;
      h0 = h1; h1 = h; k0 = k1; k1 = k;
      if (Math.abs(Math.abs(y) - h / k) <= 1e-12 * Math.max(1, Math.abs(y))) return [Math.sign(y) * h, k];
      const fr = x - a; if (fr < 1e-15) return null; x = 1 / fr;
    } return null;
  }
  function cpow(a, b) {
    if (real(a) && real(b)) {
      const x = a.r, y = b.r;
      if (x === 0) { if (y > 0) return Z(0); throw merr(); }
      if (x > 0 || Number.isInteger(y)) return Z(Math.pow(x, y));
      const fr = ratio(y); if (fr && fr[1] % 2 === 1) return Z((fr[0] % 2 === 0 ? 1 : -1) * Math.pow(-x, y));
    }
    if (a.r === 0 && a.i === 0) return Z(0);
    return cexp(cmul(b, cln(a)));
  }
  const clean = v => (Math.abs(v) < 1e-300 ? 0 : Number(v.toPrecision(15)));
  const toRad = (x, ang) => ang === 'deg' ? x * PI / 180 : ang === 'gra' ? x * PI / 200 : x;
  const fromRad = (x, ang) => ang === 'deg' ? x * 180 / PI : ang === 'gra' ? x * 200 / PI : x;

  function trig(f, x, ang) {
    if (ang !== 'rad') {
      const full = ang === 'deg' ? 360 : 400, q = full / 4, t = ((x % full) + full) % full;
      if (t % q === 0) { const k = t / q;
        if (f === 'sin') return [0, 1, 0, -1][k]; if (f === 'cos') return [1, 0, -1, 0][k];
        if (k % 2) throw merr(); return 0; }
    }
    const r = toRad(x, ang);
    if (f === 'tan') { if (Math.abs(Math.cos(r)) < 1e-14) throw merr(); return Math.tan(r); }
    const v = f === 'sin' ? Math.sin(r) : Math.cos(r); return Math.abs(v) < 1e-14 ? 0 : v;
  }
  const NAMES = ['sinh⁻¹', 'cosh⁻¹', 'tanh⁻¹', 'sin⁻¹', 'cos⁻¹', 'tan⁻¹', 'sinh', 'cosh', 'tanh', 'sin', 'cos', 'tan', 'logb', 'log', 'ln', 'Abs', 'Pol', 'Rec', 'RanInt#', 'Ran#', 'Ans', 'Rnd', 'Intg', 'Int', 'GCD', 'LCM', 'Conjg', 'Arg', 'ReP', 'ImP', 'nCr', 'nPr', 'd/dx', '∫', 'Σ', '√', '∛', 'ˣ√', 'π', '∠', 'e', 'i'];
  const ALIAS = { 'sinh⁻¹': 'asinh', 'cosh⁻¹': 'acosh', 'tanh⁻¹': 'atanh', 'sin⁻¹': 'asin', 'cos⁻¹': 'acos', 'tan⁻¹': 'atan', '√': 'sqrt', '∛': 'cbrt', 'd/dx': 'deriv', '∫': 'integ', 'Σ': 'sigma', 'RanInt#': 'ranint', 'Ran#': 'ran', 'π': 'pi', 'ˣ√': 'rt', 'Abs': 'abs' };
  const FN = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'log', 'logb', 'ln', 'abs', 'Pol', 'Rec', 'ranint', 'Rnd', 'Int', 'Intg', 'GCD', 'LCM', 'Conjg', 'Arg', 'ReP', 'ImP', 'deriv', 'integ', 'sigma', 'sqrt', 'cbrt']);
  const INFIX = new Set(['nCr', 'nPr', '∠', 'rt']);
  const VARS = 'ABCDEFXYM';

  function tokenize(src, cx) {
    const s = String(src).replace(/−|–/g, '-').replace(/×|·|\*/g, '*').replace(/÷/g, '/').replace(/²/g, '^2').replace(/³/g, '^3').replace(/(sinh|cosh|tanh|sin|cos|tan)⁻¹/g, '$1§').replace(/⁻¹/g, '^(-1)').replace(/§/g, '⁻¹');
    // note: x⁻¹ after a name like sin is part of the name; handled by NAMES longest-first below.
    const out = []; let i = 0;
    const rest = () => s.slice(i);
    while (i < s.length) {
      const c = s[i];
      if (c === ' ') { i++; continue; }
      let m;
      if ((m = /^(\d+\.?\d*|\.\d+)°(?:(\d+\.?\d*)′)?(?:(\d+\.?\d*)″)?/.exec(rest())) && /°/.test(m[0])) { out.push({ t: 'num', v: parseFloat(m[1]) + (m[2] ? parseFloat(m[2]) / 60 : 0) + (m[3] ? parseFloat(m[3]) / 3600 : 0), dms: true }); i += m[0].length; continue; }
      if ((m = /^(\d+)⌟(\d+)⌟(\d+)/.exec(rest()))) { if (+m[3] === 0) throw merr(); out.push({ t: 'num', v: +m[1] + +m[2] / +m[3] }); i += m[0].length; continue; }
      if ((m = /^(\d+)⌟(\d+)/.exec(rest()))) { if (+m[2] === 0) throw merr(); out.push({ t: 'num', v: +m[1] / +m[2] }); i += m[0].length; continue; }
      if ((m = /^(\d+\.?\d*|\.\d+)(?:ᴇ(-?\d+))?/.exec(rest()))) { out.push({ t: 'num', v: parseFloat(m[1] + (m[2] ? 'e' + m[2] : '')) }); i += m[0].length; continue; }
      if ('+-*/^()!%,'.includes(c)) { out.push({ t: c }); i++; continue; }
      const nm = NAMES.find(n => rest().startsWith(n));
      if (nm) {
        i += nm.length; const id = ALIAS[nm] || nm;
        if (INFIX.has(id)) out.push({ t: 'op', v: id });
        else if (id === 'pi') out.push({ t: 'const', v: 'pi' }); else if (id === 'e' || id === 'i' || id === 'Ans' || id === 'ran') out.push({ t: 'const', v: id });
        else out.push({ t: 'fn', v: id });
        if (id === 'ran') { out[out.length - 1].t = 'const'; }
        continue;
      }
      if (VARS.includes(c)) { out.push({ t: 'var', v: c }); i++; continue; }
      throw serr();
    }
    const res = [];
    out.forEach(tk => {
      const a = res[res.length - 1];
      const left = a && (a.t === 'num' || a.t === ')' || a.t === 'const' || a.t === 'var' || a.t === '!' || a.t === '%');
      const right = tk.t === 'num' || tk.t === '(' || tk.t === 'fn' || tk.t === 'const' || tk.t === 'var';
      if (left && right) res.push({ t: '*' });
      res.push(tk);
    });
    return res;
  }

  function adaptive(f, a, b, eps) {
    const simpson = (fa, fm, fb, a, b) => (b - a) / 6 * (fa + 4 * fm + fb);
    const rec = (a, b, fa, fm, fb, whole, eps, d) => {
      const m = (a + b) / 2, lm = (a + m) / 2, rm = (m + b) / 2, flm = f(lm), frm = f(rm);
      const l = simpson(fa, flm, fm, a, m), r = simpson(fm, frm, fb, m, b);
      if (d <= 0 || Math.abs(l + r - whole) <= 15 * eps) return l + r + (l + r - whole) / 15;
      return rec(a, m, fa, flm, fm, l, eps / 2, d - 1) + rec(m, b, fm, frm, fb, r, eps / 2, d - 1);
    };
    // split in 8 panels first so that functions like sin on [0, 2π] are not fooled
    let tot = 0, N = 8, h = (b - a) / N;
    for (let k = 0; k < N; k++) { const x0 = a + k * h, x1 = x0 + h, xm = (x0 + x1) / 2, f0 = f(x0), fm = f(xm), f1 = f(x1); tot += rec(x0, x1, f0, fm, f1, simpson(f0, fm, f1, x0, x1), eps / N, 22); }
    return tot;
  }

  function evaluate(src, opt = {}) {
    const env = { ang: opt.ang || 'deg', cx: !!opt.cx, vars: opt.vars || {}, ans: opt.ans || Z(0), set: opt.set || {} };
    const toks = typeof src === 'string' ? tokenize(src, env.cx) : src;
    const ctx = { multi: null, span: null };
    const v = run(toks, env, ctx);
    if (ctx.multi && ctx.span && ctx.span[0] === 0 && ctx.span[1] === toks.length) return { multi: ctx.multi };
    return finish(v, env);
  }
  function finish(v, env) {
    let r = clean(v.r), i = clean(v.i);
    if (Math.abs(r) <= 1e-13 * Math.abs(i)) r = 0; if (Math.abs(i) <= 1e-13 * Math.abs(r)) i = 0;
    if (!isFinite(r) || !isFinite(i)) throw merr();
    if (Math.abs(i) <= 1e-13 * Math.max(1, Math.abs(r))) return Z(r, 0);
    if (!env.cx) throw merr();
    return Z(r, i);
  }
  const R = (x) => Z(x);
  function realOf(z) { if (!real(z)) throw merr(); return z.r; }

  function run(toks, env, ctx) {
    let p = 0; const peek = () => toks[p], eat = t => { if (peek() && peek().t === t) { p++; return true; } return false; };
    const isOp = v => peek() && peek().t === 'op' && peek().v === v;
    const sub = (slice, vars) => run(slice, vars ? { ...env, vars: { ...env.vars, ...vars } } : env, ctx);
    const fact = n => { if (n < 0 || !Number.isInteger(n) || n > 69) throw merr(); let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; };
    function expr() { let v = term(); for (;;) { if (eat('+')) v = cadd(v, term()); else if (eat('-')) v = csub(v, term()); else return v; } }
    function term() { let v = unary(); for (;;) { if (eat('*')) v = cmul(v, unary()); else if (eat('/')) v = cdiv(v, unary()); else return v; } }
    function unary() { if (eat('-')) { const v = unary(); return Z(-v.r, -v.i); } if (eat('+')) return unary(); return power(); }
    function power() {
      let b = postfix();
      for (;;) {
        if (eat('^')) { b = cpow(b, unaryExp()); continue; }
        if (isOp('rt')) { p++; const x = postfix(); b = cpow(x, cdiv(Z(1), b)); continue; }
        if (isOp('nCr') || isOp('nPr')) {
          const w = peek().v; p++; const k = realOf(postfix()), n = realOf(b);
          if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || n < k || n < 0 || n >= 1e10) throw merr();
          let x = 1; if (w === 'nCr') { const kk = Math.min(k, n - k); for (let j = 1; j <= kk; j++) x = x * (n - kk + j) / j; x = Math.round(x); } else for (let j = 0; j < k; j++) x *= n - j;
          b = Z(x); continue;
        }
        if (isOp('∠')) { p++; const th = toRad(realOf(postfix()), env.ang); b = cmul(b, Z(Math.cos(th), Math.sin(th))); continue; }
        return b;
      }
    }
    function unaryExp() { if (eat('-')) { const v = unaryExp(); return Z(-v.r, -v.i); } if (eat('+')) return unaryExp(); return power(); }
    function postfix() { let v = primary(); for (;;) { if (eat('!')) v = Z(fact(realOf(v))); else if (eat('%')) v = Z(v.r / 100, v.i / 100); else return v; } }
    function group() { if (!eat('(')) return null; let d = 1, start = p; while (p < toks.length && d) { if (toks[p].t === '(') d++; else if (toks[p].t === ')') d--; p++; } const end = d ? p : p - 1; return toks.slice(start, end); }
    function split(sl) { const out = [[]]; let d = 0; sl.forEach(t => { if (t.t === '(') d++; if (t.t === ')') d--; if (t.t === ',' && !d) out.push([]); else out[out.length - 1].push(t); }); return out; }
    function primary() {
      const t = peek(); if (!t) throw serr();
      if (t.t === 'num') { p++; return Z(t.v); }
      if (t.t === 'const') {
        p++;
        if (t.v === 'pi') return Z(PI); if (t.v === 'e') return Z(Math.E);
        if (t.v === 'i') { if (!env.cx) throw serr(); return Z(0, 1); }
        if (t.v === 'ran') return Z(Math.floor(Math.random() * 1000) / 1000);
        return env.ans;
      }
      if (t.t === 'var') { p++; const v = env.vars[t.v]; return v ? (typeof v === 'number' ? Z(v) : v) : Z(0); }
      if (t.t === '(') { p++; const v = expr(); if (!eat(')')) { if (p >= toks.length) return v; throw serr(); } return v; }
      if (t.t === 'fn') {
        const start = p; p++;
        if (['integ', 'deriv', 'sigma'].includes(t.v)) {
          const sl = group(); if (!sl) throw serr(); const a = split(sl);
          if (t.v === 'sigma') { const rng = a.length === 4 ? a.slice(2) : a.slice(1); if (rng.length !== 2) throw serr(); const lo = Math.round(realOf(sub(rng[0]))), hi = Math.round(realOf(sub(rng[1]))); if (hi - lo > 100000) throw merr(); let s = Z(0); for (let x = lo; x <= hi; x++) s = cadd(s, sub(a[0], { X: Z(x) })); return s; }
          if (t.v === 'deriv') { if (a.length < 2) throw serr(); const x0 = realOf(sub(a[1])), h = Math.max(Math.abs(x0), 1) * 1e-3, f = x => realOf(sub(a[0], { X: Z(x) })); const d = (-f(x0 + 2 * h) + 8 * f(x0 + h) - 8 * f(x0 - h) + f(x0 - 2 * h)) / (12 * h); return Z(Number(d.toPrecision(9))); }
          if (a.length < 3) throw serr(); const lo = realOf(sub(a[1])), hi = realOf(sub(a[2])); if (lo === hi) return Z(0);
          const f = x => realOf(sub(a[0], { X: Z(x) })); return Z(Number(adaptive(f, lo, hi, 1e-12).toPrecision(10)));
        }
        let args; const sl = group();
        if (sl) args = split(sl).map(x => { if (!x.length) throw serr(); return sub(x); }); else args = [postfix()];
        if (t.v === 'Pol' || t.v === 'Rec') {
          if (args.length !== 2) throw serr(); const a = realOf(args[0]), b = realOf(args[1]);
          if (t.v === 'Pol') { const r = Math.hypot(a, b), th = fromRad(Math.atan2(b, a), env.ang); ctx.multi = [['r', clean(r)], ['θ', clean(th)]]; env.vars.X = Z(r); env.vars.Y = Z(th); ctx.span = [start, p]; return Z(r); }
          const th = toRad(b, env.ang), x = trig('cos', b, env.ang) * a, y = trig('sin', b, env.ang) * a; void th; ctx.multi = [['x', clean(x)], ['y', clean(y)]]; env.vars.X = Z(x); env.vars.Y = Z(y); ctx.span = [start, p]; return Z(x);
        }
        return call(t.v, args);
      }
      throw serr();
    }
    function call(f, a) {
      const z = a[0], x = z.r;
      const one = () => { if (a.length !== 1) throw serr(); };
      switch (f) {
        case 'sin': case 'cos': case 'tan': one(); return Z(trig(f, realOf(z), env.ang));
        case 'asin': one(); if (Math.abs(realOf(z)) > 1) throw merr(); return Z(fromRad(Math.asin(x), env.ang));
        case 'acos': one(); if (Math.abs(realOf(z)) > 1) throw merr(); return Z(fromRad(Math.acos(x), env.ang));
        case 'atan': one(); return Z(fromRad(Math.atan(realOf(z)), env.ang));
        case 'sinh': return Z(Math.sinh(realOf(z))); case 'cosh': return Z(Math.cosh(realOf(z))); case 'tanh': return Z(Math.tanh(realOf(z)));
        case 'asinh': return Z(Math.asinh(realOf(z))); case 'acosh': if (realOf(z) < 1) throw merr(); return Z(Math.acosh(x)); case 'atanh': if (Math.abs(realOf(z)) >= 1) throw merr(); return Z(Math.atanh(x));
        case 'log': { one(); if (!real(z) || x <= 0) throw merr(); const v = Math.log10(x); return Z(Math.abs(v - Math.round(v)) < 1e-13 ? Math.round(v) : v); }
        case 'logb': { if (a.length !== 2) throw serr(); const b = realOf(a[0]), y = realOf(a[1]); if (b <= 0 || b === 1 || y <= 0) throw merr(); const v = Math.log(y) / Math.log(b); return Z(Math.abs(v - Math.round(v)) < 1e-12 ? Math.round(v) : v); }
        case 'ln': one(); if (real(z) && x > 0) return Z(Math.log(x)); if (!env.cx) throw merr(); return cln(z);
        case 'sqrt': one(); if (real(z) && x >= 0) return Z(Math.sqrt(x)); if (!env.cx) throw merr(); return csqrt(z);
        case 'cbrt': return Z(Math.cbrt(realOf(z)));
        case 'abs': return Z(cabs(z));
        case 'Arg': return Z(fromRad(carg(z), env.ang));
        case 'Conjg': return Z(z.r, -z.i); case 'ReP': return Z(z.r); case 'ImP': return Z(z.i);
        case 'Rnd': { const v = realOf(z), s = env.set || {}; if (s.mode === 'fix') return Z(Number(v.toFixed(s.dig || 0))); if (s.mode === 'sci') return Z(Number(v.toExponential(s.dig || 1))); return Z(Number(v.toPrecision(10))); }
        case 'Int': return Z(Math.trunc(realOf(z))); case 'Intg': return Z(Math.floor(realOf(z)));
        case 'GCD': case 'LCM': { if (a.length !== 2) throw serr(); const m = realOf(a[0]), n = realOf(a[1]); if (!Number.isInteger(m) || !Number.isInteger(n) || m < 0 || n < 0) throw merr(); const g2 = gcd(m, n); return Z(f === 'GCD' ? g2 : (g2 ? m / g2 * n : 0)); }
        case 'ranint': { if (a.length !== 2) throw serr(); const lo = Math.ceil(realOf(a[0])), hi = Math.floor(realOf(a[1])); if (hi < lo) throw merr(); return Z(lo + Math.floor(Math.random() * (hi - lo + 1))); }
      }
      throw serr();
    }
    const v = expr(); if (p < toks.length) throw serr(); return v;
  }

  /* ---------- display ---------- */
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = n => String(n).split('').map(c => SUP[c]).join('');
  function sci(v, dig, eng) {
    if (v === 0) return '0';
    let [m, e] = v.toExponential(dig == null ? 9 : dig).split('e'); e = +e;
    if (eng) { const sh = ((e % 3) + 3) % 3; e -= sh; m = String(+m * Math.pow(10, sh)); if (dig != null) m = (+m).toFixed(Math.max(0, dig - sh)); }
    if (dig == null) m = String(+m); return `${m}×10${sup(e)}`;
  }
  function fmt(v, set = {}) {
    if (!isFinite(v)) throw merr(); if (v === 0 && !set.dig) return '0';
    const a = Math.abs(v), mode = set.mode || 'norm1', dig = set.dig;
    if (mode === 'fix') { if (a >= 1e10) return sci(v, 9); return v.toFixed(dig || 0).replace(/^-0(\.0*)?$/, (m, d) => d ? '0' + d : '0'); }
    if (mode === 'sci') return sci(v, dig ? dig - 1 : 9);
    if (mode === 'eng') return sci(v, null, true);
    const lo = mode === 'norm2' ? 1e-9 : 1e-2;
    if (a < lo || a >= 1e10) return sci(Number(v.toPrecision(10)), null);
    return String(Number(v.toPrecision(10))).replace(/e.*/, m => m);
  }
  function fmtC(z, set = {}) {
    if (!z.i) return fmt(z.r, set);
    if (set.cpx === 'polar') { const r = cabs(z), th = fromRad(carg(z), set.ang || 'deg'); return `${fmt(clean(r), set)}∠${fmt(clean(th), set)}`; }
    const im = Math.abs(z.i); return `${z.r ? fmt(z.r, set) : ''}${z.i < 0 ? '−' : (z.r ? '+' : '')}${im === 1 ? '' : fmt(im, set)}i`;
  }
  const FR = '⁄';
  function exact(v, frac) {
    if (!isFinite(v) || Number.isInteger(v)) return null;
    const f = ratio(v, 99999);
    if (f) { const n = Math.abs(f[0]), d = f[1], s = v < 0 ? '−' : '';
      if (frac === 'dc' || n < d) return `${s}${n}${FR}${d}`;
      const w = Math.floor(n / d); return `${s}${w} ${n - w * d}${FR}${d}`; }
    const sq = ratio(v * v, 1000);
    if (sq && sq[0] > 0) { const N = sq[0] * sq[1]; let k = 1, b = N; for (let q = 2; q * q <= b; q++) while (b % (q * q) === 0) { b /= q * q; k *= q; }
      if (b > 1 && b < 1e6) { const g2 = gcd(k, sq[1]); const num = k / g2, den = sq[1] / g2; return `${v < 0 ? '−' : ''}${num > 1 ? num : ''}√${b}${den > 1 ? FR + den : ''}`.replace(/^(−?)(\d*)√(\d+)⁄(\d+)$/, (m, s2, a2, b2, c2) => `${s2}${a2 ? a2 : ''}√${b2}${FR}${c2}`); } }
    const pf = ratio(v / PI, 1000); if (pf && Math.abs(pf[0]) < 1e5) { const n = Math.abs(pf[0]), d = pf[1]; return `${v < 0 ? '−' : ''}${n === 1 ? '' : n}π${d > 1 ? FR + d : ''}`; }
    return null;
  }
  function toDMS(v) {
    const s = v < 0 ? '-' : ''; v = Math.abs(v); let d = Math.floor(v + 1e-12), m = Math.floor((v - d) * 60 + 1e-9), sec = Math.round(((v - d) * 60 - m) * 60 * 1000) / 1000;
    if (sec >= 60) { sec -= 60; m++; } if (m >= 60) { m -= 60; d++; }
    return `${s}${d}°${m}′${Number(sec.toFixed(3))}″`;
  }

  /* ---------- constants and conversions (fx-991ES PLUS, CODATA 2010) ---------- */
  const CONSTS = [['mp', 'Proton mass', 1.672621777e-27], ['mn', 'Neutron mass', 1.674927351e-27], ['me', 'Electron mass', 9.10938291e-31], ['mμ', 'Muon mass', 1.883531475e-28], ['a0', 'Bohr radius', 5.2917721092e-11], ['h', 'Planck constant', 6.62606957e-34], ['μN', 'Nuclear magneton', 5.05078353e-27], ['μB', 'Bohr magneton', 9.27400968e-24], ['ħ', 'Reduced Planck constant', 1.054571726e-34], ['α', 'Fine-structure constant', 7.2973525698e-3], ['re', 'Classical electron radius', 2.8179403267e-15], ['λc', 'Compton wavelength', 2.4263102389e-12], ['γp', 'Proton gyromagnetic ratio', 2.675222005e8], ['λcp', 'Proton Compton wavelength', 1.32140985623e-15], ['λcn', 'Neutron Compton wavelength', 1.31959090468e-15], ['R∞', 'Rydberg constant', 10973731.568539], ['u', 'Atomic mass unit', 1.660538921e-27], ['μp', 'Proton magnetic moment', 1.410606743e-26], ['μe', 'Electron magnetic moment', -9.2847643e-24], ['μn', 'Neutron magnetic moment', -9.6623647e-27], ['μμ', 'Muon magnetic moment', -4.49044807e-26], ['F', 'Faraday constant', 96485.3365], ['e', 'Elementary charge', 1.602176565e-19], ['NA', 'Avogadro constant', 6.02214129e23], ['k', 'Boltzmann constant', 1.3806488e-23], ['Vm', 'Molar volume (ideal gas)', 0.022413968], ['R', 'Molar gas constant', 8.3144621], ['c0', 'Speed of light', 299792458], ['c1', 'First radiation constant', 3.74177153e-16], ['c2', 'Second radiation constant', 0.01438777], ['σ', 'Stefan–Boltzmann constant', 5.670373e-8], ['ε0', 'Electric constant', 8.854187817e-12], ['μ0', 'Magnetic constant', 1.2566370614e-6], ['φ0', 'Magnetic flux quantum', 2.067833758e-15], ['g', 'Standard gravity', 9.80665], ['G0', 'Conductance quantum', 7.7480917346e-5], ['Z0', 'Vacuum impedance', 376.730313461], ['t', 'Celsius temperature', 273.15], ['G', 'Gravitational constant', 6.67384e-11], ['atm', 'Standard atmosphere', 101325]];
  const L = (a, b, k) => [a, b, x => x * k, x => x / k];
  const CONVS = [['in', 'cm', x => x * 2.54], ['cm', 'in', x => x / 2.54], ['ft', 'm', x => x * 0.3048], ['m', 'ft', x => x / 0.3048], ['yd', 'm', x => x * 0.9144], ['m', 'yd', x => x / 0.9144], ['mile', 'km', x => x * 1.609344], ['km', 'mile', x => x / 1.609344], ['n mile', 'm', x => x * 1852], ['m', 'n mile', x => x / 1852], ['acre', 'm²', x => x * 4046.8564224], ['m²', 'acre', x => x / 4046.8564224], ['gal (US)', 'L', x => x * 3.785411784], ['L', 'gal (US)', x => x / 3.785411784], ['gal (UK)', 'L', x => x * 4.54609], ['L', 'gal (UK)', x => x / 4.54609], ['pc', 'km', x => x * 3.08567782e13], ['km', 'pc', x => x / 3.08567782e13], ['km/h', 'm/s', x => x / 3.6], ['m/s', 'km/h', x => x * 3.6], ['oz', 'g', x => x * 28.349523125], ['g', 'oz', x => x / 28.349523125], ['lb', 'kg', x => x * 0.45359237], ['kg', 'lb', x => x / 0.45359237], ['atm', 'Pa', x => x * 101325], ['Pa', 'atm', x => x / 101325], ['mmHg', 'Pa', x => x * 133.322368421], ['Pa', 'mmHg', x => x / 133.322368421], ['hp', 'kW', x => x * 0.7456998716], ['kW', 'hp', x => x / 0.7456998716], ['kgf/cm²', 'Pa', x => x * 98066.5], ['Pa', 'kgf/cm²', x => x / 98066.5], ['kgf·m', 'J', x => x * 9.80665], ['J', 'kgf·m', x => x / 9.80665], ['lbf/in²', 'kPa', x => x * 6.894757293], ['kPa', 'lbf/in²', x => x / 6.894757293], ['°F', '°C', x => (x - 32) * 5 / 9], ['°C', '°F', x => x * 9 / 5 + 32], ['J', 'cal', x => x / 4.1868], ['cal', 'J', x => x * 4.1868]];
  void L;

  /* ---------- statistics ---------- */
  function expand(data) { const a = []; data.forEach(d => { for (let k = 0; k < d.f; k++) a.push(d.x); }); return a.sort((p, q) => p - q); }
  function med(a) { const n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; }
  function stat1(data) {
    data = data.filter(d => d.f > 0); const n = data.reduce((s, d) => s + d.f, 0); if (!n) throw merr('No data');
    if (n > 20000) throw merr();
    const sx = data.reduce((s, d) => s + d.f * d.x, 0), sx2 = data.reduce((s, d) => s + d.f * d.x * d.x, 0), mean = sx / n;
    const ss = data.reduce((s, d) => s + d.f * (d.x - mean) ** 2, 0), srt = expand(data);
    const half = Math.floor(n / 2), lo = srt.slice(0, half), hi = srt.slice(n % 2 ? half + 1 : half);
    const r = { 'n': n, 'x̄': mean, 'Σx': sx, 'Σx²': sx2, 'σx': Math.sqrt(ss / n), 'sx': n > 1 ? Math.sqrt(ss / (n - 1)) : null, 'min X': srt[0], 'Q1': lo.length ? med(lo) : srt[0], 'Med': med(srt), 'Q3': hi.length ? med(hi) : srt[n - 1], 'max X': srt[n - 1] };
    return r;
  }
  const REG = { lin: 'A+BX', quad: '_+CX²', ln: 'A+B·ln X', exp: 'A·e^(BX)', ab: 'A·B^X', pow: 'A·X^B', inv: 'A+B/X' };
  function solveLin(M, b) { // Gaussian elimination, partial pivot
    const n = b.length, A = M.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-13) throw merr(); [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; } }
    return A.map((r, i) => r[n] / r[i]);
  }
  function stat2(type, data) {
    data = data.filter(d => d.f > 0); const n = data.reduce((s, d) => s + d.f, 0); if (n < 2) throw merr();
    const sum = (f) => data.reduce((s, d) => s + d.f * f(d), 0);
    const bad = data.some(d => (type === 'ln' || type === 'pow' || type === 'inv') && d.x <= 0 || (['exp', 'ab', 'pow'].includes(type)) && d.y <= 0 || (type === 'inv' && d.x === 0)); if (bad) throw merr();
    const X = { lin: d => d.x, quad: d => d.x, ln: d => Math.log(d.x), exp: d => d.x, ab: d => d.x, pow: d => Math.log(d.x), inv: d => 1 / d.x }[type];
    const Y = { lin: d => d.y, quad: d => d.y, ln: d => d.y, exp: d => Math.log(d.y), ab: d => Math.log(d.y), pow: d => Math.log(d.y), inv: d => d.y }[type];
    const sx = sum(X), sy = sum(Y), sxx = sum(d => X(d) ** 2), syy = sum(d => Y(d) ** 2), sxy = sum(d => X(d) * Y(d));
    const det = n * sxx - sx * sx, out = {};
    const raw = { 'n': n, 'x̄': sum(d => d.x) / n, 'Σx': sum(d => d.x), 'Σx²': sum(d => d.x * d.x), 'ȳ': sum(d => d.y) / n, 'Σy': sum(d => d.y), 'Σy²': sum(d => d.y * d.y), 'Σxy': sum(d => d.x * d.y) };
    raw['σx'] = Math.sqrt(raw['Σx²'] / n - raw['x̄'] ** 2); raw['σy'] = Math.sqrt(raw['Σy²'] / n - raw['ȳ'] ** 2);
    raw['sx'] = Math.sqrt((raw['Σx²'] - n * raw['x̄'] ** 2) / (n - 1)); raw['sy'] = Math.sqrt((raw['Σy²'] - n * raw['ȳ'] ** 2) / (n - 1));
    Object.assign(out, raw); let a, b, c, f, inv;
    if (type === 'quad') {
      const s = [sum(d => 1), sx, sxx, sum(d => d.x ** 3), sum(d => d.x ** 4)], t = [sy, sxy, sum(d => d.x * d.x * d.y)];
      [a, b, c] = solveLin([[s[0], s[1], s[2]], [s[1], s[2], s[3]], [s[2], s[3], s[4]]], t);
      const ym = sy / n, sst = sum(d => (d.y - ym) ** 2), sse = sum(d => (d.y - (a + b * d.x + c * d.x * d.x)) ** 2); out.r = sst ? Math.sqrt(Math.max(0, 1 - sse / sst)) : 1;
      out.a = a; out.b = b; out.c = c; f = x => a + b * x + c * x * x;
      inv = y => { const D = b * b - 4 * c * (a - y); if (D < 0 || !c) return null; const q = Math.sqrt(D); return [(-b + q) / (2 * c), (-b - q) / (2 * c)]; };
    } else {
      if (!det) throw merr(); const B = (n * sxy - sx * sy) / det, A = (sy - B * sx) / n, den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
      out.r = den ? (n * sxy - sx * sy) / den : 1;
      if (type === 'lin') { a = A; b = B; f = x => a + b * x; inv = y => b ? [(y - a) / b] : null; }
      else if (type === 'ln') { a = A; b = B; f = x => a + b * Math.log(x); inv = y => b ? [Math.exp((y - a) / b)] : null; }
      else if (type === 'exp') { a = Math.exp(A); b = B; f = x => a * Math.exp(b * x); inv = y => (y > 0 && b) ? [Math.log(y / a) / b] : null; }
      else if (type === 'ab') { a = Math.exp(A); b = Math.exp(B); f = x => a * Math.pow(b, x); inv = y => (y > 0 && b !== 1) ? [Math.log(y / a) / Math.log(b)] : null; }
      else if (type === 'pow') { a = Math.exp(A); b = B; f = x => a * Math.pow(x, b); inv = y => (y > 0 && b) ? [Math.pow(y / a, 1 / b)] : null; }
      else { a = A; b = B; f = x => a + b / x; inv = y => (y !== a) ? [b / (y - a)] : null; }
      out.a = a; out.b = b;
    }
    return { out, f, inv };
  }

  /* ---------- equations ---------- */
  function polyRoots(co) { // co = [a, b, c] or [a, b, c, d] highest power first
    const n = co.length - 1; if (!co[0]) throw merr();
    if (n === 2) { const [a, b, c] = co, D = b * b - 4 * a * c;
      if (D >= 0) { const q = Math.sqrt(D); return { roots: [Z((-b + q) / (2 * a)), Z((-b - q) / (2 * a))], extra: { 'x-vertex': -b / (2 * a), 'y-vertex': c - b * b / (4 * a) } }; }
      const q = Math.sqrt(-D); return { roots: [Z(-b / (2 * a), q / (2 * a)), Z(-b / (2 * a), -q / (2 * a))], extra: { 'x-vertex': -b / (2 * a), 'y-vertex': c - b * b / (4 * a) } }; }
    const k = co.map(v => v / co[0]); let r = [Z(1, 0), Z(0.4, 0.9), Z(-0.65, 0.72)].map(z => Z(z.r * (1 + Math.max(...k.map(Math.abs))), z.i * (1 + Math.max(...k.map(Math.abs)))));
    const ev = z => k.reduce((s, c) => cadd(cmul(s, z), Z(c)), Z(0));
    for (let it = 0; it < 500; it++) { let md = 0; r = r.map((z, i) => { let d = Z(1); r.forEach((w, j) => { if (j !== i) d = cmul(d, csub(z, w)); }); const dz = cdiv(ev(z), d); md = Math.max(md, cabs(dz)); return csub(z, dz); }); if (md < 1e-15) break; }
    r = r.map(z => Z(Math.abs(z.r) < 1e-10 ? 0 : clean(z.r), Math.abs(z.i) < 1e-10 ? 0 : clean(z.i)));
    return { roots: r, extra: {} };
  }

  /* ---------- matrices and vectors ---------- */
  const mm = {
    add: (a, b) => { if (a.length !== b.length || a[0].length !== b[0].length) throw merr('Dimension ERROR'); return a.map((r, i) => r.map((v, j) => v + b[i][j])); },
    sub: (a, b) => { if (a.length !== b.length || a[0].length !== b[0].length) throw merr('Dimension ERROR'); return a.map((r, i) => r.map((v, j) => v - b[i][j])); },
    mul: (a, b) => { if (a[0].length !== b.length) throw merr('Dimension ERROR'); return a.map(r => b[0].map((_, j) => r.reduce((s, v, k) => s + v * b[k][j], 0))); },
    scale: (a, k) => a.map(r => r.map(v => v * k)),
    t: a => a[0].map((_, j) => a.map(r => r[j])),
    det: a => { const n = a.length; if (n !== a[0].length) throw merr('Dimension ERROR'); const m = a.map(r => [...r]); let d = 1;
      for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r; if (Math.abs(m[p][c]) < 1e-14) return 0; if (p !== c) { [m[p], m[c]] = [m[c], m[p]]; d = -d; } d *= m[c][c]; for (let r = c + 1; r < n; r++) { const f = m[r][c] / m[c][c]; for (let k = c; k < n; k++) m[r][k] -= f * m[c][k]; } } return d; },
    inv: a => { const n = a.length; if (n !== a[0].length) throw merr('Dimension ERROR'); const m = a.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => +(i === j))]);
      for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r; if (Math.abs(m[p][c]) < 1e-13) throw merr(); [m[c], m[p]] = [m[p], m[c]]; const d = m[c][c]; m[c] = m[c].map(v => v / d); for (let r = 0; r < n; r++) if (r !== c) { const f = m[r][c]; m[r] = m[r].map((v, k) => v - f * m[c][k]); } }
      return m.map(r => r.slice(n).map(clean)); }
  };
  const vv = {
    add: (a, b) => a.map((v, i) => v + b[i]), sub: (a, b) => a.map((v, i) => v - b[i]), dot: (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
    cross: (a, b) => { const A = [...a, 0].slice(0, 3), B = [...b, 0].slice(0, 3); return [A[1] * B[2] - A[2] * B[1], A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]]; },
    abs: a => Math.sqrt(a.reduce((s, v) => s + v * v, 0))
  };

  /* ---------- Base-N (32-bit, BIN is 16-bit like the real calculator) ---------- */
  function baseEval(src, base) {
    const DIG = '0123456789ABCDEF', toks = []; let s = String(src).replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'), i = 0;
    while (i < s.length) {
      let m = /^(and|or|xor|xnor|Not|Neg)/.exec(s.slice(i)); if (m) { toks.push({ t: 'op', v: m[1] }); i += m[1].length; continue; }
      const c = s[i].toUpperCase(); if (DIG.includes(c) && DIG.indexOf(c) < base) { let j = i; while (j < s.length && DIG.includes(s[j].toUpperCase()) && DIG.indexOf(s[j].toUpperCase()) < base) j++; toks.push({ t: 'num', v: parseInt(s.slice(i, j), base) }); i = j; continue; }
      if ('+-*/()'.includes(s[i])) { toks.push({ t: s[i] }); i++; continue; } throw serr();
    }
    const res = []; toks.forEach(t => { const a = res[res.length - 1]; if (a && (a.t === 'num' || a.t === ')') && (t.t === 'num' || t.t === '(' || (t.t === 'op' && (t.v === 'Not' || t.v === 'Neg')))) res.push({ t: '*' }); res.push(t); });
    const bits = base === 2 ? 16 : 32, wrap = v => { if (bits === 16) return (v << 16) >> 16; return v | 0; };
    let p = 0; const peek = () => res[p], eatOp = v => peek() && peek().t === 'op' && peek().v === v && (p++, true), eat = t => peek() && peek().t === t && (p++, true);
    const lim = v => { if (bits === 16 ? (v > 32767 || v < -32768) : (v > 2147483647 || v < -2147483648)) throw merr(); return v; };
    function or() { let v = and(); for (;;) { if (eatOp('or')) v = wrap(v | and()); else if (eatOp('xor')) v = wrap(v ^ and()); else if (eatOp('xnor')) v = wrap(~(v ^ and())); else return v; } }
    function and() { let v = add(); while (eatOp('and')) v = wrap(v & add()); return v; }
    function add() { let v = mul(); for (;;) { if (eat('+')) v = lim(v + mul()); else if (eat('-')) v = lim(v - mul()); else return v; } }
    function mul() { let v = un(); for (;;) { if (eat('*')) v = lim(v * un()); else if (eat('/')) { const d = un(); if (!d) throw merr(); v = Math.trunc(v / d); } else return v; } }
    function un() { if (eatOp('Not')) return wrap(~un()); if (eatOp('Neg')) return lim(-un()); if (eat('-')) return lim(-un()); return pr(); }
    function pr() { const t = peek(); if (!t) throw serr(); if (t.t === 'num') { p++; if (base !== 10 && t.v > 0x7fffffff) return wrap(t.v); return lim(bits === 16 && t.v > 0x7fff && base !== 10 ? (t.v << 16) >> 16 : t.v); } if (eat('(')) { const v = or(); if (!eat(')')) throw serr(); return v; } throw serr(); }
    const v = or(); if (p < res.length) throw serr(); return v;
  }
  function toBase(v, base) { const bits = base === 2 ? 16 : 32; if (base === 10) return String(v); const u = bits === 16 ? (v & 0xffff) : (v >>> 0); return u.toString(base).toUpperCase(); }

  /* ---------- solve f(x)=0 (SOLVE key) ---------- */
  function solveFor(fn, guess) {
    const f = x => { try { return fn(x); } catch { return NaN; } };
    let x = guess; for (let it = 0; it < 80; it++) { const y = f(x); if (!isFinite(y)) break; if (Math.abs(y) < 1e-12) return x; const h = Math.max(Math.abs(x), 1) * 1e-6, d = (f(x + h) - f(x - h)) / (2 * h); if (!isFinite(d) || d === 0) break; const nx = x - y / d; if (Math.abs(nx - x) < 1e-13 * Math.max(1, Math.abs(x))) { if (Math.abs(f(nx)) < 1e-8) return nx; break; } x = nx; }
    for (const span of [1, 10, 100, 1000, 1e4]) { let prev = f(guess - span), px = guess - span; for (let k = 1; k <= 200; k++) { const cx = guess - span + k * span / 100, cy = f(cx); if (isFinite(prev) && isFinite(cy) && prev * cy <= 0) { let lo = px, hi = cx; for (let j = 0; j < 200; j++) { const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; } return (lo + hi) / 2; } prev = cy; px = cx; } }
    throw merr('Can\'t Solve');
  }

  g.Calc = { evaluate, tokenize, fmt, fmtC, exact, toDMS, CalcError, CONSTS, CONVS, stat1, stat2, REG, solveLin, polyRoots, mm, vv, baseEval, toBase, solveFor, clean, Z, cabs, carg, fromRad, sup };
  if (typeof module !== 'undefined' && module.exports) module.exports = g.Calc;
})(typeof window !== 'undefined' ? window : globalThis);
