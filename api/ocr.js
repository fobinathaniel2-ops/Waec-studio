const { askJSON, auth } = require('../lib/ai');
const STYLE = 'Write chemical formulas and equations with Unicode subscripts and superscripts (H₂O, CO₂, SO₄²⁻, Fe³⁺, Ca(OH)₂) and use → ⇌ ↑ ↓ for arrows. Write maths in plain symbols (x², √, ÷, ×, π, fractions as 3/4, degrees as 30°). No markdown, no LaTeX, no dollar signs.';
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!auth(req, res)) return;
  try {
    const b = req.body || {}, subject = String(b.subject || '').slice(0, 80);
    if (b.mode === 'tidy') {
      const text = String(b.text || '').slice(0, 12000); if (!text.trim()) return res.status(400).json({ error: 'There is no text to tidy.' });
      const d = await askJSON([{ type: 'text', text: `Here is a student's written answer${subject ? ' for ' + subject : ''}:\n\n${text}\n\nRewrite it so it is simple and clear: fix spelling and spacing, put each point on its own short line, and keep the same meaning and every fact the student gave. Do not add new facts and do not answer for the student. ${STYLE} Reply with ONLY JSON: {"text":"..."}` }], 3000, '{');
      return res.json({ text: String(d.text || '').trim() });
    }
    if (!b.image || !/^image\/(jpeg|png|gif|webp)$/.test(b.imageType)) return res.status(400).json({ error: 'Take a photo of the written answer first.' });
    if (String(b.image).length > 4200000) return res.status(413).json({ error: 'The photo is too large. Try again.' });
    const d = await askJSON([
      { type: 'image', source: { type: 'base64', media_type: b.imageType, data: b.image } },
      { type: 'text', text: `This is a photo of a student's handwritten or printed answer${subject ? ' for ' + subject : ''}. Copy out exactly what is written, keeping the line breaks, numbering and order. Do not correct, answer, explain or add anything. If a word cannot be read, write [?]. ${STYLE} If there is no readable writing, return an empty text. Reply with ONLY JSON: {"text":"..."}` }
    ], 3000, '{');
    const text = String(d.text || '').trim();
    if (!text) return res.status(422).json({ error: 'No readable writing found. Retake the photo in good light, with the page flat.' });
    res.json({ text });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
};
