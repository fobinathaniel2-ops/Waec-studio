const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const show = (t, v) => { (typeof t === 'string' ? $(t) : t).hidden = !v; };
const loader = { on(m) { $('#ltxt').textContent = m; show('#loader', true); }, off() { show('#loader', false); } };
/* questions already asked, remembered per subject so the same question never comes back */
const seenKey = s => 'seen:' + String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60);
const seenGet = s => { try { return JSON.parse(localStorage.getItem(seenKey(s)) || '[]'); } catch { return []; } };
const seenAdd = (s, d) => { try { const all = [...seenGet(s), ...[...(d.objective || []), ...(d.theory || [])].map(x => String(x.q).replace(/\s+/g, ' ').slice(0, 160))]; localStorage.setItem(seenKey(s), JSON.stringify(all.slice(-150))); } catch {} };
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

/* ---------- subject colour: the whole app tints itself to the subject ---------- */
const ACC = [[/math|further/i, '#FF8A3D'], [/phys/i, '#5BC0FF'], [/chem/i, '#C4F23C'], [/bio|science|agric|health/i, '#4EE08F'], [/engl|liter|french|lang|relig|islam|christ|arabic/i, '#FF8FC7'], [/hist/i, '#FF7A7A'], [/social|govern|geo|econ|account|business|commerc|cost/i, '#FFD23F'], [/ict|comput|tech/i, '#3DE8D0']];
const accFor = s => { const hit = ACC.find(a => a[0].test(s || '')); return hit ? hit[1] : '#A78BFF'; };
function theme(s) { document.documentElement.style.setProperty('--acc', accFor(s)); }
['#lsubject', '#pSubject'].forEach(id => $(id).addEventListener('input', e => theme(e.target.value)));
theme(store.get('lsub'));

/* ---------- study streak ---------- */
const day = d => new Date(d).toISOString().slice(0, 10);
function drawStreak() {
  let s = {}; try { s = JSON.parse(store.get('streak') || '{}'); } catch {}
  const live = s.last === day(Date.now()) || s.last === day(Date.now() - 864e5);
  const c = $('#streak'); if (!live || !s.n) return show(c, false);
  c.textContent = `🔥 ${s.n} day${s.n > 1 ? 's' : ''}`; show(c, true);
}
function bump() {
  let s = {}; try { s = JSON.parse(store.get('streak') || '{}'); } catch {}
  const t = day(Date.now()); if (s.last !== t) { s.n = s.last === day(Date.now() - 864e5) ? (s.n || 0) + 1 : 1; s.last = t; store.set('streak', JSON.stringify(s)); }
  drawStreak();
}
drawStreak();

/* ---------- confetti for a good score ---------- */
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = el('canvas', 'confetti'); c.width = innerWidth; c.height = innerHeight; document.body.append(c);
  const g = c.getContext('2d'), cols = ['#A78BFF', '#FF8FC7', '#FFD23F', '#4EE08F', '#5BC0FF', '#FF8A3D'];
  const ps = Array.from({ length: 110 }, () => ({ x: c.width / 2, y: c.height * .45, vx: (Math.random() - .5) * 15, vy: -Math.random() * 15 - 4, s: 6 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[Math.random() * cols.length | 0] }));
  let f = 0;
  (function tick() {
    g.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => { p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); });
    if (++f < 130) requestAnimationFrame(tick); else c.remove();
  })();
}

/* One request per tap. If it fails, the message shows and the user decides when to try again. */
async function api(path, body) {
  for (let t = 0; t < 2; t++) {
    const sent = store.get('code') || '';
    let r, d;
    try {
      r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-access-code': sent }, body: JSON.stringify(body) });
      d = await r.json().catch(() => ({ error: 'The server took too long. Tap Try again.' }));
    } catch (e) { throw new Error('Cannot reach the server. Check your internet and tap Try again.'); }
    if (r.status === 401 && t === 0) { if ((store.get('code') || '') !== sent) continue; const c = prompt('Enter the access code'); if (!c) throw new Error('Access code required.'); store.set('code', c); continue; }
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  }
}

/* ---------- navigation ---------- */
function go(tab) {
  ['learn', 'practice', 'history'].forEach(v => {
    show('#' + v, v === tab); const b = $('#t' + v[0].toUpperCase() + v.slice(1));
    b.classList.toggle('on', v === tab); b.setAttribute('aria-current', v === tab ? 'page' : 'false');
  });
  if (tab === 'history') drawHistory();
  scrollTo(0, 0);
}
$('#tLearn').onclick = () => go('learn'); $('#tPractice').onclick = () => go('practice'); $('#tHistory').onclick = () => go('history');

/* ---------- files ---------- */
const b64 = f => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(f); });
async function shrink(f) {
  if (!f.type.startsWith('image/')) return f;
  const bmp = await createImageBitmap(f);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = bmp.width * k; c.height = bmp.height * k;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  let q = .85, blob;
  do { blob = await new Promise(r => c.toBlob(r, 'image/jpeg', q)); q -= .15; } while (blob.size > 2e6 && q > .2);
  return new File([blob], 'image.jpg', { type: 'image/jpeg' });
}
async function pdfText(f, range) {
  if (typeof pdfjsLib === 'undefined') throw new Error('The PDF reader could not load. Check your internet and reload.');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
  let [a, b] = (range || '').split('-').map(x => parseInt(x));
  if (!a) { a = 1; b = Math.min(pdf.numPages, 40); } else b = Math.min(b || a, pdf.numPages);
  let out = '';
  for (let i = a; i <= b && out.length < 40000; i++) { const pg = await pdf.getPage(i); const tc = await pg.getTextContent(); out += tc.items.map(x => x.str).join(' ') + '\n\n'; }
  return out;
}

/* ---------- history: saved on this phone ---------- */
const H = {
  all() { try { return JSON.parse(store.get('hist') || '[]'); } catch { return []; } },
  save(a) { a = a.slice(0, 40); a.forEach((r, i) => { if (i >= 15) { delete r.lesson; delete r.tips; delete r.videos; } }); store.set('hist', JSON.stringify(a)); },
  upsert(r) { const a = this.all(), i = a.findIndex(x => x.id === r.id); if (i >= 0) a[i] = r; else a.unshift(r); this.save(a); },
  clear() { store.set('hist', '[]'); }
};
const when = ts => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
function drawHistory() {
  const all = H.all(), lessons = all.filter(r => r.t === 'lesson'), quizzes = all.filter(r => r.t === 'quiz');
  const avg = quizzes.length ? Math.round(quizzes.reduce((s, r) => s + r.percent, 0) / quizzes.length) : null;
  let st = {}; try { st = JSON.parse(store.get('streak') || '{}'); } catch {}
  const live = st.last === day(Date.now()) || st.last === day(Date.now() - 864e5);
  const B = $('#stats'); B.innerHTML = '';
  [['avg', avg == null ? '🎯' : avg + '%', avg == null ? 'take a quiz to see your average' : 'average quiz score'], ['streak', live && st.n ? st.n : 0, 'day streak'], ['les', lessons.length, 'lessons studied'], ['quiz', quizzes.length, 'quizzes taken']]
    .forEach(([c, big, label]) => { const t = el('div', 'tile ' + c); t.append(el('b', null, String(big)), el('span', null, label)); B.append(t); });
  const L = $('#hlist'); L.innerHTML = '';
  if (!all.length) { const e = el('div', 'empty'); e.append(el('b', null, 'Nothing here yet'), el('span', null, 'Study a topic or take a quiz and it shows up here.')); L.append(e); }
  all.forEach(r => {
    const b = el('button', 'hitem'); b.type = 'button'; b.style.setProperty('--c', accFor(r.subject));
    const dot = el('i', 'dot', r.t === 'quiz' ? '✎' : '📖'); dot.setAttribute('aria-hidden', 'true');
    const mid = el('div', 'hmid'); mid.append(el('b', null, r.t === 'quiz' ? r.subject : r.topic), el('span', 'mut', r.t === 'quiz' ? `Quiz, ${r.score} of ${r.total}, ${when(r.ts)}` : `${r.subject}, ${r.level}, ${when(r.ts)}`));
    const end = el('span', 'hend', r.t === 'quiz' ? `${r.percent}%` : (r.lesson ? 'Open' : 'Redo'));
    b.append(dot, mid, end);
    if (r.t === 'lesson') b.onclick = () => openRecord(r); else b.disabled = true;
    L.append(b);
  });
  show('#hclear', all.length > 0);
}
$('#hclear').onclick = () => { if (confirm('Clear all your study history?')) { H.clear(); drawHistory(); } };

/* ---------- quiz engine (used by Practice and by Learn) ---------- */
let uid = 0;
function makeQuiz(R) {
  const id = ++uid; let quiz = null, answers = {}, tans = {};
  const tick = () => {
    const n = Object.keys(answers).length, t = quiz.objective.length;
    R.count.textContent = t ? `${n} of ${t} answered` : 'Write your answers, then submit';
    R.bar.style.setProperty('--p', t ? (n / t * 100) + '%' : '0%');
  };
  function load(d) {
    quiz = d; answers = {}; tans = {}; bump(); if (window.MathPad) MathPad.setContext(R.label ? R.label() : '', R.qs);
    R.qs.innerHTML = ''; R.result.innerHTML = ''; show(R.result, false); show(R.bar, true);
    if (d.objective.length) R.qs.append(el('h2', 'h2 secH', 'Objective questions'));
    d.objective.forEach((q, i) => {
      const card = el('article', 'q'); card.id = `q${id}-${i}`;
      const head = el('div', 'qh'); head.append(el('span', 'qn', String(i + 1)), el('p', 'qt', q.q)); card.append(head);
      const opts = el('div', 'opts');
      Object.entries(q.options).forEach(([k, v]) => {
        const l = el('label', 'opt'); l.dataset.k = k;
        const r = el('input'); r.type = 'radio'; r.name = `q${id}-${i}`;
        r.onchange = () => { answers[i] = k; $$('.opt', opts).forEach(o => o.classList.toggle('sel', o === l)); tick(); };
        l.append(r, el('span', 'k', k), el('span', 't', v)); opts.append(l);
      });
      card.append(opts); R.qs.append(card);
    });
    if (d.theory.length) R.qs.append(el('h2', 'h2 secH', 'Theory questions'));
    d.theory.forEach((q, i) => {
      const card = el('article', 'q'); card.id = `t${id}-${i}`;
      const head = el('div', 'qh'); head.append(el('span', 'qn', String(i + 1)), el('p', 'qt', `${q.q} (${q.marks} marks)`)); card.append(head);
      const ta = el('textarea', 'ans'); ta.placeholder = 'Write your answer here'; ta.rows = 5; ta.oninput = () => tans[i] = ta.value; card.append(ta); if (window.MathPad) MathPad.attach(ta, R.label ? R.label() : '');
      R.qs.append(card);
    });
    tick();
  }
  function feedback(card, ok, text) { const f = el('div', 'fb ' + (ok ? 'good' : 'bad')); f.append(el('strong', null, ok ? 'Correct' : 'Not quite'), el('span', null, ' ' + text)); card.append(f); }
  function paint(d) {
    d.objective.forEach(x => {
      const card = $(`#q${id}-${x.id}`); $$('input', card).forEach(i => i.disabled = true);
      $$('.opt', card).forEach(o => {
        if (o.dataset.k === x.correct) o.classList.add('right'); else if (o.dataset.k === x.picked) o.classList.add('wrong');
      });
      feedback(card, x.isCorrect, (x.isCorrect ? '' : (x.picked ? `The answer is ${x.correct}. ` : `You did not answer. The answer is ${x.correct}. `)) + x.explanation);
    });
    d.theory.forEach(x => {
      const card = $(`#t${id}-${x.id}`); $('textarea', card).disabled = true;
      const f = el('div', 'fb ' + (x.awarded >= x.marks / 2 ? 'good' : 'bad'));
      f.append(el('strong', null, `${x.awarded} of ${x.marks} marks`), el('span', null, ' ' + x.feedback)); card.append(f);
      const det = el('details', 'more'); det.append(el('summary', null, 'Marking scheme and model answer'));
      if (x.scheme.length) { const u = el('ul'); x.scheme.forEach(p => u.append(el('li', null, p))); det.append(u); }
      det.append(el('p', null, x.model_answer)); card.append(det);
    });
    const pct = d.percent, paper = el('div', 'paper');
    const score = el('div', 'score');
    score.innerHTML = '<svg viewBox="0 0 240 120" aria-hidden="true"><path class="ring" d="M24 62C20 24 96 8 148 12c58 5 84 34 70 62-14 30-92 36-144 26C30 92 12 70 34 42"/></svg>';
    score.append(el('span', 'big', `${d.score}/${d.total}`));
    const note = pct >= 75 ? 'Excellent work.' : pct >= 50 ? 'Good effort. Read the explanations to pick up the rest.' : 'Keep going. Read each explanation, then try again.';
    const meta = el('div', 'rmeta'); meta.append(el('span', 'pct', `${pct}%`), el('span', 'gradechip', `Grade ${d.grade}`));
    const again = el('button', 'btn', 'Practise again'); again.type = 'button'; again.onclick = () => R.again();
    paper.append(score, meta, el('p', 'note', note), again);
    R.result.innerHTML = ''; R.result.append(paper); show(R.result, true); show(R.bar, false); if (window.MathPad) MathPad.setContext(null);
    H.upsert({ id: Date.now(), t: 'quiz', subject: R.label ? R.label() : 'Practice', score: d.score, total: d.total, percent: d.percent, grade: d.grade, ts: Date.now() });
    R.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (pct >= 50) confetti();
  }
  R.submit.onclick = async () => {
    if (!quiz) return;
    const left = quiz.objective.length - Object.keys(answers).length;
    if (left && !confirm(`${left} question${left > 1 ? 's' : ''} unanswered. Submit anyway?`)) return;
    loader.on('Marking your work…');
    try { paint(await api('/api/mark', { token: quiz.token, answers, theory: tans })); } catch (e) { alert(e.message); }
    loader.off();
  };
  return { load };
}

/* ---------- Practice tab (file, photo or notes) ---------- */
let file = null; const perr = m => $('#perr').textContent = m || '';
async function setFile(f) {
  perr(''); loader.on('Preparing file…');
  try { file = await shrink(f); } catch { file = f; }
  loader.off();
  const c = $('#chip'); c.innerHTML = '';
  const b = el('button', null, '✕'); b.type = 'button'; b.setAttribute('aria-label', 'Remove file'); b.onclick = () => { file = null; show(c, false); };
  c.append(el('span', null, `${file.name || 'Pasted image'} (${(file.size / 1048576).toFixed(2)} MB)`), b); show(c, true);
}
const drop = $('#drop');
drop.onclick = () => $('#file').click();
drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#file').click(); } };
$('#file').onchange = e => e.target.files[0] && setFile(e.target.files[0]);
['dragover', 'dragenter'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => e.dataTransfer.files[0] && setFile(e.dataTransfer.files[0]));
document.addEventListener('paste', e => { if ($('#practice').hidden) return; const f = e.clipboardData.files[0]; if (f) { e.preventDefault(); setFile(f); } });

const PQ = makeQuiz({ label: () => $('#pSubject').value.trim() || 'My own notes', qs: $('#pqs'), bar: $('#pbar'), count: $('#pcount'), submit: $('#psubmit'), result: $('#pres'),
  again() { show('#pquiz', false); show('#psetup', true); scrollTo(0, 0); } });

$('#psetup').onsubmit = async e => {
  e.preventDefault(); perr('');
  loader.on('Writing your questions… this can take up to a minute');
  try {
    let text = $('#pText').value, image = null, imageType = null;
    if (file) {
      if (file.type.startsWith('image/')) { image = await b64(file); imageType = file.type; }
      else if (file.type === 'application/pdf') {
        loader.on('Reading your PDF…'); text = (await pdfText(file, $('#pPages').value)) + '\n\n' + text;
        if (text.trim().length < 200) throw new Error('This PDF has no readable text (it may be scanned). Add photos of the pages instead.');
        loader.on('Writing your questions… this can take up to a minute');
      } else text = (await file.text()).slice(0, 40000) + '\n\n' + text;
    }
    if (!text.trim() && !image) throw new Error('Add a file, a photo or some notes first.');
    const d = await api('/api/generate', { text, image, imageType, subject: $('#pSubject').value, count: $('#pCount').value, type: $('#pType').value, diff: $('#pDiff').value, seen: seenGet($('#pSubject').value) });
    seenAdd($('#pSubject').value, d); PQ.load(d); show('#psetup', false); show('#pquiz', true); scrollTo(0, 0);
  } catch (err) { perr(err.message); }
  loader.off();
};

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
