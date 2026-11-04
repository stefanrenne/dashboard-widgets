// Nextcloud: the serverinfo app's API (ocs/v2.php/apps/serverinfo/api/v1/info) with the
// NC-Token from Administration settings > System, or an admin's login. cpuload and
// memoryusage are homepage's older fields, available through `fields`.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const { url, key, username, password } = ctx.options;
    const headers = { accept: 'application/json', 'OCS-APIRequest': 'true' };
    if (key) headers['NC-Token'] = key;
    else if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${url.replace(/\/+$/, '')}/ocs/v2.php/apps/serverinfo/api/v1/info?format=json`, { headers });
    if (!res.ok) throw new Error(`Nextcloud serverinfo answered ${res.status}`);
    const data = (await res.json()).ocs?.data ?? {};
    const nc = data.nextcloud ?? {};
    const system = nc.system ?? {};
    const memTotal = Number(system.mem_total);
    const load = Array.isArray(system.cpuload) ? Number(system.cpuload[0]) : null;
    const free = Number(system.freespace);
    return {
      attributes: { freespace: system.freespace === undefined || !Number.isFinite(free) ? null : Math.round(free / 1e8) / 10 },
      blocks: [
        { key: 'cpuload', label: 'cpuload', value: Number.isFinite(load) ? Math.round(load * 100) / 100 : null },
        { key: 'memoryusage', label: 'memory', value: memTotal > 0 ? Math.round((1000 * (memTotal - Number(system.mem_free))) / memTotal) / 10 : null, unit: '%' },
        { key: 'freespace', label: 'freespace', value: system.freespace === undefined ? null : formatBytes(system.freespace) },
        { key: 'activeusers', label: 'activeusers', value: data.activeUsers?.last24hours ?? null },
        { key: 'numfiles', label: 'numfiles', value: nc.storage?.num_files ?? null },
        { key: 'numshares', label: 'numshares', value: nc.shares?.num_shares ?? null },
      ],
    };
  },
};
