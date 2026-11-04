// MikroTik RouterOS 7: GET /rest/system/resource and /rest/ip/dhcp-server/lease with Basic
// authentication. RouterOS writes the uptime as "1w2d3h4m5s"; it becomes a span ("9d 3h"). A
// CPU load or memory use above 90% is marked.

/** RouterOS's "1w2d3h4m5s" in seconds. */
export function routerosSeconds(text) {
  const units = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 };
  return [...String(text ?? '').matchAll(/(\d+)([wdhms])/g)].reduce((s, [, n, u]) => s + Number(n) * units[u], 0);
}

/** Seconds as "2d 3h", "3h 5m" or "5m". */
export function span(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

const high = (n) => (n > 90 ? { status: 'warn' } : {});

export default {
  async fetch(ctx) {
    const { username, password, insecure } = ctx.options;
    const url = `${ctx.options.url.replace(/\/+$/, '')}/rest`;
    const headers = { accept: 'application/json', authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers, insecure });
      if (!res.ok) throw new Error(`MikroTik ${path.split('?')[0]} answered ${res.status}`);
      return res.json();
    };
    const [sys, leases] = await Promise.all([get('system/resource'), get('ip/dhcp-server/lease?.proplist=address')]);
    const cpu = Number(sys['cpu-load']) || 0;
    const total = Number(sys['total-memory']) || 0;
    const memory = total ? Math.round((1 - (Number(sys['free-memory']) || 0) / total) * 100) : null;
    const uptime = sys.uptime ? routerosSeconds(sys.uptime) : null;
    return {
      attributes: { uptimeHours: uptime === null ? null : Math.round(uptime / 360) / 10 },
      blocks: [
        { key: 'uptime', label: 'uptime', value: span(routerosSeconds(sys.uptime)) },
        { key: 'cpuLoad', label: 'cpuLoad', value: cpu, unit: '%', ...high(cpu) },
        { key: 'memoryUsed', label: 'memoryUsed', value: memory, unit: '%', ...high(memory) },
        { key: 'numberOfLeases', label: 'numberOfLeases', value: Array.isArray(leases) ? leases.length : 0 },
      ],
    };
  },
};
