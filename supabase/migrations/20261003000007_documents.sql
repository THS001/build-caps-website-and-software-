-- Gated downloads: market reports and the investor guide.
-- PDFs live in a private bucket; the server hands out short-lived signed links
-- after someone leaves their email.

alter table public.reports
  add column kind text not null default 'report' check (kind in ('report', 'guide'));

insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "editors upload documents" on storage.objects for insert with check (bucket_id = 'documents' and public.can_edit());
create policy "editors update documents" on storage.objects for update using (bucket_id = 'documents' and public.can_edit());
create policy "editors delete documents" on storage.objects for delete using (bucket_id = 'documents' and public.can_edit());
-- No select policy: nobody reads these directly; downloads use signed URLs.
