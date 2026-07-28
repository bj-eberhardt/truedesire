import { query } from "../db/pool.js";

export type AdminStatsCounts = {
  registeredUsers: number;
  activeUsers: number;
  activePairs: number;
  questionsCreated: number;
  answersGiven: number;
  activatedUsers: number;
  activatedPairs: number;
  mutuallyAnsweredQuestions: number;
  matchedQuestions: number;
  perfectMatches: number;
  maybeMatches: number;
};

export type AdminStatsTrendCounts = {
  dayStart: number;
  registeredUsers: number;
  activeUsers: number;
  activePairs: number;
  questionsCreated: number;
  answersGiven: number;
};

function count(row: Record<string, unknown>, key: keyof AdminStatsCounts): number {
  return Number(row[key] ?? 0);
}

function mapCounts(row: Record<string, unknown>): AdminStatsCounts {
  return {
    registeredUsers: count(row, "registeredUsers"),
    activeUsers: count(row, "activeUsers"),
    activePairs: count(row, "activePairs"),
    questionsCreated: count(row, "questionsCreated"),
    answersGiven: count(row, "answersGiven"),
    activatedUsers: count(row, "activatedUsers"),
    activatedPairs: count(row, "activatedPairs"),
    mutuallyAnsweredQuestions: count(row, "mutuallyAnsweredQuestions"),
    matchedQuestions: count(row, "matchedQuestions"),
    perfectMatches: count(row, "perfectMatches"),
    maybeMatches: count(row, "maybeMatches")
  };
}

export async function readAdminStatsCounts(
  startAt: number | null,
  endAt: number
): Promise<AdminStatsCounts> {
  const result = await query<Record<string, unknown>>(
    `with params as (
       select $1::bigint as start_at, $2::bigint as end_at
     ),
     answers_in_window as (
       select a.*
       from answers a, params p
       where (p.start_at is null or coalesce(a.updated_at, a.created_at) >= p.start_at)
         and coalesce(a.updated_at, a.created_at) < p.end_at
     ),
     answer_pairs as (
       select
         a.question_id,
         greatest(coalesce(a.updated_at, a.created_at), coalesce(b.updated_at, b.created_at)) as completed_at,
         (
           exists (
             select 1
             from jsonb_array_elements_text(coalesce(a.match_tokens->'perfect', '[]'::jsonb)) own(token)
             join jsonb_array_elements_text(coalesce(b.match_tokens->'perfect', '[]'::jsonb)) partner(token)
               on partner.token = own.token
           )
         ) as has_perfect,
         (
           exists (
             select 1
             from jsonb_array_elements_text(coalesce(a.match_tokens->'mixedMaybe', '[]'::jsonb)) own(token)
             join jsonb_array_elements_text(coalesce(b.match_tokens->'mixedMaybe', '[]'::jsonb)) partner(token)
               on partner.token = own.token
           ) or exists (
             select 1
             from jsonb_array_elements_text(coalesce(a.match_tokens->'mutualMaybe', '[]'::jsonb)) own(token)
             join jsonb_array_elements_text(coalesce(b.match_tokens->'mutualMaybe', '[]'::jsonb)) partner(token)
               on partner.token = own.token
           )
         ) as has_maybe
       from answers a
       join answers b on b.question_id = a.question_id and b.user_id > a.user_id
     ),
     answer_pairs_in_window as (
       select ap.*
       from answer_pairs ap, params p
       where (p.start_at is null or ap.completed_at >= p.start_at)
         and ap.completed_at < p.end_at
     )
     select
       (select count(*)::int from users u, params p
        where (p.start_at is null or u.created_at >= p.start_at) and u.created_at < p.end_at) as "registeredUsers",
       (select count(distinct a.user_id)::int from answers_in_window a) as "activeUsers",
       (select count(distinct a.pair_id)::int from answers_in_window a) as "activePairs",
       (select count(*)::int from questions q, params p
        where (p.start_at is null or q.created_at >= p.start_at) and q.created_at < p.end_at) as "questionsCreated",
       (select count(*)::int from answers_in_window) as "answersGiven",
       (select count(distinct a.user_id)::int
        from answers a
        join pairs p on p.id = a.pair_id and p.status = 'active') as "activatedUsers",
       (select count(distinct p.id)::int
        from pairs p
        join answers a on a.pair_id = p.id
        where p.status = 'active') as "activatedPairs",
       (select count(*)::int from answer_pairs_in_window) as "mutuallyAnsweredQuestions",
       (select count(*)::int from answer_pairs_in_window where has_perfect or has_maybe) as "matchedQuestions",
       (select count(*)::int from answer_pairs_in_window where has_perfect) as "perfectMatches",
       (select count(*)::int from answer_pairs_in_window where has_maybe) as "maybeMatches"`,
    [startAt, endAt]
  );
  return mapCounts(result.rows[0] ?? {});
}

export async function readAdminStatsTrendCounts(
  startAt: number,
  endAt: number
): Promise<AdminStatsTrendCounts[]> {
  const result = await query<{
    day_start: string;
    registered_users: string;
    active_users: string;
    active_pairs: string;
    questions_created: string;
    answers_given: string;
  }>(
    `with days as (
       select generate_series($1::bigint, $2::bigint - 86400000, 86400000)::bigint as day_start
     ),
     user_counts as (
       select
         ((created_at - $1::bigint) / 86400000)::int as day_index,
         count(*)::int as registered_users
       from users
       where created_at >= $1::bigint
         and created_at < $2::bigint
       group by day_index
     ),
     question_counts as (
       select
         ((created_at - $1::bigint) / 86400000)::int as day_index,
         count(*)::int as questions_created
       from questions
       where created_at >= $1::bigint
         and created_at < $2::bigint
       group by day_index
     ),
     answer_counts as (
       select
         ((coalesce(updated_at, created_at) - $1::bigint) / 86400000)::int as day_index,
         count(*)::int as answers_given,
         count(distinct user_id)::int as active_users,
         count(distinct pair_id)::int as active_pairs
       from answers
       where coalesce(updated_at, created_at) >= $1::bigint
         and coalesce(updated_at, created_at) < $2::bigint
       group by day_index
     )
     select
       d.day_start::text,
       coalesce(uc.registered_users, 0)::text as registered_users,
       coalesce(ac.active_users, 0)::text as active_users,
       coalesce(ac.active_pairs, 0)::text as active_pairs,
       coalesce(qc.questions_created, 0)::text as questions_created,
       coalesce(ac.answers_given, 0)::text as answers_given
     from days d
     left join user_counts uc on uc.day_index = ((d.day_start - $1::bigint) / 86400000)::int
     left join question_counts qc on qc.day_index = ((d.day_start - $1::bigint) / 86400000)::int
     left join answer_counts ac on ac.day_index = ((d.day_start - $1::bigint) / 86400000)::int
     order by d.day_start`,
    [startAt, endAt]
  );

  return result.rows.map((row) => ({
    dayStart: Number(row.day_start),
    registeredUsers: Number(row.registered_users),
    activeUsers: Number(row.active_users),
    activePairs: Number(row.active_pairs),
    questionsCreated: Number(row.questions_created),
    answersGiven: Number(row.answers_given)
  }));
}
