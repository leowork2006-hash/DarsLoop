-- Fictional identities/rows in one rolled-back transaction. No email is sent.
begin;
create temporary table darsloop_checks(name text,passed boolean);
grant select,insert on darsloop_checks to authenticated,service_role;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','darsloop-owner@example.invalid'),
 ('10000000-0000-4000-8000-000000000002','darsloop-member@example.invalid'),
 ('10000000-0000-4000-8000-000000000003','darsloop-outsider@example.invalid');
insert into public.lessons values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,'{"id":"20000000-0000-4000-8000-000000000001","ownerId":"10000000-0000-4000-8000-000000000001","version":1,"status":"ready","segments":[]}');
insert into public.groups values('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Fictional test class');
insert into public.memberships values('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
insert into public.shares values('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',1);
insert into public.reviews values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','fictional-question',1,'{}');
set local role authenticated;
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';
insert into darsloop_checks select 'owner reads own lesson',count(*)=1 from public.lessons where id='20000000-0000-4000-8000-000000000001';
insert into darsloop_checks select 'owner reads own review',count(*)=1 from public.reviews where lesson_id='20000000-0000-4000-8000-000000000001';
insert into darsloop_checks values('browser cannot write artifacts',not has_table_privilege('authenticated','public.lessons','INSERT,UPDATE,DELETE'));
insert into darsloop_checks values('browser cannot read job queue',not has_table_privilege('authenticated','public.jobs','SELECT'));
insert into darsloop_checks values('browser cannot invoke worker',not has_function_privilege('authenticated','public.darsloop_claim()','EXECUTE'));
insert into darsloop_checks values('anonymous cannot read lesson table',not has_table_privilege('anon','public.lessons','SELECT'));
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into darsloop_checks select 'invited member reads shared version',count(*)=1 from public.lessons where id='20000000-0000-4000-8000-000000000001';
insert into darsloop_checks select 'member cannot read owner practice history',count(*)=0 from public.reviews where lesson_id='20000000-0000-4000-8000-000000000001';
insert into darsloop_checks values('helper cannot impersonate another user',not darsloop_private.can_read('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'));
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}';
insert into darsloop_checks select 'outsider cannot read lesson',count(*)=0 from public.lessons where id='20000000-0000-4000-8000-000000000001';
insert into darsloop_checks select 'outsider cannot read group membership',count(*)=0 from public.memberships where group_id='30000000-0000-4000-8000-000000000001';
set local role service_role;
set local request.jwt.claims='{"role":"service_role"}';
update public.lessons set version=2,payload=jsonb_set(payload,'{version}','2') where id='20000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into darsloop_checks select 'older share does not authorize changed lesson',count(*)=0 from public.lessons where id='20000000-0000-4000-8000-000000000001';
set local role service_role;
set local request.jwt.claims='{"role":"service_role"}';
update public.shares set version=2 where lesson_id='20000000-0000-4000-8000-000000000001';
delete from public.shares where lesson_id='20000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims='{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}';
insert into darsloop_checks select 'revocation removes future row access',count(*)=0 from public.lessons where id='20000000-0000-4000-8000-000000000001';
reset role;
insert into darsloop_checks select 'audio bucket is private',not public from storage.buckets where id='lesson-audio';
select name,passed from darsloop_checks;
rollback;
