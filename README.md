# Sky Bet Club

A season-long accumulator tracker for a five-a-side betting group. This is the
self-hosted version — same app that was running as a Claude artifact, rebuilt
to run on your own domain via GitHub + Vercel, for free.

## What's different from the Claude.ai version

- **Storage**: shared data now lives in a free Supabase project instead of
  Claude's built-in storage. Updates sync to everyone live.
- **Live results checking**: instead of an AI web search, this calls
  [football-data.org](https://www.football-data.org)'s free API directly and
  works out each leg's result from real scores. No AI, no cost.
- **The cheeky AI recap feature has been removed** — do that bit manually in
  the group chat if you want it; keeping it would have meant a paid Anthropic
  API key.

## One-time setup (about 20 minutes)

You'll create three free accounts. None of them need a credit card.

### 1. Supabase (shared storage)

1. Go to [supabase.com](https://supabase.com), sign up, create a new project
   (pick any name/region, generate a database password and save it somewhere).
2. Once it's ready, open the **SQL Editor** and paste in the contents of
   [`supabase/schema.sql`](supabase/schema.sql) from this repo, then run it.
   This creates the one table the app needs and turns on live sync.
3. Go to **Settings -> API**. You'll need two values in a minute:
   - **Project URL**
   - **anon / public key**

### 2. football-data.org (live results)

1. Go to [football-data.org/client/register](https://www.football-data.org/client/register)
   and sign up for the free tier.
2. Once confirmed, your API token is on your account page. Free tier covers
   12 competitions including the Premier League, Champions League, and the
   other major European leagues, at 10 requests/minute — plenty for five
   people checking scores after a weekend.

### 3. GitHub + Vercel (hosting)

1. Push this project to a new **GitHub** repository (private is fine — it's
   just for the five of you).
2. Go to [vercel.com](https://vercel.com), sign up with your GitHub account,
   and click **Add New -> Project**, then import the repo you just pushed.
   Vercel will detect it's a Vite project automatically.
3. Before clicking deploy, add the environment variables (**Settings ->
   Environment Variables**, or the form shown during import):

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
   | `FOOTBALL_DATA_TOKEN` | your football-data.org token |

4. Deploy. Vercel gives you a live URL immediately (something like
   `sky-bet-club.vercel.app`), and a custom domain can be attached later
   under **Settings -> Domains** if you want one.

Share the Vercel URL with the group — that's it, no further setup needed on
their end.

## Running it locally (optional, for testing changes)

```bash
npm install
cp .env.example .env.local   # then fill in the three values above
npm run dev
```

## Honest limitations, worth knowing before you rely on this

- **No login system.** Anyone with the link can view and edit everything —
  same trust model as a shared Google Doc. Don't reuse the Supabase project
  for anything you wouldn't want a stranger stumbling onto.
- **Live results checking only covers what football-data.org's free tier
  covers**: match-level outcomes (result, BTTS, over/under goals, correct
  score, handicap, clean sheet, double chance) across 12 major competitions.
  Anything needing player-level data — anytime goalscorer, cards, corners —
  can't be auto-checked on the free tier and will always come back
  "pending" with a note to check it manually.
- **It only checks when someone has the app open.** There's no background
  server running this on a schedule — the first person to open the app after
  a gameweek finishes triggers the check for everyone, same as before.
- **The `anon` Supabase key is public by design** (that's how Supabase
  security works — access is controlled by the row-level security policies
  in `schema.sql`, not by hiding the key). It showing up in your deployed
  JavaScript is expected, not a leak.

## Project structure

```
src/App.jsx           the whole app
src/lib/storage.js     Supabase read/write/live-sync helpers
api/check-results.js   Vercel serverless function — the live results checker
supabase/schema.sql    run once in the Supabase SQL editor
```
