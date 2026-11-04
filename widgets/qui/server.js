// qui (a front end for several qBittorrent instances): GET /api/instances/<id>/torrents?limit=1
// or, for all instances, /api/torrents/cross-instance?limit=1, with the API key in X-API-Key.
// Leech and seed are "active / all" as in qBittorrent's sidebar. Errored torrents are marked.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const instance = ctx.options.instance === undefined || ctx.options.instance === null || ctx.options.instance === '' ? null : String(ctx.options.instance);
    if (instance !== null && !/^\w+$/.test(instance)) throw new Error('instance: the ID shown in qui');
    const path = instance !== null ? `instances/${instance}/torrents?limit=1` : 'torrents/cross-instance?limit=1';
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/${path}`, { headers: { accept: 'application/json', 'x-api-key': ctx.options.key } });
    if (!res.ok) throw new Error(`qui answered ${res.status}`);
    const d = await res.json();
    const s = d.stats ?? {};
    const c = d.counts?.status;
    const completed = c ? c.completed : s.seeding;
    const incomplete = c ? c.all - c.completed : s.downloading;
    const errored = (c ? c.errored : s.error) ?? 0;
    const blocks = [
      { key: 'leech', label: 'leech', value: `${s.downloading ?? 0} / ${incomplete ?? 0}` },
      { key: 'download', label: 'download', value: `${formatBytes(s.totalDownloadSpeed)}/s` },
      { key: 'seed', label: 'seed', value: `${s.seeding ?? 0} / ${completed ?? 0}` },
      { key: 'upload', label: 'upload', value: `${formatBytes(s.totalUploadSpeed)}/s` },
      { key: 'total', label: 'total', value: (c ? c.all : s.total) ?? 0 },
      { key: 'errored', label: 'errored', value: errored, ...(errored ? { status: 'warn' } : {}) },
    ];
    if (d.serverState) {
      blocks.push({ key: 'ratio', label: 'ratio', value: Math.round(parseFloat(d.serverState.global_ratio) * 100) / 100 || 0 });
      blocks.push({ key: 'freeSpace', label: 'freeSpace', value: formatBytes(d.serverState.free_space_on_disk) });
    }
    const mbps = (bytes) => Math.round((Number(bytes) || 0) / 1e5) / 10;
    return { attributes: { download: mbps(s.totalDownloadSpeed), upload: mbps(s.totalUploadSpeed) }, blocks };
  },
};
