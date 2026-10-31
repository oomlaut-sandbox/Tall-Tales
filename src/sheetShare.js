// Web preview: sending sheets works on the phone only (see sheetShare.native.js).
export const SHEET_KIND = 'oomlaut-sheet';
export async function shareSheet() {}
export function sheetPhotoFile() { return null; }
export async function unpackSheetPage(d) { const pg = (d && d.page) || {}; return { kind: pg.kind === 'sketch' ? 'sketch' : 'note', text: pg.text || '', strokes: pg.strokes || [], strokes2: pg.strokes2 || [] }; }
