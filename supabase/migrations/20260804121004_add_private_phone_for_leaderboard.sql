alter table public.game_scores
  add column phone_number text
    check (phone_number is null or char_length(phone_number) between 7 and 24),
  add column festival_day date not null
    default ((now() at time zone 'Asia/Beirut')::date);

create index game_scores_festival_day_rank_idx
  on public.game_scores (festival_day, score desc, created_at asc);

-- The leaderboard is public, but participant phone numbers are private.
-- Browser clients can only read the explicitly listed leaderboard columns.
revoke select on table public.game_scores from anon, authenticated;
grant select (id, display_name, score, survival_ms, created_at, festival_day)
  on table public.game_scores to anon, authenticated;

comment on column public.game_scores.phone_number is
  'Private prize-contact number. Never expose this column through leaderboard responses.';

comment on column public.game_scores.festival_day is
  'Calendar day in the Asia/Beirut festival timezone, assigned when a score is submitted.';
