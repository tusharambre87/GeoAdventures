/**
 * Shared open-status formatter.
 * Returns { label, color } when we have usable hours data, or null to hide the chip.
 */
export function formatOpenStatus(
  hours?: string | null
): { label: string; color: string } | null {
  if (!hours) return null;

  const trimmed = hours.trim();
  // Short string (e.g. "9 AM – 5 PM") — use as-is
  if (trimmed.length < 30) {
    const lc = trimmed.toLowerCase();
    if (lc.includes('closed')) return { label: trimmed, color: '#dc2626' };
    return { label: trimmed, color: '#16a34a' };
  }

  // Multi-day string — extract today's hours
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today = days[new Date().getDay()];
  const re = new RegExp(today + '[^:]*:\\s*([^,;\\n]+)', 'i');
  const m = trimmed.match(re);
  const seg = m ? m[1].trim() : trimmed.split(/[,;\n]/)[0].replace(/^[A-Za-z]+[–-][A-Za-z]+:\s*/, '').trim();

  if (!seg) return null;
  const lc = seg.toLowerCase();
  if (lc.includes('closed')) return { label: 'Closed', color: '#dc2626' };
  if (lc.includes('open')) return { label: 'Open now', color: '#16a34a' };
  // It's a time range like "9:00 AM – 5:00 PM" — label as Open now with the range
  return { label: `Open now · ${seg}`, color: '#16a34a' };
}
