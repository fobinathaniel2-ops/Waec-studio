/* Camera scan: photograph a written answer, read the text, then edit, copy or add it to the answer box. */
(() => {
  const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const btn = (c, x, f) => { const b = mk('button', c, x); b.type = 'button'; if (f) b.onclick = f; return b; };
  let sheet = null;

  function closeSheet() { if (sheet) { sheet.remove(); sheet = null; document.body.classList.remove('sc-on'); } }
  function openSheet(title) { closeSheet(); sheet = mk('div', 'sc'); sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', title); document.body.classList.add('sc-on'); const h = mk('div', 'sc-h'); h.append(mk('b', null, title), btn('sc-x', '✕', closeSheet)); h.lastChild.setAttribute('aria-label', 'Close'); sheet.append(h); document.body.append(sheet); return sheet; }

  function insertInto(ta, text, replace) {
    if (!ta || ta.disabled) return;
    if (replace) ta.value = text;
    else { const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? a; const pre = ta.value.slice(0, a), sep = pre && !/\s$/.test(pre) ? '\n' : ''; ta.value = pre + sep + text + ta.value.slice(b); }
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function pick(ta, label, camera) {
    const f = mk('input'); f.type = 'file'; f.accept = 'image/*'; if (camera) f.setAttribute('capture', 'environment'); f.style.display = 'none';
    f.onchange = () => { const file = f.files && f.files[0]; f.remove(); if (file) read(ta, label, file); };
    document.body.append(f); f.click();
  }

  async function read(ta, label, file) {
    const s = openSheet('Reading your writing…'); const st = mk('p', 'sc-note', 'Reading the photo. This can take up to a minute.'); const sp = mk('div', 'sc-spin'); s.append(sp, st);
    try {
      const small = await shrink(file), image = await b64(small);
      const d = await api('/api/ocr', { image, imageType: 'image/jpeg', subject: label() });
      result(ta, label, d.text, URL.createObjectURL(small));
    } catch (e) {
      s.innerHTML = ''; const h = mk('div', 'sc-h'); h.append(mk('b', null, 'Could not read the photo'), btn('sc-x', '✕', closeSheet)); s.append(h, mk('p', 'sc-bad', e.message));
      const r = mk('div', 'sc-row'); r.append(btn('btn sm', 'Take photo again', () => pick(ta, label, true)), btn('btn sm ghost', 'Choose another photo', () => pick(ta, label, false))); s.append(r);
    }
  }

  function result(ta, label, text, imgUrl) {
    const s = openSheet('Your written answer'); s.append(mk('p', 'sc-note', 'Check the text, fix any mistakes, then use it. You can copy it or add it to your answer.'));
    if (imgUrl) { const img = mk('img', 'sc-img'); img.src = imgUrl; img.alt = 'Your photo'; s.append(img); }
    const t = mk('textarea', 'sc-text'); t.value = text; t.rows = 8; t.setAttribute('aria-label', 'Text read from your photo'); s.append(t);
    const msg = mk('p', 'sc-note sc-msg', ''); const say = x => { msg.textContent = x; };
    const r1 = mk('div', 'sc-row');
    r1.append(btn('btn sm', 'Add to my answer', () => { insertInto(ta, t.value.trim(), false); closeSheet(); }), btn('btn sm ghost', 'Replace my answer', () => { insertInto(ta, t.value.trim(), true); closeSheet(); }));
    const r2 = mk('div', 'sc-row');
    r2.append(btn('btn sm ghost', 'Copy', async () => { try { await navigator.clipboard.writeText(t.value); say('Copied.'); } catch { t.select(); try { document.execCommand('copy'); say('Copied.'); } catch { say('Press and hold the text to copy it.'); } } }),
      btn('btn sm ghost', 'Make it simple', async function () {
        this.disabled = true; say('Tidying your text…');
        try { const d = await api('/api/ocr', { mode: 'tidy', text: t.value, subject: label() }); if (d.text) t.value = d.text; say('Done. Check it before you use it.'); } catch (e) { say(e.message); }
        this.disabled = false;
      }),
      btn('btn sm ghost', 'Scan again', () => pick(ta, label, true)));
    s.append(r1, r2, msg);
  }

  window.Scan = {
    attach(ta, label) {
      let row = ta.nextElementSibling; if (!row || !row.classList.contains('kbrow')) { row = mk('div', 'kbrow'); ta.after(row); }
      const b = btn('kbcalc scanbtn', '📷 Scan written answer', () => {
        const s = openSheet('Scan your written answer'); s.append(mk('p', 'sc-note', 'Photograph your handwritten answer with the page flat and in good light. The writing is turned into text you can edit.'));
        const r = mk('div', 'sc-row'); r.append(btn('btn sm', '📷 Take photo', () => pick(ta, label, true)), btn('btn sm ghost', '🖼 Choose from gallery', () => pick(ta, label, false))); s.append(r);
      });
      row.append(b);
    }
  };
})();
