const crypto = require('crypto');
const sleep = ms => new Promise(ok => setTimeout(ok, ms));

async function claude(content, max, deadline = Date.now() + 52000) {
  const left = () => deadline - Date.now();
  const SLOW = 'The free AI is slow right now. Tap Try again in a few seconds.';
  const gk = process.env.GEMINI_API_KEY, ak = process.env.ANTHROPIC_API_KEY, ork = process.env.OPENROUTER_API_KEY;
  if (!gk && !ak && !ork) throw new Error('Server has no API key. Add OPENROUTER_API_KEY in Vercel settings.');
  let url, headers, body;
  if (ork) {
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers = { 'content-type': 'application/json', authorization: 'Bearer ' + ork };
    const parts = content.map(c => c.type === 'text' ? { type: 'text', text: c.text } : { type: 'image_url', image_url: { url: `data:${c.source.media_type};base64,${c.source.data}` } });
    body = { model: process.env.OPENROUTER_MODEL || 'openrouter/free', max_tokens: Math.min(max, 8000), messages: [{ role: 'user', content: parts.every(x => x.type === 'text') ? parts.map(x => x.text).join('\n\n') : parts }] };
  } else if (gk) {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent`;
    headers = { 'content-type': 'application/json', 'x-goog-api-key': gk };
    body = { contents: [{ parts: content.map(c => c.type === 'text' ? { text: c.text } : { inline_data: { mime_type: c.source.media_type, data: c.source.data } }) }], generationConfig: { maxOutputTokens: 20000, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } };
  } else {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'content-type': 'application/json', 'x-api-key': ak, 'anthropic-version': '2023-06-01' };
    body = { model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6', max_tokens: max, messages: [{ role: 'user', content }] };
  }
  // Free providers get busy: retry with backoff, and on OpenRouter switch model / skip the busy provider.
  const models = ork ? [process.env.OPENROUTER_MODEL || 'openrouter/free', 'openrouter/free', 'meta-llama/llama-3.3-70b-instruct:free', 'google/gemma-3-27b-it:free'] : [];
  const busy = (st, m) => st === 429 || st === 503 || st === 502 || st === 504 || /rate.?limit|capacity|overloaded|temporarily|unavailable/i.test(m || '');
  let r, d = {};
  const N = ork ? 6 : 3;
  for (let t = 0; t < N; t++) {
    if (ork) {
      body.model = models[Math.min(Math.floor(t / 2), models.length - 1)];
      if (t >= 1) body.provider = { ignore: ['Groq'], allow_fallbacks: true };
    }
    if (left() < 6000) throw new Error(SLOW);
    // give each try a fair share so a stuck model is dropped and the next one is tried
    const cap = t < N - 1 ? Math.max(6000, Math.min(26000, left() - 8000)) : left() - 1000;
    try { r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(cap) }); }
    catch (e) { if (t < N - 1 && left() > 9000) { await sleep(500); continue; } throw new Error(/abort|timeout/i.test(e.name + e.message) ? SLOW : 'Cannot reach the AI service. Try again.'); }
    try { d = await r.json(); } catch (e) { d = {}; }
    const msg = d.error?.message || d.error?.metadata?.raw || '';
    const empty = ork && r.ok && !d.error && !d.choices?.[0]?.message?.content;
    if ((busy(r.status, msg) || empty) && t < N - 1) { await sleep(Math.min(1500 + t * 1000, Math.max(0, left() - 9000))); continue; }
    break;
  }
  if (busy(r.status, d.error?.message)) throw new Error('The free AI is very busy right now. Wait about 30 seconds and tap Try again.');
  if (!r.ok || d.error) throw new Error(d.error?.message || 'AI request failed');
  if (ork) return d.choices?.[0]?.message?.content || '';
  return gk ? (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('') : d.content.map(c => c.text || '').join('');
}
// Pull the first complete JSON value out of messy model output (code fences, chatter, truncation).
// Close any open strings/brackets so a cut-off reply becomes valid JSON.
function closeOpen(s) {
  const stack = []; let inStr = false, esc = false;
  for (const c of s) {
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === '{') stack.push('}'); else if (c === '[') stack.push(']'); else if (c === '}' || c === ']') stack.pop();
  }
  return (inStr ? s + '"' : s).replace(/[,:\s]+$/, '') + stack.reverse().join('');
}
// Returns [text, start, complete] for the JSON value that starts at the first `open` at or after `from`.
function extract(t, open, from) {
  const start = t.indexOf(open, from);
  if (start < 0) return null;
  const stack = []; let inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === '{' || c === '[') stack.push(c);
    else if (c === '}' || c === ']') { stack.pop(); if (!stack.length) return [t.slice(start, i + 1), start, true]; }
  }
  return [t.slice(start), start, false];
}
// Repair near-JSON: raw line breaks inside strings, bad backslashes, and un-escaped quotes (for example print("hi")).
function sanitize(s) {
  let out = '', inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (!inStr) { out += c; if (c === '"') inStr = true; continue; }
    if (c === '\\') { const n = s[i + 1]; if (n && '"\\/bfnrtu'.includes(n)) { out += c + n; i++; } else out += '\\\\'; continue; }
    if (c === '"') {
      let j = i + 1; while (j < s.length && /\s/.test(s[j])) j++;
      if (j >= s.length || ',}]:'.includes(s[j])) { inStr = false; out += c; } else out += '\\"';
      continue;
    }
    if (c === '\n') { out += '\\n'; continue; }
    if (c === '\r') continue;
    if (c === '\t') { out += '\\t'; continue; }
    out += c;
  }
  return out.replace(/,\s*([}\]])/g, '$1');
}
const parse = (t, open, check) => {
  t = String(t || '').replace(/```(?:json)?/gi, '');
  const good = v => v && typeof v === 'object' && (open === '[' ? Array.isArray(v) : !Array.isArray(v) && Object.keys(v).length) && (!check || check(v));
  // try every possible start, so stray text like "{thinking}" before the real answer is skipped
  for (let from = 0, r; (r = extract(t, open, from)); from = r[1] + 1) {
    let txt = r[0];
    // a cut-off reply: close it, and if that still is not valid, drop the unfinished tail piece by piece
    for (let tries = 0; tries < (r[2] ? 1 : 40); tries++) {
      const cand = r[2] ? txt : closeOpen(txt);
      for (const x of [cand.replace(/,\s*([}\]])/g, '$1'), sanitize(cand)]) {
        try { const v = JSON.parse(x); if (good(v)) return v; } catch {}
      }
      const cut = txt.lastIndexOf(','); if (r[2] || cut < 1) break; txt = txt.slice(0, cut);
    }
  }
  throw new Error('The AI gave an unreadable answer. Tap Try again.');
};
// Ask the model and retry when the answer cannot be read.
async function askJSON(content, max, open, check) {
  const deadline = Date.now() + 52000;
  let err;
  for (let t = 0; t < 3; t++) {
    try {
      return parse(await claude(content, max, deadline), open, check);
    } catch (e) { err = e; if (!/unreadable/.test(e.message) || deadline - Date.now() < 12000) throw e; }
  }
  throw err;
}
const grade = p => p >= 75 ? 'A1 (Excellent)' : p >= 70 ? 'B2 (Very Good)' : p >= 65 ? 'B3 (Good)' : p >= 60 ? 'C4 (Credit)' : p >= 55 ? 'C5 (Credit)' : p >= 50 ? 'C6 (Credit)' : p >= 45 ? 'D7 (Pass)' : p >= 40 ? 'E8 (Pass)' : 'F9 (Fail)';

// Quizzes are stateless on Vercel: the answer key travels inside an encrypted token.
const key = () => crypto.createHash('sha256').update(process.env.QUIZ_SECRET || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || 'x').digest();
function seal(obj) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url');
}
function unseal(t) {
  const b = Buffer.from(String(t), 'base64url'), d = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
}
function auth(req, res) {
  const code = process.env.ACCESS_CODE;
  if (code && req.headers['x-access-code'] !== code) { res.status(401).json({ error: 'Access code required.' }); return false; }
  return true;
}
module.exports = { claude, parse, sanitize, askJSON, grade, seal, unseal, auth };
