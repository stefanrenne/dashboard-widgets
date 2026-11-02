// Deluge: web.update_ui over the Web UI's JSON-RPC (POST /json). When Deluge answers "not
// authenticated" (error code 1) the widget logs in with auth.login, keeps the _session_id
// cookie and asks again. With enableLeechProgress a row per download, errored ones first.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB']; // decimal, as in every widget
export function formatRate(bytesPerSecond) {
  let n = Number(bytesPerSecond) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}/s`;
}

/** Seconds -> "12:30" or "1:02:03"; 0 or less means unknown. */
export function clock(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return null;
  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const FIELDS = ['queue', 'name', 'total_wanted', 'state', 'progress', 'download_payload_rate', 'upload_payload_rate', 'total_remaining', 'eta'];

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const url = `${o.url.replace(/\/+$/, '')}/json`;
    let id = 0;
    const rpc = async (method, params) => {
      const headers = { 'content-type': 'application/json', accept: 'application/json' };
      if (ctx.cache.get('cookie')) headers.cookie = ctx.cache.get('cookie');
      const res = await ctx.fetch(url, { method: 'POST', headers, body: JSON.stringify({ method, params, id: ++id }) });
      if (!res.ok) throw new Error(`Deluge answered ${res.status}`);
      const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('_session_id='));
      if (cookie) ctx.cache.set('cookie', cookie);
      return res.json();
    };
    let answer = await rpc('web.update_ui', [FIELDS, {}]);
    if (answer.error?.code === 1) {
      const login = await rpc('auth.login', [o.password]);
      if (login.result !== true) throw new Error('Deluge login answered 401');
      answer = await rpc('web.update_ui', [FIELDS, {}]);
    }
    if (answer.error) throw new Error(`Deluge: ${answer.error.message ?? 'error'}`);
    const torrents = Object.values(answer.result?.torrents ?? {});
    const done = torrents.filter((t) => t.total_remaining === 0).length;
    const down = torrents.reduce((s, t) => s + (t.download_payload_rate ?? 0), 0);
    const up = torrents.reduce((s, t) => s + (t.upload_payload_rate ?? 0), 0);
    const out = {
      // the rates in MB/s (decimal, one decimal) for a filter
      attributes: { download: Math.round(down / 1e5) / 10, upload: Math.round(up / 1e5) / 10 },
      blocks: [
        { key: 'leech', label: 'leech', value: torrents.length - done },
        { key: 'download', label: 'download', value: formatRate(down) },
        { key: 'seed', label: 'seed', value: done },
        { key: 'upload', label: 'upload', value: formatRate(up) },
      ],
    };
    if (o.enableLeechProgress) {
      const order = ['Error', 'Downloading', 'Checking', 'Queued', 'Paused'];
      const leeching = torrents.filter((t) => t.total_remaining > 0 && order.includes(t.state))
        .sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state) || b.progress - a.progress);
      const limit = Math.max(1, Number(o.queueLimit) || 5);
      out.rows = leeching.slice(0, limit).map((t) => ({
        label: t.name,
        value: t.state === 'Error' ? 'error' : clock(t.eta),
        progress: Math.round(Math.max(0, Math.min(100, t.progress ?? 0)) * 10) / 10,
        icon: ['Paused', 'Queued'].includes(t.state) ? 'pause' : 'play',
        ...(t.state === 'Error' ? { status: 'error' } : {}),
      }));
      if (leeching.length > limit) out.rows.push({ label: 'moreItems', vars: { count: leeching.length - limit } });
    }
    return out;
  },
};
