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
-- (uploading with "replace if it's there" needs to see the folder too, not only add to it: 30 Oct 2026)
drop policy if exists "admins read books folder" on storage.objects;
create policy "admins read books folder" on storage.objects for select to authenticated
  using (bucket_id = 'books' and public.is_store_admin());
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

-- Six languages for store books (30 Oct 2026): each language's state, title and synopsis for the store
-- ({ "de": { "status": "translating|review|narrating|ready|failed", "note", "title", "blurb", "coverTitle" }, … }).
-- The words themselves live in the book's content.json. A language shows to families only when "ready".
alter table public.books add column if not exists langs jsonb not null default '{}'::jsonb;

-- How a book was made (shown on its card as Process, including any use of AI). From docs/catalog-setup.sql, here too
-- so it's never missing: without it the app's catalog and Store Manager fall back to fewer columns (30 Oct 2026).
alter table public.books add column if not exists process text;

-- Shelf names in the other languages ({ "de": "Neu", … }), made by the translation service (30 Oct 2026).
alter table public.shelves add column if not exists langs jsonb not null default '{}'::jsonb;

-- Changes one language's entry without touching the others (the translation and narration services
-- work on several languages at once). Only the store owner, or the services themselves, may use it.
create or replace function public.set_book_lang(book_id text, lang text, patch jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (public.is_store_admin() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'Only the store owner can do this.';
  end if;
  update public.books
    set langs = coalesce(langs, '{}'::jsonb) || jsonb_build_object(lang, coalesce(langs -> lang, '{}'::jsonb) || patch)
    where id = book_id;
end $$;
revoke all on function public.set_book_lang(text, text, jsonb) from public, anon;
grant execute on function public.set_book_lang(text, text, jsonb) to authenticated, service_role;

-- Books for sale (30 Oct 2026): an artist's book bought on its own, on top of the membership. Its pages and
-- narration live in the private "sold-books" folder; the "open-book" service hands a buyer short-lived links
-- after checking the purchase with RevenueCat. Its cover stays in the public "books" folder for the store.
insert into storage.buckets (id, name, public) values ('sold-books', 'sold-books', false) on conflict (id) do nothing;
drop policy if exists "admins read sold books" on storage.objects;
create policy "admins read sold books" on storage.objects for select to authenticated
  using (bucket_id = 'sold-books' and public.is_store_admin());
drop policy if exists "admins upload sold books" on storage.objects;
create policy "admins upload sold books" on storage.objects for insert to authenticated
  with check (bucket_id = 'sold-books' and public.is_store_admin());
drop policy if exists "admins update sold books" on storage.objects;
create policy "admins update sold books" on storage.objects for update to authenticated
  using (bucket_id = 'sold-books' and public.is_store_admin());
drop policy if exists "admins delete sold books" on storage.objects;
create policy "admins delete sold books" on storage.objects for delete to authenticated
  using (bucket_id = 'sold-books' and public.is_store_admin());

-- Music and sounds for the tape player (31 Oct 2026): added, named, ordered, shown or hidden in the Store Manager,
-- without an app update. The files live in the public "tracks" folder. A track can name its musician (artist,
-- artist_note, artist_link), and one can be the featured musician on the Music and Sounds page.
create table if not exists public.tracks (
  id text primary key,
  kind text not null default 'music' check (kind in ('music', 'sound')),
  name text not null,
  langs jsonb not null default '{}'::jsonb,      -- the name in other languages: { de: '…', fr: '…' }
  artist text, artist_note text, artist_link text,
  file text,                                    -- its path in the "tracks" folder
  version int not null default 1,               -- goes up when the file is replaced (phones fetch it again)
  size_kb int,
  sort int not null default 100,
  hidden boolean not null default true,         -- new tracks start hidden until shown
  featured boolean not null default false,
  fade boolean not null default false,          -- fade out and in between repeats
  created_at timestamptz not null default now()
);
alter table public.tracks enable row level security;
drop policy if exists "everyone reads shown tracks" on public.tracks;
create policy "everyone reads shown tracks" on public.tracks for select using (not hidden);
drop policy if exists "admins read tracks" on public.tracks;
create policy "admins read tracks" on public.tracks for select using (public.is_store_admin());
drop policy if exists "admins write tracks" on public.tracks;
create policy "admins write tracks" on public.tracks for all using (public.is_store_admin()) with check (public.is_store_admin());
grant select on public.tracks to anon, authenticated;
grant insert, update, delete on public.tracks to authenticated;

insert into storage.buckets (id, name, public) values ('tracks', 'tracks', true) on conflict (id) do nothing;
drop policy if exists "admins read tracks folder" on storage.objects;
create policy "admins read tracks folder" on storage.objects for select to authenticated
  using (bucket_id = 'tracks' and public.is_store_admin());
drop policy if exists "admins upload tracks" on storage.objects;
create policy "admins upload tracks" on storage.objects for insert to authenticated
  with check (bucket_id = 'tracks' and public.is_store_admin());
drop policy if exists "admins update tracks" on storage.objects;
create policy "admins update tracks" on storage.objects for update to authenticated
  using (bucket_id = 'tracks' and public.is_store_admin());
drop policy if exists "admins delete tracks" on storage.objects;
create policy "admins delete tracks" on storage.objects for delete to authenticated
  using (bucket_id = 'tracks' and public.is_store_admin());

-- Make yourself the owner: put your sign-in email between the quotes.
insert into public.store_admins (user_id)
  select id from auth.users where lower(email) = lower('YOUR-EMAIL-HERE')
on conflict do nothing;

-- The pieces built into the app (Jörg, 31 Oct 2026): the Store Manager can hide any of them for everyone.
-- One row per built-in piece that has been switched (its id in the app, e.g. 'crickets').
create table if not exists public.builtin_tracks (
  id text primary key,
  hidden boolean not null default false
);
alter table public.builtin_tracks enable row level security;
drop policy if exists "everyone reads builtin tracks" on public.builtin_tracks;
create policy "everyone reads builtin tracks" on public.builtin_tracks for select using (true);
drop policy if exists "admins write builtin tracks" on public.builtin_tracks;
create policy "admins write builtin tracks" on public.builtin_tracks for all using (public.is_store_admin()) with check (public.is_store_admin());
grant select on public.builtin_tracks to anon, authenticated;
grant insert, update, delete on public.builtin_tracks to authenticated;
