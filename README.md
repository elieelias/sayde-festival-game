# Save the Scoop

A standalone, mobile-first festival game built with Next.js, Supabase, and Vercel in mind.

## Current gameplay

- One life: the first unprotected heat collision ends the run.
- No round timer: players continue until they are hit.
- Every power-up lasts 10 seconds.
- Difficulty rises continuously through faster hazards, shorter spawn intervals, drifting movement, and multi-hazard bursts.
- Custom vector art replaces the original emoji-style ice cream, heat, and power-up icons.
- The original Save the Scoop wordmark is retained.
- Players enter a name and phone number before starting.
- Every completed run opens today’s leaderboard automatically.

## Run locally

Use Node.js 22 or later.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase

Copy `.env.example` to `.env.local` and add the Project URL and publishable key from the Supabase Connect dialog. Add the service-role key as `SUPABASE_SERVICE_ROLE_KEY`; it is server-only and must never use a `NEXT_PUBLIC_` prefix.

Apply the migrations in `supabase/migrations`. The database has one application table, `game_entries`, with exactly these columns: `id`, `name`, `phone_number`, `token`, `url`, `is_used`, `score`, and `used_at`.

It contains 2,000 unique single-use QR-token rows. Tokens and phone numbers are private, every row starts with `is_used = false`, and only trusted server-side code can access the table. URLs currently use the relative form `/?token=<token>` so the final public game domain can be added when the QR file is generated.

The game UI remains locked unless the URL contains a valid, unused token. Pressing **Start game** atomically changes that row to `is_used = true` and records `used_at`; any later visit or second start attempt with the same URL is blocked. A completed run may save its score once, but the game cannot be replayed.

No secret or service-role key belongs in a `NEXT_PUBLIC_` variable.

## Vercel

Import this directory as a Vercel project, set Node.js 22, and add all three Supabase environment variables. Keep the service-role key private. Next.js requires no custom Vercel configuration.

## Not implemented yet

The QR scanning and atomic game-start validation flow, authoritative server-side score verification, and prize administration remain outside this pass. Until QR validation is connected, the score endpoint should be treated as a prototype trust boundary.
