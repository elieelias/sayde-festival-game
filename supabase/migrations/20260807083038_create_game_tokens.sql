create table public.game_tokens (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  is_used boolean not null default false,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  constraint game_tokens_usage_consistency_check
    check (
      (is_used = false and used_at is null)
      or (is_used = true and used_at is not null)
    )
);

alter table public.game_tokens enable row level security;

-- QR tokens are secrets. Only trusted server-side code may read or consume them.
revoke all on table public.game_tokens from anon, authenticated;
grant all on table public.game_tokens to service_role;

insert into public.game_tokens (token)
select gen_random_uuid()
from generate_series(1, 2000);

comment on table public.game_tokens is
  'Single-use QR admission tokens. A token is consumed atomically when its game starts.';

comment on column public.game_tokens.is_used is
  'False until the token starts a game; true afterwards so it cannot be reused.';

comment on column public.game_tokens.used_at is
  'Server timestamp recorded when the token starts its one permitted game.';
