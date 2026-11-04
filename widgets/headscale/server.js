// Headscale: GET /api/v1/node/<id> with an API key. Last seen is a span ("2d 3h") so it needs
// no words in code; an offline node is marked.

/** Milliseconds as "2d 3h", "3h 5m" or "5m". */
export function span(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

export default {
  async fetch(ctx) {
    const id = String(ctx.options.nodeId ?? '');
    if (!/^\d+$/.test(id)) throw new Error('nodeId: the ID from headscale nodes list');
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/node/${id}`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.options.key}` } });
    if (!res.ok) throw new Error(`Headscale answered ${res.status}`);
    const n = (await res.json()).node ?? {};
    const seen = Date.parse(n.lastSeen ?? '');
    return {
      attributes: { hoursSinceSeen: n.online ? 0 : Number.isFinite(seen) ? Math.round((Date.now() - seen) / 360000) / 10 : null },
      blocks: [
        { key: 'name', label: 'name', value: n.givenName ?? n.name ?? null },
        { key: 'address', label: 'address', value: n.ipAddresses?.[0] ?? null },
        { key: 'last_seen', label: 'last_seen', value: n.online ? 'now' : Number.isFinite(seen) ? span(Date.now() - seen) : 'never' },
        { key: 'status', label: 'status', value: n.online ? 'online' : 'offline', ...(n.online ? {} : { status: 'warn' }) },
      ],
    };
  },
};
