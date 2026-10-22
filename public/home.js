/* Home, Dashboard and Premium pages. Everything shown on the dashboard is worked out from real activity in H (history) and the streak. */
const CFG = window.CONFIG || { plans: [], features: [], currency: 'GH₵' };
const money = n => CFG.currency + (Number.isInteger(n) ? n : n.toFixed(2));
const todayKey = () => day(Date.now());
const goalN = () => Math.max(1, +store.get('goal') || 2);

function startTopic(subject, topic) {
  $('#lsubject').value = subject || ''; if (topic != null) $('#ltopic').value = topic;
  theme(subject); go('learn'); $('#ltopic').focus();
}
const split = label => { const i = (label || '').indexOf(': '); return i > 0 ? [label.slice(0, i), label.slice(i + 2)] : [label || '', '']; };

/* ---------- Home ---------- */
const SUBJECTS = [['📐', 'Mathematics'], ['📖', 'English Language'], ['🔬', 'Integrated Science'], ['🧬', 'Biology'], ['⚗️', 'Chemistry'], ['⚡', 'Physics'], ['🌍', 'Social Studies'], ['📜', 'History'], ['💻', 'ICT']];
(() => {
  const box = $('#homeSubjects');
  SUBJECTS.forEach(([e, s]) => { const b = el('button', 'subj'); b.type = 'button'; b.style.setProperty('--c', accFor(s)); b.append(el('i', null, e), el('span', null, s)); b.onclick = () => startTopic(s, null); box.append(b); });
})();

/* sample question: original, runs in the browser, no AI call */
(() => {
  const Q = { q: 'Solve for x: 3x + 7 = 22', opts: ['x = 3', 'x = 5', 'x = 7', 'x = 15'], a: 1, why: 'Subtract 7 from both sides: 3x = 15. Then divide both sides by 3: x = 5.' };
  const box = $('#sampleQ'); box.append(el('p', 'sq', Q.q));
  const list = el('div', 'sopts'); const fb = el('p', 'sfb'); fb.setAttribute('aria-live', 'polite');
  Q.opts.forEach((o, i) => {
    const b = el('button', 'sopt', o); b.type = 'button';
    b.onclick = () => {
      $$('.sopt', list).forEach((x, j) => { x.disabled = true; x.classList.toggle('right', j === Q.a); x.classList.toggle('wrong', j === i && i !== Q.a); });
      fb.textContent = (i === Q.a ? 'Correct. ' : 'Not quite. ') + Q.why; fb.className = 'sfb ' + (i === Q.a ? 'good' : 'bad');
    };
    list.append(b);
  });
  box.append(list, fb);
  const more = el('button', 'btn sm', 'Practise on your own topic'); more.type = 'button'; more.dataset.go = 'learn'; box.append(more);
})();

/* free vs premium table (home and plans page) */
const mark = v => v === 'live' ? '✓' : v === 'planned' ? 'Planned' : '—';
function compare(into) {
  const t = el('table', 'cmp'); const hd = el('tr'); ['', 'Free', 'Premium'].forEach(x => hd.append(el('th', null, x))); t.append(hd);
  CFG.features.forEach(f => { const r = el('tr'); r.append(el('td', null, f.name));
    [f.free, f.premium].forEach(v => { const c = el('td', 'c ' + (v || 'no'), mark(v)); if (v === 'live') c.setAttribute('aria-label', 'Included'); r.append(c); });
    t.append(r); });
  const w = el('div', 'cmpwrap'); w.append(t); into.innerHTML = ''; into.append(w);
  const n = el('p', 'small mut', 'Planned means it is not built yet. Nothing marked Planned can be bought today.'); into.append(n);
}
compare($('#homeCompare'));

/* continue card: shows the most recent lesson so you can pick up where you left off */
function drawContinue(box) {
  const last = H.all().find(r => r.t === 'lesson');
  box.innerHTML = ''; show(box, !!last); if (!last) return;
  box.append(el('span', 'k', 'Continue where you left off'), el('b', null, last.topic), el('span', 'mut', `${last.subject}, ${last.level}`));
  const b = el('button', 'btn sm', last.lesson ? 'Continue lesson' : 'Open topic'); b.type = 'button'; b.onclick = () => openRecord(last); box.append(b);
}

/* ---------- Dashboard ---------- */
function drawDash() {
  const all = H.all(), lessons = all.filter(r => r.t === 'lesson'), quizzes = all.filter(r => r.t === 'quiz');
  const hour = new Date().getHours();
  $('#dWelcome').textContent = (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening') + ' 👋';
  $('#dSub').textContent = all.length ? 'Here is your study picture, based on what you have done.' : 'Welcome. Start your first lesson and this page fills in as you study.';
  drawContinue($('#dContinue'));

  // daily goal: activities today, from history
  const doneToday = all.filter(r => day(r.ts) === todayKey()).length, goal = goalN();
  const G = $('#dGoal'); G.innerHTML = '';
  G.append(el('b', 'big', `${Math.min(doneToday, goal)} / ${goal}`), el('span', 'mut', doneToday >= goal ? 'Goal reached today. Well done.' : 'lessons or quizzes today'));
  const bar = el('div', 'track'); const fill = el('i'); fill.style.setProperty('--w', Math.min(100, doneToday / goal * 100) + '%'); bar.append(fill); G.append(bar);
  const sel = el('select'); sel.setAttribute('aria-label', 'Daily goal'); [1, 2, 3, 5].forEach(n => { const o = el('option', null, `${n} per day`); o.value = n; if (n === goal) o.selected = true; sel.append(o); });
  sel.onchange = () => { store.set('goal', sel.value); drawDash(); }; G.append(sel);

  // streak (same source as the header badge)
  let st = {}; try { st = JSON.parse(store.get('streak') || '{}'); } catch {}
  const live = st.last === todayKey() || st.last === day(Date.now() - 864e5);
  const S = $('#dStreak'); S.innerHTML = ''; S.append(el('b', 'big', `${live && st.n ? st.n : 0} 🔥`), el('span', 'mut', live && st.n ? 'days in a row' : 'Study today to start a streak.'));

  // subject progress: lessons studied and average quiz score, per subject
  const by = {};
  lessons.forEach(r => { (by[r.subject] ||= { l: 0, q: [] }).l++; });
  quizzes.forEach(r => { const s = split(r.subject)[0]; if (!s || s === 'Practice') return; (by[s] ||= { l: 0, q: [] }).q.push(r.percent); });
  const SB = $('#dSubjects'); SB.innerHTML = '';
  const subs = Object.entries(by).sort((a, b) => b[1].l + b[1].q.length - (a[1].l + a[1].q.length)).slice(0, 6);
  if (!subs.length) SB.append(emptyMsg('No subjects yet', 'Study a topic and your subjects appear here.'));
  subs.forEach(([s, v]) => {
    const row = el('div', 'srow'); row.style.setProperty('--c', accFor(s));
    const avg = v.q.length ? Math.round(v.q.reduce((x, y) => x + y, 0) / v.q.length) : null;
    const tr = el('div', 'track'); const f = el('i'); f.style.setProperty('--w', (avg == null ? 0 : avg) + '%'); tr.append(f);
    row.append(el('em', null, s), tr, el('span', 'mut', `${v.l} lesson${v.l === 1 ? '' : 's'}${avg == null ? ', no quiz yet' : `, ${avg}% avg`}`)); SB.append(row);
  });

  // weak topics: from real quiz results (under 60%), lowest first
  const topics = {};
  quizzes.forEach(r => { if (!r.subject || r.subject === 'Practice' || r.subject === 'My own notes') return; (topics[r.subject] ||= []).push(r.percent); });
  const weak = Object.entries(topics).map(([k, v]) => [k, Math.round(v.reduce((x, y) => x + y, 0) / v.length)]).filter(x => x[1] < 60).sort((a, b) => a[1] - b[1]).slice(0, 4);
  const W = $('#dWeak'); W.innerHTML = '';
  if (!quizzes.length) W.append(emptyMsg('Nothing to show yet', 'Take a practice quiz and weak topics show up here.'));
  else if (!weak.length) W.append(emptyMsg('No weak topics', 'Every quiz topic is at 60% or above. Keep going.'));
  weak.forEach(([k, p]) => { const [s, t] = split(k); const b = el('button', 'hitem mini'); b.type = 'button'; b.style.setProperty('--c', accFor(s));
    const m = el('div', 'hmid'); m.append(el('b', null, t || s), el('span', 'mut', `${p}% average. Revise it`)); b.append(m, el('span', 'hend', p + '%')); b.onclick = () => startTopic(s, t); W.append(b); });

  // recommended next activity
  const N = $('#dNext'); N.innerHTML = '';
  let rec;
  if (weak.length) { const [s, t] = split(weak[0][0]); rec = [`Revise ${t || s}`, `Your quiz average there is ${weak[0][1]}%.`, 'Revise now', () => startTopic(s, t)]; }
  else if (lessons[0] && !quizzes.some(q => split(q.subject)[1] && lessons[0].topic && split(q.subject)[1].toLowerCase() === lessons[0].topic.toLowerCase())) rec = [`Quiz yourself on ${lessons[0].topic}`, 'Open the lesson, then use the Practice tab inside it.', 'Open lesson', () => openRecord(lessons[0])];
  else if (!all.length) rec = ['Start your first lesson', 'Pick a subject and a topic from the Learn tab.', 'Start studying', () => go('learn')];
  else rec = ['Study something new', 'You are up to date. Try a new topic.', 'Choose a topic', () => go('learn')];
  N.append(el('b', null, rec[0]), el('span', 'mut', rec[1])); const nb = el('button', 'btn sm', rec[2]); nb.type = 'button'; nb.onclick = rec[3]; N.append(nb);

  // recent lists
  const RQ = $('#dQuizzes'); RQ.innerHTML = '';
  if (!quizzes.length) RQ.append(emptyMsg('No quizzes yet', 'Finish a practice quiz to see it here.'));
  quizzes.slice(0, 4).forEach(r => { const [s, t] = split(r.subject); const x = el('div', 'hitem mini'); x.style.setProperty('--c', accFor(s)); const m = el('div', 'hmid'); m.append(el('b', null, t || s), el('span', 'mut', `${r.score} of ${r.total}, ${when(r.ts)}`)); x.append(m, el('span', 'hend', r.percent + '%')); RQ.append(x); });
  const RL = $('#dLessons'); RL.innerHTML = '';
  if (!lessons.length) RL.append(emptyMsg('No lessons yet', 'Your recent lessons will be listed here.'));
  lessons.slice(0, 4).forEach(r => { const b = el('button', 'hitem mini'); b.type = 'button'; b.style.setProperty('--c', accFor(r.subject)); const m = el('div', 'hmid'); m.append(el('b', null, r.topic), el('span', 'mut', `${r.subject}, ${when(r.ts)}`)); b.append(m, el('span', 'hend', 'Open')); b.onclick = () => openRecord(r); RL.append(b); });

  // saved lessons: ones whose full content is stored on this phone and open instantly
  const SV = $('#dSaved'); SV.innerHTML = '';
  const saved = lessons.filter(r => r.lesson);
  if (!saved.length) SV.append(emptyMsg('Nothing saved yet', 'Lessons you open are kept on this phone and reopen instantly, with no waiting.'));
  saved.slice(0, 6).forEach(r => { const b = el('button', 'hitem mini'); b.type = 'button'; b.style.setProperty('--c', accFor(r.subject)); const m = el('div', 'hmid'); m.append(el('b', null, r.topic), el('span', 'mut', `${r.subject}, ${r.level}`)); b.append(m, el('span', 'hend', 'Open')); b.onclick = () => openRecord(r); SV.append(b); });

  // membership: Free for everyone today
  const P = $('#dPlan'); P.innerHTML = '';
  P.append(el('b', null, 'Free plan'), el('span', 'mut', 'You can use every feature that is live today. Premium is planned and not on sale yet.'));
  const pb = el('button', 'btn sm alt', 'See what Premium will include'); pb.type = 'button'; pb.dataset.go = 'premium'; P.append(pb);
}
function emptyMsg(t, s) { const e = el('div', 'empty'); e.append(el('b', null, t), el('span', null, s)); return e; }

/* ---------- Premium page: prices come only from config.js ---------- */
let planId = (CFG.plans.find(p => p.id === 'monthly') || CFG.plans[0] || {}).id;
function drawPlans() {
  const pick = $('#planPick'); pick.innerHTML = '';
  CFG.plans.forEach(p => { const b = el('button', 'pp' + (p.id === planId ? ' on' : '')); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', p.id === planId);
    b.append(el('b', null, p.label), el('span', null, money(p.price))); b.onclick = () => { planId = p.id; drawPlans(); }; pick.append(b); });
  const p = CFG.plans.find(x => x.id === planId); if (!p) return;
  $('#proPrice').textContent = money(p.price) + ' / ' + ({ weekly: 'week', monthly: 'month', annual: 'year' }[p.id] || p.label.toLowerCase());
  const perWeek = p.price / (p.days / 7);
  $('#proNote').textContent = p.days === 7 ? 'Billed weekly.' : `About ${money(perWeek)} a week. Billed ${p.label.toLowerCase()}.`;
  const fl = $('#freeList'); fl.innerHTML = ''; CFG.features.filter(f => f.free).forEach(f => fl.append(el('li', null, f.name)));
  const pl = $('#proList'); pl.innerHTML = ''; CFG.features.filter(f => f.premium).forEach(f => pl.append(el('li', null, f.name + (f.premium === 'planned' ? ' (planned)' : ''))));
  const btn = $('#proBtn'); btn.disabled = !CFG.premiumOpen; btn.textContent = CFG.premiumOpen ? 'Upgrade' : 'Opens soon';
}
compare($('#planCompare'));

/* support line from config */
$('#supportLine').textContent = CFG.supportEmail ? '' : 'Support contact details are coming soon.';
if (CFG.supportEmail) { const a = el('a', 'link', CFG.supportEmail); a.href = 'mailto:' + CFG.supportEmail; $('#supportLine').append('Email us at ', a); }

window.onView = v => { if (v === 'dash') drawDash(); if (v === 'home') drawContinue($('#continue')); if (v === 'premium') drawPlans(); };
drawContinue($('#continue')); drawPlans();
