// Opening a book that's for sale (30 Oct 2026). The app sends { bookId, appUserId } (RevenueCat's ID for this
// phone). If RevenueCat says this customer bought the book (product oomlaut.book.<id>), or the caller is the
// store owner, the answer is a short-lived link for each of the book's files: { files: { "<path>": "<url>" } }.
// Free books don't need this: their files are public.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { cors, json, listAll } from '../_shared/books.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RC_KEY = (Deno.env.get('REVENUECAT_SECRET_KEY') || '').trim();
const HOURS = 12; // links last this long (a long bedtime story with the screen off)

const productId = (bookId: string) => `oomlaut.book.${bookId.replace(/[^A-Za-z0-9]/g, '_')}`;

async function bought(appUserId: string, bookId: string) {
  if (!RC_KEY || !appUserId) return false;
  const r = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, { headers: { Authorization: `Bearer ${RC_KEY}` } });
  if (r.status !== 200) return false;
  const body = await r.json().catch(() => null);
  const ns = body && body.subscriber && body.subscriber.non_subscriptions;
  return !!(ns && Array.isArray(ns[productId(bookId)]) && ns[productId(bookId)].length);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const { bookId, appUserId } = await req.json().catch(() => ({}));
  if (!bookId || !/^[a-z0-9-]+$/.test(bookId)) return json({ error: 'Which book?' }, 400);
  const db = createClient(URL_, SERVICE);
  const { data: book } = await db.from('books').select('id,access,published,content_path').eq('id', bookId).maybeSingle();
  if (!book) return json({ error: 'This book isn’t in the Book Store any more.' }, 404);
  if (book.access !== 'paid') return json({ free: true });
  const auth = req.headers.get('Authorization') || '';
  const { data: isAdmin } = await createClient(URL_, ANON, { global: { headers: { Authorization: auth } } }).rpc('is_store_admin');
  if (!isAdmin && !(book.published && await bought(String(appUserId || ''), bookId))) {
    return json({ error: RC_KEY ? 'This book hasn’t been bought on this device yet. Try Restore Purchases.' : 'Buying books isn’t switched on yet.' }, 403);
  }
  const folder = book.content_path || book.id;
  const paths = await listAll(db, 'sold-books', folder);
  const files: Record<string, string> = {};
  for (let i = 0; i < paths.length; i += 100) {
    const { data } = await db.storage.from('sold-books').createSignedUrls(paths.slice(i, i + 100).map((p) => `${folder}/${p}`), HOURS * 3600);
    for (const d of data || []) if (d.signedUrl && d.path) files[d.path.slice(folder.length + 1)] = d.signedUrl;
  }
  return json({ files });
});
