// The calendar as homepage shows it: a month with a dot per event and the chosen day's events
// below it, or an agenda of the coming events. Dates in the viewer's time zone (or `timezone`)
// and the page language; paging to another month asks the server for it (hd-widget-params).

// homepage's colour names (Tailwind 500)
const COLORS = {
  slate: '#64748b', gray: '#6b7280', zinc: '#71717a', neutral: '#737373', stone: '#78716c', red: '#ef4444', orange: '#f97316',
  amber: '#f59e0b', yellow: '#eab308', lime: '#84cc16', green: '#22c55e', emerald: '#10b981', teal: '#14b8a6', cyan: '#06b6d4',
  sky: '#0ea5e9', blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7', fuchsia: '#d946ef', pink: '#ec4899', rose: '#f43f5e',
};
const color = (c) => COLORS[c] ?? (/^#[0-9a-f]{3,8}$/i.test(c ?? '') ? c : 'var(--hd-accent)');
const DAY = 86400_000;

class HdCalendar extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' }).innerHTML = `<style>
      :host { display: block; font-size: .875rem; }
      .head { display: flex; align-items: center; gap: 4px; margin-bottom: 6px; }
      .title { flex: 1; font-weight: 600; text-transform: capitalize; }
      button { font: inherit; color: inherit; background: none; border: 0; border-radius: 6px; cursor: pointer; min-width: 28px; min-height: 28px; }
      button:hover { background: color-mix(in srgb, var(--hd-text) 10%, transparent); }
      button:focus-visible { outline: 2px solid var(--hd-accent); outline-offset: 1px; }
      .today-btn { font-size: .75rem; padding: 0 8px; }
      .grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; text-align: center; }
      .wd { font-size: .6875rem; color: var(--hd-muted); padding-bottom: 2px; }
      .day { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 3px 0; min-height: 34px; font-variant-numeric: tabular-nums; }
      .day.other { color: var(--hd-muted); }
      .day.today .n { outline: 1px solid var(--hd-accent); border-radius: 4px; padding: 0 3px; }
      .day[aria-pressed="true"] { background: color-mix(in srgb, var(--hd-accent) 22%, transparent); }
      .dots { display: flex; gap: 2px; height: 6px; margin-top: 2px; }
      .dot { width: 5px; height: 5px; border-radius: 50%; }
      ul { list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 4px; }
      li { display: flex; align-items: baseline; gap: 6px; padding: 3px 6px; border-radius: 4px; background: color-mix(in srgb, var(--hd-text) 6%, transparent); }
      li .bar { align-self: stretch; width: 3px; border-radius: 2px; flex: none; }
      li .t { flex: 1; min-width: 0; overflow-wrap: anywhere; }
      li .d { color: var(--hd-muted); font-size: .75rem; white-space: nowrap; }
      li.done .t { opacity: .7; }
      li a { color: inherit; }
      h4 { margin: 10px 0 2px; font-size: .75rem; font-weight: 600; color: var(--hd-muted); text-transform: capitalize; }
      h4:first-child { margin-top: 0; }
      .empty, .failed { margin-top: 8px; font-size: .75rem; color: var(--hd-muted); }
      .failed { color: var(--hd-warn); }
    </style><div class="cal"></div>`;
    this.render();
  }
  set data(value) {
    this._data = value;
    this.render();
  }
  get data() {
    return this._data;
  }
  /** "YYYY-MM-DD" of a moment in the calendar's time zone. */
  dayKey(date) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: this.zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  /** An event's day: all-day events keep their date as written. */
  eventDay(e) {
    return e.allDay ? e.date.slice(0, 10) : this.dayKey(new Date(e.date));
  }
  page(delta) {
    const [y, m] = this._month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    this.show(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, null);
  }
  /** Shows a month (asking the server for its events when it is another one) and a day in it. */
  show(month, day) {
    const other = month !== this._month;
    this._month = month;
    this._selected = day;
    if (other) this._asked = month;
    if (other) this.dispatchEvent(new CustomEvent('hd-widget-params', { bubbles: true, composed: true, detail: { month } }));
    this.render();
  }
  item(e, t, lang, showTime) {
    const li = document.createElement('li');
    if (e.done) li.className = 'done';
    const bar = document.createElement('span');
    bar.className = 'bar';
    bar.style.background = color(e.color);
    const title = document.createElement('span');
    title.className = 't';
    const text = [e.title, e.detail, e.detailKey ? t(e.detailKey) : null].filter(Boolean).join(' · ');
    if (e.url && /^https?:\/\//.test(e.url)) {
      const a = document.createElement('a');
      a.href = e.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = text;
      title.append(a);
    } else title.textContent = text;
    li.append(bar, title);
    if (showTime && !e.allDay) {
      const d = document.createElement('span');
      d.className = 'd';
      d.textContent = new Intl.DateTimeFormat(lang, { timeZone: this.zone, hour: 'numeric', minute: '2-digit' }).format(new Date(e.date));
      li.append(d);
    }
    return li;
  }
  render() {
    const root = this.shadowRoot;
    if (!root) return;
    const box = root.querySelector('.cal');
    const t = this.t ?? ((k) => k);
    const lang = document.documentElement.lang || undefined;
    const cal = this._data?.calendar;
    this.zone = cal?.timezone || undefined;
    try { new Intl.DateTimeFormat('en', { timeZone: this.zone }); } catch { this.zone = undefined; }
    box.replaceChildren();
    if (this.error) {
      box.textContent = this.error;
      return;
    }
    const today = this.dayKey(new Date());
    this._month ??= today.slice(0, 7);
    // data for another month than the one in view (the server's clock or time zone is not the
    // viewer's): ask for this one, once
    if (cal?.month && cal.month !== this._month && this._asked !== this._month) {
      this._asked = this._month;
      this.dispatchEvent(new CustomEvent('hd-widget-params', { bubbles: true, composed: true, detail: { month: this._month } }));
    }
    const events = cal?.events ?? [];
    const byDay = new Map();
    for (const e of events) {
      const k = this.eventDay(e);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(e);
    }
    const max = cal?.maxEvents ?? 10;
    if (cal?.view === 'agenda') this.agenda(box, byDay, today, t, lang, max, cal);
    else this.month(box, byDay, today, t, lang, max, cal);
    if (cal?.failed?.length) {
      const f = document.createElement('div');
      f.className = 'failed';
      f.textContent = `${t('notAnswered')}: ${cal.failed.join(', ')}`;
      box.append(f);
    }
  }
  month(box, byDay, today, t, lang, max, cal) {
    const [y, m] = this._month.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const head = document.createElement('div');
    head.className = 'head';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
    const btn = (text, label, fn, cls) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      if (label) b.setAttribute('aria-label', label);
      if (cls) b.className = cls;
      b.addEventListener('click', fn);
      return b;
    };
    head.append(title,
      btn('‹', t('previousMonth'), () => this.page(-1)),
      btn(t('today'), null, () => this.show(today.slice(0, 7), today), 'today-btn'),
      btn('›', t('nextMonth'), () => this.page(1)));
    const grid = document.createElement('div');
    grid.className = 'grid';
    const sundayFirst = cal?.firstDayInWeek === 'sunday';
    // weekday names from a known week (2026-01-04 was a Sunday)
    for (let i = 0; i < 7; i++) {
      const wd = document.createElement('div');
      wd.className = 'wd';
      wd.setAttribute('aria-hidden', 'true');
      wd.textContent = new Intl.DateTimeFormat(lang, { weekday: 'narrow', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 4 + i + (sundayFirst ? 0 : 1))));
      grid.append(wd);
    }
    const offset = (first.getUTCDay() - (sundayFirst ? 0 : 1) + 7) % 7;
    const start = first.getTime() - offset * DAY;
    const days = Math.ceil((offset + new Date(Date.UTC(y, m, 0)).getUTCDate()) / 7) * 7;
    const selected = this._selected ?? (today.slice(0, 7) === this._month ? today : `${this._month}-01`);
    const longDate = new Intl.DateTimeFormat(lang, { dateStyle: 'full', timeZone: 'UTC' });
    for (let i = 0; i < days; i++) {
      const date = new Date(start + i * DAY);
      const key = date.toISOString().slice(0, 10);
      const list = byDay.get(key) ?? [];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `day${key.slice(0, 7) !== this._month ? ' other' : ''}${key === today ? ' today' : ''}`;
      b.setAttribute('aria-pressed', String(key === selected));
      b.setAttribute('aria-label', `${longDate.format(date)}${list.length ? `, ${list.length}` : ''}`);
      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = String(date.getUTCDate());
      const dots = document.createElement('span');
      dots.className = 'dots';
      dots.setAttribute('aria-hidden', 'true');
      for (const e of list.slice(0, 3)) {
        const dot = document.createElement('span');
        dot.className = 'dot';
        dot.style.background = color(e.color);
        dots.append(dot);
      }
      b.append(n, dots);
      b.addEventListener('click', () => { this._selected = key; this.render(); });
      grid.append(b);
    }
    box.append(head, grid);
    const chosen = (byDay.get(selected) ?? []).slice(0, max);
    if (chosen.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = t('noEvents');
      box.append(empty);
      return;
    }
    const ul = document.createElement('ul');
    for (const e of chosen) ul.append(this.item(e, t, lang, cal?.showTime && selected === today));
    box.append(ul);
  }
  agenda(box, byDay, today, t, lang, max, cal) {
    const from = new Date(Date.parse(today) - (cal?.previousDays ?? 0) * DAY).toISOString().slice(0, 10);
    const days = [...byDay.keys()].filter((k) => k >= from).sort();
    let left = max;
    const fmt = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    for (const day of days) {
      if (left <= 0) break;
      const h = document.createElement('h4');
      h.textContent = day === today ? t('today') : fmt.format(new Date(`${day}T00:00:00Z`));
      const ul = document.createElement('ul');
      for (const e of byDay.get(day).slice(0, left)) ul.append(this.item(e, t, lang, cal?.showTime && day === today));
      left -= ul.children.length;
      box.append(h, ul);
    }
    if (!box.children.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = t('noEvents');
      box.append(empty);
    }
  }
}
customElements.define('hd-calendar', HdCalendar);
