// OpenWrt: ubus over JSON-RPC (POST /ubus). Logs in with session.login (the session is kept and
// renewed on "access denied", -32002), then system.info, or network.device.status for
// interfaceName. The load is the 5-minute load average. An interface that is down is marked.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

/** Seconds as "2d 3h", "3h 5m" or "5m". */
export function span(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

const NO_SESSION = '00000000000000000000000000000000';

export default {
  async fetch(ctx) {
    const { username, password, interfaceName } = ctx.options;
    const url = `${ctx.options.url.replace(/\/+$/, '')}/ubus`;
    let id = 0;
    const rpc = async (session, object, method, args = {}) => {
      const res = await ctx.fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method: 'call', params: [session, object, method, args] }) });
      if (!res.ok) throw new Error(`OpenWrt answered ${res.status}`);
      const body = await res.json();
      if (body.error?.code === -32002) return { denied: true };
      if (body.error) throw new Error(`OpenWrt ${object} answered an error (${body.error.code})`);
      if (!Array.isArray(body.result) || body.result[0] !== 0) throw new Error(`OpenWrt ${object} answered ${body.result?.[0] === 6 ? 401 : 500} (ubus ${body.result?.[0]})`);
      return { data: body.result[1] ?? {} };
    };
    const login = async () => {
      const r = await rpc(NO_SESSION, 'session', 'login', { username, password });
      if (r.denied || !r.data.ubus_rpc_session) throw new Error('OpenWrt login answered 401');
      ctx.cache.set('session', r.data.ubus_rpc_session);
      return r.data.ubus_rpc_session;
    };
    const read = async (session) => (interfaceName ? rpc(session, 'network.device', 'status', {}) : rpc(session, 'system', 'info', {}));
    let r = await read(ctx.cache.get('session') ?? (await login()));
    if (r.denied) r = await read(await login());
    if (r.denied) throw new Error('OpenWrt answered 403 (the user\'s ACL does not allow this)');
    if (interfaceName) {
      const dev = r.data[interfaceName];
      if (!dev) throw new Error(`no OpenWrt device "${interfaceName}"`);
      return {
        blocks: [
          { key: 'status', label: 'status', value: dev.up ? 'up' : 'down', ...(dev.up ? {} : { status: 'error' }) },
          { key: 'bytesTx', label: 'bytesTx', value: formatBytes(dev.statistics?.tx_bytes) },
          { key: 'bytesRx', label: 'bytesRx', value: formatBytes(dev.statistics?.rx_bytes) },
        ],
      };
    }
    const load = r.data.load?.[1];
    const uptime = Number(r.data.uptime);
    return {
      attributes: { uptimeHours: r.data.uptime === undefined || !Number.isFinite(uptime) ? null : Math.round(uptime / 360) / 10 },
      blocks: [
        { key: 'uptime', label: 'uptime', value: span(r.data.uptime) },
        { key: 'cpuLoad', label: 'cpuLoad', value: typeof load === 'number' ? Math.round((load / 65536) * 100) / 100 : null },
      ],
    };
  },
};
