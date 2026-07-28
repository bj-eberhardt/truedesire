create index if not exists users_created_at_idx
  on users(created_at);

create index if not exists questions_created_at_idx
  on questions(created_at);

create index if not exists answers_activity_at_user_pair_idx
  on answers((coalesce(updated_at, created_at)), user_id, pair_id);

create index if not exists pairs_active_id_idx
  on pairs(id)
  where status = 'active';
