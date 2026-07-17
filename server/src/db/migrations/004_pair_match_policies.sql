create table if not exists pair_match_policies (
  pair_id text not null references pairs(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  policy text not null check (policy in ('perfectOnly', 'allowMixedMaybe', 'allowMutualMaybe')),
  updated_at bigint not null,
  primary key (pair_id, user_id)
);

create index if not exists pair_match_policies_user_idx on pair_match_policies(user_id);
