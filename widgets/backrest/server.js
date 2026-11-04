// Backrest: the summary dashboard (POST /v1.Backrest/GetSummaryDashboard). Per plan the status
// of the latest backup, and over 30 days the backups that succeeded and failed and the bytes
// added. Failures are marked.

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget
export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= 1000 && i < UNITS.length - 1) { n /= 1000; i++; }
  return `${i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${UNITS[i]}`;
}

export default {
  async fetch(ctx) {
    const { url, username, password } = ctx.options;
    const headers = { 'content-type': 'application/json', accept: 'application/json' };
    if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${url.replace(/\/+$/, '')}/v1.Backrest/GetSummaryDashboard`, { method: 'POST', headers, body: '{}' });
    if (!res.ok) throw new Error(`Backrest answered ${res.status}`);
    const plans = (await res.json()).planSummaries ?? [];
    const sum = (f) => plans.reduce((s, p) => s + (Number(p[f]) || 0), 0);
    const latest = (status) => plans.filter((p) => p.recentBackups?.status?.[0] === status).length;
    const failedLatest = latest('STATUS_ERROR');
    const failed30 = sum('backupsFailed30days');
    return {
      attributes: { bytes_added_30: Math.round(sum('bytesAddedLast30days') / 1e8) / 10 },
      blocks: [
        { key: 'num_plans', label: 'num_plans', value: plans.length },
        { key: 'num_success_latest', label: 'num_success_latest', value: latest('STATUS_SUCCESS') },
        { key: 'num_failure_latest', label: 'num_failure_latest', value: failedLatest, ...(failedLatest > 0 ? { status: 'error' } : {}) },
        { key: 'num_success_30', label: 'num_success_30', value: sum('backupsSuccessLast30days') },
        { key: 'num_failure_30', label: 'num_failure_30', value: failed30, ...(failed30 > 0 ? { status: 'warn' } : {}) },
        { key: 'bytes_added_30', label: 'bytes_added_30', value: formatBytes(sum('bytesAddedLast30days')) },
      ],
    };
  },
};
