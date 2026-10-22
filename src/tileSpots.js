// Where each book's cover sits in My Library right now (so a shut book can glide back to its real place,
// even after the library scrolled or the phone turned). Tiles register their cover view by book id.
const spots = new Map();
export function setTileSpot(id, ref) { if (id != null) spots.set(id, ref); }
export function clearTileSpot(id, ref) { if (spots.get(id) === ref) spots.delete(id); }
export function measureTile(id, cb) {
  const ref = spots.get(id);
  const v = ref && ref.current;
  if (!v || !v.measureInWindow) { cb(null); return; }
  v.measureInWindow((x, y, w, h) => cb(w ? { x, y, w, h } : null));
}
