const { auth } = require('../lib/ai');
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'their', 'its', 'how', 'what', 'why', 'are', 'of', 'in', 'on', 'to', 'a', 'an']);
const secs = d => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d || '') || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!auth(req, res)) return;
  const b = req.body || {};
  const topic = String(b.topic || '').slice(0, 100), subject = String(b.subject || '').slice(0, 60), stage = String(b.level || '').split(' ')[0];
  const searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(`${topic} ${subject} lesson`);
  const key = (process.env.YOUTUBE_API_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!key) return res.json({ noKey: true, searchUrl, videos: [] });
  try {
    const get = async (ep, p) => { const d = await (await fetch(`https://www.googleapis.com/youtube/v3/${ep}?` + new URLSearchParams({ ...p, key }))).json(); if (d.error) throw new Error(d.error.message); return d; };
    const find = q => get('search', { part: 'snippet', q, type: 'video', maxResults: '25', safeSearch: 'strict', relevanceLanguage: 'en' });
    // two searches: the topic on its own, and the topic with the exam context
    const [a, c] = await Promise.all([find(`${topic} ${subject} lesson`), find(`${topic} ${subject} ${stage} Ghana WAEC`)]);
    const ids = [...new Set([...(a.items || []), ...(c.items || [])].map(i => i.id.videoId).filter(Boolean))].slice(0, 50).join(',');
    if (!ids) return res.json({ videos: [], searchUrl });
    const v = await get('videos', { part: 'snippet,statistics,contentDetails', id: ids });
    const words = topic.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !STOP.has(w));
    const all = (v.items || []).map(i => {
      const title = i.snippet.title.toLowerCase(), desc = (i.snippet.description || '').toLowerCase();
      const hits = words.filter(w => title.includes(w)).length * 2 + words.filter(w => desc.includes(w)).length;
      return { id: i.id, title: i.snippet.title, channel: i.snippet.channelTitle, thumb: i.snippet.thumbnails?.medium?.url, likes: +i.statistics?.likeCount || 0, views: +i.statistics?.viewCount || 0, duration: i.contentDetails.duration, url: 'https://www.youtube.com/watch?v=' + i.id, hits, len: secs(i.contentDetails.duration) };
    }).filter(x => x.len >= 90 && x.len <= 7200);
    // keep only videos that are actually about the topic, then rank those by likes
    let pool = words.length ? all.filter(x => x.hits >= Math.min(2, words.length * 2)) : all;
    if (pool.length < 2) pool = all.filter(x => x.hits > 0);
    if (pool.length < 2) pool = all;
    pool.sort((x, y) => y.likes - x.likes || y.views - x.views);
    res.json({ videos: pool.slice(0, 5).map(({ hits, len, ...rest }) => rest), searchUrl });
  } catch (e) { console.error(e); res.json({ videos: [], searchUrl, error: /not valid/i.test(e.message) ? 'YouTube did not accept the API key. Check that it was pasted in full, then restart the server.' : 'YouTube said: ' + e.message }); }
};
