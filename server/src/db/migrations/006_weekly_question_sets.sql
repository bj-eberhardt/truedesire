alter table system_questions
  add column if not exists intensity_level integer null check (intensity_level between 1 and 5);

update system_questions
set intensity_level = case question_id
  when 'q_checkin' then 1
  when 'q_conflict_style' then 1
  when 'q_boundaries_phone' then 1
  when 'q_rules' then 1
  when 'q_exes_contact' then 1
  when 'q_surprise' then 1
  when 'q_public_affection' then 2
  when 'q_sleep_separate' then 2
  when 'q_initiative' then 2
  when 'q_shower_or_bath_together' then 2
  when 'q_fkk' then 2
  when 'q_textile_free_sauna' then 2
  when 'q_sleep_naked_together' then 2
  when 'q_talk' then 3
  when 'q_aftercare' then 3
  when 'q_toys' then 3
  when 'q_porn' then 3
  when 'q_erotic_photos' then 3
  when 'q_dirty_talk' then 3
  when 'q_sexual_needs_missing' then 3
  when 'q_two_week_abstinence_date' then 3
  when 'q_sex_without_orgasm_goal' then 3
  when 'q_oral_sex' then 3
  when 'q_kamasutra_positions' then 3
  when 'q_mutual_masturbation' then 3
  when 'q_say_what_you_want' then 3
  when 'q_erotic_story_reading' then 3
  when 'q_sex_with_lights_on' then 3
  when 'q_roleplay' then 4
  when 'q_kinks_list' then 4
  when 'q_safeword' then 4
  when 'q_bondage' then 4
  when 'q_blindfold' then 4
  when 'q_spanking' then 4
  when 'q_temperature_play' then 4
  when 'q_wax_play' then 4
  when 'q_sex_commands' then 4
  when 'q_private_unusual_place' then 4
  when 'q_remote_toy' then 4
  when 'q_fetish_materials' then 4
  when 'q_daytime_erotic_messages' then 4
  when 'q_one_leads_evening' then 4
  when 'q_food_play_whipped_cream' then 4
  when 'q_genital_plaster_casting' then 4
  when 'q_threesome' then 5
  when 'q_flirting_others' then 5
  when 'q_sex_recording' then 5
  when 'q_sm_apartment_weekend' then 5
  when 'q_discreet_outdoor_sex' then 5
  when 'q_erotic_club' then 5
  when 'q_swingerclub_visit' then 5
  when 'q_anal_play' then 5
  else 1
end
where intensity_level is null;

alter table system_questions
  alter column intensity_level set not null;

alter table questions
  add column if not exists system_question_id text null,
  add column if not exists system_catalog_version integer null,
  add column if not exists system_week_start bigint null,
  add column if not exists intensity_level integer null check (intensity_level between 1 and 5);

create table if not exists pair_weekly_question_sets (
  pair_id text not null references pairs(id) on delete cascade,
  week_start bigint not null,
  catalog_version integer not null references system_question_versions(version),
  system_question_ids jsonb not null,
  own_question_ids jsonb not null,
  created_at bigint not null,
  primary key (pair_id, week_start)
);

create index if not exists pair_weekly_question_sets_pair_week_idx
  on pair_weekly_question_sets(pair_id, week_start);

create unique index if not exists questions_pair_system_week_idx
  on questions(pair_id, system_catalog_version, system_question_id, system_week_start)
  where system_question_id is not null and system_catalog_version is not null and system_week_start is not null;

update pairs set weekly_limit = 6 where weekly_limit between 1 and 5;

alter table pairs
  drop constraint if exists pairs_weekly_limit_range;

alter table pairs
  add constraint pairs_weekly_limit_range
  check (weekly_limit = 0 or weekly_limit between 6 and 50);
