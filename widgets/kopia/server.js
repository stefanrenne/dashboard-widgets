// Kopia: GET /api/v1/sources (Basic authentication with the server's user). The first source,
// or the one matching snapshotHost and snapshotPath. Times are spans ("2d 3h") so they need no
// words in code; a last snapshot with errors is marked.

/** Milliseconds as "2d 3h", "3h 5m" or "5m". */
export function span(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
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

const STATES = { IDLE: 'idle', PENDING: 'pending', UPLOADING: 'uploading', PAUSED: 'paused', FAILED: 'failed', REMOTE: 'remote' };

export default {
  async fetch(ctx) {
    const { username, password, snapshotHost, snapshotPath } = ctx.options;
    const headers = { accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/api/v1/sources`, { headers, insecure: ctx.options.insecure });
    if (!res.ok) throw new Error(`Kopia answered ${res.status}`);
    const sources = (await res.json()).sources ?? [];
    const s = sources.find((x) => (!snapshotHost || x.source?.host === snapshotHost) && (!snapshotPath || x.source?.path === snapshotPath));
    if (!s) throw new Error(`no Kopia source${snapshotHost || snapshotPath ? ` for ${[snapshotHost, snapshotPath].filter(Boolean).join(':')}` : ''}`);
    const now = Date.now();
    const last = s.lastSnapshot;
    const failed = (last?.stats?.errorCount ?? 0) > 0;
    const started = Date.parse(last?.startTime ?? '');
    const next = Date.parse(s.nextSnapshotTime ?? '');
    return {
      attributes: { hoursSinceRun: Number.isFinite(started) ? Math.round((now - started) / 360000) / 10 : null, failed },
      blocks: [
        { key: 'status', label: 'status', value: STATES[s.status] ?? (String(s.status ?? '').toLowerCase() || null) },
        { key: 'size', label: 'size', value: last ? formatBytes(last.stats?.totalSize) : null },
        { key: 'lastrun', label: 'lastrun', value: failed ? 'failed' : Number.isFinite(started) ? span(now - started) : 'never', ...(failed ? { status: 'error' } : {}) },
        { key: 'nextrun', label: 'nextrun', value: Number.isFinite(next) ? span(next - now) : null },
      ],
    };
  },
};
