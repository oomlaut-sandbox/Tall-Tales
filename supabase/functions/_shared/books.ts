// Where a store book's files live (30 Oct 2026): free books in the public "books" folder; books for sale in the
// private "sold-books" folder (their cover stays in "books", so the store can show it to everyone).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

export const bucketFor = (access: string | null | undefined) => (access === 'paid' ? 'sold-books' : 'books');

export async function bookBucket(db: SupabaseClient, bookId: string) {
  const { data } = await db.from('books').select('access').eq('id', bookId).maybeSingle();
  return bucketFor(data && data.access);
}

// Every file under a folder, with its path relative to that folder (folders come back with no id).
export async function listAll(db: SupabaseClient, bucket: string, folder: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (dir: string, rel: string) => {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.storage.from(bucket).list(dir, { limit: 1000, offset });
      if (error || !data || !data.length) break;
      for (const f of data) {
        if (f.id) out.push(rel ? `${rel}/${f.name}` : f.name);
        else await walk(`${dir}/${f.name}`, rel ? `${rel}/${f.name}` : f.name);
      }
      if (data.length < 1000) break;
    }
  };
  await walk(folder, '');
  return out;
}

export const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
export const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
