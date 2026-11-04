// ntfy: GET /<topic>/json?poll=1&since=latest, newline-delimited JSON with the topic's latest
// message (nothing when there is none). A token as Bearer, or Basic with a user. The time is a
// span ("2d 3h"); high priority is marked, urgent as an error.

/** Milliseconds as "2d 3h", "3h 5m" or "5m". */
export function span(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

const PRIORITIES = { 1: 'min', 2: 'low', 3: 'default', 4: 'high', 5: 'urgent' };

export default {
  async fetch(ctx) {
    const { topic, key, username, password } = ctx.options;
    if (!/^[-_A-Za-z0-9]{1,64}$/.test(String(topic ?? ''))) throw new Error('topic: letters, digits, - and _');
    const headers = { accept: 'application/x-ndjson' };
    if (key) headers.authorization = `Bearer ${key}`;
    else if (username) headers.authorization = `Basic ${Buffer.from(`${username}:${password ?? ''}`).toString('base64')}`;
    const res = await ctx.fetch(`${ctx.options.url.replace(/\/+$/, '')}/${topic}/json?poll=1&since=latest`, { headers });
    if (!res.ok) throw new Error(`ntfy answered ${res.status}`);
    const lines = (await res.text()).split('\n').filter((l) => l.trim());
    let m = null;
    for (const line of lines) {
      try {
        const e = JSON.parse(line);
        if (e.event === 'message' || e.event === undefined) m = e;
      } catch { /* a broken line */ }
    }
    const priority = PRIORITIES[m?.priority ?? 3] ?? 'default';
    return {
      attributes: { hoursSinceMessage: m?.time ? Math.round((Date.now() - m.time * 1000) / 360000) / 10 : null },
      blocks: [
        { key: 'title', label: 'title', value: m?.title || 'none' },
        { key: 'message', label: 'message', value: m?.message || 'none' },
        { key: 'priority', label: 'priority', value: m ? priority : 'none', ...(m && priority === 'urgent' ? { status: 'error' } : m && priority === 'high' ? { status: 'warn' } : {}) },
        { key: 'lastReceived', label: 'lastReceived', value: m?.time ? span(Date.now() - m.time * 1000) : 'none' },
        { key: 'tags', label: 'tags', value: m?.tags?.length ? m.tags.join(', ') : 'none' },
      ],
    };
  },
};
