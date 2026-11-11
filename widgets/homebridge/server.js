// Homebridge, through its UI (homebridge-config-ui-x): logs in (POST /api/auth/login; the
// access token is kept and renewed on 401/403), then the status, the Homebridge version, the
// child bridges and the plugins. Homebridge not up is marked, updates and stopped child
// bridges are warnings.

export default {
  async fetch(ctx) {
    const { username, password } = ctx.options;
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api`;
    const login = async () => {
      const res = await ctx.fetch(`${url}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ username: String(username), password: String(password) }) });
      if (!res.ok) throw new Error(`Homebridge login answered ${res.status}`);
      ctx.cache.set('token', (await res.json()).access_token);
    };
    const get = async (path, retried = false) => {
      if (!ctx.cache.get('token')) await login();
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', authorization: `Bearer ${ctx.cache.get('token')}` } });
      if ((res.status === 401 || res.status === 403) && !retried) {
        ctx.cache.delete('token');
        return get(path, true);
      }
      if (!res.ok) throw new Error(`Homebridge ${path} answered ${res.status}`);
      return res.json();
    };
    const status = await get('status/homebridge');
    const [version, children, plugins] = await Promise.all([get('status/homebridge-version'), get('status/homebridge/child-bridges'), get('plugins')]);
    const state = ['up', 'down', 'pending'].includes(status.status) ? status.status : 'down';
    const update = Boolean(version?.updateAvailable) || (plugins ?? []).some((p) => p.updateAvailable);
    const kids = Array.isArray(children) ? children : [];
    const running = kids.filter((c) => c.status === 'ok').length;
    const blocks = [
      { key: 'status', label: 'status', value: state, ...(state === 'up' ? {} : { status: state === 'pending' ? 'warn' : 'error' }) },
      { key: 'updates', label: 'updates', value: update ? 'updateAvailable' : 'upToDate', ...(update ? { status: 'warn' } : {}) },
    ];
    if (kids.length) blocks.push({ key: 'child_bridges', label: 'child_bridges', value: `${running} / ${kids.length}`, ...(running < kids.length ? { status: 'warn' } : {}) });
    // the card says updateAvailable or upToDate (as homepage's); a filter compares true or false
    return { attributes: { updates: update }, blocks };
  },
};
