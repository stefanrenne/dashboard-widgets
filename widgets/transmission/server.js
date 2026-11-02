// Transmission: the RPC call torrent-get. Transmission answers 409 with an
// X-Transmission-Session-Id header first; it is kept and sent along from then on.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB']; // decimal, as in every widget
export function formatRate(bytesPerSecond) {
  let n = Number(bytesPerSecond) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}/s`;
}

const SESSION = 'x-transmission-session-id';

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const path = `/${String(o.rpcUrl ?? '/transmission/').replace(/^\/+|\/+$/g, '')}/rpc`.replace(/^\/\//, '/');
    const url = `${o.url.replace(/\/+$/, '')}${path}`;
    const body = JSON.stringify({ method: 'torrent-get', arguments: { fields: ['percentDone', 'status', 'rateDownload', 'rateUpload'] } });
    const call = async (retried = false) => {
      const headers = { 'content-type': 'application/json', accept: 'application/json' };
      if (o.username) headers.authorization = `Basic ${Buffer.from(`${o.username}:${o.password ?? ''}`).toString('base64')}`;
      if (ctx.cache.get('session')) headers[SESSION] = ctx.cache.get('session');
      const res = await ctx.fetch(url, { method: 'POST', headers, body });
      if (res.status === 409 && !retried && res.headers.get(SESSION)) {
        ctx.cache.set('session', res.headers.get(SESSION));
        return call(true);
      }
      if (!res.ok) throw new Error(`Transmission answered ${res.status}`);
      return res.json();
    };
    const json = await call();
    if (json.result && json.result !== 'success') throw new Error(`Transmission: ${json.result}`);
    const torrents = json.arguments?.torrents ?? [];
    const done = torrents.filter((t) => t.percentDone === 1).length;
    const down = torrents.reduce((s, t) => s + (t.rateDownload ?? 0), 0);
    const up = torrents.reduce((s, t) => s + (t.rateUpload ?? 0), 0);
    return {
      // the rates in MB/s (decimal, one decimal) for a filter
      attributes: { download: Math.round(down / 1e5) / 10, upload: Math.round(up / 1e5) / 10 },
      blocks: [
        { key: 'leech', label: 'leech', value: torrents.length - done },
        { key: 'download', label: 'download', value: formatRate(down) },
        { key: 'seed', label: 'seed', value: done },
        { key: 'upload', label: 'upload', value: formatRate(up) },
      ],
    };
  },
};
