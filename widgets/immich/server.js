// Immich: server statistics with an admin's API key: /api/server/statistics (version 2, Immich
// 1.118 and later) or /api/server-info/statistics (version 1).

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const { url, key, version } = ctx.options;
    const path = Number(version) >= 2 ? '/api/server/statistics' : '/api/server-info/statistics';
    const res = await ctx.fetch(`${url.replace(/\/+$/, '')}${path}`, { headers: { 'x-api-key': key, accept: 'application/json' } });
    if (!res.ok) throw new Error(`Immich statistics answered ${res.status}`);
    const s = await res.json();
    return {
      attributes: { storage: s.usage === undefined ? null : Math.round((Number(s.usage) || 0) / 1e8) / 10 },
      blocks: [
        { key: 'users', label: 'users', value: Array.isArray(s.usageByUser) ? s.usageByUser.length : null },
        { key: 'photos', label: 'photos', value: s.photos ?? null },
        { key: 'videos', label: 'videos', value: s.videos ?? null },
        { key: 'storage', label: 'storage', value: s.usage === undefined ? null : formatBytes(s.usage) },
      ],
    };
  },
};
