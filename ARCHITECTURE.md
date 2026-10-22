# WAEC Practice Studio: architecture and roadmap

## Today (Phase 1)
- **Stack:** plain HTML/CSS/JS front end in `public/`, a dependency-free Node server (`server.js`) for local use, and serverless handlers in `api/` that also deploy on Vercel (`vercel.json`, 60 s limit).
- **Pages (views):** Home, Learn, Practice, Progress (dashboard), History, Premium (plans), and Privacy / Terms / Support.
- **AI:** `lib/ai.js`. Gemini is the main provider (models tried in order: `GEMINI_MODEL`, gemini-3.8-flash, 3.6-flash, 3.5-flash-lite, 3.1-flash-lite). If it fails, OpenRouter free models are raced as the backup.
- **Data:** no accounts and no database. History, streak, daily goal and saved lessons live in the browser (`localStorage`). The quiz answer key is sealed in an encrypted token, so the server stays stateless.
- **Config:** `public/config.js` holds prices, plan features and the support email. Change prices there only.

## Environment variables
| Name | Needed | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes (or OpenRouter) | main AI |
| `OPENROUTER_API_KEY` | optional | backup AI |
| `YOUTUBE_API_KEY` | for videos | video search |
| `GEMINI_MODEL`, `OPENROUTER_MODELS`, `OPENROUTER_RACE` | optional | tuning |
| `ACCESS_CODE` | optional | simple shared access code |
| `QUIZ_SECRET` | optional | key for sealing quiz tokens |

## Not built yet (and why)
These need user accounts and a database, which this version does not have. Because Vercel functions keep no files between requests, a database is a separate service.

| Phase | Needs | External setup |
|---|---|---|
| 2: real Free/Premium limits | sign-in + a database to count usage | e.g. Supabase (free tier): project URL, anon key, service key |
| 3: payments | accounts, database, payment provider | e.g. Paystack account (Ghana), secret key and webhook secret, business verification |
| 4: revision packs, analytics, admin | all of the above + file storage | storage bucket, admin role |

Until Phase 2 and 3 exist: **Premium is not for sale, server-side AI quotas are not enforced, and no charge is taken.** The Premium page says so. Do not turn on `premiumOpen` in `public/config.js` until payments are verified on the server.

## Rules for the next phases
- Never trust a redirect or a browser value as proof of payment. Verify on the server and via a signed webhook.
- Keep all secrets in server environment variables.
- Record only what is needed, and show a privacy notice and consent before any analytics.
