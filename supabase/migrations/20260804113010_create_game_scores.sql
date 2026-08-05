create table public.game_scores (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 1 and 60),
  score integer not null check (score >= 0),
  survival_ms integer not null check (survival_ms >= 0),
  created_at timestamptz not null default now()
);

create index game_scores_created_at_score_idx
  on public.game_scores (created_at desc, score desc);

alter table public.game_scores enable row level security;

revoke all on table public.game_scores from anon, authenticated;
grant select on table public.game_scores to anon, authenticated;
grant all on table public.game_scores to service_role;

create policy "Festival leaderboard is publicly readable"
  on public.game_scores
  for select
  to anon, authenticated
  using (true);

comment on table public.game_scores is
  'Festival game results. Score submission remains server-only until QR validation is implemented.';
