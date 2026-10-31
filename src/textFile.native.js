// A text file chosen from the phone (Files: a class list saved as .csv or .txt from Numbers, Excel or Google Sheets):
// its words, or null (Jörg, 31 Oct 2026). The web preview uses textFile.js.
import { File } from 'expo-file-system';

export async function pickTextFile() {
  let r = null;
  try { r = await File.pickFileAsync(undefined, 'text/*'); } catch (e) {
    try { r = await File.pickFileAsync(); } catch (e2) { return null; }
  }
  if (Array.isArray(r)) r = r[0];
  if (r && r.canceled) return null;
  if (r && r.result) r = Array.isArray(r.result) ? r.result[0] : r.result;
  if (!r) return null;
  const f = r instanceof File ? r : new File(r.uri || r);
  return f.text();
}
