/* Scientific calculator engine (Casio fx-991ES PLUS style). No eval(): everything is parsed here.
   Works in the browser (window.CalcEngine) and in Node (module.exports) so it can be tested. */
(function (root) {
'use strict';
const PI = Math.PI;
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
const SI = Number.isSafeInteger;
const err = m => { throw new Error(m); };

/* ---------- exact values: (n/d) * sqrt(s) * pi^p ---------- */
const EX = {
  mk(n, d = 1, s = 1, p = 0) {
    if (!SI(n) || !SI(d) || !SI(s) || d === 0 || s < 1 || s > 1e12) return null;
    if (d < 0) { n = -n; d = -d; }
    let k = 1; for (let f = 2; f * f <= s; f++) while (s % (f * f) === 0) { s /= f * f; k *= f; }
    n *= k; if (!SI(n)) return null;
    if (n === 0) return { n: 0, d: 1, s: 1, p: 0 };
    const g = gcd(n, d) || 1; return { n: n / g, d: d / g, s, p };
  },
  val: e => e.n / e.d * Math.sqrt(e.s) * Math.pow(PI, e.p)
};
const V = (v, ex = null) => ({ v, ex });
const fromEx = ex => ex ? { v: EX.val(ex), ex } : null;
const int = n => V(n, EX.mk(n));
const isInt = x => x.ex && x.ex.d === 1 && x.ex.s === 1 && x.ex.p === 0;

/* ---------- real arithmetic with exact tracking ---------- */
const R = {
  zero: () => int(0), one: () => int(1), fromNum: (n, exact) => exact && SI(n) ? int(n) : V(n),
  add(a, b) {
    const v = a.v + b.v; let ex = null;
    if (a.ex && b.ex) {
      if (a.ex.n === 0) ex = b.ex; else if (b.ex.n === 0) ex = a.ex;
      else if (a.ex.s === b.ex.s && a.ex.p === b.ex.p) ex = EX.mk(a.ex.n * b.ex.d + b.ex.n * a.ex.d, a.ex.d * b.ex.d, a.ex.s, a.ex.p);
    }
    return V(v, ex);
  },
  neg: a => V(-a.v, a.ex ? EX.mk(-a.ex.n, a.ex.d, a.ex.s, a.ex.p) : null),
  sub(a, b) { return R.add(a, R.neg(b)); },
  mul(a, b) {
    const v = a.v * b.v; let ex = null;
    if (a.ex && b.ex && a.ex.p + b.ex.p <= 1) ex = EX.mk(a.ex.n * b.ex.n, a.ex.d * b.ex.d, a.ex.s * b.ex.s, a.ex.p + b.ex.p);
    return V(v, ex);
  },
  div(a, b) {
    if (b.v === 0) err('Math ERROR');
    const v = a.v / b.v; let ex = null;
    if (a.ex && b.ex && a.ex.p - b.ex.p >= 0 && a.ex.p - b.ex.p <= 1)
      ex = EX.mk(a.ex.n * b.ex.d, a.ex.d * b.ex.n * b.ex.s, a.ex.s * b.ex.s, a.ex.p - b.ex.p);
    return V(v, ex);
  },
  pow(a, b) {
    if (a.v === 0 && b.v === 0) err('Math ERROR');
    if (a.v < 0 && !Number.isInteger(b.v)) {            // odd root of a negative number, e.g. (-8)^(1/3)
      if (b.ex && b.ex.s === 1 && b.ex.p === 0 && b.ex.d % 2 === 1) return V(-Math.pow(-a.v, b.v));
      err('Math ERROR');
    }
    const v = Math.pow(a.v, b.v); if (!Number.isFinite(v)) err('Math ERROR');
    let ex = null;
    if (a.ex && isInt(b) && Math.abs(b.ex.n) <= 30) {
      const k = b.ex.n, ae = a.ex;
      if (ae.p === 0) {
        if (k === 0) ex = EX.mk(1); else {
          const m = Math.abs(k), half = Math.floor(m / 2), odd = m % 2;
          let n = Math.pow(ae.n, m) * Math.pow(ae.s, half), d = Math.pow(ae.d, m), s = odd ? ae.s : 1;
          if (SI(n) && SI(d)) ex = k > 0 ? EX.mk(n, d, s, 0) : (odd ? EX.mk(d, n * s, s, 0) : EX.mk(d, n, 1, 0));
        }
      } else if (ae.p === 1 && ae.s === 1 && (k === 1 || k === 0)) ex = k ? ae : EX.mk(1);
    } else if (a.ex && b.ex && a.ex.p === 0 && a.ex.s === 1 && b.ex.s === 1 && b.ex.p === 0 && b.ex.d <= 3 && b.ex.d > 1 && a.v > 0) {
      const r = Math.round(Math.pow(a.v, 1 / b.ex.d));    // exact fractional power of a perfect power
      if (Math.abs(Math.pow(r, b.ex.d) - a.v) < 1e-9 && SI(Math.pow(r, b.ex.n))) ex = EX.mk(Math.pow(r, b.ex.n));
    }
    return V(v, ex);
  },
  sqrt(a) {
    if (a.v < 0) err('Math ERROR');
    const v = Math.sqrt(a.v); let ex = null;
    if (a.ex && a.ex.p === 0 && a.ex.s === 1) ex = a.ex.n === 0 ? EX.mk(0) : EX.mk(1, a.ex.d, a.ex.n * a.ex.d, 0);
    return V(v, ex);
  },
  cbrt(a) {
    const v = Math.cbrt(a.v); let ex = null;
    if (isInt(a)) { const r = Math.round(v); if (r * r * r === a.ex.n) ex = EX.mk(r); }
    return V(v, ex);
  },
  abs: a => V(Math.abs(a.v), a.ex ? EX.mk(Math.abs(a.ex.n), a.ex.d, a.ex.s, a.ex.p) : null),
  cmp: (a, b) => a.v - b.v
};

/* ---------- complex arithmetic (CMPLX mode); values are {re, im} ---------- */
const C = (re, im = 0) => ({ re, im });
const Cx = {
  zero: () => C(0), one: () => C(1), fromNum: n => C(n, 0),
  add: (a, b) => C(a.re + b.re, a.im + b.im), sub: (a, b) => C(a.re - b.re, a.im - b.im), neg: a => C(-a.re, -a.im),
  mul: (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re),
  div(a, b) { const d = b.re * b.re + b.im * b.im; if (d === 0) err('Math ERROR'); return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); },
  abs: a => Math.hypot(a.re, a.im), arg: a => Math.atan2(a.im, a.re),
  exp: a => C(Math.exp(a.re) * Math.cos(a.im), Math.exp(a.re) * Math.sin(a.im)),
  ln(a) { if (a.re === 0 && a.im === 0) err('Math ERROR'); return C(Math.log(Cx.abs(a)), Cx.arg(a)); },
  sqrt(a) { if (a.im === 0) return a.re >= 0 ? C(Math.sqrt(a.re)) : C(0, Math.sqrt(-a.re)); const r = Cx.abs(a), t = Cx.arg(a) / 2, m = Math.sqrt(r); return C(m * Math.cos(t), m * Math.sin(t)); },
  pow(a, b) {
    if (a.re === 0 && a.im === 0) { if (b.re === 0 && b.im === 0) err('Math ERROR'); return C(0); }
    if (b.im === 0 && Number.isInteger(b.re) && Math.abs(b.re) <= 200) { let r = C(1), k = Math.abs(b.re); for (let i = 0; i < k; i++) r = Cx.mul(r, a); return b.re < 0 ? Cx.div(C(1), r) : r; }
    return Cx.exp(Cx.mul(b, Cx.ln(a)));
  }
};

/* ---------- tokenizer ---------- */
const FNS = ['sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'logb', 'log', 'ln', 'exp', 'pow10', 'sqrt', 'cbrt', 'abs', 'intg', 'int', 'rnd', 'ranint', 'gcd', 'lcm', 'fact', 'pol', 'rec', 'deriv', 'integ', 'sum', 'conj', 'arg', 're', 'im', 'not', 'neg', 'ang', 'dot', 'cross', 'unitv', 'floor', 'sign'];
const FNRE = FNS.slice().sort((a, b) => b.length - a.length);
function tokenize(src) {
  const t = []; let i = 0, s = src;
  while (i < s.length) {
    const rest = s.slice(i); let m;
    if ((m = /^(\d+\.?\d*|\.\d+)/.exec(rest))) { t.push({ k: 'num', v: m[0] }); i += m[0].length; continue; }
    if ((m = /^(PreAns|Ans|Ran#)/.exec(rest))) { t.push({ k: 'var', v: m[0] }); i += m[0].length; continue; }
    if ((m = /^(nCr|nPr|xnor|xor|and|or)/.exec(rest))) { t.push({ k: 'bin', v: m[0] }); i += m[0].length; continue; }
    let f = FNRE.find(n => rest.startsWith(n) && rest[n.length] === '(');
    if (f) { t.push({ k: 'fn', v: f }); i += f.length + 1; continue; }
    const c = rest[0];
    if ('+-*/^(),=⁄⌐!²³%°′″ᵈʳᵍᴇ'.includes(c)) { t.push({ k: c }); i++; continue; }
    if (rest.startsWith('⁻¹')) { t.push({ k: '⁻¹' }); i += 2; continue; }
    if (rest.startsWith('ˣ√')) { t.push({ k: 'ˣ√' }); i += 2; continue; }
    if (c === 'π') { t.push({ k: 'const', v: 'pi' }); i++; continue; }
    if (c === 'e') { t.push({ k: 'const', v: 'e' }); i++; continue; }
    if (c === 'i') { t.push({ k: 'const', v: 'i' }); i++; continue; }
    if ('ABCDEFXYM'.includes(c)) { t.push({ k: 'var', v: c }); i++; continue; }
    err('Syntax ERROR');
  }
  return t;
}

/* ---------- parser -> AST ---------- */
function parse(src) {
  const tk = tokenize(src); if (!tk.length) err('Syntax ERROR');
  let open = 0; tk.forEach(x => { if (x.k === '(' || x.k === 'fn') open++; else if (x.k === ')') open--; });
  while (open-- > 0) tk.push({ k: ')' });
  let p = 0; const pk = () => tk[p], eat = k => pk() && pk().k === k && (p++, true);
  const startsPrimary = t => t && (t.k === 'num' || t.k === '(' || t.k === 'fn' || t.k === 'const' || t.k === 'var');
  function top() { const l = addsub(); if (eat('=')) { const r = addsub(); return { t: 'eq', l, r }; } return l; }
  function addsub() { let n = muldiv(); for (;;) { if (eat('+')) n = { t: 'bin', o: '+', a: n, b: muldiv() }; else if (eat('-')) n = { t: 'bin', o: '-', a: n, b: muldiv() }; else return n; } }
  function muldiv() { let n = logic(); for (;;) { if (eat('*')) n = { t: 'bin', o: '*', a: n, b: logic() }; else if (eat('/')) n = { t: 'bin', o: '/', a: n, b: logic() }; else return n; } }
  function logic() { let n = comb(); for (;;) { const t = pk(); if (t && t.k === 'bin' && ['and', 'or', 'xor', 'xnor'].includes(t.v)) { p++; n = { t: 'bin', o: t.v, a: n, b: comb() }; } else return n; } }
  function comb() { let n = imp(); for (;;) { const t = pk(); if (t && t.k === 'bin' && (t.v === 'nCr' || t.v === 'nPr')) { p++; n = { t: 'bin', o: t.v, a: n, b: imp() }; } else return n; } }
  function imp() { let n = unary(); while (startsPrimary(pk())) n = { t: 'bin', o: '*', a: n, b: unary() }; return n; }
  function unary() { if (eat('-')) return { t: 'neg', a: unary() }; if (eat('+')) return unary(); return mixed(); }
  function mixed() { const a = frac(); if (pk() && pk().k === '⌐') { p++; const b = frac(); return { t: 'bin', o: '+', a, b }; } return a; }
  function frac() { let n = power(); while (eat('⁄')) n = { t: 'bin', o: '/', a: n, b: power() }; return n; }
  function power() {
    let b = postfix();
    if (eat('^')) { const e = expo(); return { t: 'bin', o: '^', a: b, b: e }; }
    if (eat('ˣ√')) { const e = postfix(); return { t: 'root', a: b, b: e }; }
    return b;
  }
  function expo() { if (eat('-')) return { t: 'neg', a: expo() }; if (eat('+')) return expo(); const b = postfix(); if (eat('^')) return { t: 'bin', o: '^', a: b, b: expo() }; return b; }
  function postfix() {
    let n = primary();
    for (;;) {
      const t = pk(); if (!t) return n;
      if (t.k === '!') { p++; n = { t: 'fn', f: 'fact!', a: [n] }; }
      else if (t.k === '²') { p++; n = { t: 'bin', o: '^', a: n, b: { t: 'num', v: '2' } }; }
      else if (t.k === '³') { p++; n = { t: 'bin', o: '^', a: n, b: { t: 'num', v: '3' } }; }
      else if (t.k === '⁻¹') { p++; n = { t: 'bin', o: '/', a: { t: 'num', v: '1' }, b: n }; }
      else if (t.k === '%') { p++; n = { t: 'bin', o: '/', a: n, b: { t: 'num', v: '100' } }; }
      else if (t.k === '°' || t.k === '′' || t.k === '″') {
        p++; const div = t.k === '°' ? 1 : t.k === '′' ? 60 : 3600;
        n = { t: 'dms', a: n, div }; /* a° b′ c″ : parts are added by the number after the mark */
        if (pk() && pk().k === 'num') { const rest = postfixDms(); n = { t: 'bin', o: '+', a: n, b: rest }; }
      }
      else if (t.k === 'ᵈ' || t.k === 'ʳ' || t.k === 'ᵍ') { p++; n = { t: 'unit', u: t.k, a: n }; }
      else return n;
    }
  }
  function postfixDms() { const num = primary(); const t = pk(); if (t && (t.k === '′' || t.k === '″')) { p++; const n = { t: 'dms', a: num, div: t.k === '′' ? 60 : 3600 }; if (pk() && pk().k === 'num') return { t: 'bin', o: '+', a: n, b: postfixDms() }; return n; } return num; }
  function exp10(n) { if (pk() && pk().k === 'ᴇ') { p++; const neg = eat('-'); if (!eat('+')) { /* optional */ } const t = pk(); if (!t || t.k !== 'num') err('Syntax ERROR'); p++; return { t: 'e10', a: n, e: (neg ? -1 : 1) * parseFloat(t.v) }; } return n; }
  function primary() {
    const t = pk(); if (!t) err('Syntax ERROR');
    if (t.k === 'num') { p++; return exp10({ t: 'num', v: t.v }); }
    if (t.k === 'const') { p++; return { t: 'const', v: t.v }; }
    if (t.k === 'var') { p++; return { t: 'var', v: t.v }; }
    if (t.k === '(') { p++; const e = top(); if (!eat(')')) err('Syntax ERROR'); return e; }
    if (t.k === 'fn') {
      p++; const a = [addsub()]; while (eat(',')) a.push(addsub());
      if (!eat(')')) err('Syntax ERROR'); return { t: 'fn', f: t.v, a };
    }
    if (t.k === 'ᴇ') { p++; const neg = eat('-'); const n = pk(); if (!n || n.k !== 'num') err('Syntax ERROR'); p++; return { t: 'num', v: '1e' + (neg ? '-' : '') + n.v, ex: false }; }
    err('Syntax ERROR');
  }
  const r = top(); if (p < tk.length) err('Syntax ERROR'); return r;
}

/* ---------- evaluation ---------- */
const UNIT = { deg: 180 / PI, rad: 1, gra: 200 / PI };      // multiply radians by this to get the unit
function special(deg) {                                      // exact sin of integer degrees (multiples of 30 and 45)
  deg = ((deg % 360) + 360) % 360; if (!(deg % 30 === 0 || deg % 45 === 0)) return null;
  let r = deg, sign = 1; if (r > 180) { r = 360 - r; sign = -1; } if (r > 90) r = 180 - r;
  const T = { 0: EX.mk(0), 30: EX.mk(1, 2), 45: EX.mk(1, 2, 2), 60: EX.mk(1, 2, 3), 90: EX.mk(1) }[r]; if (!T) return null;
  return EX.mk(sign * T.n, T.d, T.s, 0);
}
function makeEnv(o = {}) {
  return Object.assign({ mode: 'comp', angle: 'deg', vars: {}, ans: null, preans: null, rnd: Math.random }, o);
}
function evalAst(node, env, over) {
  const cplx = env.mode === 'cmplx', O = cplx ? Cx : R;
  const ev = n => evalAst(n, env, over);
  const num = n => { const x = ev(n); if (cplx) { if (Math.abs(x.im) > 1e-12 * (1 + Math.abs(x.re))) err('Math ERROR'); return V(x.re); } return x; };
  const toRad = x => x.v / UNIT[env.angle];                 // x (angle unit) -> radians
  const fromRad = x => V(x * UNIT[env.angle]);
  const degOf = x => {                                      // exact degrees as a fraction if possible
    if (!x.ex) return null; const e = x.ex;
    if (env.angle === 'deg' && e.s === 1 && e.p === 0) return e.n / e.d;
    if (env.angle === 'rad' && e.s === 1 && e.p === 1) return 180 * e.n / e.d;
    if (env.angle === 'gra' && e.s === 1 && e.p === 0) return 0.9 * e.n / e.d;
    return null;
  };
  const withX = (xv, f) => { const old = over.X; over.X = xv; try { return f(); } finally { over.X = old; } };
  const evalFn = (f, a) => {
    if (cplx) return evalCplxFn(f, a, env, ev);
    const x = () => ev(a[0]);
    switch (f) {
      case 'sin': case 'cos': case 'tan': {
        const a0 = x(), d = degOf(a0); let ex = null;
        if (d !== null && Number.isInteger(d) && d >= -1e6 && d <= 1e6) {
          if (f === 'sin') ex = special(d); else if (f === 'cos') ex = special(90 - d);
          else { const sn = special(d), cs = special(90 - d); if (sn && cs) { if (cs.n === 0) err('Math ERROR'); const q = R.div(fromEx(sn), fromEx(cs)); ex = q.ex; } }
        }
        const r = toRad(a0); if (f === 'tan' && ex === null) { const dd = ((r % PI) + PI) % PI; if (Math.abs(dd - PI / 2) < 1e-12) err('Math ERROR'); }
        const v = f === 'sin' ? Math.sin(r) : f === 'cos' ? Math.cos(r) : Math.tan(r);
        return ex ? V(EX.val(ex), ex) : V(Math.abs(v) < 1e-14 ? 0 : v);
      }
      case 'asin': case 'acos': { const a0 = x(); if (Math.abs(a0.v) > 1 + 1e-12) err('Math ERROR'); const r = f === 'asin' ? Math.asin(Math.max(-1, Math.min(1, a0.v))) : Math.acos(Math.max(-1, Math.min(1, a0.v))); return invExact(a0, r, f); }
      case 'atan': { const a0 = x(); return invExact(a0, Math.atan(a0.v), f); }
      case 'sinh': return V(Math.sinh(x().v)); case 'cosh': return V(Math.cosh(x().v)); case 'tanh': return V(Math.tanh(x().v));
      case 'asinh': return V(Math.asinh(x().v));
      case 'acosh': { const v = x().v; if (v < 1) err('Math ERROR'); return V(Math.acosh(v)); }
      case 'atanh': { const v = x().v; if (Math.abs(v) >= 1) err('Math ERROR'); return V(Math.atanh(v)); }
      case 'log': { const v = x().v; if (v <= 0) err('Math ERROR'); return V(Math.log10(v)); }
      case 'logb': { const b = ev(a[0]).v, v = ev(a[1]).v; if (b <= 0 || b === 1 || v <= 0) err('Math ERROR'); return V(Math.log(v) / Math.log(b)); }
      case 'ln': { const v = x().v; if (v <= 0) err('Math ERROR'); return V(Math.log(v)); }
      case 'exp': return V(Math.exp(x().v));
      case 'pow10': { const v = Math.pow(10, x().v); if (!Number.isFinite(v)) err('Math ERROR'); const a0 = x(); return isInt(a0) && Math.abs(a0.ex.n) < 15 ? (a0.ex.n >= 0 ? int(v) : V(v, EX.mk(1, Math.pow(10, -a0.ex.n)))) : V(v); }
      case 'sqrt': return R.sqrt(x());
      case 'cbrt': return R.cbrt(x());
      case 'abs': return R.abs(x());
      case 'int': { const v = x().v; return int(Math.trunc(v)); }
      case 'intg': case 'floor': { const v = x().v; return int(Math.floor(v)); }
      case 'sign': { const v = x().v; return int(Math.sign(v)); }
      case 'rnd': { const v = x().v; return V(+v.toPrecision(10)); }
      case 'ranint': { const lo = Math.ceil(ev(a[0]).v), hi = Math.floor(ev(a[1]).v); if (hi < lo) err('Math ERROR'); return int(lo + Math.floor(env.rnd() * (hi - lo + 1))); }
      case 'gcd': case 'lcm': {
        const p = ev(a[0]).v, q = ev(a[1]).v; if (!Number.isInteger(p) || !Number.isInteger(q)) err('Math ERROR');
        const g = gcd(p, q); return int(f === 'gcd' ? g : (g ? Math.abs(p * q) / g : 0));
      }
      case 'fact!': { const n = x().v; if (!Number.isInteger(n) || n < 0 || n > 69) err('Math ERROR'); let r = 1; for (let k = 2; k <= n; k++) r *= k; return V(r, SI(r) ? EX.mk(r) : null); }
      case 'deriv': return derivative(a, ev, withX, over, env);
      case 'integ': return integral(a, ev, withX, over);
      case 'sum': {
        const lo = ev(a[1]).v, hi = ev(a[2]).v; if (!Number.isInteger(lo) || !Number.isInteger(hi) || hi < lo || hi - lo > 100000) err('Math ERROR');
        let s = R.zero(); for (let k = lo; k <= hi; k++) s = withX(int(k), () => R.add(s, ev(a[0]))); return s;
      }
      case 'not': case 'neg': err('Syntax ERROR');
      default: err('Syntax ERROR');
    }
  };
  function invExact(a0, rad, f) {
    let ex = null; const e = a0.ex;
    const set = d => { const u = env.angle; if (u === 'deg') ex = EX.mk(d); else if (u === 'gra') ex = EX.mk(d * 10, 9); else ex = EX.mk(d, 180, 1, 1); };
    if (e && e.p === 0) {
      const k = (e.n < 0 ? -1 : 1), t = (x, y, z) => e.n * k === x && e.d === y && e.s === z;
      if (f === 'asin') { if (e.n === 0) set(0); else if (t(1, 2, 1)) set(30 * k); else if (t(1, 2, 2)) set(45 * k); else if (t(1, 2, 3)) set(60 * k); else if (t(1, 1, 1)) set(90 * k); }
      else if (f === 'acos') { const c = x => 90 - x; if (e.n === 0) set(90); else if (t(1, 2, 1)) set(c(30 * k)); else if (t(1, 2, 2)) set(c(45 * k)); else if (t(1, 2, 3)) set(c(60 * k)); else if (t(1, 1, 1)) set(c(90 * k)); }
      else if (f === 'atan') { if (e.n === 0) set(0); else if (t(1, 1, 1)) set(45 * k); else if (t(1, 3, 3)) set(30 * k); else if (t(1, 1, 3)) set(60 * k); }
    }
    return ex ? V(EX.val(ex), ex) : fromRad(rad);
  }
  switch (node.t) {
    case 'num': { const exact = !/[.e]/.test(node.v) && node.ex !== false; const n = parseFloat(node.v); return O.fromNum(n, exact); }
    case 'e10': { const a = ev(node.a); const f = Math.pow(10, node.e); return cplx ? C(a.re * f, a.im * f) : V(a.v * f); }
    case 'const': {
      if (node.v === 'pi') return cplx ? C(PI) : V(PI, EX.mk(1, 1, 1, 1));
      if (node.v === 'e') return cplx ? C(Math.E) : V(Math.E);
      if (node.v === 'i') { if (!cplx) err('Syntax ERROR'); return C(0, 1); }
      break;
    }
    case 'var': {
      const n = node.v;
      if (n === 'Ran#') return O.fromNum(Math.floor(env.rnd() * 1000) / 1000, false);
      if (n in over && over[n] != null && n === 'X') return over.X;
      const val = n === 'Ans' ? env.ans : n === 'PreAns' ? env.preans : env.vars[n];
      return val == null ? O.zero() : (cplx && val.v !== undefined ? C(val.v) : (!cplx && val.re !== undefined ? V(val.re) : val));
    }
    case 'neg': return O.neg(ev(node.a));
    case 'bin': {
      const o = node.o;
      if (o === '+') return O.add(ev(node.a), ev(node.b));
      if (o === '-') return O.sub(ev(node.a), ev(node.b));
      if (o === '*') return O.mul(ev(node.a), ev(node.b));
      if (o === '/') return O.div(ev(node.a), ev(node.b));
      if (o === '^') return O.pow(ev(node.a), ev(node.b));
      if (o === 'nCr' || o === 'nPr') {
        const n = num(node.a).v, r = num(node.b).v; if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || n < r || n > 1e6) err('Math ERROR');
        let x = 1; if (o === 'nPr') for (let k = 0; k < r; k++) x *= n - k; else { const rr = Math.min(r, n - r); for (let k = 1; k <= rr; k++) x = x * (n - rr + k) / k; x = Math.round(x); }
        return V(x, SI(x) ? EX.mk(x) : null);
      }
      err('Syntax ERROR');
    }
    case 'root': { const n = ev(node.a), x = ev(node.b); return O.pow(x, O.div(O.one(), n)); }
    case 'dms': { const a = ev(node.a); const q = O.div(a, O.fromNum(node.div, true)); return cplx ? q : V(q.v); }
    case 'unit': {
      const a = num(node.a); const u = node.u === 'ᵈ' ? 'deg' : node.u === 'ʳ' ? 'rad' : 'gra';
      const rad = a.v / UNIT[u]; return V(rad * UNIT[env.angle]);
    }
    case 'fn': return evalFn(node.f, node.a);
    case 'eq': err('Syntax ERROR');
  }
  err('Syntax ERROR');
}
function evalCplxFn(f, a, env, ev) {
  const x = () => ev(a[0]);
  switch (f) {
    case 'abs': return C(Cx.abs(x()));
    case 'arg': return C(Cx.arg(x()) * UNIT[env.angle]);
    case 'conj': { const z = x(); return C(z.re, -z.im); }
    case 're': return C(x().re); case 'im': return C(x().im);
    case 'sqrt': return Cx.sqrt(x());
    case 'exp': return Cx.exp(x());
    case 'ln': return Cx.ln(x());
    case 'log': return Cx.div(Cx.ln(x()), C(Math.LN10));
    case 'sin': { const z = x(); return C(Math.sin(z.re) * Math.cosh(z.im), Math.cos(z.re) * Math.sinh(z.im)); }
    case 'cos': { const z = x(); return C(Math.cos(z.re) * Math.cosh(z.im), -Math.sin(z.re) * Math.sinh(z.im)); }
    case 'fact!': { const z = x(); if (z.im || !Number.isInteger(z.re) || z.re < 0 || z.re > 69) err('Math ERROR'); let r = 1; for (let k = 2; k <= z.re; k++) r *= k; return C(r); }
    default: { const z = x(); if (Math.abs(z.im) > 1e-12) err('Math ERROR'); const rr = evalAst({ t: 'fn', f, a: [{ t: 'num', v: String(z.re) }] }, Object.assign({}, env, { mode: 'comp' }), {}); return C(rr.v); }
  }
}
function numericFn(a, ev, withX, over) { return x => withX(V(x), () => ev(a)).v; }
function derivative(a, ev, withX, over, env) {
  const x0 = ev(a[1]).v, f = numericFn(a[0], ev, withX, over);
  const h0 = Math.max(1e-3, Math.abs(x0) * 1e-3); const D = [];
  let h = h0; const T = [];
  for (let i = 0; i < 6; i++) { T[i] = [(f(x0 + h) - f(x0 - h)) / (2 * h)]; for (let j = 1; j <= i; j++) T[i][j] = (Math.pow(4, j) * T[i][j - 1] - T[i - 1][j - 1]) / (Math.pow(4, j) - 1); h /= 2; }
  const v = T[5][5]; if (!Number.isFinite(v)) err('Math ERROR');
  const r = +v.toPrecision(9); return V(Math.abs(r) < 1e-9 ? 0 : r, Number.isInteger(r) && Math.abs(r) < 1e12 ? EX.mk(r) : null);
}
function integral(a, ev, withX, over) {
  const lo = ev(a[1]).v, hi = ev(a[2]).v, f = numericFn(a[0], ev, withX, over);
  if (lo === hi) return int(0);
  const gl = [[-0.9061798459386640, 0.2369268850561891], [-0.5384693101056831, 0.4786286704993665], [0, 0.5688888888888889], [0.5384693101056831, 0.4786286704993665], [0.9061798459386640, 0.2369268850561891]];
  const g5 = (x0, x1) => { const m = (x0 + x1) / 2, h = (x1 - x0) / 2; let s = 0; gl.forEach(([x, w]) => { const y = f(m + h * x); if (!Number.isFinite(y)) err('Math ERROR'); s += w * y; }); return s * h; };
  const rec = (x0, x1, whole, depth) => { const m = (x0 + x1) / 2, l = g5(x0, m), r = g5(m, x1); if (depth > 18 || Math.abs(l + r - whole) < 1e-11 * (1 + Math.abs(whole))) return l + r; return rec(x0, m, l, depth + 1) + rec(m, x1, r, depth + 1); };
  const N = 8; let s = 0; for (let k = 0; k < N; k++) { const x0 = lo + (hi - lo) * k / N, x1 = lo + (hi - lo) * (k + 1) / N; s += rec(x0, x1, g5(x0, x1), 0); }
  const r = +s.toPrecision(10); const z = Math.abs(r) < 1e-10 ? 0 : r; return V(z, Number.isInteger(z) && Math.abs(z) < 1e12 ? EX.mk(z) : null);
}

/* ---------- SOLVE ---------- */
function solve(src, env, guess) {
  const ast = parse(src), L = ast.t === 'eq' ? ast.l : ast, Rn = ast.t === 'eq' ? ast.r : null;
  const over = {}, f = x => { over.X = V(x); const a = evalAst(L, env, over); const b = Rn ? evalAst(Rn, env, over) : { v: 0 }; return (a.v) - (b.v); };
  const safe = x => { try { const y = f(x); return Number.isFinite(y) ? y : NaN; } catch { return NaN; } };
  let x = guess;
  for (let it = 0; it < 80; it++) {
    const y = safe(x); if (Number.isNaN(y)) break; if (Math.abs(y) < 1e-14) return { x, r: y };
    const h = 1e-6 * (1 + Math.abs(x)), d = (safe(x + h) - safe(x - h)) / (2 * h); if (!Number.isFinite(d) || d === 0) break;
    const nx = x - y / d; if (!Number.isFinite(nx)) break; if (Math.abs(nx - x) < 1e-13 * (1 + Math.abs(x))) { x = nx; if (Math.abs(safe(x)) < 1e-6) return { x, r: safe(x) }; break; } x = nx;
  }
  for (let w = 0.5; w < 1e7; w *= 2) {                                // bracket search outward from the guess
    let prev = guess, py = safe(prev);
    for (let k = 1; k <= 400; k++) for (const sgn of [1, -1]) {
      const c = guess + sgn * w * k / 40, cy = safe(c);
      if (!Number.isNaN(cy) && !Number.isNaN(py) && py * cy <= 0) { let lo = Math.min(prev, c), hi = Math.max(prev, c); for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; const ym = safe(m); if (safe(lo) * ym <= 0) hi = m; else lo = m; } const rt = (lo + hi) / 2; return { x: rt, r: safe(rt) }; }
      if (sgn === 1) { prev = c; py = cy; }
    }
    break;
  }
  err('Can\'t Solve');
}

/* ---------- display formatting ---------- */
function cleanFloat(v) { if (v === 0) return 0; return Number(v.toPrecision(12)); }
function fmtFloat(v, st = {}) {
  if (!Number.isFinite(v)) return 'Math ERROR'; v = cleanFloat(v); if (v === 0) return '0';
  const m = st.fmt || 'norm1', n = st.digits || 0, a = Math.abs(v);
  const sci = (x, d) => { let s = x.toExponential(d); let [mant, e] = s.split('e'); if (d === undefined) { mant = String(Number(mant)); } e = parseInt(e); return mant + '×10^' + e; };
  const eng = x => { let e = Math.floor(Math.log10(Math.abs(x)) / 3) * 3 + 3 * (st.engOff || 0); let mant = x / Math.pow(10, e); return String(Number(mant.toPrecision(10))) + '×10^' + e; };
  if (st.eng) return eng(v);
  if (m === 'fix') return v.toFixed(Math.min(9, n));
  if (m === 'sci') return sci(v, Math.max(0, (n || 10) - 1));
  const lo = m === 'norm2' ? 1e-9 : 1e-2;
  if (a >= 1e10 || a < lo) { const s = v.toExponential(9); const [mant, e] = s.split('e'); return String(Number(mant)) + '×10^' + parseInt(e); }
  return String(Number(v.toPrecision(10)));
}
function fmtExact(e, st = {}) {
  const sign = e.n < 0 ? '-' : ''; const n = Math.abs(e.n);
  if (e.n === 0) return '0';
  if (e.s === 1 && e.p === 0 && st.mixed && n > e.d && e.d > 1) { const w = Math.floor(n / e.d), r = n % e.d; return sign + w + ' ' + r + '/' + e.d; }
  let top = (n !== 1 || (e.s === 1 && e.p === 0) ? String(n) : '') + (e.p ? 'π' : '') + (e.s > 1 ? '√' + e.s : '');
  if (!top) top = '1'; return sign + top + (e.d !== 1 ? '/' + e.d : '');
}
function fmtVal(x, st = {}) {
  if (x.re !== undefined) return fmtComplex(x, st);
  if (x.ex && !st.dec && !st.eng && st.exact !== false) return fmtExact(x.ex, st);
  return fmtFloat(x.v, st);
}
function fmtComplex(z, st) {
  const f = v => fmtFloat(v, st);
  if (st.polar) { const r = Cx.abs(z), t = Cx.arg(z) * UNIT[st.angle || 'deg']; return f(r) + '∠' + f(t); }
  const sc = Math.max(Math.abs(z.re), Math.abs(z.im)); const re = cleanFloat(Math.abs(z.re) < 1e-12 * sc ? 0 : z.re), im = cleanFloat(Math.abs(z.im) < 1e-12 * sc ? 0 : z.im);
  if (im === 0) return f(re);
  const ims = Math.abs(im) === 1 ? '' : f(Math.abs(im));
  return (re === 0 ? '' : f(re)) + (im < 0 ? '-' : (re === 0 ? '' : '+')) + ims + 'i';
}
function ratApprox(x, maxD = 10000) {                      // fraction string for plain floats (used by modes)
  if (!Number.isFinite(x)) return null; if (Number.isInteger(x)) return null;
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = Math.abs(x);
  for (let i = 0; i < 30; i++) { const a = Math.floor(b); const h2 = a * h1 + h0, k2 = a * k1 + k0; if (k2 > maxD) return null; h0 = h1; h1 = h2; k0 = k1; k1 = k2; if (Math.abs(Math.abs(x) - h1 / k1) < 1e-11 * Math.abs(x)) return (x < 0 ? '-' : '') + h1 + '/' + k1; if (b - a === 0) break; b = 1 / (b - a); }
  return null;
}
const smart = (x, st = {}) => { x = cleanFloat(x); if (!st.dec) { const r = ratApprox(x); if (r) return r; } return fmtFloat(x, st); };

/* ---------- top-level calculate ---------- */
function toSrc(atoms) { return atoms.map(a => a.s).join(''); }
const SUFFIX = ['►DMS', '►r∠θ', '►a+bi', '►Dec', '►Hex', '►Bin', '►Oct', 'ENG', 'ENG←'];
function calculate(src, env, st) {
  let cmd = null; for (const c of SUFFIX) if (src.endsWith(c)) { cmd = c; src = src.slice(0, -c.length); break; }
  const ast = parse(src);
  if (ast.t === 'eq') err('Syntax ERROR');
  const over = {};
  if (src.includes('Fact(') ) { /* handled below */ }
  const fm = /^fact\((.*)\)$/.exec(src);
  if (fm) { const n = evalAst(parse(fm[1]), env, over).v; return { text: factorText(n) }; }
  const pm = /^(pol|rec)\((.*)\)$/.exec(src);
  if (pm) {
    const parts = splitTop(pm[2]); if (parts.length !== 2) err('Syntax ERROR');
    const A0 = evalAst(parse(parts[0]), env, over), B0 = evalAst(parse(parts[1]), env, over), a = A0.v, b = B0.v;
    if (pm[1] === 'pol') { const rv = R.sqrt(R.add(R.mul(A0, A0), R.mul(B0, B0))), th = Math.atan2(b, a) * UNIT[env.angle]; return { multi: [['r', rv], ['θ', V(cleanFloat(th))]], set: { X: rv, Y: V(th) } }; }
    const th = a * 0 + b / UNIT[env.angle]; const x = a * Math.cos(th), y = a * Math.sin(th);
    return { multi: [['x', V(Math.abs(x) < 1e-14 ? 0 : x)], ['y', V(Math.abs(y) < 1e-14 ? 0 : y)]], set: { X: V(x), Y: V(y) } };
  }
  let val = evalAst(ast, env, over);
  if (env.mode === 'cmplx') { return { val, polar: cmd === '►r∠θ' ? true : cmd === '►a+bi' ? false : undefined }; }
  if (cmd === '►DMS') return { val, text: toDMS(val.v) };
  return { val, eng: cmd === 'ENG' ? 1 : cmd === 'ENG←' ? -1 : 0 };
}
function splitTop(s) { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; }
function toDMS(v) { const neg = v < 0; v = Math.abs(v); let d = Math.floor(v + 1e-12), m = Math.floor((v - d) * 60 + 1e-9), s = ((v - d) * 60 - m) * 60; s = Math.round(s * 1e6) / 1e6; if (s >= 60) { s = 0; m++; } if (m >= 60) { m = 0; d++; } return (neg ? '-' : '') + d + '°' + m + '′' + s + '″'; }
function factorText(n) {
  if (!Number.isInteger(n) || n < 2 || n > 9999999999) err('Math ERROR'); const out = []; let x = n;
  for (let f = 2; f * f <= x; f += f === 2 ? 1 : 2) { let c = 0; while (x % f === 0) { x /= f; c++; } if (c) out.push([f, c]); }
  if (x > 1) out.push([x, 1]); const sup = c => String(c).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]).join('');
  return out.map(([f, c]) => c > 1 ? f + sup(c) : String(f)).join(' × ');
}

/* ---------- BASE-N (integer, 32-bit two's complement) ---------- */
function baseEval(src, base) {
  const digits = { 2: '01', 8: '01234567', 10: '0123456789', 16: '0123456789ABCDEF' }[base];
  const T = []; let i = 0;
  while (i < src.length) {
    const rest = src.slice(i); let m;
    if ((m = /^(xnor|xor|and|or|Not|Neg)/.exec(rest))) { T.push({ k: m[0] }); i += m[0].length; continue; }
    if ('+-*/()'.includes(rest[0])) { T.push({ k: rest[0] }); i++; continue; }
    if (digits.includes(rest[0])) { let j = i; while (j < src.length && digits.includes(src[j])) j++; const w = src.slice(i, j); const n = parseInt(w, base); T.push({ k: 'n', v: n }); i = j; continue; }
    err('Syntax ERROR');
  }
  let open = 0; T.forEach(t => { if (t.k === '(') open++; else if (t.k === ')') open--; }); while (open-- > 0) T.push({ k: ')' });
  let p = 0; const pk = () => T[p], eat = k => pk() && pk().k === k && (p++, true);
  const w32 = x => { x = Number(BigInt.asIntN(32, BigInt(Math.trunc(x)))); return x; };
  const chk = x => { if (x > 2147483647 || x < -2147483648) err('Math ERROR'); return x; };
  const expr = () => { let a = and_(); for (;;) { if (eat('or')) a = w32(a | and_()); else if (eat('xor')) a = w32(a ^ and_()); else if (eat('xnor')) a = w32(~(a ^ and_())); else return a; } };
  const and_ = () => { let a = add(); while (eat('and')) a = w32(a & add()); return a; };
  const add = () => { let a = mul(); for (;;) { if (eat('+')) a = chk(a + mul()); else if (eat('-')) a = chk(a - mul()); else return a; } };
  const mul = () => { let a = un(); for (;;) { if (eat('*')) a = chk(a * un()); else if (eat('/')) { const b = un(); if (b === 0) err('Math ERROR'); a = Math.trunc(a / b); } else return a; } };
  const un = () => { if (eat('-')) return -un(); if (eat('Not')) return w32(~un()); if (eat('Neg')) return chk(-un()); return pr(); };
  const pr = () => { const t = pk(); if (!t) err('Syntax ERROR'); if (t.k === 'n') { p++; if (t.v > 4294967295) err('Math ERROR'); return w32(t.v); } if (eat('(')) { const v = expr(); if (!eat(')')) err('Syntax ERROR'); return v; } err('Syntax ERROR'); };
  const r = expr(); if (p < T.length) err('Syntax ERROR'); return r;
}
function baseStr(n, base) { const u = n < 0 ? n + 4294967296 : n; return u.toString(base).toUpperCase(); }

/* ---------- STAT ---------- */
function statCalc(rows, type) {            // rows: [{x, y, f}] ; type: '1var' | 'lin' | 'quad' | 'ln' | 'exp' | 'ab' | 'pow' | 'inv'
  rows = rows.filter(r => Number.isFinite(r.x) && r.f > 0 && (type === '1var' || Number.isFinite(r.y)));
  const n = rows.reduce((s, r) => s + r.f, 0); if (!n) err('No Data');
  const out = {}; const sum = f => rows.reduce((s, r) => s + r.f * f(r), 0);
  out.n = n; out.sx = sum(r => r.x); out.sx2 = sum(r => r.x * r.x); out.mx = out.sx / n;
  out.sigx = Math.sqrt(Math.max(0, out.sx2 / n - out.mx * out.mx)); out.sdx = n > 1 ? Math.sqrt(Math.max(0, (out.sx2 - n * out.mx * out.mx) / (n - 1))) : NaN;
  const xs = []; rows.slice().sort((a, b) => a.x - b.x).forEach(r => { for (let k = 0; k < r.f && xs.length < 100000; k++) xs.push(r.x); });
  out.min = xs[0]; out.max = xs[xs.length - 1];
  const med = a => { const m = a.length; return m % 2 ? a[(m - 1) / 2] : (a[m / 2 - 1] + a[m / 2]) / 2; };
  out.med = med(xs); const h = Math.floor(xs.length / 2); out.q1 = med(xs.slice(0, h)); out.q3 = med(xs.slice(xs.length - h));
  out.sx3 = sum(r => r.x ** 3); out.sx4 = sum(r => r.x ** 4);
  if (type === '1var') return out;
  out.sy = sum(r => r.y); out.sy2 = sum(r => r.y * r.y); out.sxy = sum(r => r.x * r.y); out.my = out.sy / n;
  out.sigy = Math.sqrt(Math.max(0, out.sy2 / n - out.my * out.my)); out.sdy = n > 1 ? Math.sqrt(Math.max(0, (out.sy2 - n * out.my * out.my) / (n - 1))) : NaN;
  const tx = { lin: x => x, quad: x => x, ln: x => Math.log(x), exp: x => x, ab: x => x, pow: x => Math.log(x), inv: x => 1 / x }[type];
  const ty = { lin: y => y, quad: y => y, ln: y => y, exp: y => Math.log(y), ab: y => Math.log(y), pow: y => Math.log(y), inv: y => y }[type];
  const pts = rows.map(r => ({ x: tx(r.x), y: ty(r.y), f: r.f })); if (pts.some(q => !Number.isFinite(q.x) || !Number.isFinite(q.y))) err('Math ERROR');
  if (type === 'quad') {
    const s = (f) => pts.reduce((a, q) => a + q.f * f(q), 0), S = [[s(q => q.x ** 4), s(q => q.x ** 3), s(q => q.x ** 2), s(q => q.x ** 2 * q.y)], [s(q => q.x ** 3), s(q => q.x ** 2), s(q => q.x), s(q => q.x * q.y)], [s(q => q.x ** 2), s(q => q.x), n, s(q => q.y)]];
    const sol = gauss(S); if (!sol) err('Math ERROR'); out.c = sol[0]; out.b = sol[1]; out.a = sol[2]; return out;
  }
  const sx = pts.reduce((a, q) => a + q.f * q.x, 0), sy = pts.reduce((a, q) => a + q.f * q.y, 0), sxx = pts.reduce((a, q) => a + q.f * q.x * q.x, 0), syy = pts.reduce((a, q) => a + q.f * q.y * q.y, 0), sxy = pts.reduce((a, q) => a + q.f * q.x * q.y, 0);
  const den = n * sxx - sx * sx; if (den === 0) err('Math ERROR');
  let b = (n * sxy - sx * sy) / den, a = (sy - b * sx) / n; const rr = (n * sxy - sx * sy) / Math.sqrt(den * (n * syy - sy * sy));
  out.r = rr;
  if (type === 'exp') { out.a = Math.exp(a); out.b = b; } else if (type === 'ab') { out.a = Math.exp(a); out.b = Math.exp(b); } else if (type === 'pow') { out.a = Math.exp(a); out.b = b; } else { out.a = a; out.b = b; }
  return out;
}
function statPredict(out, type, x) {       // y-hat from x
  const { a, b, c } = out;
  return { lin: a + b * x, quad: a + b * x + c * x * x, ln: a + b * Math.log(x), exp: a * Math.exp(b * x), ab: a * Math.pow(b, x), pow: a * Math.pow(x, b), inv: a + b / x }[type];
}
function statInverse(out, type, y) {       // x-hat from y (may give two values for quadratic)
  const { a, b, c } = out;
  switch (type) {
    case 'lin': return [(y - a) / b]; case 'ln': return [Math.exp((y - a) / b)]; case 'exp': return [Math.log(y / a) / b]; case 'ab': return [Math.log(y / a) / Math.log(b)];
    case 'pow': return [Math.pow(y / a, 1 / b)]; case 'inv': return [b / (y - a)];
    case 'quad': { const D = b * b - 4 * c * (a - y); if (D < 0) return []; return D === 0 ? [-b / (2 * c)] : [(-b + Math.sqrt(D)) / (2 * c), (-b - Math.sqrt(D)) / (2 * c)]; }
  }
}
function gauss(M) {                          // solve augmented n x (n+1); returns null if singular
  const n = M.length; M = M.map(r => r.slice());
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; if (Math.abs(M[p][c]) < 1e-12) return null; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } }
  return M.map((r, i) => r[n] / r[i]);
}

/* ---------- EQN ---------- */
function polyRoots(co) {                     // co = [a, b, c] or [a, b, c, d]; returns complex roots [{re, im}]
  const a = co[0]; if (a === 0) err('Math ERROR');
  if (co.length === 3) {
    const [, b, c] = co, D = b * b - 4 * a * c;
    if (D >= 0) { const s = Math.sqrt(D); return [C((-b + s) / (2 * a)), C((-b - s) / (2 * a))]; }
    const s = Math.sqrt(-D); return [C(-b / (2 * a), s / (2 * a)), C(-b / (2 * a), -s / (2 * a))];
  }
  const b = co[1] / a, c = co[2] / a, d = co[3] / a, p = c - b * b / 3, q = 2 * b * b * b / 27 - b * c / 3 + d, sh = -b / 3;
  const disc = q * q / 4 + p * p * p / 27, out = [];
  if (Math.abs(disc) < 1e-13) { if (Math.abs(p) < 1e-13) return [C(sh), C(sh), C(sh)]; const u = Math.cbrt(-q / 2); return [C(2 * u + sh), C(-u + sh), C(-u + sh)]; }
  if (disc > 0) {
    const s = Math.sqrt(disc), u = Math.cbrt(-q / 2 + s), v = Math.cbrt(-q / 2 - s), y1 = u + v;
    out.push(C(y1 + sh), C(-y1 / 2 + sh, Math.sqrt(3) / 2 * (u - v)), C(-y1 / 2 + sh, -Math.sqrt(3) / 2 * (u - v)));
  } else {
    const r = 2 * Math.sqrt(-p / 3), th = Math.acos(Math.max(-1, Math.min(1, 3 * q / (p * r)))) / 3;
    for (let k = 0; k < 3; k++) out.push(C(r * Math.cos(th - 2 * PI * k / 3) + sh));
  }
  return out;
}
function linSolve(M) { const s = gauss(M); if (!s) return null; return s; }

/* ---------- MATRIX / VECTOR ---------- */
const Mx = {
  add: (A, B) => { if (A.length !== B.length || A[0].length !== B[0].length) err('Dimension ERROR'); return A.map((r, i) => r.map((x, j) => x + B[i][j])); },
  sub: (A, B) => { if (A.length !== B.length || A[0].length !== B[0].length) err('Dimension ERROR'); return A.map((r, i) => r.map((x, j) => x - B[i][j])); },
  mul: (A, B) => { if (A[0].length !== B.length) err('Dimension ERROR'); return A.map((r, i) => B[0].map((_, j) => r.reduce((s, x, k) => s + x * B[k][j], 0))); },
  scale: (A, k) => A.map(r => r.map(x => x * k)),
  trn: A => A[0].map((_, j) => A.map(r => r[j])),
  det(A) { if (A.length !== A[0].length) err('Dimension ERROR'); const n = A.length; if (n === 1) return A[0][0]; if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0]; let d = 0; for (let j = 0; j < n; j++) d += (j % 2 ? -1 : 1) * A[0][j] * Mx.det(A.slice(1).map(r => r.filter((_, c) => c !== j))); return d; },
  inv(A) {
    if (A.length !== A[0].length) err('Dimension ERROR'); const n = A.length, d = Mx.det(A); if (Math.abs(d) < 1e-14) err('Math ERROR');
    if (n === 1) return [[1 / A[0][0]]];
    const cof = A.map((r, i) => r.map((_, j) => ((i + j) % 2 ? -1 : 1) * Mx.det(n === 2 ? [[A[1 - i][1 - j]]] : A.filter((_, ii) => ii !== i).map(rr => rr.filter((_, jj) => jj !== j)))));
    return Mx.trn(cof).map(r => r.map(x => x / d));
  },
  pow(A, k) { if (A.length !== A[0].length) err('Dimension ERROR'); let r = A.map((row, i) => row.map((_, j) => i === j ? 1 : 0)); for (let i = 0; i < k; i++) r = Mx.mul(r, A); return r; }
};
const Vc = {
  add: (a, b) => { if (a.length !== b.length) err('Dimension ERROR'); return a.map((x, i) => x + b[i]); }, sub: (a, b) => { if (a.length !== b.length) err('Dimension ERROR'); return a.map((x, i) => x - b[i]); },
  scale: (a, k) => a.map(x => x * k), dot: (a, b) => { if (a.length !== b.length) err('Dimension ERROR'); return a.reduce((s, x, i) => s + x * b[i], 0); },
  cross(a, b) { if (a.length !== 3 || b.length !== 3) err('Dimension ERROR'); return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; },
  abs: a => Math.sqrt(a.reduce((s, x) => s + x * x, 0)),
  unit(a) { const m = Vc.abs(a); if (!m) err('Math ERROR'); return a.map(x => x / m); },
  ang(a, b, unit) { const m = Vc.abs(a) * Vc.abs(b); if (!m) err('Math ERROR'); return Math.acos(Math.max(-1, Math.min(1, Vc.dot(a, b) / m))) * UNIT[unit || 'deg']; }
};

/* ---------- constants and unit conversions (fx-991ES PLUS tables) ---------- */
const CONSTS = [
  ['mp', 'proton mass', 1.672621777e-27], ['mn', 'neutron mass', 1.674927351e-27], ['me', 'electron mass', 9.10938291e-31], ['mμ', 'muon mass', 1.883531475e-28],
  ['a0', 'Bohr radius', 5.2917721092e-11], ['h', 'Planck constant', 6.62606957e-34], ['μN', 'nuclear magneton', 5.05078353e-27], ['μB', 'Bohr magneton', 9.27400968e-24],
  ['ħ', 'Planck constant over 2π', 1.054571726e-34], ['α', 'fine-structure constant', 7.2973525698e-3], ['re', 'classical electron radius', 2.8179403267e-15], ['λc', 'Compton wavelength', 2.4263102389e-12],
  ['γp', 'proton gyromagnetic ratio', 2.675222005e8], ['λcp', 'proton Compton wavelength', 1.32140985623e-15], ['λcn', 'neutron Compton wavelength', 1.31959090608e-15], ['R∞', 'Rydberg constant', 10973731.568539],
  ['u', 'atomic mass unit', 1.660538921e-27], ['μp', 'proton magnetic moment', 1.410606743e-26], ['μe', 'electron magnetic moment', -9.28476430e-24], ['μn', 'neutron magnetic moment', -9.6623647e-27],
  ['μμ', 'muon magnetic moment', -4.49044807e-26], ['F', 'Faraday constant', 96485.3365], ['e', 'elementary charge', 1.602176565e-19], ['NA', 'Avogadro constant', 6.02214129e23],
  ['k', 'Boltzmann constant', 1.3806488e-23], ['Vm', 'molar volume of ideal gas', 0.022413968], ['R', 'molar gas constant', 8.3144621], ['C0', 'speed of light', 299792458],
  ['C1', 'first radiation constant', 3.74177153e-16], ['C2', 'second radiation constant', 1.4387770e-2], ['σ', 'Stefan-Boltzmann constant', 5.670373e-8], ['ε0', 'electric constant', 8.854187817e-12],
  ['μ0', 'magnetic constant', 1.256637061e-6], ['Φ0', 'magnetic flux quantum', 2.067833758e-15], ['g', 'standard gravity', 9.80665], ['G0', 'conductance quantum', 7.7480917346e-5],
  ['Z0', 'characteristic impedance of vacuum', 376.730313461], ['t', 'Celsius temperature', 273.15], ['G', 'gravitational constant', 6.67384e-11], ['atm', 'standard atmosphere', 101325]
];
const CONV = [
  ['in → cm', x => x * 2.54], ['cm → in', x => x / 2.54], ['ft → m', x => x * 0.3048], ['m → ft', x => x / 0.3048], ['yd → m', x => x * 0.9144], ['m → yd', x => x / 0.9144],
  ['mile → km', x => x * 1.609344], ['km → mile', x => x / 1.609344], ['n mile → m', x => x * 1852], ['m → n mile', x => x / 1852], ['acre → m²', x => x * 4046.8564224], ['m² → acre', x => x / 4046.8564224],
  ['gal (US) → ℓ', x => x * 3.785411784], ['ℓ → gal (US)', x => x / 3.785411784], ['gal (UK) → ℓ', x => x * 4.54609], ['ℓ → gal (UK)', x => x / 4.54609], ['pc → km', x => x * 3.08567782e13], ['km → pc', x => x / 3.08567782e13],
  ['km/h → m/s', x => x * 1000 / 3600], ['m/s → km/h', x => x * 3.6], ['oz → g', x => x * 28.349523125], ['g → oz', x => x / 28.349523125], ['lb → kg', x => x * 0.45359237], ['kg → lb', x => x / 0.45359237],
  ['atm → Pa', x => x * 101325], ['Pa → atm', x => x / 101325], ['mmHg → Pa', x => x * 101325 / 760], ['Pa → mmHg', x => x * 760 / 101325], ['hp → kW', x => x * 0.74569987158], ['kW → hp', x => x / 0.74569987158],
  ['kgf/cm² → Pa', x => x * 98066.5], ['Pa → kgf/cm²', x => x / 98066.5], ['kgf·m → J', x => x * 9.80665], ['J → kgf·m', x => x / 9.80665], ['lbf/in² → kPa', x => x * 6.8947572932], ['kPa → lbf/in²', x => x / 6.8947572932],
  ['°F → °C', x => (x - 32) * 5 / 9], ['°C → °F', x => x * 9 / 5 + 32], ['J → cal', x => x / 4.1868], ['cal → J', x => x * 4.1868]
];

const api = { V, R, Cx, C, EX, int, parse, evalAst, makeEnv, calculate, solve, fmtFloat, fmtExact, fmtVal, fmtComplex, smart, ratApprox, cleanFloat, toSrc, baseEval, baseStr, statCalc, statPredict, statInverse, gauss, polyRoots, Mx, Vc, CONSTS, CONV, toDMS, factorText, splitTop, UNIT };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CalcEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
