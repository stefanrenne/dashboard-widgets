// qBittorrent: GET /api/v2/torrents/info. Torrents not complete (leech) and complete (seed),
// the total download and upload rate, and with enableLeechProgress a row per download, stalled
// and errored ones first and marked. Logs in with a username and password (the SID cookie is
// kept and renewed on a 403), or sends an API key (qBittorrent 5.2 and later).

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB']; // decimal, as in every widget
const scaled = (n, suffix = '') => {
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}${suffix}`;
};
export const formatRate = (bytesPerSecond) => scaled(Number(bytesPerSecond) || 0, '/s');
export const formatBytes = (bytes) => scaled(Number(bytes) || 0);

/** Seconds -> "12:30" or "1:02:03"; qBittorrent's 8640000 means unknown. */
export function clock(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0 || total >= 8640000) return null;
  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const ERRORED = ['error', 'missingFiles'];
const STALLED = ['stalledDL', 'metaDL', 'forcedMetaDL'];
const PAUSED = ['pausedDL', 'stoppedDL', 'queuedDL'];
// homepage's order of download states; problems go first here
const ORDER = ['error', 'missingFiles', 'stalledDL', 'metaDL', 'forcedMetaDL', 'downloading', 'forcedDL', 'checkingDL', 'queuedDL', 'pausedDL', 'stoppedDL'];

async function login(ctx, url) {
  const body = new URLSearchParams({ username: ctx.options.username ?? '', password: ctx.options.password ?? '' }).toString();
  const res = await ctx.fetch(`${url}/api/v2/auth/login`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', referer: url }, body });
  const text = res.ok ? (await res.text()).trim() : '';
  const sid = res.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('SID=') || c.startsWith('QBT_SID'));
  if (!res.ok || text === 'Fails.' || !sid) throw new Error(`qBittorrent login answered ${res.ok ? 401 : res.status}`);
  ctx.cache.set('cookie', sid);
  return sid;
}

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const url = o.url.replace(/\/+$/, '');
    const get = async (retried = false) => {
      const headers = { accept: 'application/json' };
      if (o.key) headers.authorization = `Bearer ${o.key}`;
      else if (ctx.cache.get('cookie')) headers.cookie = ctx.cache.get('cookie');
      const res = await ctx.fetch(`${url}/api/v2/torrents/info`, { headers });
      if ((res.status === 403 || res.status === 401) && !o.key && !retried) {
        await login(ctx, url);
        return get(true);
      }
      if (!res.ok) throw new Error(`qBittorrent torrents answered ${res.status}`);
      return res.json();
    };
    const torrents = await get();
    const done = torrents.filter((t) => t.progress === 1).length;
    const down = torrents.reduce((s, t) => s + (t.dlspeed ?? 0), 0);
    const up = torrents.reduce((s, t) => s + (t.upspeed ?? 0), 0);
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
      const leeching = torrents.filter((t) => ORDER.includes(t.state) && t.progress < 1)
        .sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state) || b.progress - a.progress);
      const limit = Math.max(1, Number(o.queueLimit) || 5);
      out.rows = leeching.slice(0, limit).map((t) => {
        const problem = ERRORED.includes(t.state) ? 'error' : STALLED.includes(t.state) ? 'stalled' : null;
        return {
          label: t.name,
          // a problem is the value on its own (a key the page translates), else time left and size
          value: problem ?? ([clock(t.eta), o.enableLeechSize ? formatBytes(t.size) : null].filter(Boolean).join(' · ') || null),
          progress: Math.round(Math.max(0, Math.min(1, t.progress ?? 0)) * 1000) / 10,
          icon: PAUSED.includes(t.state) ? 'pause' : 'play',
          ...(problem ? { status: problem === 'error' ? 'error' : 'warn' } : {}),
        };
      });
      if (leeching.length > limit) out.rows.push({ label: 'moreItems', vars: { count: leeching.length - limit } });
    }
    return out;
  },
};
