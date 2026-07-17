alter table answers
  add column if not exists match_tokens jsonb not null default '[]'::jsonb,
  add column if not exists policy_version integer not null default 1,
  add column if not exists maybe_counts_as_match boolean null;
