// Free or for sale (30 Oct 2026): the store owner changes who can read a store book. A book for sale has its
// pages and narration moved into the private "sold-books" folder (the cover stays public, for the store);
// made free again, they move back. POST { bookId, access: 'free' | 'paid' | 'member', price_label? }.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { bucketFor, cors, json, listAll } from '../_shared/books.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const auth = req.headers.get('Authorization') || '';
  const { data: isAdmin } = await createClient(URL_, ANON, { global: { headers: { Authorization: auth } } }).rpc('is_store_admin');
  if (!isAdmin) return json({ error: 'Only the store owner can do this.' }, 403);
  const { bookId, access, price_label } = await req.json().catch(() => ({}));
  if (!bookId || !/^[a-z0-9-]+$/.test(bookId) || !['free', 'paid', 'member'].includes(access)) return json({ error: 'Which book, and free or for sale?' }, 400);
  const db = createClient(URL_, SERVICE);
  const { data: book } = await db.from('books').select('id,access,bundled,content_path').eq('id', bookId).maybeSingle();
  if (!book) return json({ error: 'No such book.' }, 404);
  const from = bucketFor(book.access), to = bucketFor(access);
  let moved = 0;
  if (!book.bundled && from !== to) {
    const folder = book.content_path || book.id;
    const files = (await listAll(db, from, folder)).filter((p) => p !== 'cover.jpg'); // the cover always stays public
    for (const p of files) {
      const dl = await db.storage.from(from).download(`${folder}/${p}`);
      if (dl.error || !dl.data) return json({ error: `Couldn’t move ${p}.` }, 500);
      const up = await db.storage.from(to).upload(`${folder}/${p}`, dl.data, { upsert: true, contentType: dl.data.type || undefined, cacheControl: '60' });
      if (up.error) return json({ error: `Couldn’t move ${p}: ${up.error.message}` }, 500);
      moved++;
    }
    if (files.length) await db.storage.from(from).remove(files.map((p) => `${folder}/${p}`));
  }
  const patch: Record<string, unknown> = { access };
  if (access === 'paid') patch.price_label = price_label || '$1.99';
  const { error } = await db.from('books').update(patch).eq('id', bookId);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, moved });
});
