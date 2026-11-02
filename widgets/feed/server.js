// Feed: an RSS 2.0 or Atom document, read with a few regular expressions (no XML library: only
// node: imports). Per item the title, link, date and an image: media:thumbnail, media:content,
// an image enclosure, or else the first <img> in the content. Links and images must be http(s);
// the browser draws the items (client.js) and loads the images itself.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function decode(text) {
  return String(text ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
        return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    });
}

const httpUrl = (u, base) => {
  try {
    const url = new URL(decode(u).trim(), base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
};
const attr = (tag, name) => new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(tag)?.slice(2).find((x) => x !== undefined);
const inner = (xml, name) => new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(xml)?.[1];
const tags = (xml, name) => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?/?>`, 'gi')) ?? [];
const text = (html) => decode(String(html ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

function image(item, base) {
  for (const t of tags(item, 'media:thumbnail')) if (attr(t, 'url')) return httpUrl(attr(t, 'url'), base);
  for (const t of tags(item, 'media:content')) {
    if (attr(t, 'url') && (attr(t, 'medium') === 'image' || /^image\//.test(attr(t, 'type') ?? '') || /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(attr(t, 'url')))) return httpUrl(attr(t, 'url'), base);
  }
  for (const t of [...tags(item, 'enclosure'), ...tags(item, 'link')]) {
    if (/^image\//.test(attr(t, 'type') ?? '') && (attr(t, 'url') || attr(t, 'href'))) return httpUrl(attr(t, 'url') ?? attr(t, 'href'), base);
  }
  const html = decode(inner(item, 'content:encoded') ?? inner(item, 'content') ?? inner(item, 'description') ?? inner(item, 'summary') ?? '');
  const img = /<img\s[^>]*>/i.exec(html)?.[0];
  return img && attr(img, 'src') ? httpUrl(attr(img, 'src'), base) : null;
}

/** The items of an RSS or Atom document: { title, link, date, image }. */
export function parseFeed(xml, base) {
  const atom = !/<item[\s>]/i.test(xml) && /<entry[\s>]/i.test(xml);
  const items = xml.match(atom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  return items.map((item) => {
    let link;
    if (atom) {
      const links = tags(item, 'link');
      const t = links.find((l) => (attr(l, 'rel') ?? 'alternate') === 'alternate') ?? links[0];
      link = t && attr(t, 'href');
    } else {
      link = inner(item, 'link') ?? (/isPermaLink\s*=\s*["']false/i.test(tags(item, 'guid')[0] ?? '') ? undefined : inner(item, 'guid'));
    }
    const when = Date.parse(text(inner(item, atom ? 'published' : 'pubDate') ?? inner(item, 'updated') ?? inner(item, 'dc:date') ?? ''));
    return {
      title: text(inner(item, 'title')) || null,
      link: link ? httpUrl(link, base) : null,
      date: Number.isFinite(when) ? new Date(when).toISOString() : null,
      image: image(item, base),
    };
  }).filter((i) => i.title || i.link);
}

/** Items published in the 24 hours before `now` (ms); an item without a date does not count. */
export function recentItems(items, now = Date.now()) {
  return items.filter((i) => i.date && Date.parse(i.date) >= now - 86400_000 && Date.parse(i.date) <= now).length;
}

export default {
  async fetch(ctx) {
    const { url, images } = ctx.options;
    const max = Math.min(50, Math.max(1, Math.floor(Number(ctx.options.maxItems) || 5)));
    const res = await ctx.fetch(url, { headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' } });
    if (!res.ok) throw new Error(`Feed answered ${res.status}`);
    const all = parseFeed(await res.text(), res.url || url);
    const items = all.slice(0, max);
    return {
      blocks: [],
      attributes: { items: all.length, recent: recentItems(all) },
      feed: {
        layout: ctx.options.layout === 'grid' ? 'grid' : 'list',
        items: images === false ? items.map((i) => ({ ...i, image: null })) : items,
      },
    };
  },
};
