// SABnzbd: download rate, number of items in the queue and time left.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB']; // decimal, as in every widget

export function formatRate(bytesPerSecond) {
  let n = bytesPerSecond;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) {
    n /= 1000;
    i++;
  }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}/s`;
}

/** "0:12:30" -> "12:30", "1:02:03" stays: the one time format of these widgets. */
export function clock(hms) {
  const parts = String(hms ?? '0:00:00').split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return String(hms);
  const [h, m, s] = parts.length === 3 ? parts : [0, ...parts];
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** "1:02:30" -> 62.5 (minutes), null when it is not a time. */
function minutesLeft(hms) {
  const parts = String(hms ?? '').split(':').map(Number);
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return null;
  const [h, m, s] = parts.length === 3 ? parts : [0, ...parts];
  return Math.round((h * 60 + m + s / 60) * 10) / 10;
}

export default {
  async fetch(ctx) {
    const url = new URL(`${ctx.options.url.replace(/\/+$/, '')}/api`);
    url.search = new URLSearchParams({ mode: 'queue', output: 'json', apikey: ctx.options.key }).toString();
    const res = await ctx.fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`SABnzbd answered ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`SABnzbd: ${json.error}`);
    const q = json.queue ?? {};
    const paused = q.paused === true || String(q.status).toLowerCase() === 'paused';
    const rate = paused ? 0 : (Number(q.kbpersec) || 0) * 1000;
    return {
      attributes: { rate: Math.round(rate / 1e5) / 10, paused, timeleft: minutesLeft(q.timeleft) },
      blocks: [
        paused
          ? { key: 'rate', label: 'rate', value: 'paused', status: 'warn' }
          : { key: 'rate', label: 'rate', value: formatRate(rate) },
        { key: 'queue', label: 'queue', value: Number(q.noofslots) || 0 },
        { key: 'timeleft', label: 'timeleft', value: clock(q.timeleft) },
      ],
    };
  },
};
