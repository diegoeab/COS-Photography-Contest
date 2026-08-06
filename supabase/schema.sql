create extension if not exists "pgcrypto";

create table if not exists photos (
  id text primary key,
  title text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  voter_token text not null,
  favorite_id text not null references photos(id) on delete restrict,
  second_id text references photos(id) on delete restrict,
  third_id text references photos(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint votes_unique_voter_token unique (voter_token),
  constraint votes_distinct_choices check (
    (second_id is null or favorite_id <> second_id)
    and (third_id is null or favorite_id <> third_id)
    and (second_id is null or third_id is null or second_id <> third_id)
  )
);

create index if not exists idx_votes_created_at on votes(created_at);
create index if not exists idx_votes_favorite_id on votes(favorite_id);
create index if not exists idx_votes_second_id on votes(second_id);
create index if not exists idx_votes_third_id on votes(third_id);

create or replace view photo_scores as
with score_rows as (
  select favorite_id as photo_id, 2 as points from votes
  union all
  select second_id as photo_id, 1 as points from votes
  union all
  select third_id as photo_id, 1 as points from votes
)
select
  p.id as photo_id,
  p.title,
  coalesce(sum(s.points), 0)::int as points
from photos p
left join score_rows s on s.photo_id = p.id
group by p.id, p.title;

alter table photos enable row level security;
alter table votes enable row level security;

drop policy if exists "photos_select_public" on photos;
create policy "photos_select_public"
on photos
for select
to anon, authenticated
using (true);

drop policy if exists "votes_insert_public" on votes;
create policy "votes_insert_public"
on votes
for insert
to anon, authenticated
with check (true);

drop policy if exists "votes_select_public" on votes;
create policy "votes_select_public"
on votes
for select
to anon, authenticated
using (true);
