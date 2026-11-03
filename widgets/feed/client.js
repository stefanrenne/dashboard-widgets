// The feed's items as homepage shows them: a list (title, age, a small thumbnail) or a grid of
// image tiles. Items open in a new tab; ages are in the page language.

const UNITS = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];

class DashFeed extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host { display: block; font-size: .875rem; }
      ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
      li .item { display: flex; align-items: center; gap: 8px; min-height: 28px; padding: 3px 6px; border-radius: 4px; color: inherit; text-decoration: none; background: color-mix(in srgb, var(--dash-text) 6%, transparent); }
      li a.item:hover { background: color-mix(in srgb, var(--dash-text) 12%, transparent); }
      a:focus-visible { outline: 2px solid var(--dash-accent); outline-offset: 1px; }
      .thumb { width: 40px; height: 40px; flex: none; border-radius: 4px; object-fit: cover; }
      .t { flex: 1; min-width: 0; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .d { color: var(--dash-muted); font-size: .75rem; white-space: nowrap; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 6px; }
      .tile { position: relative; display: block; aspect-ratio: 4 / 3; border-radius: 6px; overflow: hidden; color: #fff; text-decoration: none; background: color-mix(in srgb, var(--dash-text) 12%, transparent); }
      .tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .tile span { position: absolute; inset: auto 0 0 0; padding: 14px 6px 4px; font-size: .75rem; line-height: 1.25; background: linear-gradient(transparent, rgb(0 0 0 / .8)); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .tile.noimg span { position: static; display: block; padding: 6px; color: var(--dash-text); background: none; }
      .empty { font-size: .75rem; color: var(--dash-muted); }
    </style><div class="feed"></div>`;
    this.render();
  }
  set data(value) {
    this._data = value;
    this.render();
  }
  get data() {
    return this._data;
  }
  age(iso) {
    const s = (Date.parse(iso) - Date.now()) / 1000;
    if (!Number.isFinite(s)) return '';
    const rtf = new Intl.RelativeTimeFormat(document.documentElement.lang || undefined, { numeric: 'auto', style: 'narrow' });
    for (const [unit, size] of UNITS) if (Math.abs(s) >= size) return rtf.format(Math.round(s / size), unit);
    return rtf.format(0, 'minute');
  }
  link(item, className) {
    const a = document.createElement(item.link ? 'a' : 'div');
    a.className = className;
    if (item.link) Object.assign(a, { href: item.link, target: '_blank', rel: 'noopener noreferrer' });
    return a;
  }
  img(src, className) {
    const img = document.createElement('img');
    Object.assign(img, { src, alt: '', loading: 'lazy', decoding: 'async', referrerPolicy: 'no-referrer', className });
    img.addEventListener('error', () => img.remove());
    return img;
  }
  render() {
    const root = this.shadowRoot?.querySelector('.feed');
    if (!root) return;
    root.replaceChildren();
    const feed = this._data?.feed;
    if (!feed) return;
    if (!feed.items.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = this.t?.('noItems') ?? 'noItems';
      return root.append(p);
    }
    if (feed.layout === 'grid') {
      const grid = document.createElement('div');
      grid.className = 'grid';
      for (const item of feed.items) {
        const tile = this.link(item, item.image ? 'tile' : 'tile noimg');
        if (item.image) tile.append(this.img(item.image));
        const title = document.createElement('span');
        title.textContent = item.title ?? item.link;
        tile.append(title);
        if (item.title) tile.title = item.title;
        grid.append(tile);
      }
      return root.append(grid);
    }
    const ul = document.createElement('ul');
    for (const item of feed.items) {
      const li = document.createElement('li');
      const a = this.link(item, 'item');
      if (item.image) a.append(this.img(item.image, 'thumb'));
      const t = document.createElement('span');
      t.className = 't';
      t.textContent = item.title ?? item.link;
      a.append(t);
      if (item.date) {
        const d = document.createElement('time');
        d.className = 'd';
        d.dateTime = item.date;
        d.textContent = this.age(item.date);
        a.append(d);
      }
      li.append(a);
      ul.append(li);
    }
    root.append(ul);
  }
}
customElements.define('dash-feed', DashFeed);
