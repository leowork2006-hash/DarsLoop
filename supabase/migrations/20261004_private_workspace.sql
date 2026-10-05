-- Dedicated DarsLoop project. Browser clients can read authorized rows only.
-- Writes go through verified application routes or the private worker.
create schema if not exists darsloop_private;
revoke all on schema darsloop_private from public, anon, authenticated;
create table public.lessons (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 version integer not null check(version>0), payload jsonb not null,
 check ((payload->>'id')::uuid=id), check ((payload->>'ownerId')::uuid=owner_id),
 check ((payload->>'version')::integer=version)
);
create index lessons_owner on public.lessons(owner_id);
create table public.groups (id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,name text not null check(length(name) between 2 and 80));
create table public.memberships (group_id uuid references public.groups(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,primary key(group_id,user_id));
create index memberships_user on public.memberships(user_id);
create table public.shares (group_id uuid references public.groups(id) on delete cascade,lesson_id uuid references public.lessons(id) on delete cascade,version integer not null,primary key(group_id,lesson_id));
create index shares_lesson on public.shares(lesson_id);
create table public.invites (token_hash text primary key,group_id uuid not null references public.groups(id) on delete cascade,expires_at timestamptz not null,used boolean not null default false);
create table public.reviews (user_id uuid references auth.users(id) on delete cascade,lesson_id uuid references public.lessons(id) on delete cascade,item_id text,version integer,payload jsonb not null,primary key(user_id,lesson_id,item_id,version));
create index reviews_lesson on public.reviews(lesson_id);
create table public.jobs (id uuid primary key,lesson_id uuid unique not null references public.lessons(id) on delete cascade,status text not null check(status in ('queued','running','done','failed')),lease uuid,lease_until timestamptz,attempts integer not null default 0,error text,created_at timestamptz not null default now());
create index jobs_pending on public.jobs(status,lease_until);
create table public.events (id bigint generated always as identity primary key,user_id uuid not null references auth.users(id) on delete cascade,event text not null,created_at timestamptz not null default now());
create index events_budget on public.events(user_id,event,created_at);
create table public.search_vectors (lesson_id uuid references public.lessons(id) on delete cascade,version integer,model text,dimensions integer,chunk_hash text,vector jsonb not null,primary key(lesson_id,version,model,dimensions,chunk_hash));

create function darsloop_private.member(p_group uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$ select (p_user=(select auth.uid()) or (select auth.role())='service_role') and exists(select 1 from public.memberships where group_id=p_group and user_id=p_user) $$;
create function darsloop_private.can_read(p_lesson uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$ select (p_user=(select auth.uid()) or (select auth.role())='service_role') and exists(select 1 from public.lessons l where l.id=p_lesson and (l.owner_id=p_user or exists(select 1 from public.shares s join public.memberships m on m.group_id=s.group_id where s.lesson_id=l.id and s.version=l.version and m.user_id=p_user))) $$;
revoke execute on function darsloop_private.member(uuid,uuid),darsloop_private.can_read(uuid,uuid) from public,anon;
grant usage on schema darsloop_private to authenticated,service_role;
grant execute on function darsloop_private.member(uuid,uuid),darsloop_private.can_read(uuid,uuid) to authenticated,service_role;

alter table public.lessons enable row level security;
alter table public.groups enable row level security;
alter table public.memberships enable row level security;
alter table public.shares enable row level security;
alter table public.invites enable row level security;
alter table public.reviews enable row level security;
alter table public.jobs enable row level security;
alter table public.events enable row level security;
alter table public.search_vectors enable row level security;
revoke all on public.lessons,public.groups,public.memberships,public.shares,public.invites,public.reviews,public.jobs,public.events,public.search_vectors from anon,authenticated;
grant select on public.lessons,public.groups,public.memberships,public.shares,public.reviews to authenticated;
grant all on public.lessons,public.groups,public.memberships,public.shares,public.invites,public.reviews,public.jobs,public.events,public.search_vectors to service_role;
grant usage,select on sequence public.events_id_seq to service_role;
create policy lesson_read on public.lessons for select to authenticated using(darsloop_private.can_read(id,(select auth.uid())));
create policy group_read on public.groups for select to authenticated using(darsloop_private.member(id,(select auth.uid())));
create policy membership_read on public.memberships for select to authenticated using(darsloop_private.member(group_id,(select auth.uid())));
create policy share_read on public.shares for select to authenticated using(darsloop_private.member(group_id,(select auth.uid())));
create policy review_read on public.reviews for select to authenticated using(user_id=(select auth.uid()) and darsloop_private.can_read(lesson_id,(select auth.uid())) and exists(select 1 from public.lessons l where l.id=lesson_id and l.version=reviews.version));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('lesson-audio','lesson-audio',false,25165824,array['audio/mpeg','audio/mp4','audio/wav','audio/ogg','audio/webm']);
-- Original audio is served through the application after a fresh access check.
-- No browser storage policies: no direct write, listing or signed URL generation.

create function public.darsloop_queue(p_payload jsonb,p_new boolean) returns void language plpgsql security definer set search_path='' as $$
declare p_id uuid := (p_payload->>'id')::uuid; p_owner uuid := (p_payload->>'ownerId')::uuid; p_version int := (p_payload->>'version')::int;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
 if p_new then
  if (select count(*) from public.lessons where owner_id=p_owner)>=30 then raise exception 'Lesson limit reached'; end if;
  insert into public.lessons values(p_id,p_owner,p_version,p_payload);
 else
  if exists(select 1 from public.jobs where lesson_id=p_id and status='running') then raise exception 'Lesson is processing';end if;
  update public.lessons set payload=p_payload where id=p_id and owner_id=p_owner and version=p_version;
  if not found then raise exception 'Lesson changed'; end if;
 end if;
 insert into public.jobs(id,lesson_id,status) values(gen_random_uuid(),p_id,'queued') on conflict(lesson_id) do update set status='queued',lease=null,lease_until=null,error=null,attempts=0 where jobs.status in ('failed','done');
end $$;
create function public.darsloop_claim() returns setof public.jobs language plpgsql security definer set search_path='' as $$
begin
 update public.lessons l set payload=jsonb_set(jsonb_set(jsonb_set(l.payload,'{status}','"failed"'),'{stage}','"Processing paused"'),'{error}','"Processing was interrupted repeatedly. Your audio is saved; retry when the worker is stable."') where exists(select 1 from public.jobs j where j.lesson_id=l.id and j.status='running' and j.attempts>=3 and j.lease_until<now());
 update public.jobs set status='failed',lease=null,lease_until=null where status='running' and attempts>=3 and lease_until<now();
 return query update public.jobs set status='running',lease=gen_random_uuid(),lease_until=now()+interval '90 seconds',attempts=attempts+1 where id=(select id from public.jobs where attempts<3 and (status='queued' or (status='running' and lease_until<now())) order by created_at for update skip locked limit 1) returning *;
end $$;
create function public.darsloop_heartbeat(p_job uuid,p_lease uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin update public.jobs set lease_until=now()+interval '90 seconds' where id=p_job and lease=p_lease and status='running' and lease_until>now();return found;end $$;
create function public.darsloop_commit(p_job uuid,p_lease uuid,p_payload jsonb,p_done boolean) returns void language plpgsql security definer set search_path='' as $$
declare p_lesson uuid;
begin
 select lesson_id into p_lesson from public.jobs where id=p_job and lease=p_lease and status='running' and lease_until>now() for update;
 if p_lesson is null or p_lesson<>(p_payload->>'id')::uuid then raise exception 'Job lease expired';end if;
 update public.lessons set payload=p_payload where id=p_lesson and owner_id=(p_payload->>'ownerId')::uuid and version=(p_payload->>'version')::int;
 if not found then raise exception 'Lesson changed';end if;
 if p_done then update public.jobs set status='done',lease=null,lease_until=null where id=p_job;end if;
end $$;
create function public.darsloop_fail(p_job uuid,p_lease uuid,p_error text) returns void language plpgsql security definer set search_path='' as $$
declare p_lesson uuid;
begin
 update public.jobs set status='failed',error=p_error,lease=null,lease_until=null where id=p_job and lease=p_lease and status='running' returning lesson_id into p_lesson;
 if p_lesson is not null then update public.lessons set payload=jsonb_set(jsonb_set(jsonb_set(payload,'{status}','"failed"'),'{stage}','"Processing paused"'),'{error}',to_jsonb(p_error)) where id=p_lesson;end if;
end $$;
create function public.darsloop_group(p_user uuid,p_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare p_id uuid:=gen_random_uuid();
begin insert into public.groups values(p_id,p_user,p_name);insert into public.memberships values(p_id,p_user);return p_id;end $$;
create function public.darsloop_join(p_user uuid,p_hash text) returns uuid language plpgsql security definer set search_path='' as $$
declare p_id uuid;
begin update public.invites set used=true where token_hash=p_hash and expires_at>now() and not used returning group_id into p_id;if p_id is null then raise exception 'Invitation expired or used';end if;insert into public.memberships values(p_id,p_user) on conflict do nothing;return p_id;end $$;
create function public.darsloop_budget(p_user uuid,p_event text,p_limit int) returns boolean language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_event,0));
 delete from public.events where created_at<now()-interval '1 day';
 if (select count(*) from public.events where user_id=p_user and event=p_event and created_at>now()-interval '1 minute')>=p_limit then return false;end if;
 insert into public.events(user_id,event) values(p_user,p_event);return true;
end $$;
create function public.darsloop_review(p_user uuid,p_lesson uuid,p_item text,p_version int,p_correct boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare old_review jsonb; days int; result jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_lesson::text||p_item,0));
 if not darsloop_private.can_read(p_lesson,p_user) or not exists(select 1 from public.lessons where id=p_lesson and version=p_version) then raise exception 'Lesson access ended';end if;
 select payload into old_review from public.reviews where user_id=p_user and lesson_id=p_lesson and item_id=p_item and version=p_version;
 days:=case when p_correct then least(30,case when coalesce((old_review->>'intervalDays')::int,0)<1 then 1 else (old_review->>'intervalDays')::int*2 end) else 0 end;
 result:=jsonb_build_object('itemId',p_item,'lessonId',p_lesson,'version',p_version,'intervalDays',days,'attempts',coalesce((old_review->>'attempts')::int,0)+1,'lastResult',p_correct,'dueAt',now()+case when p_correct then make_interval(days=>days) else interval '10 minutes' end);
 insert into public.reviews values(p_user,p_lesson,p_item,p_version,result) on conflict(user_id,lesson_id,item_id,version) do update set payload=excluded.payload;return result;
end $$;
-- Prevent directly calling privileged mutators with a user-chosen owner ID.
revoke all on function public.darsloop_queue(jsonb,boolean),public.darsloop_claim(),public.darsloop_heartbeat(uuid,uuid),public.darsloop_commit(uuid,uuid,jsonb,boolean),public.darsloop_fail(uuid,uuid,text),public.darsloop_group(uuid,text),public.darsloop_join(uuid,text),public.darsloop_budget(uuid,text,int),public.darsloop_review(uuid,uuid,text,int,boolean) from public,anon,authenticated;
grant execute on function public.darsloop_queue(jsonb,boolean),public.darsloop_claim(),public.darsloop_heartbeat(uuid,uuid),public.darsloop_commit(uuid,uuid,jsonb,boolean),public.darsloop_fail(uuid,uuid,text),public.darsloop_group(uuid,text),public.darsloop_join(uuid,text),public.darsloop_budget(uuid,text,int),public.darsloop_review(uuid,uuid,text,int,boolean) to service_role;
