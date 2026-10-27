const { askJSON, grade, unseal, auth } = require('../lib/ai');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!auth(req, res)) return;
  try {
    let qz; try { qz = unseal(req.body.token); } catch { return res.status(400).json({ error: 'Quiz expired or invalid. Generate a new one.' }); }
    const a = req.body.answers || {}, t = req.body.theory || {};
    let score = 0, total = qz.obj.length;
    const objective = qz.obj.map((x, i) => {
      const ok = a[i] === x.answer; if (ok) score++;
      return { id: i, picked: a[i] || null, correct: x.answer, isCorrect: ok, explanation: x.explanation || '' };
    });
    const marks = {};
    const imgs = [], haveSheet = new Set(); let bytes = 0;
    Object.entries(req.body.sheets || {}).forEach(([k, arr]) => {
      const i = Number(k); if (!qz.the[i] || !Array.isArray(arr)) return;
      arr.slice(0, 3).forEach(s => { if (s && typeof s.img === 'string' && /^[A-Za-z0-9+/=]+$/.test(s.img.slice(0, 200)) && s.img.length < 900000 && bytes + s.img.length < 3000000) { bytes += s.img.length; haveSheet.add(i); imgs.push({ i, img: s.img, name: String(s.name || 'sheet').slice(0, 30), note: String(s.note || '').slice(0, 1500) }); } });
    });
    const toMark = qz.the.map((x, i) => ({ i, question: x.q, max: x.marks, scheme: x.scheme, model_answer: x.model_answer, student: String(t[i] || '').trim().slice(0, 4000), has_picture: haveSheet.has(i) })).filter(x => x.student || x.has_picture);
    if (toMark.length) {
      const pics = imgs.flatMap(p => [{ type: 'text', text: `Picture drawn by the student for question i=${p.i} (${p.name}). The tool that made it describes it as: ${p.note}` }, { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: p.img } }]);
      const arr = await askJSON([...pics, { type: 'text', text: `You are a strict but fair WAEC examiner. Mark each student answer against its marking scheme; accept correct equivalent wording. Never exceed "max". Where "has_picture" is true, the student's graph, chart or diagram is shown in the picture(s) above with its question number: mark it against the scheme too (axes and labels, scale, correctly plotted points, smooth curve or straight line, title, tables, correct values read from it) together with the written answer. Reply with ONLY a JSON array: [{"i":0,"awarded":3,"feedback":"one or two sentences on what was right and what was missed"}]\n\n${JSON.stringify(toMark)}` }], 4000, '[');
      arr.forEach(m => marks[m.i] = m);
    }
    const theory = qz.the.map((x, i) => {
      total += x.marks;
      const m = marks[i], awarded = m ? Math.max(0, Math.min(x.marks, Number(m.awarded) || 0)) : 0;
      score += awarded;
      return { id: i, marks: x.marks, awarded, feedback: m ? m.feedback : 'Not answered.', scheme: x.scheme || [], model_answer: x.model_answer || '' };
    });
    const percent = Math.round((score / total) * 100);
    res.json({ score, total, percent, grade: grade(percent), objective, theory });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
};
