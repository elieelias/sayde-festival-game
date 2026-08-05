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

Apply the migrations in `supabase/migrations`. The score table has RLS enabled and exposes only public leaderboard columns. Phone numbers remain private. Score writes go through the server route rather than granting insert access to browser clients.

No secret or service-role key belongs in a `NEXT_PUBLIC_` variable.

## Vercel

Import this directory as a Vercel project, set Node.js 22, and add all three Supabase environment variables. Keep the service-role key private. Next.js requires no custom Vercel configuration.

## Not implemented yet

Single-use QR validation, authoritative server-side score verification, and prize administration remain outside this pass. Until QR validation is connected, the score endpoint should be treated as a prototype trust boundary.
