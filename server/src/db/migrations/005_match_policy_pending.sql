alter table pairs
  add column if not exists match_policy_pending jsonb null;
