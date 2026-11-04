// Maintainerr: GET /api/storage-metrics, no key.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/storage-metrics`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Maintainerr answered ${res.status}`);
    const m = await res.json();
    const c = m.cleanupTotals ?? {};
    const s = m.collectionSummary ?? {};
    return {
      attributes: { reclaimable: Math.round((Number(s.activeSizeBytes) || 0) / 1e8) / 10 },
      blocks: [
        { key: 'itemsHandled', label: 'itemsHandled', value: c.itemsHandled ?? 0 },
        { key: 'episodesHandled', label: 'episodesHandled', value: c.episodesHandled ?? 0 },
        { key: 'moviesHandled', label: 'moviesHandled', value: c.moviesHandled ?? 0 },
        { key: 'showsHandled', label: 'showsHandled', value: c.showsHandled ?? 0 },
        { key: 'seasonsHandled', label: 'seasonsHandled', value: c.seasonsHandled ?? 0 },
        { key: 'reclaimable', label: 'reclaimable', value: formatBytes(s.activeSizeBytes) },
        { key: 'movieReclaimable', label: 'movieReclaimable', value: formatBytes(s.movieSizeBytes) },
        { key: 'showReclaimable', label: 'showReclaimable', value: formatBytes(s.showSizeBytes) },
        { key: 'totalCapacity', label: 'totalCapacity', value: formatBytes(m.totals?.totalSpace) },
      ],
    };
  },
};
