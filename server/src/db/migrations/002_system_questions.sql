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

insert into system_question_versions(version, published_at, description)
values (
  1,
  floor(extract(epoch from clock_timestamp()) * 1000)::bigint,
  'Initial system questions migrated from server/data/system-questions.json'
)
on conflict (version) do nothing;

with migration_clock as (
  select floor(extract(epoch from clock_timestamp()) * 1000)::bigint as created_at
)
insert into system_questions(
  catalog_version,
  question_id,
  position,
  text,
  sha256_b64,
  created_at
)
select
  1,
  item.question_id,
  item.position,
  item.text,
  item.sha256_b64,
  migration_clock.created_at
from migration_clock
cross join (
  values
    (1, 'q_threesome', 1, 'Möchtest du gerne einen Dreier ausprobieren?', 'Q6g2KqSMRGze3UsRa1CDaz3Sf3tWurz7tRsuE/DwR9M='),
    (1, 'q_roleplay', 2, 'Möchtest du mal ein Rollenspiel ausprobieren?', 'a295QJ0SXcru7VEIpo/K/081biaEJorCmzZB2Z8pDSg='),
    (1, 'q_talk', 3, 'Möchtest du über Fantasien offener sprechen (z.B. 1x pro Woche 10 Minuten)?', 'ShuwDWExTvessj3ulRElzbhFZA14JpGMrX370nbqwcQ='),
    (1, 'q_surprise', 4, 'Hättest du Lust auf ein Überraschungs-Date (abwechselnd geplant)?', '2O2ImLshJ+BmA6j+thirTUnFg3dlWqyc9oPGlG+UuNk='),
    (1, 'q_rules', 5, 'Sollen wir Grenzen/No-Gos einmal gemeinsam festhalten (ohne Druck)?', 'sHU8n7QShwGAFYeGo0o38yCpge1WxANtkNpqnW2nmzY='),
    (1, 'q_love_language', 6, 'Wie zeigst du am liebsten Liebe: Zeit, Worte, Berührung, Hilfe oder Geschenke?', 'kUb32CMDZnLctN4jf5e4eMWorwKX06nlWPOd0ybGuog='),
    (1, 'q_checkin', 7, 'Wollen wir einen regelmäßigen Check-in machen (z.B. sonntags 10 Minuten)?', 'xWJYpzaitSMMXkdCKa2LSL5dA8bDSPHWIndaFrmzhgU='),
    (1, 'q_conflict_style', 8, 'Wenn wir uns streiten: Lieber direkt klären oder erstmal Abstand und später reden?', 'wvUJkiyyapXbhBZD7l2qI3JooUquxJ4mSHyFlGjSNdY='),
    (1, 'q_boundaries_phone', 9, 'Sollen Handys bei Dates eher weggelegt werden (z.B. auf lautlos)?', 'u5K1gWO4B4tFMeTFKDvL5JX0a+r5K8MaOKXLQOe+Ces='),
    (1, 'q_money_split', 10, 'Wie sollen wir bei gemeinsamen Ausgaben vorgehen: 50/50, abwechselnd, oder nach Einkommen?', 'aSZN+qosjXt0T0V7L/V0dt8IWCHm0a3LMV4eOVfcop8='),
    (1, 'q_travel_style', 11, 'Wie reist du am liebsten: spontan, geplant, eher aktiv oder eher entspannt?', '9eFMxToIBHdpiCa4ETBKvzGAy37Sqd+EMcM+Tp5Xo8k='),
    (1, 'q_sleepover', 12, 'Hast du Lust, dass wir mal öfter zusammen übernachten?', '8NFOHfatqU9OgsLIwq1wRYntCDqCW9Rmg2DaNbOL5rM='),
    (1, 'q_public_affection', 13, 'Magst du Zuneigung in der Öffentlichkeit (Händchen halten, Küssen)?', 'GeKgcQvBS8wQdNH++uXagM0P40Fd2fQsxZLYS8BrMRc='),
    (1, 'q_frequency_sex', 14, 'Wie wichtig ist dir sexuelle Häufigkeit im Alltag?', 'oZGMdwuHeKFudRUzr5hILp0NvjhHvZar6OrnqRcnetY='),
    (1, 'q_initiative', 15, 'Wünschst du dir, dass wir beide gleich oft Initiative zeigen (Dates, Sex, Nähe)?', 'hVqwlxc6gJTxmpejcwKYYtXuM9q6AzfZFskuhP3IVR8='),
    (1, 'q_aftercare', 16, 'Ist dir Aftercare wichtig (kuscheln, reden, Nähe nach Sex)?', 'YYwspeQn3t2u0KMzc1e8y9/yZs/E+joRv/bR7Djc+Pw='),
    (1, 'q_kinks_list', 17, 'Wollen wir eine kleine Liste machen: ''Neugierig'', ''Vielleicht'', ''Nein'' (ohne Bewertung)?', 'LVghd06UTVQLXfbH4dcQIxsua3GERNTmknJQn2Cf5Ek='),
    (1, 'q_safeword', 18, 'Sollen wir ein Safeword vereinbaren, falls etwas zu viel wird?', '2g8vRvFkSFop4ifUS/DwsXZl7e8tTJzH+m3fqb70+Gk='),
    (1, 'q_toys', 19, 'Hättest du Lust, zusammen ein Toy auszusuchen (online oder im Shop)?', 'keQWhb7g+wAsZRsoibwFaFWLxm7rqwRptgqzFU6Zvas='),
    (1, 'q_porn', 20, 'Wie stehst du zu Pornos: okay, nur gemeinsam, oder lieber gar nicht?', '7FI8RjGs16Q0rGP1Hnyg7E4R/xxnpBh617ofHrVNntM='),
    (1, 'q_flirting_others', 21, 'Ist Flirten mit anderen für dich okay, und wo wäre die Grenze?', 'w30jwbHJJivCOtXp+NBaUALwMtVjV0uXbFob4hoBEb4='),
    (1, 'q_exes_contact', 22, 'Wie gehen wir mit Kontakt zu Ex-Partnern um?', 'p1fCjtNlIUBQXci8ztd0TW48SIwQ2DCc6HZvwThVQ6k='),
    (1, 'q_texting_frequency', 23, 'Wie viel Schreiben/Telefonieren am Tag fühlt sich für dich gut an?', 'fAykzFy99diMS25vnMI9S95an3/lVBhYbSHWlkJ2mBA='),
    (1, 'q_future_3months', 24, 'Was wünschst du dir von uns in den nächsten 3 Monaten?', 'Sorf4N0Tt9fT2krwfSwtQIYKAzr7d+Mtt65XwqXTums='),
    (1, 'q_date_ideas', 25, 'Sollen wir eine gemeinsame Date-Ideen-Liste anlegen und abwechselnd etwas auswählen?', 'i5nwGS+wIY04DRs6f52vL9D9PZzW0SWkMqjedZTmCJQ=')
) as item(catalog_version, question_id, position, text, sha256_b64)
on conflict (catalog_version, question_id) do nothing;
