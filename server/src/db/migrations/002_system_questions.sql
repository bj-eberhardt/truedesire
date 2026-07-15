create table if not exists system_question_versions (
  version integer primary key,
  published_at bigint not null,
  description text null
);

create table if not exists system_questions (
  catalog_version integer not null references system_question_versions(version) on delete cascade,
  question_id text not null,
  position integer not null,
  text text not null,
  sha256_b64 text not null,
  created_at bigint not null,
  primary key (catalog_version, question_id),
  unique (catalog_version, position)
);

create index if not exists system_questions_catalog_position_idx
  on system_questions(catalog_version, position);
