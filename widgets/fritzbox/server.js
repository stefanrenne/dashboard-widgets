// FRITZ!Box: the UPnP status over SOAP (/igdupnp/control/WANIPConn1 and WANCommonIFC1), on
// port 49000 (49443 with https) unless the url names a port. Needs no credentials. The
// external IPv6 address and prefix are left empty when the box has none (it answers a fault).
// A connection that is not up is marked.

/** Seconds as "2d 3h", "3h 5m" or "5m". */
export function span(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

const STATES = { Connected: 'connected', Connecting: 'connecting', Disconnected: 'disconnected', Disconnecting: 'disconnected', PendingDisconnect: 'disconnected', Unconfigured: 'unconfigured' };

export default {
  async fetch(ctx) {
    const u = new URL(ctx.options.url);
    const base = `${u.protocol}//${u.hostname}:${u.port || (u.protocol === 'https:' ? 49443 : 49000)}${u.pathname.replace(/\/+$/, '')}`;
    const soap = async (service, action, optional = false) => {
      const path = service === 'WANIPConnection' ? 'WANIPConn1' : 'WANCommonIFC1';
      const res = await ctx.fetch(`${base}/igdupnp/control/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'text/xml; charset="utf-8"', soapaction: `urn:schemas-upnp-org:service:${service}:1#${action}` },
        body: `<?xml version="1.0" encoding="utf-8"?><s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:${action} xmlns:u="urn:schemas-upnp-org:service:${service}:1"/></s:Body></s:Envelope>`,
        insecure: ctx.options.insecure,
      });
      if (!res.ok) {
        if (optional) return {};
        throw new Error(`FRITZ!Box ${action} answered ${res.status}`);
      }
      return Object.fromEntries([...(await res.text()).matchAll(/<(New\w+)>([^<]*)<\/\1>/g)].map((m) => [m[1], m[2]]));
    };
    const [status, link, traffic, ip, ip6, prefix] = await Promise.all([
      soap('WANIPConnection', 'GetStatusInfo'),
      soap('WANCommonInterfaceConfig', 'GetCommonLinkProperties'),
      soap('WANCommonInterfaceConfig', 'GetAddonInfos'),
      soap('WANIPConnection', 'GetExternalIPAddress', true),
      soap('WANIPConnection', 'X_AVM_DE_GetExternalIPv6Address', true),
      soap('WANIPConnection', 'X_AVM_DE_GetIPv6Prefix', true),
    ]);
    const state = STATES[status.NewConnectionStatus] ?? 'unconfigured';
    const rate = (bytes) => `${formatBytes(bytes)}/s`;
    const mbps = (bytes) => (Number.isFinite(Number(bytes)) && bytes !== undefined ? Math.round(Number(bytes) / 1e5) / 10 : null);
    const uptime = Number(status.NewUptime);
    return {
      attributes: {
        uptimeHours: status.NewUptime === undefined || !Number.isFinite(uptime) ? null : Math.round(uptime / 360) / 10,
        down: mbps(traffic.NewByteReceiveRate),
        up: mbps(traffic.NewByteSendRate),
      },
      blocks: [
        { key: 'connectionStatus', label: 'connectionStatus', value: state, ...(state === 'connected' ? {} : { status: state === 'connecting' ? 'warn' : 'error' }) },
        { key: 'uptime', label: 'uptime', value: span(status.NewUptime) },
        { key: 'maxDown', label: 'maxDown', value: rate((Number(link.NewLayer1DownstreamMaxBitRate) || 0) / 8) },
        { key: 'maxUp', label: 'maxUp', value: rate((Number(link.NewLayer1UpstreamMaxBitRate) || 0) / 8) },
        { key: 'down', label: 'down', value: rate(traffic.NewByteReceiveRate) },
        { key: 'up', label: 'up', value: rate(traffic.NewByteSendRate) },
        { key: 'received', label: 'received', value: formatBytes(traffic.NewX_AVM_DE_TotalBytesReceived64) },
        { key: 'sent', label: 'sent', value: formatBytes(traffic.NewX_AVM_DE_TotalBytesSent64) },
        { key: 'externalIPAddress', label: 'externalIPAddress', value: ip.NewExternalIPAddress || null },
        { key: 'externalIPv6Address', label: 'externalIPv6Address', value: ip6.NewExternalIPv6Address || null },
        { key: 'externalIPv6Prefix', label: 'externalIPv6Prefix', value: prefix.NewIPv6Prefix ? `${prefix.NewIPv6Prefix}${prefix.NewPrefixLength ? `/${prefix.NewPrefixLength}` : ''}` : null },
      ],
    };
  },
};
