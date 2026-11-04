// ruTorrent: POST /plugins/httprpc/action.php with mode=list (the httprpc plugin, on by default).
// Each torrent is a list of fields; 3 is the state (1 = started), 11 the upload and 12 the
// download rate.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB']; // decimal, as in every widget
export function formatRate(bytesPerSecond) {
  let n = Number(bytesPerSecond) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}/s`;
}

export default {
  async fetch(ctx) {
    const { username, password } = ctx.options;
    const headers = { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/plugins/httprpc/action.php`, { method: 'POST', headers, body: 'mode=list' });
    if (!res.ok) throw new Error(`ruTorrent answered ${res.status}`);
    const list = Object.values((await res.json()).t ?? {});
    const sum = (i) => list.reduce((s, t) => s + (parseInt(t[i], 10) || 0), 0);
    return {
      attributes: { upload: Math.round(sum(11) / 1e5) / 10, download: Math.round(sum(12) / 1e5) / 10 },
      blocks: [
        { key: 'active', label: 'active', value: list.filter((t) => String(t[3]) === '1').length },
        { key: 'upload', label: 'upload', value: formatRate(sum(11)) },
        { key: 'download', label: 'download', value: formatRate(sum(12)) },
      ],
    };
  },
};
