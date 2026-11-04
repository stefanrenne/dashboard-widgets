// Glances (https://glances.readthedocs.io) in web server mode: CPU, memory, CPU temperature,
// uptime and disks through its REST API (v3 or v4). Read-only GETs; basic auth when set.

// Sensor labels that hold a CPU temperature (as homepage); cpuSensorLabel adds one.
const CPU_SENSORS = ['cpu_thermal', 'Core', 'Tctl', 'Temperature', 'Package id'];

export function formatBytes(bytes, binary = false) {
  const step = binary ? 1024 : 1000;
  const units = binary ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'] : ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];
  let n = Number(bytes) || 0;
  let i = 0;
  while (n >= step && i < units.length - 1) {
    n /= step;
    i++;
  }
  return `${n >= 100 || i === 0 ? Math.round(n) : Math.round(n * 10) / 10} ${units[i]}`;
}

/** Glances' uptime ("3 days, 4:05:06" or "4:05:06") as "3d 4h" / "4h 5m". */
export function formatUptime(text) {
  const m = /^(?:(\d+) days?, )?(\d+):(\d+):(\d+)/.exec(String(text ?? '').trim());
  if (!m) return String(text ?? '') || null;
  const [d, h, min] = [Number(m[1] ?? 0), Number(m[2]), Number(m[3])];
  return d ? `${d}d ${h}h` : h ? `${h}h ${min}m` : `${min}m`;
}

export default {
  async fetch(ctx) {
    // defaults again here, so the widget also works when called without its widget.yaml defaults
    const o = { version: 3, cpu: true, mem: true, disk: [], ...ctx.options };
    const base = `${o.url.replace(/\/+$/, '')}/api/${o.version}`;
    const headers = { accept: 'application/json' };
    if (o.username) headers.authorization = `Basic ${Buffer.from(`${o.username}:${o.password ?? ''}`).toString('base64')}`;
    const get = async (path) => {
      const res = await ctx.fetch(`${base}/${path}`, { headers });
      if (!res.ok) throw new Error(`Glances ${path} answered ${res.status}`);
      return res.json();
    };
    const binary = o.diskUnits === 'bbytes';
    const pct = (n) => (typeof n === 'number' ? Math.round(n * 10) / 10 : null);
    const blocks = [];

    if (o.cpu !== false) {
      const cpu = await get('cpu');
      blocks.push({ key: 'cpu', label: 'cpu', value: pct(cpu.total), unit: '%' });
    }
    if (o.mem !== false) {
      const mem = await get('mem');
      blocks.push({ key: 'memory', label: 'memory', value: pct(mem.percent), unit: '%' });
      if (o.expanded) {
        blocks.push({ key: 'memoryUsed', label: 'memoryUsed', value: formatBytes(mem.used) });
        blocks.push({ key: 'memoryTotal', label: 'memoryTotal', value: formatBytes(mem.total) });
      }
    }
    if (o.cputemp) {
      const sensors = await get('sensors');
      const prefixes = [...CPU_SENSORS, ...(o.cpuSensorLabel ? [o.cpuSensorLabel] : [])];
      const temps = (Array.isArray(sensors) ? sensors : [])
        .filter((s) => typeof s.value === 'number' && prefixes.some((p) => String(s.label ?? '').startsWith(p)) && String(s.type ?? 'temperature').startsWith('temperature'))
        .map((s) => s.value);
      const celsius = temps.length ? Math.max(...temps) : null;
      const imperial = o.unit === 'imperial';
      const value = celsius === null ? null : Math.round((imperial ? celsius * 9 / 5 + 32 : celsius) * 10) / 10;
      blocks.push({ key: 'cputemp', label: 'cputemp', value, unit: imperial ? '°F' : '°C', ...(value !== null && celsius >= 85 ? { status: 'warn' } : {}) });
    }
    let uptimeHours = null;
    if (o.uptime) {
      const text = await get('uptime');
      const m = /^(?:(\d+) days?, )?(\d+):(\d+):(\d+)/.exec(String(text ?? '').trim());
      if (m) uptimeHours = Math.round((Number(m[1] ?? 0) * 24 + Number(m[2]) + Number(m[3]) / 60) * 10) / 10;
      blocks.push({ key: 'uptime', label: 'uptime', value: formatUptime(text) });
    }
    if (Array.isArray(o.disk) && o.disk.length) {
      const fs = await get('fs');
      for (const mount of o.disk) {
        const d = (Array.isArray(fs) ? fs : []).find((f) => f.mnt_point === mount);
        const key = o.disk.length > 1 ? mount : 'disk';
        blocks.push({ key, label: o.disk.length > 1 ? mount : 'disk', value: d ? pct(d.percent) : null, unit: '%', ...(d ? {} : { status: 'unknown' }) });
        if (o.expanded && d) blocks.push({ key: `${key}Free`, label: 'free', value: formatBytes(d.free ?? d.size - d.used, binary) });
      }
    }
    return { attributes: { uptimeHours }, blocks };
  },
};
