// Navidrome: the Subsonic API's getNowPlaying with token authentication (u, t = md5(password +
// salt), s). One row per entry: artist and title, with the listener and the album.

export default {
  async fetch(ctx) {
    const { url, user, token, salt } = ctx.options;
    const query = new URLSearchParams({ u: user, t: token, s: salt, v: '1.16.1', c: 'dashboard', f: 'json' });
    const res = await ctx.fetch(`${url.replace(/\/+$/, '')}/rest/getNowPlaying?${query}`, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Navidrome answered ${res.status}`);
    const r = (await res.json())['subsonic-response'] ?? {};
    // Subsonic answers 200 with status failed; error 40 is a wrong login
    if (r.status !== 'ok') throw new Error(`Navidrome answered ${r.error?.code === 40 || r.error?.code === 41 ? 401 : 500}`);
    const entries = [].concat(r.nowPlaying?.entry ?? []);
    if (entries.length === 0) return { rows: [{ label: 'nothingPlaying' }] };
    return {
      rows: entries.map((e) => ({
        label: [e.artist, e.title].filter(Boolean).join(' - ') + (e.username ? ` (${e.username})` : ''),
        value: e.album ?? null,
        icon: 'play',
      })),
    };
  },
};
