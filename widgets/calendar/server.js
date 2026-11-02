// Calendar: events from Sonarr, Radarr, Lidarr and Readarr (their calendar APIs) and iCal
// feeds, for the month in view (or the agenda's days), as homepage's calendar widget. An
// integration points to a service with service_group and service_name (the dashboard fills in
// its url and key) or gives url and key itself. client.js draws the month or the agenda.

const DAY = 86400_000;

const pad = (n) => String(n).padStart(2, '0');
/** A day "2026-10-23" in a time zone (UTC when it is not set or not known). */
export function dayIn(date, zone) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: zone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }
}
/** How many events fall on a day ("2026-10-23") in a time zone; all-day events carry their day in UTC. */
export function eventsOn(events, day, zone) {
  return events.filter((e) => (e.allDay ? e.date.slice(0, 10) : dayIn(new Date(e.date), zone)) === day).length;
}
const isoDay = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** The days to ask for: the month in view with a week around it, or the agenda's days. */
export function range({ view, previousDays = 0, month }, now = new Date()) {
  if (view === 'agenda') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Math.max(0, Number(previousDays) || 0) * DAY);
    return { start, end: new Date(start.getTime() + (Math.max(0, Number(previousDays) || 0) + 62) * DAY) };
  }
  const m = /^(\d{4})-(\d{2})$/.exec(month ?? '');
  const year = m ? Number(m[1]) : now.getUTCFullYear();
  const mon = m ? Number(m[2]) - 1 : now.getUTCMonth();
  return { start: new Date(Date.UTC(year, mon, 1) - 7 * DAY), end: new Date(Date.UTC(year, mon + 1, 1) + 7 * DAY) };
}

// ---------------------------------------------------------------- iCal (RFC 5545, the common part)

/** Unfolded content lines of an iCalendar text. */
function lines(text) {
  return String(text).replace(/\r?\n[ \t]/g, '').split(/\r?\n/).filter(Boolean);
}

/** "DTSTART;TZID=Europe/Amsterdam:20261024T090000" -> { name, params, value }. */
function property(line) {
  const colon = line.search(/:(?=(?:[^"]*"[^"]*")*[^"]*$)/);
  const head = line.slice(0, colon);
  const [name, ...rest] = head.split(';');
  const params = Object.fromEntries(rest.map((p) => p.split('=')).map(([k, v]) => [k.toUpperCase(), v?.replace(/^"|"$/g, '')]));
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

/** A date-time in a zone (IANA name) to a Date, without libraries: correct the offset once. */
function zoned(y, mo, d, h, mi, s, zone) {
  const guess = Date.UTC(y, mo, d, h, mi, s);
  if (!zone) return new Date(guess);
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
    const asZone = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    return new Date(guess - (asZone - guess));
  } catch {
    return new Date(guess);
  }
}

/** DTSTART/DTEND value -> { date, allDay }. Floating times count as UTC. */
export function icalDate({ value, params }) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value ?? '');
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined || params?.VALUE === 'DATE') return { date: new Date(Date.UTC(+y, +mo - 1, +d)), allDay: true, wall: Date.UTC(+y, +mo - 1, +d), zone: null };
  const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  const zone = z ? null : params?.TZID ?? null;
  return { date: zone ? zoned(+y, +mo - 1, +d, +h, +mi, +s, zone) : new Date(wall), allDay: false, wall, zone };
}

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * Occurrences of an event between start and end; RRULE with FREQ, INTERVAL, COUNT, UNTIL and
 * (weekly) BYDAY. Repeats are counted on the event's wall clock and then put in its time zone,
 * so a weekly 09:00 stays 09:00 across a daylight saving change.
 */
export function occurrences(event, start, end) {
  const first = event.start.wall ?? event.start.date.getTime();
  const length = event.end ? event.end.date.getTime() - event.start.date.getTime() : 0;
  const out = [];
  const real = (wall) => {
    if (!event.start.zone) return wall;
    const d = new Date(wall);
    return zoned(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), event.start.zone).getTime();
  };
  const add = (wall) => {
    const t = real(wall);
    if (t + length >= start.getTime() && t < end.getTime() && !event.exdates.has(t)) out.push(t);
  };
  if (!event.rrule) {
    add(first);
    return out;
  }
  const r = Object.fromEntries(event.rrule.split(';').map((p) => p.split('=')));
  const interval = Math.max(1, Number(r.INTERVAL) || 1);
  const untilDate = r.UNTIL ? icalDate({ value: r.UNTIL }) : null;
  const until = untilDate ? (untilDate.allDay ? untilDate.wall + DAY - 1 : untilDate.date.getTime() + (first - event.start.date.getTime())) : Infinity;
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  const days = r.BYDAY ? r.BYDAY.split(',').map((d) => WEEKDAYS.indexOf(d.slice(-2))).filter((d) => d >= 0) : null;
  let n = 0;
  const base = new Date(first);
  for (let i = 0; i < 2000 && n < count; i++) {
    let times;
    if (r.FREQ === 'DAILY') times = [first + i * interval * DAY];
    else if (r.FREQ === 'WEEKLY') {
      const weekStart = first + i * interval * 7 * DAY - base.getUTCDay() * DAY;
      times = (days ?? [base.getUTCDay()]).sort((a, b) => a - b).map((d) => weekStart + d * DAY).filter((t) => t >= first);
    } else if (r.FREQ === 'MONTHLY') times = [Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + i * interval, base.getUTCDate(), base.getUTCHours(), base.getUTCMinutes())];
    else if (r.FREQ === 'YEARLY') times = [Date.UTC(base.getUTCFullYear() + i * interval, base.getUTCMonth(), base.getUTCDate(), base.getUTCHours(), base.getUTCMinutes())];
    else break;
    for (const t of times) {
      if (t > until || n >= count) return out;
      n++;
      add(t);
    }
    if (times.length && real(times[0]) >= end.getTime()) break;
  }
  return out;
}

/** VEVENTs of an iCalendar text: { uid, title, start, end, rrule, exdates, url, location }. */
export function parseIcal(text) {
  const events = [];
  let cur = null;
  for (const line of lines(text)) {
    if (line === 'BEGIN:VEVENT') cur = { exdates: new Set() };
    else if (line === 'END:VEVENT') { if (cur?.start) events.push(cur); cur = null; }
    else if (cur) {
      const p = property(line);
      if (p.name === 'SUMMARY') cur.title = p.value.replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ');
      else if (p.name === 'DTSTART') cur.start = icalDate(p);
      else if (p.name === 'DTEND') cur.end = icalDate(p);
      else if (p.name === 'RRULE') cur.rrule = p.value;
      else if (p.name === 'EXDATE') for (const v of p.value.split(',')) { const d = icalDate({ value: v, params: p.params }); if (d) cur.exdates.add(d.date.getTime()); }
      else if (p.name === 'URL') cur.url = p.value;
      else if (p.name === 'UID') cur.uid = p.value;
      else if (p.name === 'STATUS') cur.cancelled = p.value === 'CANCELLED';
    }
  }
  return events.filter((e) => !e.cancelled);
}

// ---------------------------------------------------------------- integrations

const COLORS = { sonarr: 'teal', radarr: 'amber', lidarr: 'green', readarr: 'rose', ical: 'zinc' };

async function arr(ctx, it, version, path, { start, end }, extra) {
  const url = new URL(`${String(it.url).replace(/\/+$/, '')}/api/${version}/${path}`);
  url.search = new URLSearchParams({ start: start.toISOString(), end: end.toISOString(), unmonitored: String(it.params?.unmonitored ?? false), ...extra }).toString();
  const res = await ctx.fetch(url, { headers: { 'X-Api-Key': it.key ?? '', accept: 'application/json' } });
  if (!res.ok) throw new Error(`${it.type} calendar answered ${res.status}`);
  return res.json();
}

const link = (it, path) => (it.baseUrl ? `${String(it.baseUrl).replace(/\/+$/, '')}/${path}` : null);

const SOURCES = {
  async sonarr(ctx, it, r) {
    return (await arr(ctx, it, 'v3', 'calendar', r, { includeSeries: 'true' })).map((e) => ({
      date: e.airDateUtc, title: e.series?.title ?? e.title, detail: `S${pad(e.seasonNumber)}E${pad(e.episodeNumber)}`, done: e.hasFile === true,
      url: e.series?.titleSlug ? link(it, `series/${e.series.titleSlug}`) : null,
    }));
  },
  async radarr(ctx, it, r) {
    const out = [];
    for (const m of await arr(ctx, it, 'v3', 'calendar', r)) {
      for (const [field, detail] of [['inCinemas', 'inCinemas'], ['physicalRelease', 'physicalRelease'], ['digitalRelease', 'digitalRelease']]) {
        if (m[field]) out.push({ date: m[field], allDay: true, title: m.title, detailKey: detail, done: m.hasFile === true, url: m.titleSlug ? link(it, `movie/${m.titleSlug}`) : null });
      }
    }
    return out;
  },
  async lidarr(ctx, it, r) {
    return (await arr(ctx, it, 'v1', 'calendar', r, { includeArtist: 'true' })).map((e) => ({
      date: e.releaseDate, allDay: true, title: `${e.artist?.artistName ?? ''} - ${e.title}`.replace(/^ - /, ''), done: (e.statistics?.percentOfTracks ?? 0) >= 100,
    }));
  },
  async readarr(ctx, it, r) {
    return (await arr(ctx, it, 'v1', 'calendar', r, { includeAuthor: 'true' })).map((e) => ({
      date: e.releaseDate, allDay: true, title: `${e.author?.authorName ?? ''} - ${e.title}`.replace(/^ - /, ''), done: (e.statistics?.bookFileCount ?? 0) > 0,
    }));
  },
  async ical(ctx, it, r) {
    const res = await ctx.fetch(String(it.url).replace(/^webcal:/, 'https:'), { headers: { accept: 'text/calendar' } });
    if (!res.ok) throw new Error(`${it.name ?? 'ical'} answered ${res.status}`);
    const out = [];
    for (const e of parseIcal(await res.text())) {
      for (const t of occurrences(e, r.start, r.end)) {
        out.push({ date: new Date(t).toISOString(), allDay: e.start.allDay, title: it.params?.showName && it.name ? `${it.name}: ${e.title ?? ''}` : e.title ?? '', url: e.url ?? null });
      }
    }
    return out;
  },
};

export default {
  async fetch(ctx) {
    const o = ctx.options;
    const r = range({ ...o, month: ctx.params?.month });
    let integrations = o.integrations ?? [];
    if (typeof integrations === 'string') integrations = JSON.parse(integrations);
    const events = [];
    const failed = [];
    await Promise.all(integrations.map(async (it, i) => {
      const source = SOURCES[it?.type];
      try {
        if (!source) throw new Error(`integrations[${i}]: type must be sonarr, radarr, lidarr, readarr or ical`);
        if (!it.url) throw new Error(`integrations[${i}]: needs service_group and service_name, or url`);
        for (const e of await source(ctx, it, r)) {
          const at = Date.parse(e.date);
          // Radarr returns a movie when any of its dates falls in the range; keep the dates that do
          if (!Number.isFinite(at) || at < r.start.getTime() || at >= r.end.getTime()) continue;
          events.push({ ...e, date: new Date(at).toISOString(), color: it.color ?? COLORS[it.type], source: it.name ?? it.service_name ?? it.type });
        }
      } catch (err) {
        ctx.log.warn(err.message);
        failed.push(it?.name ?? it?.service_name ?? it?.type ?? `integrations[${i}]`);
      }
    }));
    events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
    if (integrations.length > 0 && failed.length === integrations.length) throw new Error(`Calendar: no integration answered (${failed.join(', ')})`);
    return {
      blocks: [],
      // today in the widget's time zone: the server cannot know the viewer's
      attributes: { eventsToday: eventsOn(events, dayIn(new Date(), o.timezone), o.timezone), failed: failed.length },
      calendar: {
        view: o.view ?? 'monthly',
        month: isoDay(new Date(r.start.getTime() + 8 * DAY)).slice(0, 7),
        firstDayInWeek: o.firstDayInWeek ?? 'monday',
        maxEvents: Math.max(1, Number(o.maxEvents) || 10),
        showTime: o.showTime === true,
        timezone: o.timezone ?? null,
        previousDays: Math.max(0, Number(o.previousDays) || 0),
        events,
        failed,
      },
    };
  },
};
