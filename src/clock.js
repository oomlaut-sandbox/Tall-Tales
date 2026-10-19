// Times for the nightlight clock and alarm ("07:00" strings).
// shown the way the phone shows times (7:00 AM or 07:00)
export const fmtTime = (hm) => {
  const [h, m] = (hm || '07:00').split(':').map(Number);
  const d = new Date(2000, 0, 1, h, m);
  try { return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (e) { return hm; }
};
// "07:00" plus minutes, wrapping round the day
export const addMin = (hm, d) => {
  const [h, m] = (hm || '07:00').split(':').map(Number);
  const x = (((h * 60 + m + d) % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
};
