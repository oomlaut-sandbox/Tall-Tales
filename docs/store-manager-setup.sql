-- The Store Manager: lets the store's owner (Jörg) add, edit and publish Book Store books from inside
-- the app. Run once in Supabase: SQL Editor → New query → paste all → Run.
-- Before running, put the email you sign in to Coro Reader with on the last line
-- (Profile shows it under "Signed in as").

-- Who may manage the store.
create table if not exists public.store_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.store_admins enable row level security;
drop policy if exists "see own admin row" on public.store_admins;
create policy "see own admin row" on public.store_admins for select using (user_id = auth.uid());

create or replace function public.is_store_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.store_admins where user_id = auth.uid());
$$;
grant execute on function public.is_store_admin() to authenticated;

-- What the Store Manager needs to know about each book.
alter table public.books add column if not exists narration_status text not null default 'none'; -- none | working | ready | failed
alter table public.books add column if not exists narration_note text;   -- e.g. what went wrong
alter table public.books add column if not exists source_story text;     -- the book-maker story it was published from
alter table public.books add column if not exists cover_title jsonb;      -- the title set on the cover in the Cover Editor

-- The owner can see everything (published or not) and change it.
drop policy if exists "admins read shelves" on public.shelves;
create policy "admins read shelves" on public.shelves for select using (public.is_store_admin());
drop policy if exists "admins write shelves" on public.shelves;
create policy "admins write shelves" on public.shelves for all using (public.is_store_admin()) with check (public.is_store_admin());
drop policy if exists "admins read books" on public.books;
create policy "admins read books" on public.books for select using (public.is_store_admin());
drop policy if exists "admins write books" on public.books;
create policy "admins write books" on public.books for all using (public.is_store_admin()) with check (public.is_store_admin());

-- The owner can upload, replace and remove pictures in the public "books" folder.
drop policy if exists "admins upload books" on storage.objects;
create policy "admins upload books" on storage.objects for insert to authenticated
  with check (bucket_id = 'books' and public.is_store_admin());
drop policy if exists "admins update books" on storage.objects;
create policy "admins update books" on storage.objects for update to authenticated
  using (bucket_id = 'books' and public.is_store_admin());
drop policy if exists "admins delete books" on storage.objects;
create policy "admins delete books" on storage.objects for delete to authenticated
  using (bucket_id = 'books' and public.is_store_admin());

-- Age ratings (set per book in the Store Manager): the youngest age a book is for, and the oldest it's aimed at
-- (empty = "and up"). Parents can show only the books rated for their child's age.
alter table public.books add column if not exists min_age int check (min_age between 0 and 18);
alter table public.books add column if not exists max_age int check (max_age between 0 and 18);

-- Make yourself the owner: put your sign-in email between the quotes.
insert into public.store_admins (user_id)
  select id from auth.users where lower(email) = lower('YOUR-EMAIL-HERE')
on conflict do nothing;
