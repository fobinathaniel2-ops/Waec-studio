const { askJSON, seal, auth } = require('../lib/ai');
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = s => new Set(norm(s).split(' ').filter(w => w.length > 2));
function same(a, b) { const x = words(a), y = words(b); if (!x.size || !y.size) return norm(a) === norm(b); let c = 0; x.forEach(w => y.has(w) && c++); return c / Math.min(x.size, y.size) >= 0.8; }
const STYLE = 'Write like a printed school textbook or a WAEC past-question paper: plain, simple, direct English that a student in Ghana can read easily. Use ordinary textbook wording such as "Calculate", "Find", "State", "Define", "Explain", "Name", "Simplify", "Solve", "Differentiate", "List", "Describe". Never use chatty or AI-sounding wording, no storytelling, no motivational phrases, no emojis, no markdown, no LaTeX or dollar signs, and no words such as "delve", "unlock", "journey" or "tapestry". Write maths in plain text with symbols a student can type: x², x³, √, ÷, ×, π, fractions as 3/4, degrees as 30°. Give every question all the numbers and facts it needs. Keep objective options short. For theory questions use the textbook layout with parts (a), (b), (c) where it suits the topic, each part with its own marks.';
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
    const seen = (Array.isArray(b.seen) ? b.seen : []).map(x => String(x).slice(0, 160)).filter(Boolean).slice(-80);
    const content = [];
    if (b.image && /^image\/(jpeg|png|gif|webp)$/.test(b.imageType)) content.push({ type: 'image', source: { type: 'base64', media_type: b.imageType, data: b.image } });
    if (b.text && b.text.trim()) content.push({ type: 'text', text: String(b.text).slice(0, 40000) });
    if (!content.length) return res.status(400).json({ error: 'Add a file, image or pasted text first.' });
    const jobs = [], oc = Math.ceil(nObj / 5);
    for (let k = 0; k < oc; k++) jobs.push([Math.min(5, nObj - k * 5), 0]);
    if (nThe) jobs.push([0, nThe]);
    const ANG = ['definitions and facts', 'calculations and worked problems', 'applications and real-life uses', 'reasons and explanations', 'diagrams, tables and data', 'comparisons and differences', 'step-by-step procedures', 'less obvious parts of the material'];
    const prompt = (o, t, k) => `Using the material above, write WAEC (WASSCE) standard questions${subject ? ' for ' + subject : ''} at ${diff} difficulty: ${o} objective question(s) and ${t} theory question(s).${jobs.length > 1 ? ` This is set ${k + 1} of ${jobs.length}. Cover a different part of the material from the other sets and lean towards ${ANG[(k + (Date.now() % 8)) % 8]}.` : ` Lean towards ${ANG[Date.now() % 8]}.`} Every question must test a different idea; no two questions may ask the same thing in different words. ${STYLE}${seen.length ? ' The student has already been asked the questions listed below. Do NOT repeat, reword or copy any of them; ask about something different:\n' + seen.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n' : ''} Objective: exactly 4 options A-D, one correct answer, explanation of ONE short plain sentence. Theory: textbook-style question with marks (3-10), a brief marking scheme (list of points, each with its mark) and a concise model answer in plain steps. Reply with ONLY JSON, no markdown: {"objective":[{"q":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"..."}],"theory":[{"q":"...","marks":5,"scheme":["point (1 mark)"],"model_answer":"..."}]}`;
    const results = await Promise.allSettled(jobs.map(([o, t], k) => askJSON([...content, { type: 'text', text: prompt(o, t, k) }], 6000, '{')));
    const ok = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    if (!ok.length) throw results[0].reason;
    const kept = [...seen], fresh = x => { if (kept.some(s => same(s, x.q))) return false; kept.push(x.q); return true; };
    const obj = ok.flatMap(o => o.objective || []).filter(x => x.q && x.options && 'ABCD'.includes(x.answer)).filter(fresh);
    const the = ok.flatMap(o => o.theory || []).filter(x => x.q && x.marks).filter(fresh);
    if (!obj.length && !the.length) return res.status(502).json({ error: 'Could not build questions. Try again.' });
    res.json({ token: seal({ obj, the }), objective: obj.map((x, i) => ({ id: i, q: x.q, options: x.options })), theory: the.map((x, i) => ({ id: i, q: x.q, marks: x.marks })) });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
};
