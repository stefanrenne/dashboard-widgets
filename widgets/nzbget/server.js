// NZBGet: the JSON-RPC method status (POST /jsonrpc) with the control login. A paused queue
// shows as paused and is marked, as in the sabnzbd widget.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB']; // decimal, as in every widget
const scaled = (n, suffix = '') => {
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}${suffix}`;
};
export const formatRate = (bytesPerSecond) => scaled(Number(bytesPerSecond) || 0, '/s');
// NZBGet's "MB" are MiB
export const formatMiB = (mib) => scaled((Number(mib) || 0) * 1024 * 1024);

export default {
  async fetch(ctx) {
    const { url, username, password } = ctx.options;
    const headers = { 'content-type': 'application/json', accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${url.replace(/\/+$/, '')}/jsonrpc`, { method: 'POST', headers, body: JSON.stringify({ method: 'status', params: [], id: 1 }) });
    if (!res.ok) throw new Error(`NZBGet answered ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`NZBGet: ${json.error.message ?? 'error'}`);
    const s = json.result ?? {};
    return {
      attributes: {
        rate: s.DownloadPaused ? 0 : Math.round((Number(s.DownloadRate) || 0) / 1e5) / 10,
        remaining: Math.round(((Number(s.RemainingSizeMB) || 0) * 1024 * 1024) / 1e8) / 10,
      },
      blocks: [
        s.DownloadPaused
          ? { key: 'rate', label: 'rate', value: 'paused', status: 'warn' }
          : { key: 'rate', label: 'rate', value: formatRate(s.DownloadRate) },
        { key: 'remaining', label: 'remaining', value: formatMiB(s.RemainingSizeMB) },
        { key: 'downloaded', label: 'downloaded', value: formatMiB(s.DownloadedSizeMB) },
      ],
    };
  },
};
