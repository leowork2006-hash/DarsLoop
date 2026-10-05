-- Server-only quota accounting and lease-fenced retries. No owner audio/text here.
alter table public.jobs add column available_at timestamptz not null default now();
create index jobs_available on public.jobs(status,available_at,created_at);
create table darsloop_private.provider_audio(model text not null,seconds double precision not null check(seconds>0 and seconds<=700),created_at timestamptz not null default now());
create index provider_audio_window on darsloop_private.provider_audio(model,created_at);
alter table darsloop_private.provider_audio enable row level security;
revoke all on darsloop_private.provider_audio from public,anon,authenticated;
create or replace function public.darsloop_claim() returns setof public.jobs language plpgsql security definer set search_path='' as $$
begin
 update public.lessons l set payload=jsonb_set(jsonb_set(jsonb_set(l.payload,'{status}','"failed"'),'{stage}','"Processing paused"'),'{error}','"Processing was interrupted repeatedly. Your audio is saved; retry when the worker is stable."') where exists(select 1 from public.jobs j where j.lesson_id=l.id and j.status='running' and j.attempts>=3 and j.lease_until<now());
 update public.jobs set status='failed',lease=null,lease_until=null where status='running' and attempts>=3 and lease_until<now();
 return query update public.jobs set status='running',lease=gen_random_uuid(),lease_until=now()+interval '90 seconds',attempts=attempts+1 where id=(select id from public.jobs where available_at<=now() and attempts<3 and (status='queued' or (status='running' and lease_until<now())) order by created_at for update skip locked limit 1) returning *;
end $$;
create function public.darsloop_defer(p_job uuid,p_lease uuid,p_until timestamptz,p_message text) returns void language plpgsql security definer set search_path='' as $$
declare target uuid; count int; until_at timestamptz; value jsonb;
begin
 select lesson_id into target from public.jobs where id=p_job and lease=p_lease and status='running' and lease_until>now() for update;
 if target is null then raise exception 'Job lease expired';end if;
 select payload into value from public.lessons where id=target for update;
 count:=coalesce((value->>'quotaDeferrals')::int,0)+1;
 if count>48 then perform public.darsloop_fail(p_job,p_lease,'The provider limit has persisted. Your audio is saved; ask the app owner to check capacity.');return;end if;
 until_at:=greatest(now()+interval '5 seconds',least(p_until,now()+interval '1 day'));
 update public.lessons set payload=value||jsonb_build_object('status','queued','stage',left(p_message,240),'error',null,'nextAttemptAt',until_at,'quotaDeferrals',count) where id=target;
 update public.jobs set status='queued',available_at=until_at,lease=null,lease_until=null,attempts=greatest(0,attempts-1) where id=p_job and lease=p_lease;
end $$;
create function public.darsloop_reserve_audio(p_models text[],p_seconds double precision) returns timestamptz language plpgsql security definer set search_path='' as $$
declare model_name text; span interval; limit_seconds double precision; total double precision; item record; until_at timestamptz:=now();
begin
 if p_seconds is null or p_seconds<=0 or p_seconds>700 or cardinality(p_models) not between 1 and 2 then raise exception 'Invalid audio reservation';end if;
 -- Stable lock order also protects accounting if a second consumer is started.
 for model_name in select distinct unnest(p_models) order by 1 loop
  if model_name not in ('whisper-large-v3','whisper-large-v3-turbo') then raise exception 'Unsupported audio model';end if;
  perform pg_advisory_xact_lock(hashtextextended('darsloop-audio-'||model_name,0));
 end loop;
 delete from darsloop_private.provider_audio where created_at<=now()-interval '1 day';
 for model_name in select distinct unnest(p_models) loop
  foreach span in array array[interval '1 hour',interval '1 day'] loop
   limit_seconds:=case when span=interval '1 hour' then 7100 else 28000 end;
   select coalesce(sum(seconds),0)+p_seconds into total from darsloop_private.provider_audio where model=model_name and created_at>now()-span;
   for item in select seconds,created_at from darsloop_private.provider_audio where model=model_name and created_at>now()-span order by created_at loop
    exit when total<=limit_seconds;
    until_at:=greatest(until_at,item.created_at+span+interval '1 second');total:=total-item.seconds;
   end loop;
  end loop;
 end loop;
 if until_at>now() then return until_at;end if;
 insert into darsloop_private.provider_audio(model,seconds) select distinct unnest(p_models),p_seconds;
 return null;
end $$;
revoke all on function public.darsloop_defer(uuid,uuid,timestamptz,text),public.darsloop_reserve_audio(text[],double precision),public.darsloop_claim() from public,anon,authenticated;
grant execute on function public.darsloop_defer(uuid,uuid,timestamptz,text),public.darsloop_reserve_audio(text[],double precision),public.darsloop_claim() to service_role;
