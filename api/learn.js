const { askJSON, auth } = require('../lib/ai');
const LV = /^(Primary [1-6]|JHS [1-3]|SHS [1-3])$/;
// Subjects that have no calculation formulas: never show formulas for these.
const NOFORM = /history|social|govern|literature|english|relig|\bcrs\b|\birs\b|islam|christ|french|arabic|language|citizen|civic|creative|music|visual art|\bart\b|\brme\b|life skills|comput|\bict\b|program|python|coding|twi|\bga\b|ewe|dagbani|hausa|yoruba|igbo|nzema|fante|kasem/i;
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!auth(req, res)) return;
  try {
    const b = req.body || {};
    const subject = String(b.subject || '').trim().slice(0, 80), topic = String(b.topic || '').trim().slice(0, 120);
    const level = LV.test(b.level) ? b.level : 'SHS 1';
    if (!subject || !topic) return res.status(400).json({ error: 'Enter a subject and a topic.' });
    const exam = level.startsWith('SHS') ? 'WASSCE (WAEC)' : level.startsWith('JHS') ? 'BECE (WAEC)' : 'end-of-term primary school exams';
    const ctx = `Subject: ${subject}. Topic: ${topic}. Class: ${level} (${exam}, West African / Ghana syllabus).`;
    const anchor = `Stay strictly on this subject and this topic. Never include content, facts or formulas from any other subject.`;
    const noForm = NOFORM.test(subject), isHist = /history|government|social/i.test(subject);

    const base = `You are an excellent, patient teacher. ${ctx} ${anchor}
Teach this topic so a ${level} student understands it perfectly. Use very simple English suited to that class, define every new word, and use everyday examples from West Africa. Explain the "why" not just the "what", in short clear sentences.
Reply with ONLY valid JSON starting with { and ending with }. No markdown, no commentary, no thinking text. Inside text values never use double quotes (use single quotes instead, including in code) and write any code on one line. Keep it compact.`;
    // The lesson is written as two halves at the same time, so it finishes about twice as fast.
    const lessonA = `${base}
Write the FIRST HALF of the lesson: the basics and foundations of the topic. Give 3 sections (each explanation 60-100 words). If the topic is historical or has a sequence of events, also fill "timeline" (6-10 entries), otherwise leave it as an empty list.
{"title":"...","overview":"2-3 simple sentences on what this topic is and why it matters","objectives":["You will be able to..."],"sections":[{"heading":"...","explanation":"...","examples":["..."],"key_points":["..."]}],"timeline":[{"when":"year or period","what":"event"}]}`;
    const lessonB = `${base}
Write the SECOND HALF of the lesson: the later, harder and exam-focused parts of the topic that come AFTER the basics (do not repeat the basics). Give 3 sections (each explanation 60-100 words). ${noForm ? 'Give 1 model exam answer in worked_examples.' : 'If the subject involves calculations, give 2 worked examples with step-by-step solutions; otherwise give 1 model exam answer.'}
{"sections":[{"heading":"...","explanation":"...","examples":["..."],"key_points":["..."]}],"worked_examples":[{"question":"...","solution":"step-by-step"}],"key_terms":[{"term":"...","meaning":"..."}],"summary":["..."]}`;

    const factRule = noForm
      ? `This subject has NO calculation formulas. Set "formulas" to [] and "no_formula_note" to "none". Instead fill "definitions" with 10-15 key facts a student must memorise for this exact topic: laws, acts, institutions, important names, dates, causes and effects, and key terms${isHist ? '. Also fill "timeline" with the key dates and events for this topic' : ''}.`
      : `FORMULAS: list the formulas, equations, laws and rules a ${level} student needs for THIS topic only, in exams, including rearranged forms, units and constants (up to 25). Only include a formula if it genuinely belongs to this topic and subject. If the topic has no formulas at all, set "formulas" to [] and "no_formula_note" to "none", and put its key laws and facts in "definitions". Write formulas in plain text with Unicode symbols (such as ², √, π, ×, ÷, →, subscripts). Never use LaTeX or backslashes. For each formula give what every symbol means (with units), when to use it, and one short worked example with numbers.`;
    const tips = `You are an experienced WAEC examiner and teacher. ${ctx} ${anchor}
Write the key things a student MUST know before writing an exam on this exact topic. Base it on the syllabus and typical exam patterns; do not invent specific past-paper years or claim exact question frequencies.
${factRule}
Keep every other point short and clear. Reply with ONLY valid JSON starting with { and ending with }. No markdown, no commentary, no thinking text. Inside text values never use double quotes (use single quotes instead, including in code) and write any code on one line:
{"must_know":["6-10 most important facts and ideas about ${topic}"],"formulas":[{"name":"...","formula":"...","symbols":"...","use_when":"...","example":"..."}],"definitions":[{"term":"...","meaning":"..."}],"timeline":[{"when":"...","what":"..."}],"no_formula_note":"","likely_question_types":["how this topic is usually tested (objective and theory)"],"common_mistakes":["..."],"exam_tips":["how to write and present answers to score marks"],"checklist":["quick last-minute revision items"]}`;

    const full = k => Array.isArray(k) && k.length > 0;
    const check = b.mode === 'tips' ? v => ['must_know', 'formulas', 'definitions', 'timeline', 'exam_tips', 'checklist'].some(k => full(v[k])) : v => full(v.sections);
    let out;
    if (b.mode === 'tips') out = await askJSON([{ type: 'text', text: tips }], 10000, '{', check);
    else {
      const [x, y] = await Promise.all([lessonA, lessonB].map(p => askJSON([{ type: 'text', text: p }], 6000, '{', check)));
      out = { ...x, ...y, sections: [...(x.sections || []), ...(y.sections || [])], timeline: x.timeline || [], title: x.title, overview: x.overview, objectives: x.objectives };
    }
    if (b.mode === 'tips') { out.kind = noForm ? 'facts' : 'math'; if (noForm) out.formulas = []; }
    res.json(out);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
};
