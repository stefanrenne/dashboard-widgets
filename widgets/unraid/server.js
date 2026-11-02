// Unraid: CPU, memory, array and cache pools through the Unraid API (GraphQL).
//
// Checked against a live Unraid 7 server (2026-10-24): capacity comes as strings of KiB, pools
// as numbers of KiB, one entry per device ("trunk", "trunk2", ...) where the first carries the
// pool's totals, so pools are matched on their name.
//
// Block keys follow homepage's unraid widget, so `fields: [cpu, memoryPercent,
// pool1UsedPercent]` works the same. Without `fields` the dashboard shows the four in
// widget.yaml's defaultFields. Each label has one meaning: "Memory" is the percentage,
// "Memory used" the amount. Sizes from the API are in KiB; shown in decimal units.

const QUERY = `{
  metrics { cpu { percentTotal } memory { total available percentTotal } }
  array { state capacity { kilobytes { free used total } } caches { name fsSize fsUsed fsFree } }
  notifications { overview { unread { total } } }
}`;

const UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB']; // decimal, as in every widget

export function formatBytes(bytes) {
  let n = Number(bytes) || 0;
  let i = 0;
  while (Math.abs(n) >= 1000 && i < UNITS.length - 1) {
    n /= 1000;
    i++;
  }
  return `${Math.round(n * 10) / 10} ${UNITS[i]}`;
}

const kib = (v) => formatBytes((Number(v) || 0) * 1024);
const pct = (used, total) => (total > 0 ? Math.round((100 * used) / total) : null);
const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/graphql`;
    const res = await ctx.fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', 'x-api-key': ctx.options.key },
      body: JSON.stringify({ query: QUERY }),
    });
    if (!res.ok) throw new Error(`Unraid API answered ${res.status}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(`Unraid API: ${json.errors[0].message}`);
    const { metrics = {}, array = {}, notifications = {} } = json.data ?? {};
    const mem = metrics.memory ?? {};
    const cap = array.capacity?.kilobytes ?? {};
    const state = String(array.state ?? 'unknown').toLowerCase();
    const unread = notifications.overview?.unread?.total ?? 0;

    const blocks = [
      { key: 'memoryUsed', label: 'memoryUsed', value: formatBytes((Number(mem.total) || 0) - (Number(mem.available) || 0)) },
      { key: 'memoryAvailable', label: 'memoryFree', value: formatBytes(mem.available) },
      { key: 'memoryPercent', label: 'memory', value: mem.percentTotal === undefined ? null : Math.round(mem.percentTotal), unit: '%' },
      { key: 'cpu', label: 'cpu', value: metrics.cpu?.percentTotal === undefined ? null : Math.round(metrics.cpu.percentTotal), unit: '%' },
      { key: 'notifications', label: 'notifications', value: unread, ...(unread > 0 ? { status: 'warn' } : {}) },
      { key: 'status', label: 'status', value: state, ...(state === 'started' ? {} : { status: 'warn' }) },
    ];
    // A server that keeps everything in pools (ZFS) has an array of 0 KB: no array blocks then.
    if (Number(cap.total) > 0) {
      blocks.push(
        { key: 'arrayFree', label: 'arrayFree', value: kib(cap.free) },
        { key: 'arrayUsed', label: 'arrayUsed', value: kib(cap.used) },
        { key: 'arrayUsedPercent', label: 'array', value: pct(Number(cap.used), Number(cap.total)), unit: '%' },
      );
    }
    for (const n of [1, 2, 3, 4]) {
      const name = ctx.options[`pool${n}`];
      if (!name) continue;
      const pool = (array.caches ?? []).find((c) => c.name === name);
      if (!pool) ctx.log.warn(`pool "${name}" not found; pools: ${(array.caches ?? []).map((c) => c.name).join(', ')}`);
      const vars = { pool: title(name) };
      blocks.push(
        { key: `pool${n}Free`, label: 'poolFree', vars, value: pool ? kib(pool.fsFree) : null },
        { key: `pool${n}Used`, label: 'poolUsed', vars, value: pool ? kib(pool.fsUsed) : null },
        { key: `pool${n}UsedPercent`, label: 'pool', vars, value: pool ? pct(Number(pool.fsUsed), Number(pool.fsSize)) : null, unit: '%' },
      );
    }
    // free space in GB (the API counts KiB, as kib() above); null without an array or the pool
    const freeGB = (kb) => (Number.isFinite(Number(kb)) ? Math.round((Number(kb) * 1024) / 1e8) / 10 : null);
    const attributes = { arrayFree: Number(cap.total) > 0 ? freeGB(cap.free) : null };
    for (const n of [1, 2, 3, 4]) {
      const pool = ctx.options[`pool${n}`] ? (array.caches ?? []).find((c) => c.name === ctx.options[`pool${n}`]) : null;
      attributes[`pool${n}Free`] = pool ? freeGB(pool.fsFree) : null;
    }
    return { blocks, attributes };
  },
};
