-- PDF jobs can run with generation credentials alone. Existing audio claiming
-- and transcription quota accounting stay in the original darsloop_claim RPC.
create function public.darsloop_claim_pdf() returns setof public.jobs language plpgsql security definer set search_path='' as $$
begin
 update public.lessons l set payload=jsonb_set(jsonb_set(jsonb_set(l.payload,'{status}','"failed"'),'{stage}','"Processing paused"'),'{error}','"Processing was interrupted repeatedly. Your PDF is saved; retry when the worker is stable."')
 where l.payload->>'sourceKind'='pdf' and exists(select 1 from public.jobs j where j.lesson_id=l.id and j.status='running' and j.attempts>=3 and j.lease_until<now());
 update public.jobs j set status='failed',lease=null,lease_until=null where j.status='running' and j.attempts>=3 and j.lease_until<now() and exists(select 1 from public.lessons l where l.id=j.lesson_id and l.payload->>'sourceKind'='pdf');
 return query update public.jobs set status='running',lease=gen_random_uuid(),lease_until=now()+interval '90 seconds',attempts=attempts+1
 where id=(select j.id from public.jobs j join public.lessons l on l.id=j.lesson_id
   where l.payload->>'sourceKind'='pdf' and j.available_at<=now() and j.attempts<3
     and (j.status='queued' or (j.status='running' and j.lease_until<now()))
   order by j.created_at for update of j skip locked limit 1) returning *;
end $$;
revoke all on function public.darsloop_claim_pdf() from public,anon,authenticated;
grant execute on function public.darsloop_claim_pdf() to service_role;
