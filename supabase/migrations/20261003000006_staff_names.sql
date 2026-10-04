-- Staff can see each other's names and roles (CRM timeline authors, task owners).
create policy "staff see colleagues" on public.profiles for select using (public.is_staff());
