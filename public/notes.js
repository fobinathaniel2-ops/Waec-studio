/* ---------- My lesson notes (saved on this phone) ---------- */
const NB = {
  all() { try { return JSON.parse(store.get('notes') || '[]'); } catch { return []; } },
  save(list) { try { localStorage.setItem('notes', JSON.stringify(list)); return true; } catch { return false; } }
};
const STOP = new Set('the and for are with what how why who when where this that from into about your you its their them was were will can not but all any one two has have had use using used of in on to is it as at by an or be a'.split(' '));
const words = s => (s || '').toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 2 && !STOP.has(w)) || [];

function drawNotes() {
  const box = $('#nlist'); box.innerHTML = '';
  const list = NB.all();
  if (!list.length) { box.append(el('p', 'mut', 'No notes yet. Add your first lesson note above.')); return; }
  list.forEach(n => {
    const c = el('div', 'hitem nitem'); c.style.setProperty('--c', accFor(n.subject));
    const dot = el('i', 'dot', '📒'); dot.setAttribute('aria-hidden', 'true');
    const t = el('div', 'hmid');
    t.append(el('b', null, n.title), el('span', 'mut', `${n.subject}, ${Math.max(1, Math.round(n.text.length / 6))} words`));
    const use = el('button', 'link', 'Teach me'); use.type = 'button';
    use.onclick = () => { $('#lsubject').value = n.subject; $('#ltopic').value = n.title; theme(n.subject); $('#lnotes').checked = true; go('learn'); $('#ltopic').focus(); };
    const del = el('button', 'link', 'Delete'); del.type = 'button';
    del.onclick = () => { if (confirm('Delete these notes?')) { NB.save(NB.all().filter(x => x.id !== n.id)); drawNotes(); } };
    const act = el('div', 'nact'); act.append(use, del); c.append(dot, t, act); box.append(c);
  });
}

$('#nfile').onchange = async e => {
  const f = e.target.files[0]; if (!f) return; const err = $('#nerr'); err.textContent = '';
  try {
    loader.on('Reading your file…');
    const txt = /pdf/i.test(f.type) || /\.pdf$/i.test(f.name) ? await pdfText(f) : await f.text();
    $('#ntext').value = ($('#ntext').value ? $('#ntext').value + '\n\n' : '') + txt.trim();
    if (!$('#ntitle').value) $('#ntitle').value = f.name.replace(/\.[^.]+$/, '');
  } catch (x) { err.textContent = x.message; }
  loader.off(); e.target.value = '';
};

$('#nform').onsubmit = e => {
  e.preventDefault(); const err = $('#nerr'); err.textContent = ''; $('#nok').textContent = '';
  const title = $('#ntitle').value.trim(), subject = $('#nsubject').value.trim(), text = $('#ntext').value.trim().slice(0, 60000);
  if (text.length < 40) return err.textContent = 'Add some notes first (at least a few sentences).';
  const list = NB.all(); list.unshift({ id: Date.now(), title, subject, text });
  if (!NB.save(list)) return err.textContent = 'This phone has no room left. Delete an old note and try again.';
  $('#nform').reset(); drawNotes(); err.textContent = ''; const ok = $('#nok'); ok.textContent = 'Saved. Ask for this topic in Learn and it will be taught from your notes.';
};

/* find the best saved note for a subject + topic; send only the relevant part */
function pickNotes(subject, topic) {
  const tw = [...new Set(words(topic))], sw = words(subject);
  if (!tw.length) return null;
  let best = null, top = 0;
  NB.all().forEach(n => {
    const ns = words(n.subject);
    if (ns.length && sw.length && !ns.some(w => sw.includes(w)) && !/^(sci|math)/.test(subject.toLowerCase())) return;
    const th = new Set(words(n.title)), body = new Set(words(n.text));
    const hits = tw.filter(w => th.has(w) || body.has(w)).length;
    if (hits < Math.ceil(tw.length / 2)) return;
    const score = tw.filter(w => th.has(w)).length * 3 + hits;
    if (score > top) { top = score; best = n; }
  });
  if (!best) return null;
  let text = best.text; const MAX = 14000;
  if (text.length > MAX) {
    const paras = text.split(/\n+/).map((p, i) => ({ p, i, s: tw.filter(w => p.toLowerCase().includes(w)).length })).filter(x => x.p.trim());
    let used = 0; const keep = new Set();
    paras.slice().sort((a, b) => b.s - a.s || a.i - b.i).forEach(x => { if (used + x.p.length <= MAX) { keep.add(x.i); used += x.p.length; } });
    text = paras.filter(x => keep.has(x.i)).map(x => x.p).join('\n');
  }
  return { title: best.title, text };
}
drawNotes();
