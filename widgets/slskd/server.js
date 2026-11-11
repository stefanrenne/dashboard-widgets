// slskd: GET /api/v0/application, /transfers/downloads and /transfers/uploads with the API key
// in X-API-Key. Downloads and uploads count the users transfers are with, as homepage does. Not
// connected to Soulseek is marked, as is an update.

export default {
  async fetch(ctx) {
    const url = `${ctx.options.url.replace(/\/+$/, '')}/api/v0`;
    const get = async (path) => {
      const res = await ctx.fetch(`${url}/${path}`, { headers: { accept: 'application/json', 'x-api-key': ctx.options.key } });
      if (!res.ok) throw new Error(`slskd ${path} answered ${res.status}`);
      return res.json();
    };
    const [app, down, up] = await Promise.all([get('application'), get('transfers/downloads'), get('transfers/uploads')]);
    const connected = Boolean(app.server?.isConnected);
    const update = Boolean(app.version?.isUpdateAvailable);
    // the card says updateAvailable or upToDate (as homepage's); a filter compares true or false
    return {
      attributes: { update },
      blocks: [
        { key: 'slskStatus', label: 'slskStatus', value: connected ? 'connected' : 'disconnected', ...(connected ? {} : { status: 'error' }) },
        { key: 'updateStatus', label: 'updateStatus', value: update ? 'updateAvailable' : 'upToDate', ...(update ? { status: 'warn' } : {}) },
        { key: 'downloads', label: 'downloads', value: Array.isArray(down) ? down.length : 0 },
        { key: 'uploads', label: 'uploads', value: Array.isArray(up) ? up.length : 0 },
        { key: 'sharedFiles', label: 'sharedFiles', value: app.shares?.files ?? 0 },
      ],
    };
  },
};
