const { askJSON, seal, auth } = require('../lib/ai');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!auth(req, res)) return;
  try {
    const b = req.body || {};
    const n = Math.min(Math.max(parseInt(b.count) || 10, 1), 40);
    const type = ['objective', 'theory', 'both'].includes(b.type) ? b.type : 'objective';
    const diff = { easy: 'easy', medium: 'medium', hard: 'hard', waec: 'real WAEC exam level' }[b.diff] || 'medium';
    const subject = String(b.subject || '').slice(0, 100) + (/^(Primary [1-6]|JHS [1-3]|SHS [1-3])$/.test(b.level) ? ` (${b.level} level)` : '');
    const nObj = type === 'theory' ? 0 : n;
    const nThe = type === 'objective' ? 0 : type === 'theory' ? Math.min(n, 10) : Math.max(2, Math.round(n / 4));
    const content = [];
    if (b.image && /^image\/(jpeg|png|gif|webp)$/.test(b.imageType)) content.push({ type: 'image', source: { type: 'base64', media_type: b.imageType, data: b.image } });
    if (b.text && b.text.trim()) content.push({ type: 'text', text: String(b.text).slice(0, 40000) });
    if (!content.length) return res.status(400).json({ error: 'Add a file, image or pasted text first.' });
    const jobs = [], oc = Math.ceil(nObj / 5);
    for (let k = 0; k < oc; k++) jobs.push([Math.min(5, nObj - k * 5), 0]);
    if (nThe) jobs.push([0, nThe]);
    const prompt = (o, t, k) => `Using the material above, write WAEC (WASSCE) standard questions${subject ? ' for ' + subject : ''} at ${diff} difficulty: ${o} objective question(s) and ${t} theory question(s).${jobs.length > 1 ? ` This is set ${k + 1} of ${jobs.length}; cover a different part of the material than the other sets.` : ''} Objective: exactly 4 options A-D, one correct answer, explanation of ONE short sentence. Theory: WAEC-style question with marks (3-10), a brief marking scheme (list of points, each with its mark) and a concise model answer. Reply with ONLY JSON, no markdown: {"objective":[{"q":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"..."}],"theory":[{"q":"...","marks":5,"scheme":["point (1 mark)"],"model_answer":"..."}]}`;
    const results = await Promise.allSettled(jobs.map(([o, t], k) => askJSON([...content, { type: 'text', text: prompt(o, t, k) }], 6000, '{')));
    const ok = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    if (!ok.length) throw results[0].reason;
    const obj = ok.flatMap(o => o.objective || []).filter(x => x.q && x.options && 'ABCD'.includes(x.answer));
    const the = ok.flatMap(o => o.theory || []).filter(x => x.q && x.marks);
    if (!obj.length && !the.length) return res.status(502).json({ error: 'Could not build questions. Try again.' });
    res.json({ token: seal({ obj, the }), objective: obj.map((x, i) => ({ id: i, q: x.q, options: x.options })), theory: the.map((x, i) => ({ id: i, q: x.q, marks: x.marks })) });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
};
