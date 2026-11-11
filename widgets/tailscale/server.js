// Tailscale: GET /api/v2/device/<id> with an API access token. Times are spans ("2d 3h") so
// they need no words in code; a key that expires within a week (or has) and an update that
// is available are marked.

/** Milliseconds as "2d 3h", "3h 5m" or "5m". */
export function span(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

const WEEK = 7 * 86400_000;

export default {
  async fetch(ctx) {
    const { deviceid, key, url } = ctx.options;
    if (!/^[A-Za-z0-9]+$/.test(deviceid)) throw new Error('deviceid: the device ID from the admin console');
    const res = await ctx.fetch(`${String(url).replace(/\/+$/, '')}/api/v2/device/${deviceid}`, { headers: { accept: 'application/json', authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(`Tailscale device answered ${res.status}`);
    const d = await res.json();
    const now = Date.now();
    const seen = Date.parse(d.lastSeen);
    const lastSeen = d.connectedToControl || !Number.isFinite(seen) || now - seen < 60_000 ? 'now' : span(now - seen);
    const expires = Date.parse(d.expires);
    let expiry = { value: 'never' };
    if (!d.keyExpiryDisabled && Number.isFinite(expires)) {
      expiry = expires <= now ? { value: 'expired', status: 'error' } : { value: span(expires - now), ...(expires - now < WEEK ? { status: 'warn' } : {}) };
    }
    const yesNo = (v) => (v ? 'yes' : 'no');
    // the card says yes or no (as homepage's); a filter compares true or false
    const bool = (v) => (typeof v === 'boolean' ? v : null);
    return {
      attributes: {
        authorized: bool(d.authorized),
        is_external: bool(d.isExternal),
        update_available: bool(d.updateAvailable),
        hoursSinceSeen: lastSeen === 'now' ? (Number.isFinite(seen) || d.connectedToControl ? 0 : null) : Math.round((now - seen) / 360000) / 10,
        daysUntilExpiry: d.keyExpiryDisabled || !Number.isFinite(expires) ? null : Math.max(0, Math.round((expires - now) / 8640000) / 10),
      },
      blocks: [
        { key: 'address', label: 'address', value: d.addresses?.[0] ?? null },
        { key: 'last_seen', label: 'last_seen', value: lastSeen },
        { key: 'expires', label: 'expires', ...expiry },
        { key: 'user', label: 'user', value: d.user ?? null },
        { key: 'hostname', label: 'hostname', value: d.hostname ?? null },
        { key: 'name', label: 'name', value: d.name ?? null },
        { key: 'client_version', label: 'client_version', value: d.clientVersion ? String(d.clientVersion).split('-')[0] : null },
        { key: 'os', label: 'os', value: d.os ?? null },
        { key: 'created', label: 'created', value: Number.isFinite(Date.parse(d.created)) ? new Date(d.created).toISOString().slice(0, 10) : null },
        { key: 'authorized', label: 'authorized', value: yesNo(d.authorized), ...(d.authorized === false ? { status: 'warn' } : {}) },
        { key: 'is_external', label: 'is_external', value: yesNo(d.isExternal) },
        { key: 'update_available', label: 'update_available', value: yesNo(d.updateAvailable), ...(d.updateAvailable ? { status: 'warn' } : {}) },
        { key: 'tags', label: 'tags', value: Array.isArray(d.tags) && d.tags.length ? d.tags.join(', ') : null },
      ],
    };
  },
};
