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
    const toMark = qz.the.map((x, i) => ({ i, question: x.q, max: x.marks, scheme: x.scheme, model_answer: x.model_answer, student: String(t[i] || '').trim().slice(0, 4000) })).filter(x => x.student);
    if (toMark.length) {
      const arr = await askJSON([{ type: 'text', text: `You are a strict but fair WAEC examiner. Mark each student answer against its marking scheme; accept correct equivalent wording. Never exceed "max". Reply with ONLY a JSON array: [{"i":0,"awarded":3,"feedback":"one or two sentences on what was right and what was missed"}]\n\n${JSON.stringify(toMark)}` }], 4000, '[');
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
