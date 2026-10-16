const STAGES = { Primary: 6, JHS: 3, SHS: 3 };
let stage = 'SHS', year = 1, lessonText = '', tipsText = '';
const fmt = n => new Intl.NumberFormat('en', { notation: 'compact' }).format(n);
const ul = (a, cls) => { const u = el('ul', cls); (a || []).forEach(x => u.append(el('li', null, typeof x === 'string' ? x : Object.values(x).join(': ')))); return u; };

/* class picker */
function drawClass() {
  $$('.stages button').forEach(b => { const on = b.dataset.stage === stage; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  const box = $('#years'); box.innerHTML = '';
  for (let n = 1; n <= STAGES[stage]; n++) {
    const b = el('button', 'yr' + (n === year ? ' on' : ''), `${stage} ${n}`); b.type = 'button'; b.setAttribute('aria-pressed', n === year);
    b.onclick = () => { year = n; drawClass(); }; box.append(b);
  }
}
$$('.stages button').forEach(b => b.onclick = () => { stage = b.dataset.stage; if (year > STAGES[stage]) year = 1; drawClass(); });
const saved = (store.get('lvl') || '').match(/^(Primary|JHS|SHS) (\d)$/);
if (saved && +saved[2] <= STAGES[saved[1]]) { stage = saved[1]; year = +saved[2]; }
$('#lsubject').value = store.get('lsub') || ''; $('#ltopic').value = store.get('ltop') || '';
drawClass();
[['📐', 'Mathematics'], ['📖', 'English Language'], ['🔬', 'Integrated Science'], ['🌍', 'Social Studies'], ['📜', 'History'], ['⚡', 'Physics'], ['🧪', 'Chemistry'], ['🧬', 'Biology'], ['💰', 'Economics'], ['🏛️', 'Government'], ['💻', 'ICT']].forEach(([em, s]) => {
  const b = el('button', 'qchip'); b.type = 'button'; b.append(el('span', 'em', em), s);
  b.onclick = () => { $('#lsubject').value = s; theme(s); $('#ltopic').focus(); };
  $('#quick').append(b);
});
theme($('#lsubject').value);

/* tabs */
$$('.seg button').forEach(b => b.onclick = () => {
  $$('.seg button').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
  ['pLesson', 'pTips', 'pVideo', 'pPractice'].forEach(id => show('#' + id, id === b.dataset.p));
  b.scrollIntoView({ inline: 'center', block: 'nearest' });
  $('#lout').scrollIntoView({ block: 'start' });
});

/* loading + errors */
const busy = (p, m) => { p.innerHTML = ''; const d = el('div', 'skel'); d.setAttribute('aria-live', 'polite'); d.append(el('p', 'mut', m)); for (let i = 0; i < 5; i++) d.append(el('div', 'sk')); p.append(d); };
const fail = (p, e, retry) => { p.innerHTML = ''; p.append(el('p', 'err', e.message)); if (retry) { const b = el('button', 'btn alt', 'Try again'); b.type = 'button'; b.onclick = retry; p.append(b); } };
const has = (d, ks) => ks.some(k => d?.[k]?.length > 0);
const OK = { lesson: d => has(d, ['sections']), tips: d => has(d, ['must_know', 'formulas', 'definitions', 'timeline', 'exam_tips', 'checklist', 'likely_question_types', 'common_mistakes']), videos: () => true };
const dur = s => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s || '') || []; return (m[1] ? m[1] + ':' : '') + String(m[2] || 0).padStart(m[1] ? 2 : 1, '0') + ':' + String(m[3] || 0).padStart(2, '0'); };
const group = (p, title, arr, cls) => { if (arr && arr.length) { p.append(el('h3', 'h3', title)); p.append(ul(arr, cls)); } };

/* timeline */
function timeline(p, items, title) {
  if (!items?.length) return;
  p.append(el('h3', 'h3 wide', title)); const ol = el('ol', 'tl');
  items.forEach(x => { const li = el('li'); li.append(el('b', null, x.when || ''), el('span', null, x.what || '')); ol.append(li); }); p.append(ol);
}

/* lesson */
function renderLesson(d, topic) {
  const p = $('#pLesson'); p.innerHTML = ''; lessonText = `${d.title || topic}\n${d.overview || ''}\n`;
  p.append(el('h2', 'ltitle', d.title || topic), el('p', 'lead', d.overview || ''));
  if (d.objectives?.length) { const b = el('div', 'goals'); b.append(el('strong', null, 'By the end you will be able to')); b.append(ul(d.objectives)); p.append(b); }
  (d.sections || []).forEach((s, i) => {
    const a = el('article', 'lsec'); a.append(el('span', 'n', String(i + 1)));
    const c = el('div', 'lbody'); c.append(el('h3', 'h3', s.heading), el('p', null, s.explanation));
    if (s.examples?.length) { const e = el('div', 'eg'); e.append(el('strong', null, 'Examples'), ul(s.examples)); c.append(e); }
    if (s.key_points?.length) { const k = el('div', 'rem'); k.append(el('strong', null, 'Remember'), ul(s.key_points)); c.append(k); }
    a.append(c); p.append(a);
    lessonText += `\n${s.heading}\n${s.explanation}\n${(s.key_points || []).join('. ')}\n`;
  });
  timeline(p, d.timeline, 'Timeline');
  if (d.worked_examples?.length) {
    p.append(el('h3', 'h3 wide', 'Worked examples'));
    d.worked_examples.forEach((w, i) => { const c = el('div', 'wx'); c.append(el('strong', null, `Question ${i + 1}`), el('p', 'wq', w.question), el('p', 'ws', w.solution)); p.append(c); });
  }
  if (d.key_terms?.length) {
    p.append(el('h3', 'h3 wide', 'Key terms')); const dl = el('dl', 'terms');
    d.key_terms.forEach(k => { dl.append(el('dt', null, k.term), el('dd', null, k.meaning)); lessonText += `${k.term}: ${k.meaning}\n`; }); p.append(dl);
  }
  if (d.summary?.length) { const s = el('div', 'goals sum'); s.append(el('strong', null, 'Summary'), ul(d.summary)); p.append(s); }
  const b = el('button', 'btn', 'Practise this topic'); b.type = 'button'; b.onclick = () => $('.seg button[data-p=pPractice]').click(); p.append(b);
}

/* exam essentials */
function renderTips(d) {
  const p = $('#pTips'); p.innerHTML = ''; tipsText = '';
  p.append(el('h2', 'ltitle', 'Before you write the exam'));
  group(p, 'Must-know points', d.must_know, 'ticks');
  const fs = d.formulas || d.formulas_definitions || [];
  if (fs.length) {
    p.append(el('h3', 'h3', `Formulas and laws to memorise (${fs.length})`));
    fs.forEach(f => {
      const c = el('div', 'fcard'); c.append(el('b', 'fname', f.name || f.item || ''), el('div', 'formula', f.formula || f.detail || ''));
      [['Where', f.symbols], ['Use when', f.use_when], ['Example', f.example]].forEach(([k, v]) => { if (v) { const m = el('p', 'fmeta'); m.append(el('strong', null, k + ': '), v); c.append(m); } });
      p.append(c); tipsText += `${f.name}: ${f.formula}. ${f.use_when || ''}\n`;
    });
  } else if (d.kind === 'facts' || d.no_formula_note) p.append(el('p', 'mut', 'This topic has no calculation formulas. Learn the key facts below.'));
  timeline(p, d.timeline, 'Key dates');
  if (d.definitions?.length) { p.append(el('h3', 'h3', d.kind === 'facts' ? 'Key facts to memorise' : 'Definitions to know')); const dl = el('dl', 'terms'); d.definitions.forEach(k => dl.append(el('dt', null, k.term), el('dd', null, k.meaning))); p.append(dl); }
  group(p, 'How it is usually tested', d.likely_question_types); group(p, 'Common mistakes to avoid', d.common_mistakes);
  group(p, 'Tips to score more marks', d.exam_tips); group(p, 'Last-minute checklist', d.checklist, 'ticks');
  p.append(el('p', 'mut small', 'Written by AI. Check formulas against your syllabus or teacher.'));
}

/* videos */
function renderVideos(d) {
  const p = $('#pVideo'); p.innerHTML = '';
  if (d.error) p.append(el('p', 'err', d.error));
  if (d.noKey) p.append(el('p', 'mut', 'Add a YouTube API key to see the most-liked lessons here. For now, search YouTube directly.'));
  else if (d.error) p.append(el('p', 'mut', 'You can still search YouTube yourself:'));
  else if (!d.videos.length) p.append(el('p', 'mut', 'No videos found for this topic.'));
  else {
    p.append(el('p', 'mut', 'The most-liked videos among the top matches for this topic.'));
    const g = el('div', 'vgrid');
    d.videos.forEach((v, i) => {
      const a = el('a', 'vcard'); a.href = v.url; a.target = '_blank'; a.rel = 'noopener';
      const th = el('div', 'thumb'); const im = el('img'); im.src = v.thumb || ''; im.alt = ''; im.loading = 'lazy'; th.append(im, el('span', 'dur', dur(v.duration)));
      if (i === 0) th.append(el('span', 'best', 'Top pick'));
      const t = el('div', 'vinfo'); t.append(el('b', null, v.title), el('span', 'mut', v.channel), el('span', 'mut', `${fmt(v.likes)} likes, ${fmt(v.views)} views`));
      a.append(th, t); g.append(a);
    });
    p.append(g);
  }
  const s = el('a', 'btn alt', 'Search more on YouTube'); s.href = d.searchUrl; s.target = '_blank'; s.rel = 'noopener'; p.append(s);
}

/* generate everything (or reopen from history) */
const keepTo = (rec, k, v) => { rec[k] = v; H.upsert(rec); };
function run(subject, topic, level, vid, cache) {
  lessonText = ''; tipsText = '';
  const rec = cache ? { ...cache, id: Date.now(), ts: Date.now() } : { id: Date.now(), t: 'lesson', subject, topic, level, ts: Date.now() };
  H.upsert(rec);
  const body = { subject, topic, level };
  show('#lform', false); show('#lintro', false); show('#lctx', true); show('#lout', true);
  const pills = $('#lpills'); pills.innerHTML = ''; [subject, topic, level].forEach(x => pills.append(el('span', 'pill', x)));
  show('#lpquiz', false); show('#lpsetup', true); $('#lperr').textContent = '';
  $('.seg button[data-p=pVideo]').hidden = !vid;
  $('.seg button[data-p=pLesson]').click();
  const job = (key, pane, msg, call, draw) => {
    if (cache && cache[key] && OK[key](cache[key])) { draw(cache[key]); return; }
    busy(pane, msg);
    call().then(d => { if (!OK[key](d)) throw new Error('The AI sent back an empty answer.'); draw(d); keepTo(rec, key, d); }).catch(x => fail(pane, x, () => job(key, pane, msg, call, draw)));
  };
  job('lesson', $('#pLesson'), 'Preparing your lesson. Usually 15 to 40 seconds.', () => api('/api/learn', { ...body, mode: 'lesson' }), d => renderLesson(d, topic));
  job('tips', $('#pTips'), 'Collecting the exam essentials.', () => api('/api/learn', { ...body, mode: 'tips' }), renderTips);
  if (vid) job('videos', $('#pVideo'), 'Finding the most-liked videos.', () => api('/api/videos', body), renderVideos);
}
$('#lform').onsubmit = e => {
  e.preventDefault();
  const subject = $('#lsubject').value.trim(), topic = $('#ltopic').value.trim(), level = `${stage} ${year}`;
  $('#lerr').textContent = '';
  if (!subject || !topic) return $('#lerr').textContent = 'Enter a subject and a topic.';
  store.set('lsub', subject); store.set('ltop', topic); store.set('lvl', level); theme(subject); bump();
  run(subject, topic, level, $('#lvideo').checked);
};
function openRecord(r) {
  const m = (r.level || '').match(/^(Primary|JHS|SHS) (\d)$/); if (m) { stage = m[1]; year = +m[2]; drawClass(); }
  $('#lsubject').value = r.subject; $('#ltopic').value = r.topic; theme(r.subject);
  go('learn'); run(r.subject, r.topic, r.level, r.lesson && OK.lesson(r.lesson) ? !!r.videos : $('#lvideo').checked, r.lesson && OK.lesson(r.lesson) ? r : null);
}
$('#ledit').onclick = () => { show('#lform', true); show('#lintro', true); show('#lctx', false); scrollTo(0, 0); };

/* practice inside Learn: built from the lesson, no file needed */
const LQ = makeQuiz({ qs: $('#lpqs'), bar: $('#lpbar'), count: $('#lpcount'), submit: $('#lpsubmit'), result: $('#lpres'),
  again() { show('#lpquiz', false); show('#lpsetup', true); $('#lout').scrollIntoView({ block: 'start' }); } });
$('#lpsetup').onsubmit = async e => {
  e.preventDefault(); const err = $('#lperr'); err.textContent = '';
  if (!lessonText) return err.textContent = 'The lesson is still loading. Try again in a moment.';
  loader.on('Writing your questions… this can take up to a minute');
  try {
    const d = await api('/api/generate', { text: (lessonText + '\n' + tipsText).slice(0, 38000), subject: `${$('#lsubject').value} - ${$('#ltopic').value}`, level: `${stage} ${year}`,
      count: $('#lpCount').value, type: $('#lpType').value, diff: $('#lpDiff').value });
    LQ.load(d); show('#lpsetup', false); show('#lpquiz', true); $('#lout').scrollIntoView({ block: 'start' });
  } catch (x) { err.textContent = x.message; }
  loader.off();
};

/* ---- 3D cube ---- */
(() => {
  const cube = $('#cube'), stage = $('.stage'); if (!cube || !stage) return;
  const faces = $$('.face', cube);
  faces.forEach(f => f.style.setProperty('--c', accFor(f.dataset.s)));
  const calm = matchMedia('(prefers-color-scheme: no-preference) and (prefers-reduced-motion: reduce)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rx = -24, ry = -30, vy = calm ? 0 : .28, down = false, moved = false, sx = 0, sy = 0, lx = 0, ly = 0;
  const paint = () => { cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
  const tick = () => {
    const vis = !document.hidden && $('#lintro') && !$('#lintro').hidden && !$('#learn').hidden && $('#lintro').offsetParent;
    if (vis) { if (!down) ry += vy; paint(); }
    requestAnimationFrame(tick);
  };
  stage.addEventListener('pointerdown', e => { down = true; moved = false; sx = lx = e.clientX; sy = ly = e.clientY; });
  addEventListener('pointermove', e => {
    if (!down) return;
    if (Math.hypot(e.clientX - sx, e.clientY - sy) > 4) moved = true;
    ry += (e.clientX - lx) * .7; rx = Math.max(-70, Math.min(70, rx - (e.clientY - ly) * .5));
    lx = e.clientX; ly = e.clientY; paint();
  });
  addEventListener('pointerup', () => { down = false; });
  addEventListener('pointercancel', () => { down = false; });
  stage.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  faces.forEach(f => f.addEventListener('click', () => {
    $("#lsubject").value = f.dataset.s; theme(f.dataset.s);
    cube.classList.add('pick'); setTimeout(() => cube.classList.remove('pick'), 600);
    $('#ltopic').focus();
  }));
  paint(); tick();
})();
