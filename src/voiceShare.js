// Web preview: sharing a book in your own voice works on the phone only (see voiceShare.native.js).
export async function shareBookWithVoices() { return false; }
export async function readVoicesFile() { return null; }
export async function importVoices() { return { ok: false, names: [] }; }
