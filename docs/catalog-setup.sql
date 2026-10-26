-- The Book Store catalog. Run once in Supabase: SQL Editor → New query → paste all → Run.
-- Afterwards you curate the store in Table Editor: "shelves" and "books".
--
--   shelves: one row per row of books in the Book Store ("New", "Bedtime", ...).
--            sort = order on the page (small numbers first). published = show it or not.
--   books:   one row per book.
--            shelf_id = which shelf it sits on, sort = its place on that shelf.
--            access = 'free' (everyone), 'member' (included in the membership), or 'paid'
--            (membership, or buy it on its own; price_label is what the store shows, e.g. $2.99).
--            featured = shown big at the top of the store. published = visible in the app.
--            bundled = the book's pages ship inside the app (the first free books);
--            other books are downloaded (content_path points at their folder in Storage).

create table if not exists public.shelves (
  id text primary key,
  title text not null,
  sort int not null default 100,
  published boolean not null default true
);

create table if not exists public.books (
  id text primary key,
  title text not null,
  author text,
  blurb text,
  shelf_id text references public.shelves(id) on update cascade on delete set null,
  sort int not null default 100,
  access text not null default 'member' check (access in ('free', 'member', 'paid')),
  price_label text,
  product_id text,            -- the App Store product for buying it on its own (filled in later)
  featured boolean not null default false,
  published boolean not null default false,
  bundled boolean not null default false,
  cover_path text,            -- picture in Storage (for books that aren't bundled)
  content_path text,          -- folder in Storage with the book's pages and narration
  page_count int,
  age_range text,             -- e.g. '3–6'
  updated_at timestamptz not null default now()
);

-- Everyone (signed in or not) can read what's published; nobody can change it from the app.
alter table public.shelves enable row level security;
alter table public.books enable row level security;
drop policy if exists "read published shelves" on public.shelves;
create policy "read published shelves" on public.shelves for select using (published);
drop policy if exists "read published books" on public.books;
create policy "read published books" on public.books for select using (published);

-- Keep updated_at fresh when you edit a row (the app uses it to refresh its copy).
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists books_touch on public.books;
create trigger books_touch before update on public.books for each row execute function public.touch_updated_at();

-- A public folder for book pictures, covers and narration.
insert into storage.buckets (id, name, public) values ('books', 'books', true)
  on conflict (id) do nothing;

-- Starting shelves and the three free books that come with the app (add their blurbs in Table Editor).
insert into public.shelves (id, title, sort) values
  ('free', 'Free to read', 10),
  ('new', 'New', 20),
  ('bedtime', 'Bedtime', 30),
  ('feelings', 'Big feelings', 40)
on conflict (id) do nothing;

insert into public.books (id, title, author, blurb, shelf_id, sort, access, featured, published, bundled, page_count, age_range) values
  ('different', 'Different', 'Jörg Schmidt', null, 'free', 10, 'free', true, true, true, 16, null),
  ('falling', 'Falling', 'Jörg Schmidt', null, 'free', 20, 'free', false, true, true, 14, null),
  ('pip', 'Pip and the Pond of Stars', null, null, 'free', 30, 'free', false, true, true, 4, null)
on conflict (id) do nothing;

-- Each book's Process description (Jörg, 26 Oct 2026): how the book was made, including any use of AI, shown on
-- its card in the Book Store. Safe to run again.
alter table public.books add column if not exists process text;
