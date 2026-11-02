// Duplicati 2.1+: logs in with the web interface password (POST /api/v1/auth/login, the access
// token is kept), then reads backups, serverstate, notifications and progressstate (404 until a
// job has run). Times are spans ("2d 3h") so they need no words in code; errors and warnings
// in the notifications of a backup are marked.

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

// "20260301T021500Z", as Duplicati writes LastBackupFinished
const compact = (s) => {
  const m = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)(\d\d)Z$/.exec(s ?? '');
  return m ? Date.UTC(m[1], m[2] - 1, m[3], m[4], m[5], m[6]) : NaN;
};

export default {
  async fetch(ctx) {
    const url = ctx.options.url.replace(/\/+$/, '');
    const login = async () => {
      const res = await ctx.fetch(`${url}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ Password: String(ctx.options.password), RememberMe: true }) });
      if (!res.ok) throw new Error(`Duplicati login answered ${res.status}`);
      const token = (await res.json()).AccessToken;
      if (!token) throw new Error('Duplicati login answered without a token');
      ctx.cache.set('token', token);
    };
    const get = async (path, retried = false) => {
      if (!ctx.cache.get('token')) await login();
      const res = await ctx.fetch(`${url}/api/v1/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.cache.get('token')}` } });
      if (res.status === 401 && !retried) {
        ctx.cache.delete('token');
        return get(path, true);
      }
      if (res.status === 404 && path === 'progressstate') return null;
      if (!res.ok) throw new Error(`Duplicati ${path} answered ${res.status}`);
      return res.json();
    };
    const backups = await get('backups');
    const [state, notifications, progress] = await Promise.all([get('serverstate'), get('notifications'), get('progressstate')]);
    const now = Date.now();
    const last = Math.max(...(backups ?? []).map((b) => compact(b.Backup?.Metadata?.LastBackupFinished)).filter(Number.isFinite));
    const next = Math.min(...(backups ?? []).map((b) => Date.parse(b.Schedule?.Time ?? '')).filter(Number.isFinite));
    const own = (notifications ?? []).filter((n) => n.BackupID);
    const warnings = own.filter((n) => n.Type === 'Warning').length;
    const errors = own.filter((n) => n.Type === 'Error').length;
    return {
      // hours since the newest backup finished; null when there is none
      attributes: { hoursSinceBackup: Number.isFinite(last) ? Math.round((now - last) / 360000) / 10 : null },
      blocks: [
        { key: 'jobs', label: 'jobs', value: (backups ?? []).length },
        { key: 'stored', label: 'stored', value: formatBytes((backups ?? []).reduce((s, b) => s + (Number(b.Backup?.Metadata?.TargetFilesSize) || 0), 0)) },
        { key: 'lastBackup', label: 'lastBackup', value: Number.isFinite(last) ? span(now - last) : 'never' },
        { key: 'nextRun', label: 'nextRun', value: Number.isFinite(next) ? span(next - now) : 'never' },
        { key: 'running', label: 'running', value: state?.ActiveTask && progress?.BackupID ? 1 : 0 },
        { key: 'warnings', label: 'warnings', value: warnings, ...(warnings ? { status: 'warn' } : {}) },
        { key: 'errors', label: 'errors', value: errors, ...(errors ? { status: 'error' } : {}) },
      ],
    };
  },
};
