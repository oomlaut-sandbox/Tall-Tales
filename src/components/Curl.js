// Web fallback: no Skia, so the reader uses a simple slide instead of the paper curl.
// The full curl runs on iPhone and Android (Curl.native.js).
export const supportsCurl = false;
export async function snapshot() {
  return null;
}
export function CurlCanvas() {
  return null;
}
export function FlapPeel() {
  return null;
}
