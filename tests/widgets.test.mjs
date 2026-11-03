// Every widget against its fixture, through the public ctx contract only.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { startMock } from '../scripts/mock-homelab.mjs';
import { startFakes, exampleOptions, nis, truenasServer } from '../scripts/fakes.mjs';
import { readmeExample } from '../scripts/readme-example.mjs';

const WIDGETS = path.resolve('widgets');
const IDS = fs.readdirSync(WIDGETS).filter((d) => fs.existsSync(path.join(WIDGETS, d, 'widget.yaml'))).sort();
// homepage's languages plus Dutch, as the dashboard
const LANGS = ['en', 'nl', 'fr', 'de', 'es', 'ca', 'he', 'hr', 'hu', 'it', 'nb-NO', 'pt', 'ru', 'sv', 'vi', 'zh-Hans', 'zh-Hant'];

let mock;
let fakes; // apcupsd (TCP), a2s (UDP), myjd (encrypted), mc (TCP), urb (login hash), dockerd (absolute paths), truenas (WebSocket)
let apcupsd, a2s, myjd, mc, urb, dockerd;
let REQUIRED; // options a widget cannot do without, for the tests that run every widget
before(async () => {
  mock = await startMock();
  fakes = await startFakes();
  ({ apcupsd, a2s, myjd, mc, urb, dockerd } = fakes);
  REQUIRED = exampleOptions({ mockUrl: mock.url, fakes });
});
after(() => {
  mock.close();
  fakes.close();
});

const silent = { info() {}, warn() {}, error() {} };


async function run(id, options = {}, { params } = {}) {
  if (!fs.existsSync(path.join(WIDGETS, id, 'server.js'))) return { blocks: [] }; // client-only (mjpeg)
  const { default: widget } = await import(path.join(WIDGETS, id, 'server.js'));
  return widget.fetch({
    apiVersion: 2,
    instanceId: 't',
    params: params ?? {},
    options: { url: `${mock.url}/${id}`, key: 'test-key', ...REQUIRED[id], ...options },
    signal: new AbortController().signal,
    cache: new Map(),
    log: silent,
    // a path is relative to options.url, as the dashboard's ctx.fetch
    fetch: (u, init) => fetch(/^[a-z][a-z0-9+.-]*:/i.test(String(u)) ? u : new URL(String(u), options.url ?? `${mock.url}/${id}`), init),
  });
}

const values = (out) => Object.fromEntries(out.blocks.map((b) => [b.key, b.unit && b.value !== null ? `${b.value}${b.unit}` : b.value]));
const lastRequest = (id) => mock.requests.filter((r) => r.widget === id).at(-1);

test('every folder is a valid package: manifest, i18n in all languages, only node: imports', () => {
  // every widget has a row in the README table (rule 5), and every row a widget
  const rows = [...fs.readFileSync('README.md', 'utf8').matchAll(/^\| `([a-z0-9_-]+)` \|/gm)].map((m) => m[1]).sort();
  assert.deepEqual(IDS, rows);
  for (const id of IDS) {
    const m = YAML.parse(fs.readFileSync(path.join(WIDGETS, id, 'widget.yaml'), 'utf8'));
    assert.equal(m.id, id);
    assert.match(id, /^[a-z0-9][a-z0-9-]{0,62}$/, `${id}: the dashboard's id format (homepage's names with _ go in aliases)`);
    assert.equal(m.apiVersion, 2);
    assert.match(m.version, /^\d+\.\d+\.\d+$/);
    for (const [name, def] of Object.entries(m.options)) {
      if (/key|password|token/i.test(name)) assert.equal(def.secret, true, `${id}.${name} must be secret`);
    }
    const i18n = JSON.parse(fs.readFileSync(path.join(WIDGETS, id, 'i18n.json'), 'utf8'));
    const keys = Object.keys(i18n.en).sort();
    for (const lang of LANGS) assert.deepEqual(Object.keys(i18n[lang]).sort(), keys, `${id} ${lang}`);
    const src = ['server.js', 'client.js'].filter((f) => fs.existsSync(path.join(WIDGETS, id, f))).map((f) => fs.readFileSync(path.join(WIDGETS, id, f), 'utf8')).join('\n');
    assert.ok(src, `${id} has a server.js or a client.js`);
    for (const [, spec] of src.matchAll(/^import .* from '([^']+)'/gm)) assert.match(spec, /^node:/, `${id} imports ${spec}`);
  }
});

// blocks whose value is a name from the service (a host name, an operating system), not a key
const NAMES = { tailscale: ['user', 'hostname', 'name', 'os', 'tags', 'address'], beszel: ['name'], gamedig: ['name', 'map'], headscale: ['name'], lubelogger: ['vehicle'], minecraft: ['version'], ntfy: ['title', 'message', 'tags'], wallos: ['nextRenewingSubscription'] };

test('every label, string value and row state has a translation', async () => {
  for (const id of IDS) {
    const i18n = JSON.parse(fs.readFileSync(path.join(WIDGETS, id, 'i18n.json'), 'utf8'));
    const out = await run(id, { pool1: 'trunk', enableQueue: true, queueLimit: 2 });
    for (const b of out.blocks ?? []) {
      assert.ok(b.label in i18n.en, `${id}: label ${b.label}`);
      if (typeof b.value === 'string' && /^[a-z]+$/.test(b.value) && !(NAMES[id] ?? []).includes(b.key)) assert.ok(b.value in i18n.en, `${id}: value ${b.value}`);
    }
    for (const r of out.rows ?? []) {
      if (/^[a-z][A-Za-z]+$/.test(r.label)) assert.ok(r.label in i18n.en, `${id}: row ${r.label}`);
      if (typeof r.value === 'string' && /^[a-z][A-Za-z]+$/.test(r.value)) assert.ok(r.value in i18n.en, `${id}: state ${r.value}`);
    }
  }
});

// row texts and client.js messages have the full card width
const ROW_TEXTS = new Set(['noLocation', 'locating', 'unknownSymbol', 'previousMonth', 'nextMonth', 'today', 'noEvents', 'inCinemas', 'physicalRelease', 'digitalRelease', 'notAnswered', 'moreItems', 'noActiveStreams', 'downloading', 'queued', 'paused', 'completed', 'delay', 'failed', 'failedPending',
  'warning', 'importPending', 'importBlocked', 'importing', 'imported', 'downloadClientUnavailable', 'noItems', 'placeholderFilter',
  'updateFirmware', 'updateStarted', 'wrongPassword', 'passwordNeeded']);
const BLOCK_LABELS = { radarr: ['wanted', 'missing', 'queued', 'movies'], sonarr: ['wanted', 'queued', 'series'] };

test('block labels fit a narrow block: no abbreviations, words of 12 letters or less, 24 in all', () => {
  for (const id of IDS) {
    const i18n = JSON.parse(fs.readFileSync(path.join(WIDGETS, id, 'i18n.json'), 'utf8'));
    for (const [lang, texts] of Object.entries(i18n)) {
      for (const [key, text] of Object.entries(texts)) {
        const shown = text.replace('{pool}', 'Trunk').replace('{count}', '12');
        assert.ok(!/\w\.(\s|$)/.test(shown), `${id} ${lang} ${key}: abbreviation "${text}"`);
        if (ROW_TEXTS.has(key) && !(BLOCK_LABELS[id] ?? []).includes(key)) continue; // row texts have the full card width
        assert.ok(shown.length <= 24, `${id} ${lang} ${key}: "${text}" is ${shown.length} long`);
        for (const word of shown.split(/[\s-]+/)) assert.ok(word.length <= 12, `${id} ${lang} ${key}: "${word}" is too long`);
      }
    }
  }
});

test('one decimal unit system and one time format in every widget', async () => {
  const sab = await import(path.join(WIDGETS, 'sabnzbd', 'server.js'));
  const tdarr = await import(path.join(WIDGETS, 'tdarr', 'server.js'));
  const unraid = await import(path.join(WIDGETS, 'unraid', 'server.js'));
  const radarr = await import(path.join(WIDGETS, 'radarr', 'server.js'));
  const tautulli = await import(path.join(WIDGETS, 'tautulli', 'server.js'));
  assert.equal(sab.formatRate(1_500_000), '1.5 MB/s');
  assert.equal(tdarr.formatBytes(1_500_000), '1.5 MB');
  assert.equal(unraid.formatBytes(1_500_000), '1.5 MB');
  assert.equal(sab.clock('0:12:30'), '12:30');
  assert.equal(sab.clock('1:02:03'), '1:02:03');
  assert.equal(radarr.clock(radarr.parseTimeleft('00:12:30')), '12:30');
  assert.equal(radarr.clock(radarr.parseTimeleft('1.02:03:04')), '26:03:04');
  assert.equal(tautulli.clock(750_000), '12:30');
});

test('radarr: counts, and a queue that leads with problems and stops at queueLimit', async () => {
  const out = await run('radarr', { enableQueue: true, queueLimit: 5 });
  assert.deepEqual(values(out), { wanted: 8, missing: 13, queued: 7, movies: 62 });
  assert.equal(out.rows.length, 6);
  assert.deepEqual(out.rows[0], { label: 'The Social Reckoning (2026)', value: 'importBlocked', status: 'warn' });
  assert.deepEqual(out.rows[1], { label: 'Movie 1 (2020)', value: '10:30', progress: 88 });
  assert.deepEqual(out.rows.at(-1), { label: 'moreItems', vars: { count: 2 } });
  assert.equal(lastRequest('radarr').headers['x-api-key'], 'test-key');
  const noQueue = await run('radarr');
  assert.equal(noQueue.rows, undefined);
});

test('sonarr: counts and the queue with series names', async () => {
  const out = await run('sonarr', { enableQueue: true, queueLimit: 5 });
  assert.deepEqual(values(out), { wanted: 11, queued: 3, series: 24 });
  assert.deepEqual(out.rows.map((r) => [r.label, r.value]), [
    ['South Park · S29E04', 'importPending'],
    ['MobLand · S02E06', 'importPending'],
    ["Grey's Anatomy · S23E02", 'importPending'],
  ]);
  const short = await run('sonarr', { enableQueue: true, queueLimit: 1 });
  assert.deepEqual(short.rows.at(-1), { label: 'moreItems', vars: { count: 2 } });
});

test('bazarr, prowlarr, sabnzbd, seerr, whatsupdocker, portainer', async () => {
  assert.deepEqual(values(await run('bazarr')), { missingEpisodes: 200, missingMovies: 3 });
  assert.equal(lastRequest('bazarr').headers['x-api-key'], 'test-key');
  assert.deepEqual(values(await run('prowlarr')), { grabs: 37, queries: 44, failGrabs: 0, failQueries: 0 });
  assert.deepEqual(values(await run('sabnzbd')), { rate: '45.7 MB/s', queue: 3, timeleft: '12:30' });
  assert.deepEqual(lastRequest('sabnzbd').query, { mode: 'queue', output: 'json', apikey: 'test-key' });
  assert.deepEqual(values(await run('seerr')), { pending: 0, approved: 11, completed: 0 });
  assert.deepEqual(values(await run('whatsupdocker', { username: 'u', password: 'p' })), { monitoring: 30, updates: 0 });
  assert.equal(lastRequest('whatsupdocker').headers.authorization, `Basic ${Buffer.from('u:p').toString('base64')}`);
  assert.deepEqual(values(await run('portainer', { env: 1 })), { running: 32, stopped: 2, total: 34 }, 'running + stopped = total');
  await assert.rejects(run('portainer', { env: 9 }), /no environment 9/);
});

test('stash: GraphQL stats with the API key header', async () => {
  const out = await run('stash');
  assert.deepEqual(values(out), { scenes: 5518, images: 10230, galleries: 88, performers: 2640, studios: 412, tags: 1418 });
  const req = lastRequest('stash');
  assert.equal(req.headers.apikey, 'test-key');
  assert.match(JSON.parse(req.body).query, /scene_count/);
});

test('tautulli: one row per stream, with episode number and user when asked', async () => {
  const out = await run('tautulli', { showEpisodeNumber: true, enableUser: true });
  assert.deepEqual(out.rows, [{ label: 'Silo: S03 · E09 - Farewell (alice)', icon: 'play', value: '3:54 / 58:00', progress: 7 }]);
  const plain = await run('tautulli');
  assert.equal(plain.rows[0].label, 'Silo - Farewell', 'no symbols in the text; the icon carries the state');
  const { clock } = await import(path.join(WIDGETS, 'tautulli', 'server.js'));
  assert.equal(clock(3723000), '1:02:03');
});

test('tdarr: transcode + health check totals and space saved', async () => {
  assert.deepEqual(values(await run('tdarr')), { queue: 3, processed: 2130, errored: 5, saved: '1.5 TB' });
  assert.equal(JSON.parse(lastRequest('tdarr').body).data.docID, 'statistics');
});

test('unraid: homepage field keys, pools by name', async () => {
  const out = await run('unraid', { pool1: 'trunk', pool2: 'frunk', pool3: 'missing' });
  const v = values(out);
  assert.equal(v.cpu, '2%');
  assert.equal(v.memoryPercent, '22%');
  assert.equal(v.pool1UsedPercent, '35%');
  assert.equal(v.pool2UsedPercent, '41%');
  assert.equal(v.pool3UsedPercent, null);
  assert.equal(v.status, 'started');
  assert.equal(v.arrayUsedPercent, '60%');
  assert.equal(v.memoryUsed, '15.1 GB', 'decimal units');
  const pool = out.blocks.find((b) => b.key === 'pool1UsedPercent');
  assert.deepEqual([pool.label, pool.vars], ['pool', { pool: 'Trunk' }], 'pool names are a variable, the label is translated');
  // one meaning per label: no two blocks share a label (with their vars)
  const labels = out.blocks.map((b) => b.label + JSON.stringify(b.vars ?? {}));
  assert.equal(new Set(labels).size, labels.length);
  assert.equal(out.blocks.find((b) => b.key === 'notifications').status, 'warn', 'unread alerts need attention');
  const manifest = YAML.parse(fs.readFileSync(path.join(WIDGETS, 'unraid', 'widget.yaml'), 'utf8'));
  assert.deepEqual(manifest.defaultFields, ['memoryPercent', 'cpu', 'arrayUsedPercent', 'pool1UsedPercent']);
  assert.equal(lastRequest('unraid').headers['x-api-key'], 'test-key');
  // homepage order of the commonly picked fields: memory, cpu, pools
  const order = out.blocks.map((b) => b.key).filter((k) => ['cpu', 'memoryPercent', 'pool1UsedPercent', 'pool2UsedPercent'].includes(k));
  assert.deepEqual(order, ['memoryPercent', 'cpu', 'pool1UsedPercent', 'pool2UsedPercent']);
});

test('an API error becomes a readable exception without the key', async () => {
  for (const id of ['radarr', 'seerr', 'stash', 'unraid']) {
    await assert.rejects(run(id, { url: `${mock.url}/nothing-here` }), (err) => !err.message.includes('test-key') && /answered 404/.test(err.message), id);
  }
});

test('counts that need you are marked warn', async () => {
  const { default: prowlarr } = await import(path.join(WIDGETS, 'prowlarr', 'server.js'));
  const fake = (json) => ({ options: { url: 'http://x', key: 'k' }, fetch: async () => new Response(JSON.stringify(json)) });
  const out = await prowlarr.fetch(fake({ indexers: [{ numberOfGrabs: 1, numberOfFailedGrabs: 2, numberOfQueries: 3, numberOfFailedQueries: 0 }] }));
  assert.deepEqual(out.blocks.map((b) => b.status ?? null), [null, null, 'warn', null]);
  const { default: wud } = await import(path.join(WIDGETS, 'whatsupdocker', 'server.js'));
  const w = await wud.fetch(fake([{ updateAvailable: true }, { updateAvailable: false }]));
  assert.equal(w.blocks[1].status, 'warn');
  const { default: seerr } = await import(path.join(WIDGETS, 'seerr', 'server.js'));
  assert.equal((await seerr.fetch(fake({ pending: 2 }))).blocks[0].status, 'warn');
  const { default: tdarr } = await import(path.join(WIDGETS, 'tdarr', 'server.js'));
  assert.equal((await tdarr.fetch(fake({ table3Count: 1 }))).blocks[2].status, 'warn');
  const { default: sab } = await import(path.join(WIDGETS, 'sabnzbd', 'server.js'));
  const paused = await sab.fetch(fake({ queue: { status: 'Paused', noofslots: 3, timeleft: '0:00:00' } }));
  assert.deepEqual(paused.blocks[0], { key: 'rate', label: 'rate', value: 'paused', status: 'warn' });
  const stash = YAML.parse(fs.readFileSync(path.join(WIDGETS, 'stash', 'widget.yaml'), 'utf8'));
  assert.deepEqual(stash.defaultFields, ['scenes', 'performers', 'tags']);
});

test('block labels need at most two lines on a phone (375px), estimated per widget', async () => {
  // Measured at 375px: a block in a card with 4 blocks is 65px wide, about 8 bold uppercase
  // characters per line; 3 blocks about 11; 2 blocks about 16. A longer word is hyphenated.
  for (const id of IDS) {
    const out = await run(id, { pool1: 'trunk', enableQueue: true });
    const manifest = YAML.parse(fs.readFileSync(path.join(WIDGETS, id, 'widget.yaml'), 'utf8'));
    const keys = manifest.defaultFields ?? (out.blocks ?? []).map((b) => b.key);
    const shown = (out.blocks ?? []).filter((b) => keys.includes(b.key));
    if (shown.length === 0) continue;
    const perLine = shown.length >= 4 ? 8 : shown.length === 3 ? 11 : 16;
    const i18n = JSON.parse(fs.readFileSync(path.join(WIDGETS, id, 'i18n.json'), 'utf8'));
    for (const [lang, texts] of Object.entries(i18n)) {
      for (const b of shown) {
        const text = (texts[b.label] ?? b.label).replace('{pool}', 'Trunk');
        // fill lines word by word; a word longer than a line is hyphenated over several
        let lines = 0;
        let used = perLine;
        for (const word of text.split(/\s+/)) {
          if (used + 1 + word.length <= perLine) used += 1 + word.length;
          else {
            lines += Math.ceil(word.length / perLine);
            used = word.length % perLine || perLine;
          }
        }
        assert.ok(lines <= 2, `${id} ${lang}: "${text}" needs ${lines} lines in a block of ${perLine} characters`);
      }
    }
  }
});

test('unraid: a server without array disks (pools only) gets no array blocks', async () => {
  const { default: unraid } = await import(path.join(WIDGETS, 'unraid', 'server.js'));
  const live = JSON.parse(fs.readFileSync(path.resolve('widgets/unraid/fixture.json'), 'utf8')).routes['POST /graphql'];
  live.data.array.capacity.kilobytes = { free: '0', used: '0', total: '0' }; // as a live ZFS-only server answers
  const out = await unraid.fetch({ options: { url: 'http://x', key: 'k', pool1: 'trunk' }, log: { warn() {} }, fetch: async () => new Response(JSON.stringify(live)) });
  const keys = out.blocks.map((b) => b.key);
  assert.equal(keys.some((k) => k.startsWith('array')), false);
  assert.ok(keys.includes('pool1UsedPercent'));
});

// Every README example runs on its fixture as written, so every example on the docs site works:
// the options the dashboard would give it (scripts/readme-example.mjs), pointed at the mock.
// Widgets that do not speak HTTP to their service get the address of their fake on top
// (and the login the fake checks); calendar's integrations name services, which the dashboard
// resolves; kubernetes needs a cluster and ping a host that answers.
test('README examples run on their fixture', async () => {
  const PROTOCOL = ['apcups', 'gamedig', 'jdownloader', 'minecraft', 'urbackup', 'docker', 'calendar'];
  const ELSEWHERE = ['kubernetes', 'kubernetes-pods', 'ping'];
  const failed = [];
  for (const id of IDS) {
    if (!fs.existsSync(path.join(WIDGETS, id, 'server.js')) || ELSEWHERE.includes(id)) continue;
    const example = readmeExample(id, mock.url);
    if (!example) { failed.push(`${id}: no example with the widget`); continue; }
    const options = {
      ...example,
      ...(PROTOCOL.includes(id) ? REQUIRED[id] : {}),
      ...(id === 'truenas' && Number(example.version) >= 2 ? { url: fakes.truenas.url } : {}),
    };
    const { default: widget } = await import(path.join(WIDGETS, id, 'server.js'));
    try {
      const out = await widget.fetch({
        apiVersion: 2, instanceId: 'readme', params: {}, options, signal: new AbortController().signal, cache: new Map(), log: silent,
        fetch: (u, init) => fetch(/^[a-z][a-z0-9+.-]*:/i.test(String(u)) ? u : new URL(String(u), options.url ?? `${mock.url}/${id}`), init),
      });
      const state = (out.blocks ?? []).find((b) => (b.key ?? b.label) === 'status');
      if (out.status === 'down' || state?.status === 'error') failed.push(`${id}: ${out.statusText ?? state?.value ?? out.status}`);
    } catch (err) {
      failed.push(`${id}: ${err.message}`);
    }
  }
  assert.deepEqual(failed, []);
});

test('every widget has a README for its docs page: title, every field, an example', async () => {
  for (const id of IDS) {
    const m = YAML.parse(fs.readFileSync(path.join(WIDGETS, id, 'widget.yaml'), 'utf8'));
    const readme = fs.readFileSync(path.join(WIDGETS, id, 'README.md'), 'utf8');
    assert.equal(readme.split('\n')[0], `# ${m.name}`, `${id}: the title is the manifest name`);
    // a service widget (type: <id>) or a header widget in widgets.yaml (- <id>:)
    assert.match(readme.split(/^## Example$/m)[1] ?? '', new RegExp(`type: ${id}\\b|^- ${id}:`, 'm'), `${id}: an example that uses it`);
    const fields = new Set([...(readme.split(/^## Fields$/m)[1]?.split(/^## /m)[0] ?? '').matchAll(/`([A-Za-z0-9_.]+)`/g)].map((x) => x[1]));
    const out = await run(id, { pool1: 'trunk', enableQueue: true, queueLimit: 2 });
    for (const b of out.blocks ?? []) assert.ok(fields.has(b.key ?? b.label), `${id}: field ${b.key ?? b.label} missing from README`);
  }
});

// Filter attributes (widget.yaml `attributes:`): what the dashboard takes from a block (`from:`)
// names a block of the README's Fields; what server.js returns itself comes back on the fixture,
// and every value has the declared type (or is null).
test('filter attributes: declared, documented and of the declared type on the fixture', async () => {
  const SOURCES = { '@attention': 'boolean', '@status': 'string', '@rows': 'number' };
  for (const id of IDS) {
    const m = YAML.parse(fs.readFileSync(path.join(WIDGETS, id, 'widget.yaml'), 'utf8'));
    if (!m.attributes) continue;
    const readme = fs.readFileSync(path.join(WIDGETS, id, 'README.md'), 'utf8');
    const fields = new Set([...(readme.split(/^## Fields$/m)[1]?.split(/^## /m)[0] ?? '').matchAll(/`([A-Za-z0-9_.]+)`/g)].map((x) => x[1]));
    const out = await run(id, { pool1: 'trunk', enableQueue: true, queueLimit: 2 });
    for (const [name, def] of Object.entries(m.attributes)) {
      assert.ok(['boolean', 'number', 'string'].includes(def.type), `${id}.${name}: type`);
      const ofType = (v) => v === null || typeof v === def.type;
      if (def.from?.startsWith('@')) {
        assert.equal(SOURCES[def.from], def.type, `${id}.${name}: ${def.from} is a ${SOURCES[def.from]}`);
      } else if (def.from) {
        assert.ok(fields.has(def.from), `${id}.${name}: block ${def.from} is not in the README's Fields`);
        const block = (out.blocks ?? []).find((b) => (b.key ?? b.label) === def.from);
        if (block) assert.ok(ofType(block.value), `${id}.${name}: block ${def.from} is ${typeof block.value}, declared ${def.type}`);
      } else {
        assert.ok(out.attributes && name in out.attributes, `${id}.${name}: server.js does not return it`);
        assert.ok(ofType(out.attributes[name]), `${id}.${name}: ${typeof out.attributes[name]}, declared ${def.type}`);
      }
    }
  }
});

// The docs site's highlighter (Rouge) marks the colon after a key with [ ] or ' in red, quoted
// or not: write ’ for an apostrophe in a name, and Docker labels with [n] as a list (- k=v).
test('README examples: no YAML key with [ ] or \'', () => {
  const bad = [];
  for (const id of IDS) {
    const readme = fs.readFileSync(path.join(WIDGETS, id, 'README.md'), 'utf8');
    for (const [, block] of readme.matchAll(/```ya?ml\n([\s\S]*?)```/g)) {
      for (const line of block.split('\n')) {
        const key = /^\s*(?:- )?("[^"]*"|'[^']*'|[^"'\s#{[][^:"#]*?)\s*:(?:\s|$)/.exec(line)?.[1];
        if (key && /[[\]']/.test(key.replace(/^'|'$/g, ''))) bad.push(`${id}: ${line.trim()}`);
      }
    }
  }
  assert.deepEqual(bad, []);
});


test('glances: CPU, memory, the hottest CPU sensor, uptime and disks; version 4; basic auth', async () => {
  const out = await run('glances', { cputemp: true, uptime: true, disk: ['/', '/mnt/data'], expanded: true, username: 'g', password: 'p' });
  assert.deepEqual(values(out), {
    cpu: '23.4%', memory: '62.5%', memoryUsed: '10 GB', memoryTotal: '16 GB', cputemp: '51°C', uptime: '12d 4h',
    '/': '40%', '/Free': '300 GB', '/mnt/data': '75%', '/mnt/dataFree': '1 TB',
  });
  assert.equal(lastRequest('glances').headers.authorization, `Basic ${Buffer.from('g:p').toString('base64')}`);
  assert.deepEqual(values(await run('glances', { version: 4 })), { cpu: '11%', memory: '50%' });
  assert.equal(values(await run('glances', { cpu: false, mem: false, cputemp: true, unit: 'imperial', cpuSensorLabel: 'acpitz' })).cputemp, '123.8°F');
  assert.deepEqual(values(await run('glances', { cpu: false, mem: false, disk: ['/'], diskUnits: 'bbytes', expanded: true })), { disk: '40%', diskFree: '279 GiB' });
});


test('longhorn: total and per node over their disks, include, numbered labels and expanded rows', async () => {
  const out = await run('longhorn', { expanded: true, username: 'admin', password: 'pw' });
  assert.deepEqual(values(out), { total: '38.7%', node1: '40%', node2: '92%', node3: '25%' });
  assert.deepEqual(out.blocks[1].vars, { name: 'node-a' });
  assert.equal(out.blocks.find((b) => b.key === 'node2').status, 'warn');
  assert.deepEqual(out.rows.map((r) => [r.vars?.name ?? r.label, r.value, r.progress]), [
    ['total', '1.8 TB / 3 TB', 38.7], ['node-a', '300 GB / 500 GB', 40], ['node-b', '40 GB / 500 GB', 92], ['node-c', '1.5 TB / 2 TB', 25],
  ]);
  assert.equal(lastRequest('longhorn').headers.authorization, `Basic ${Buffer.from('admin:pw').toString('base64')}`);
  const some = await run('longhorn', { include: ['node-c'], total: false, labels: false });
  assert.deepEqual(some.blocks, [{ key: 'node1', label: 'nodeNumber', vars: { n: 1 }, value: 25, unit: '%' }]);
});


test('unifi: health with an API key, a site by its description, a subsystem that is down', async () => {
  const out = await run('unifi', { key: 'k3y' });
  assert.deepEqual(values(out), {
    uptime: '13d 0h', wan: 'up', lan: 'up', lan_users: 25, lan_devices: 4, wlan: 'up', wlan_users: 20, wlan_devices: 3,
  });
  assert.equal(lastRequest('unifi').headers['x-api-key'], 'k3y');
  const office = await run('unifi', { key: 'k3y', site: 'Office' });
  assert.deepEqual(office.blocks.map((b) => [b.key, b.value, b.status ?? null]), [
    ['uptime', null, null], ['lan', 'down', 'error'], ['lan_users', 0, null], ['lan_devices', 1, null],
  ]);
  await assert.rejects(run('unifi', { key: 'k3y', site: 'Nowhere' }), /UniFi has no site "Nowhere"/);
  await assert.rejects(run('unifi', { key: '' }), /UniFi needs key, or username and password/);
});

test('unifi: login on UniFi OS (cookie and CSRF token) or a classic controller, again after a 401', async () => {
  const { default: unifi } = await import(path.join(WIDGETS, 'unifi', 'server.js'));
  const http = await import('node:http');
  const seen = [];
  let classic = false;
  let expire = false;
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      seen.push(`${req.method} ${req.url} ${req.headers.cookie ?? ''} ${req.headers['x-csrf-token'] ?? ''}`.trim());
      res.setHeader('content-type', 'application/json');
      if (req.url === '/api/auth/login' && !classic) {
        assert.deepEqual(JSON.parse(body), { username: 'ro', password: 'pw' });
        res.setHeader('set-cookie', ['TOKEN=t1; Path=/; HttpOnly']);
        res.setHeader('x-csrf-token', 'c1');
        return res.end('{}');
      }
      if (req.url === '/api/auth/login') { res.statusCode = 404; return res.end('{}'); }
      if (req.url === '/api/login') { res.setHeader('set-cookie', ['unifises=s1; Path=/', 'csrf_token=x; Path=/']); return res.end('{}'); }
      const ok = classic ? req.url === '/api/s/default/stat/health' && req.headers.cookie === 'unifises=s1; csrf_token=x'
        : req.url === '/proxy/network/api/s/default/stat/health' && req.headers.cookie === 'TOKEN=t1' && req.headers['x-csrf-token'] === 'c1';
      if (!ok || expire) { expire = false; res.statusCode = 401; return res.end('{}'); }
      res.end(JSON.stringify({ data: [{ subsystem: 'wan', status: 'ok', 'gw_system-stats': { uptime: '7200' } }] }));
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}`;
  const ctx = { options: { url, username: 'ro', password: 'pw' }, cache: new Map(), log: silent, signal: new AbortController().signal, fetch: (u, i) => fetch(u, i) };
  try {
    assert.deepEqual(values(await unifi.fetch(ctx)), { uptime: '2h 0m', wan: 'up' });
    await unifi.fetch(ctx);
    assert.equal(seen.filter((r) => r.startsWith('POST')).length, 1, 'the session is kept');
    expire = true;
    assert.deepEqual(values(await unifi.fetch(ctx)), { uptime: '2h 0m', wan: 'up' });
    assert.equal(seen.filter((r) => r.startsWith('POST')).length, 2, 'logged in again after a 401');

    classic = true;
    const old = { ...ctx, cache: new Map() };
    assert.deepEqual(values(await unifi.fetch(old)), { uptime: '2h 0m', wan: 'up' });
    assert.ok(seen.includes('POST /api/login'));
  } finally {
    srv.close();
  }
});


/** A widget's client.js in jsdom, as the dashboard mounts it. */
/** A widget's client.js in jsdom; `now` fixes the page's clock (an ISO date). */
async function renderClient(id, options = {}, now = null) {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<!doctype html><html lang="en"><body></body></html>', { runScripts: 'outside-only', url: 'http://localhost/' });
  if (now) {
    const fixed = new Date(now).getTime();
    const RealDate = dom.window.Date;
    dom.window.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [fixed])); } static now() { return fixed; } };
  }
  dom.window.eval(fs.readFileSync(path.join(WIDGETS, id, 'client.js'), 'utf8'));
  const el = dom.window.document.createElement(`dash-${id}`);
  Object.assign(el, { options, t: (k) => k });
  dom.window.document.body.append(el);
  return { el, window: dom.window };
}

test('openmeteo: the current weather, units, the cache in minutes, and errors', async () => {
  const { condition } = await import(path.join(WIDGETS, 'openmeteo', 'server.js'));
  const cache = new Map();
  const out = await run('openmeteo', { label: 'Amsterdam' });
  assert.deepEqual(out.blocks, [{ key: 'temperature', label: 'temperature', value: 10.3, unit: '°C' }, { key: 'condition', label: 'condition', value: 'drizzle' }]);
  assert.deepEqual(out.weather, { temperature: 10.3, unit: '°C', condition: 'drizzle', day: false, label: 'Amsterdam', format: null });
  assert.deepEqual([lastRequest('openmeteo').query.latitude, lastRequest('openmeteo').query.timezone, lastRequest('openmeteo').query.temperature_unit], ['52.37', 'auto', undefined]);
  await run('openmeteo', { units: 'imperial', timezone: 'Europe/Amsterdam' });
  assert.deepEqual([lastRequest('openmeteo').query.temperature_unit, lastRequest('openmeteo').query.timezone], ['fahrenheit', 'Europe/Amsterdam']);
  const { default: widget } = await import(path.join(WIDGETS, 'openmeteo', 'server.js'));
  const ctx = { options: { url: `${mock.url}/openmeteo`, ...REQUIRED.openmeteo }, params: {}, cache, log: silent, fetch: (u, i) => fetch(u, i) };
  const before = mock.requests.length;
  await widget.fetch(ctx);
  await widget.fetch(ctx);
  assert.equal(mock.requests.length - before, 1, 'within cache minutes no new call');
  await assert.rejects(run('openmeteo', { url: `${mock.url}/nothing` }), /Open-Meteo answered 404/);
  assert.deepEqual([0, 2, 3, 45, 51, 63, 81, 73, 95, 7].map(condition),
    ['clear', 'partlyCloudy', 'cloudy', 'fog', 'drizzle', 'rain', 'showers', 'snow', 'thunderstorm', 'unknown']);
});

test('openmeteo client: an icon, the temperature in the page language, label and condition', async () => {
  const { el, window } = await renderClient('openmeteo');
  window.document.documentElement.lang = 'nl';
  el.t = (k) => ({ drizzle: 'Motregen' })[k] ?? k;
  el.data = { weather: { temperature: 10.35, unit: '°C', condition: 'drizzle', day: false, label: 'Amsterdam', format: null } };
  const root = el.shadowRoot;
  assert.equal(root.querySelector('.temp').textContent, '10,4°C');
  assert.equal(root.querySelector('.cond').textContent, 'Amsterdam · Motregen');
  assert.ok(root.querySelector('svg'));
  assert.equal(root.querySelector('.w').getAttribute('aria-label'), 'Amsterdam, 10,4°C, Motregen');
});

test('weather widgets: no coordinates ask for the viewer\'s location, then use it', async () => {
  for (const id of ['openmeteo', 'openweathermap']) {
    assert.deepEqual(await run(id, { latitude: undefined, longitude: undefined }), { blocks: [], weather: null, needsLocation: true });
    const out = await run(id, { latitude: undefined, longitude: undefined }, { params: { latitude: '51.44', longitude: '5.47' } });
    assert.equal(typeof out.weather.temperature, 'number');
    const q = lastRequest(id).query;
    assert.deepEqual([q.latitude ?? q.lat, q.longitude ?? q.lon], ['51.44', '5.47']);
  }
  const secure = await renderClient('openmeteo');
  Object.defineProperty(secure.window, 'isSecureContext', { value: true });
  Object.defineProperty(secure.window.navigator, 'geolocation', { value: { getCurrentPosition: (ok) => ok({ coords: { latitude: 52.3676, longitude: 4.9041 } }) } });
  const events = [];
  secure.el.addEventListener('dash-widget-params', (e) => events.push(e.detail));
  secure.el.data = { blocks: [], weather: null, needsLocation: true };
  assert.deepEqual({ ...events[0] }, { latitude: '52.37', longitude: '4.90' }, 'rounded to two decimals'); // detail comes from the page's realm
  const plain = await renderClient('openweathermap');
  plain.el.t = (k) => ({ noLocation: 'Set latitude and longitude' })[k] ?? k;
  plain.el.data = { blocks: [], weather: null, needsLocation: true };
  assert.equal(plain.el.shadowRoot.querySelector('.cond').textContent, 'Set latitude and longitude', 'no HTTPS: an explanation');
});

test('openweathermap: the current weather with the key on the server, night icons and errors', async () => {
  const { condition } = await import(path.join(WIDGETS, 'openweathermap', 'server.js'));
  const out = await run('openweathermap', { apiKey: 'k3y', units: 'imperial', label: 'Amsterdam' });
  assert.deepEqual(out.weather, { temperature: 12.6, unit: '°F', condition: 'cloudy', day: false, label: 'Amsterdam', format: null });
  const q = lastRequest('openweathermap').query;
  assert.deepEqual([q.lat, q.lon, q.units, q.appid], ['52.37', '4.89', 'imperial', 'k3y']);
  await assert.rejects(run('openweathermap', { url: `${mock.url}/nothing` }), (err) => /OpenWeatherMap answered 404/.test(err.message) && !err.message.includes('test-key'));
  assert.deepEqual([211, 301, 501, 521, 601, 741, 800, 802, 804, 900].map(condition),
    ['thunderstorm', 'drizzle', 'rain', 'showers', 'snow', 'fog', 'clear', 'partlyCloudy', 'cloudy', 'unknown']);
});

test('stocks: Finnhub quotes for up to eight symbols, unknown ones, the cache and errors', async () => {
  const http = await import('node:http');
  const asked = [];
  let status = 200;
  const srv = http.createServer((req, res) => {
    const q = new URL(req.url, 'http://x').searchParams;
    asked.push([q.get('symbol'), q.get('token')]);
    res.statusCode = status;
    res.end(JSON.stringify({ AAPL: { c: 231.5, dp: 1.234 }, MSFT: { c: 410, dp: -0.5 }, NOPE: { c: 0, dp: null } }[q.get('symbol')] ?? { c: 10, dp: 0 }));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}`;
  const { default: stocks } = await import(path.join(WIDGETS, 'stocks', 'server.js'));
  const ctxFor = (options) => ({ options: { url, color: true, cache: 1, ...options }, params: {}, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) });
  try {
    const ctx = ctxFor({ watchlist: ['aapl', 'MSFT', 'nope', 'A', 'B', 'C', 'D', 'E', 'F'], apiKey: 'k3y' });
    const out = await stocks.fetch(ctx);
    assert.equal(asked.length, 8, 'at most eight symbols');
    assert.deepEqual(asked[0], ['AAPL', 'k3y']);
    assert.deepEqual(out.quotes.slice(0, 3), [
      { symbol: 'AAPL', price: 231.5, change: 1.23 }, { symbol: 'MSFT', price: 410, change: -0.5 }, { symbol: 'NOPE', price: null, change: null },
    ]);
    assert.deepEqual(out.blocks[0], { key: 'AAPL', label: 'symbol', vars: { symbol: 'AAPL' }, value: 231.5 });
    await stocks.fetch(ctx);
    assert.equal(asked.length, 8, 'cached');
    status = 403;
    await assert.rejects(stocks.fetch(ctxFor({ watchlist: ['AAPL'], apiKey: 'bad' })), /Finnhub answered 403/);
  } finally {
    srv.close();
  }
  assert.deepEqual(values(await run('stocks')), { AAPL: 231.5 }, 'the fixture through the mock');
});

test('stocks client: price, arrow and change; colour can be turned off', async () => {
  const { el } = await renderClient('stocks');
  el.t = (k) => ({ up: 'up', down: 'down', unknownSymbol: 'Unknown symbol' })[k] ?? k;
  el.data = { color: true, quotes: [{ symbol: 'AAPL', price: 231.5, change: 1.23 }, { symbol: 'MSFT', price: 410, change: -0.5 }, { symbol: 'NOPE', price: null, change: null }] };
  const items = [...el.shadowRoot.querySelectorAll('li')];
  assert.deepEqual(items.map((li) => li.textContent), ['AAPL231.50 ▲+1.23%', 'MSFT410.00 ▼-0.50%', 'NOPEUnknown symbol']);
  assert.equal(items[0].getAttribute('aria-label'), 'AAPL: 231.50, up 1.23%');
  assert.ok(items[1].querySelector('.chg').classList.contains('down'));
  assert.equal(el.shadowRoot.querySelector('ul').className, 'color');
  el.data = { color: false, quotes: [] };
  assert.equal(el.shadowRoot.querySelector('ul').className, '');
});

test('pihole: version 6 with a session from the password, version 5 with the token', async () => {
  const six = await run('pihole', { version: 6, key: 'pw' });
  assert.deepEqual(values(six), { queries: 48213, blocked: 7514, blocked_percent: '15.6%', gravity: 168437 });
  const login = mock.requests.filter((r) => r.widget === 'pihole' && r.route === 'POST /api/auth').at(-1);
  assert.deepEqual(JSON.parse(login.body), { password: 'pw' });
  assert.equal(lastRequest('pihole').headers['x-ftl-sid'], 'sid-123');
  const open = await run('pihole', { version: 6, key: undefined });
  assert.equal(open.blocks[0].value, 48213);
  assert.equal(lastRequest('pihole').headers['x-ftl-sid'], undefined, 'no password: no session');
  const five = await run('pihole', { key: 'token' });
  assert.deepEqual(values(five), { queries: 30500, blocked: 4200, blocked_percent: '13.8%', gravity: 120001 });
  assert.deepEqual(lastRequest('pihole').query, { summaryRaw: '', auth: 'token' });
  await assert.rejects(run('pihole', { version: 6, key: 'pw', url: `${mock.url}/nothing` }), /Pi-hole login answered 404/);
});

test('adguard: queries, blocked, filtered (Safe Browsing, Safe Search, parental) and latency', async () => {
  const out = await run('adguard', { username: 'admin', password: 'pw' });
  assert.deepEqual(values(out), { queries: 61234, blocked: 9876, filtered: 45, latency: '4.6ms' });
  assert.equal(lastRequest('adguard').headers.authorization, `Basic ${Buffer.from('admin:pw').toString('base64')}`);
});

test('plex: streams on every call, library counts per type, kept for a while', async () => {
  const { default: plex } = await import(path.join(WIDGETS, 'plex', 'server.js'));
  const ctx = { options: { url: `${mock.url}/plex`, key: 'tok' }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) };
  assert.deepEqual(values(await plex.fetch(ctx)), { streams: 2, albums: 527, movies: 876, tv: 143 });
  const req = mock.requests.filter((r) => r.widget === 'plex');
  assert.equal(req.at(-1).headers['x-plex-token'], 'tok');
  assert.equal(req.find((r) => r.route === 'GET /library/sections/1/all').headers['x-plex-container-size'], '0');
  const before = mock.requests.length;
  await plex.fetch(ctx);
  assert.deepEqual(mock.requests.slice(before).map((r) => r.route), ['GET /status/sessions'], 'libraries and counts are kept');
});

test('jellyfin and emby: a row per stream with position and progress, library counts with enableBlocks', async () => {
  for (const id of ['jellyfin', 'emby']) {
    const out = await run(id, { enableBlocks: true, enableUser: true, showEpisodeNumber: true });
    assert.deepEqual(out.rows, [
      { label: 'Silo: S01 · E01 - Pilot (anna)', icon: 'play', value: '3:54 / 58:00', progress: 6.7 },
      { label: 'Pink Floyd - The Dark Side of the Moon - Breathe (bob)', icon: 'pause', value: '1:00 / 2:43', progress: 36.8 },
    ], id);
    assert.deepEqual(values(out), { movies: 812, series: 143, episodes: 6021, songs: 9310, ...(id === 'jellyfin' ? { albums: 702 } : {}) });
    const plain = await run(id, {});
    assert.equal(plain.blocks, undefined, 'no blocks by default, as in homepage');
    assert.equal(plain.rows[0].label, 'Pilot - Silo');
  }
  assert.equal(lastRequest('jellyfin').headers.authorization, 'MediaBrowser Token="test-key"');
  assert.equal(lastRequest('emby').headers['x-emby-token'], 'test-key');
  const { default: jellyfin } = await import(path.join(WIDGETS, 'jellyfin', 'server.js'));
  const idle = await jellyfin.fetch({ options: { url: 'http://x', key: 'k' }, fetch: async () => new Response('[]') });
  assert.deepEqual(idle.rows, [{ label: 'noActiveStreams' }]);
});

test('homeassistant: people, lights and switches from one states call; custom states and templates', async () => {
  assert.deepEqual(values(await run('homeassistant')), { people_home: '2 / 3', lights_on: '2 / 4', switches_on: '1 / 2' });
  assert.equal(lastRequest('homeassistant').headers.authorization, 'Bearer test-key');
  const out = await run('homeassistant', { custom: [
    { state: 'sensor.total_power' },
    { state: 'weather.home', label: 'Wind', value: '{attributes.wind_speed} {attributes.wind_speed_unit}' },
    { template: "{{ states.switch | list | count }}", label: 'Switches' },
  ] });
  assert.deepEqual(out.blocks, [
    { key: 'custom1', label: 'Total power', value: '412 W' },
    { key: 'custom2', label: 'Wind', value: '14.4 km/h' },
    { key: 'custom3', label: 'Switches', value: '1' },
  ]);
  assert.deepEqual(JSON.parse(lastRequest('homeassistant').body), { template: '{{ states.switch | list | count }}' });
  // filter attributes: the counts, or each custom entry's value; the other form's are null
  assert.deepEqual(out.attributes, { peopleHome: null, lightsOn: null, switchesOn: null, custom1: '412 W', custom2: '14.4 km/h', custom3: '1', custom4: null });
  assert.deepEqual((await run('homeassistant')).attributes, { peopleHome: 2, lightsOn: 2, switchesOn: 1, custom1: null, custom2: null, custom3: null, custom4: null });
  await assert.rejects(run('homeassistant', { custom: [{ state: '../config' }] }), /entity id/);
});

test('proxmox: VMs and containers running of all (no templates), CPU and memory of the online nodes, or one node', async () => {
  assert.deepEqual(values(await run('proxmox', { username: 'api@pam!dash', password: 's3cret' })),
    { vms: '2 / 3', lxc: '2 / 2', 'resources.cpu': '33.3%', 'resources.mem': '33.3%' });
  assert.equal(lastRequest('proxmox').headers.authorization, 'PVEAPIToken=api@pam!dash=s3cret');
  assert.deepEqual(values(await run('proxmox', { node: 'pve-2' })), { vms: '1 / 1', lxc: '1 / 1', 'resources.cpu': '50%', 'resources.mem': '25%' });
  assert.deepEqual(values(await run('proxmox', { node: 'pve-3' })), { vms: '0 / 0', lxc: '0 / 0', 'resources.cpu': null, 'resources.mem': null }, 'an offline node');
});

test('proxmoxbackupserver: datastores, failed tasks of the last day (marked), CPU and memory', async () => {
  const out = await run('proxmoxbackupserver', { username: 'api@pbs!dash', password: 's3cret' });
  assert.deepEqual(values(out), { datastore_usage: '60%', failed_tasks_24h: 2, cpu_usage: '7.1%', memory_usage: '31.3%' });
  assert.equal(out.blocks[1].status, 'warn');
  const tasks = mock.requests.filter((r) => r.route === 'GET /api2/json/nodes/localhost/tasks').at(-1);
  assert.equal(tasks.headers.authorization, 'PBSAPIToken=api@pbs!dash:s3cret');
  assert.deepEqual([tasks.query.errors, tasks.query.limit], ['1', '100']);
  assert.ok(Math.abs(Number(tasks.query.since) - (Date.now() / 1000 - 86400)) < 60);
  assert.equal(values(await run('proxmoxbackupserver', { datastore: 'offsite' })).datastore_usage, '40%');
  await assert.rejects(run('proxmoxbackupserver', { datastore: 'nope' }), /no datastore "nope"/);
});

test('qbittorrent: leech, seed and rates; downloads per row with problems first; login with a cookie or an API key', async () => {
  const out = await run('qbittorrent', { key: 'qbt-key', enableLeechProgress: true, enableLeechSize: true, queueLimit: 3 });
  assert.deepEqual(values(out), { leech: 4, download: '2.5 MB/s', seed: 2, upload: '500 kB/s' });
  assert.equal(lastRequest('qbittorrent').headers.authorization, 'Bearer qbt-key');
  assert.deepEqual(out.rows, [
    { label: 'archlinux-2026.10.01-x86_64.iso', value: 'error', progress: 5, icon: 'play', status: 'error' },
    { label: 'ubuntu-24.04.3-desktop-amd64.iso', value: 'stalled', progress: 10, icon: 'play', status: 'warn' },
    { label: 'debian-13.1.0-amd64-DVD-1.iso', value: '12:30 · 3.9 GB', progress: 42, icon: 'play' },
    { label: 'moreItems', vars: { count: 1 } },
  ]);
  assert.equal((await run('qbittorrent')).rows, undefined, 'rows only with enableLeechProgress');

  const http = await import('node:http');
  const seen = [];
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      seen.push(`${req.method} ${req.url} ${req.headers.cookie ?? ''}`.trim());
      if (req.url === '/api/v2/auth/login') {
        if (body !== 'username=admin&password=p%26w') { res.end('Fails.'); return; }
        res.setHeader('set-cookie', 'SID=abc; HttpOnly; path=/');
        return res.end('Ok.');
      }
      if (req.headers.cookie !== 'SID=abc') { res.statusCode = 403; return res.end('Forbidden'); }
      res.end('[]');
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { default: qbt } = await import(path.join(WIDGETS, 'qbittorrent', 'server.js'));
  const ctx = (password) => ({ options: { url: `http://127.0.0.1:${srv.address().port}`, username: 'admin', password }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) });
  try {
    const c = ctx('p&w');
    assert.deepEqual(values(await qbt.fetch(c)), { leech: 0, download: '0 B/s', seed: 0, upload: '0 B/s' });
    await qbt.fetch(c);
    assert.deepEqual(seen, ['GET /api/v2/torrents/info', 'POST /api/v2/auth/login', 'GET /api/v2/torrents/info SID=abc', 'GET /api/v2/torrents/info SID=abc'], 'the session is kept');
    await assert.rejects(qbt.fetch(ctx('wrong')), /qBittorrent login answered 401/);
  } finally {
    srv.close();
  }
});

test('transmission: leech, seed and rates over RPC, with the session id after a 409', async () => {
  assert.deepEqual(values(await run('transmission', { username: 'u', password: 'p' })), { leech: 2, download: '2.8 MB/s', seed: 1, upload: '500 kB/s' });
  const req = lastRequest('transmission');
  assert.equal(req.headers.authorization, `Basic ${Buffer.from('u:p').toString('base64')}`);
  assert.equal(JSON.parse(req.body).method, 'torrent-get');
  const http = await import('node:http');
  const seen = [];
  const srv = http.createServer((q, res) => {
    seen.push(`${q.url} ${q.headers['x-transmission-session-id'] ?? '-'}`);
    if (q.headers['x-transmission-session-id'] !== 's1') { res.statusCode = 409; res.setHeader('x-transmission-session-id', 's1'); return res.end(); }
    res.end(JSON.stringify({ result: 'success', arguments: { torrents: [] } }));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { default: transmission } = await import(path.join(WIDGETS, 'transmission', 'server.js'));
  const ctx = { options: { url: `http://127.0.0.1:${srv.address().port}`, rpcUrl: '/custom' }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) };
  try {
    await transmission.fetch(ctx);
    await transmission.fetch(ctx);
    assert.deepEqual(seen, ['/custom/rpc -', '/custom/rpc s1', '/custom/rpc s1']);
  } finally {
    srv.close();
  }
});

test('deluge: leech, seed and rates over JSON-RPC, downloads per row, a login when Deluge asks', async () => {
  const out = await run('deluge', { password: 'pw', enableLeechProgress: true });
  assert.deepEqual(values(out), { leech: 3, download: '3 MB/s', seed: 1, upload: '500 kB/s' });
  assert.deepEqual(out.rows.map((r) => [r.label, r.value, r.progress, r.status ?? null]), [
    ['archlinux-2026.10.01-x86_64.iso', 'error', 5, 'error'],
    ['fedora-43-x86_64.iso', '1:02:05', 75.5, null],
    ['debian-13.1.0-amd64-DVD-1.iso', '12:30', 42, null],
  ]);
  const http = await import('node:http');
  const seen = [];
  const srv = http.createServer((q, res) => {
    let body = '';
    q.on('data', (c) => (body += c));
    q.on('end', () => {
      const { method, params } = JSON.parse(body);
      seen.push(`${method} ${q.headers.cookie ?? '-'}`);
      if (method === 'auth.login') {
        if (params[0] === 'pw') res.setHeader('set-cookie', '_session_id=xyz; Path=/json');
        return res.end(JSON.stringify({ id: 1, error: null, result: params[0] === 'pw' }));
      }
      if (q.headers.cookie !== '_session_id=xyz') return res.end(JSON.stringify({ id: 1, result: null, error: { message: 'Not authenticated', code: 1 } }));
      res.end(JSON.stringify({ id: 1, error: null, result: { torrents: {} } }));
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { default: deluge } = await import(path.join(WIDGETS, 'deluge', 'server.js'));
  const ctx = (password) => ({ options: { url: `http://127.0.0.1:${srv.address().port}`, password }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) });
  try {
    const c = ctx('pw');
    await deluge.fetch(c);
    await deluge.fetch(c);
    assert.deepEqual(seen, ['web.update_ui -', 'auth.login -', 'web.update_ui _session_id=xyz', 'web.update_ui _session_id=xyz']);
    await assert.rejects(deluge.fetch(ctx('wrong')), /Deluge login answered 401/);
  } finally {
    srv.close();
  }
});

test('nzbget: rate, remaining and downloaded in decimal units; paused is marked', async () => {
  assert.deepEqual(values(await run('nzbget', { username: 'nzbget', password: 'pw' })), { rate: '12.5 MB/s', remaining: '4 GB', downloaded: '949.1 GB' });
  const req = lastRequest('nzbget');
  assert.equal(req.headers.authorization, `Basic ${Buffer.from('nzbget:pw').toString('base64')}`);
  assert.equal(JSON.parse(req.body).method, 'status');
  const { default: nzbget } = await import(path.join(WIDGETS, 'nzbget', 'server.js'));
  const paused = await nzbget.fetch({ options: { url: 'http://x' }, fetch: async () => new Response(JSON.stringify({ result: { DownloadPaused: true } })) });
  assert.deepEqual(paused.blocks[0], { key: 'rate', label: 'rate', value: 'paused', status: 'warn' });
});

test('lidarr and readarr: wanted, queued (marked with warnings or errors), artists and books with a file', async () => {
  const lidarr = await run('lidarr');
  assert.deepEqual(values(lidarr), { wanted: 37, queued: 3, artists: 4 });
  assert.equal(lidarr.blocks[1].status, 'warn');
  assert.equal(lastRequest('lidarr').headers['x-api-key'], 'test-key');
  const readarr = await run('readarr');
  assert.deepEqual(values(readarr), { wanted: 12, queued: 0, books: 3 });
  assert.equal(readarr.blocks[1].status, undefined);
});

test('jackett: configured and errored indexers (marked), with the admin password\'s cookie', async () => {
  const out = await run('jackett');
  assert.deepEqual(values(out), { configured: 4, errored: 1 });
  assert.equal(out.blocks[1].status, 'warn');
  assert.deepEqual(lastRequest('jackett').query, { apikey: 'test-key', configured: 'true' });
  const http = await import('node:http');
  const seen = [];
  const srv = http.createServer((q, res) => {
    let body = '';
    q.on('data', (c) => (body += c));
    q.on('end', () => {
      seen.push(`${q.method} ${q.url.split('?')[0]} ${q.headers.cookie ?? '-'}`);
      if (q.url === '/UI/Dashboard') {
        res.statusCode = 302;
        res.setHeader('location', '/UI/Dashboard');
        if (body === 'password=pw') res.setHeader('set-cookie', 'Jackett=c1; path=/; HttpOnly');
        return res.end();
      }
      if (q.headers.cookie !== 'Jackett=c1') { res.statusCode = 302; res.setHeader('location', '/UI/Login'); return res.end(); }
      res.end('[]');
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { default: jackett } = await import(path.join(WIDGETS, 'jackett', 'server.js'));
  const ctx = (password) => ({ options: { url: `http://127.0.0.1:${srv.address().port}`, key: 'k', password }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) });
  try {
    const c = ctx('pw');
    assert.deepEqual(values(await jackett.fetch(c)), { configured: 0, errored: 0 });
    await jackett.fetch(c);
    assert.deepEqual(seen, ['POST /UI/Dashboard -', 'GET /api/v2.0/indexers Jackett=c1', 'GET /api/v2.0/indexers Jackett=c1']);
    await assert.rejects(jackett.fetch(ctx('wrong')), /Jackett login answered 401/);
  } finally {
    srv.close();
  }
});

test('ombi: pending (marked), approved and available requests', async () => {
  const out = await run('ombi');
  assert.deepEqual(values(out), { pending: 3, approved: 12, available: 140 });
  assert.equal(out.blocks[0].status, 'warn');
  assert.equal(lastRequest('ombi').headers['x-api-key'], 'test-key');
});

test('nextcloud: free space, active users, files and shares, with the NC-Token or a login', async () => {
  assert.deepEqual(values(await run('nextcloud')), { cpuload: 0.52, memoryusage: '62.5%', freespace: '412.3 GB', activeusers: 4, numfiles: 184233, numshares: 57 });
  const req = lastRequest('nextcloud');
  assert.equal(req.headers['nc-token'], 'test-key');
  assert.equal(req.headers['ocs-apirequest'], 'true');
  await run('nextcloud', { key: undefined, username: 'admin', password: 'app-pw' });
  assert.equal(lastRequest('nextcloud').headers.authorization, `Basic ${Buffer.from('admin:app-pw').toString('base64')}`);
});

test('immich: users, photos, videos and storage, on the version 1 or 2 path', async () => {
  assert.deepEqual(values(await run('immich', { version: 2 })), { users: 3, photos: 48210, videos: 1834, storage: '612.4 GB' });
  assert.equal(lastRequest('immich').headers['x-api-key'], 'test-key');
  assert.deepEqual(values(await run('immich')), { users: 1, photos: 30000, videos: 1000, storage: '400 GB' });
});

test('paperlessngx: inbox (marked) and total documents, with a token or a login', async () => {
  const out = await run('paperlessngx');
  assert.deepEqual(values(out), { inbox: 7, total: 2384 });
  assert.equal(out.blocks[0].status, 'warn');
  assert.equal(lastRequest('paperlessngx').headers.authorization, 'Token test-key');
  await run('paperlessngx', { key: undefined, username: 'u', password: 'p' });
  assert.equal(lastRequest('paperlessngx').headers.authorization, `Basic ${Buffer.from('u:p').toString('base64')}`);
});

test('uptimekuma: up, down (marked), average uptime and the incident of a status page', async () => {
  const out = await run('uptimekuma', { slug: 'home' });
  const v = values(out);
  assert.deepEqual([v.up, v.down, v.uptime], [2, 1, '96.5%']);
  assert.match(v.incident, /^\d+:\d\d:\d\d$/);
  assert.deepEqual(out.blocks.map((b) => b.status ?? null), [null, 'error', null, 'warn']);
  await assert.rejects(run('uptimekuma', { slug: '../x' }), /slug/);
});

test('traefik: routers, services and middlewares, marked with errors or warnings', async () => {
  const out = await run('traefik', { username: 'u', password: 'p' });
  assert.deepEqual(values(out), { routers: 24, services: 27, middleware: 8 });
  assert.deepEqual(out.blocks.map((b) => b.status ?? null), ['warn', 'error', null]);
  assert.equal(lastRequest('traefik').headers.authorization, `Basic ${Buffer.from('u:p').toString('base64')}`);
});

test('npm: enabled, disabled and total proxy hosts, with a token that is kept', async () => {
  const { default: npm } = await import(path.join(WIDGETS, 'npm', 'server.js'));
  const ctx = { options: { url: `${mock.url}/npm`, username: 'viewer@example.com', password: 'pw' }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) };
  assert.deepEqual(values(await npm.fetch(ctx)), { enabled: 3, disabled: 1, total: 4 });
  const login = mock.requests.filter((r) => r.widget === 'npm' && r.route === 'POST /api/tokens').at(-1);
  assert.deepEqual(JSON.parse(login.body), { identity: 'viewer@example.com', secret: 'pw' });
  assert.equal(lastRequest('npm').headers.authorization, 'Bearer eyJ.test.token');
  const before = mock.requests.length;
  await npm.fetch(ctx);
  assert.deepEqual(mock.requests.slice(before).map((r) => r.route), ['GET /api/nginx/proxy-hosts'], 'the token is kept');
});

test('truenas: load, uptime and alerts (marked) over REST, pools per row, unhealthy first', async () => {
  const out = await run('truenas', { enablePools: true });
  assert.deepEqual(values(out), { load: 0.47, uptime: '12d 4h', alerts: 1 });
  assert.equal(out.blocks[2].status, 'warn');
  assert.deepEqual(out.rows, [
    { label: 'fast', value: '300 GB / 1 TB', progress: 30, status: 'error' },
    { label: 'tank', value: '6 TB / 8 TB', progress: 75 },
  ]);
  assert.equal(lastRequest('truenas').headers.authorization, 'Bearer test-key');
});

test('truenas version 2: the same over the JSON-RPC WebSocket API, with an API key login', async () => {
  const srv = await truenasServer();
  const { default: truenas } = await import(path.join(WIDGETS, 'truenas', 'server.js'));
  const ctx = (key, more = {}) => ({ options: { url: srv.url, key, version: 2, ...more }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) });
  try {
    const rest = await run('truenas', { enablePools: true });
    const ws = await truenas.fetch(ctx('test-key', { enablePools: true }));
    assert.deepEqual(ws, rest, 'the same card as over REST');
    assert.deepEqual(srv.calls, ['auth.login_with_api_key', 'alert.list', 'system.info', 'pool.query', 'pool.dataset.query']);
    await assert.rejects(truenas.fetch(ctx('wrong')), /TrueNAS login answered 401/);
  } finally {
    srv.close();
  }
});


test('diskstation: uptime, free space on a volume (marked below 10%), CPU and memory; the login is POSTed', async () => {
  const out = await run('diskstation', { username: 'remote_stats', password: 'p&w' });
  assert.deepEqual(values(out), { uptime: '5d 3h', volumeAvailable: '600 GB', 'resources.cpu': '6%', 'resources.mem': '37%' });
  assert.equal(out.blocks[1].status, 'warn');
  const login = mock.requests.filter((r) => r.widget === 'diskstation' && r.route === 'POST /webapi/entry.cgi').at(-1);
  assert.equal(new URLSearchParams(login.body).get('passwd'), 'p&w', 'the password goes in the body, not the address');
  assert.equal(lastRequest('diskstation').query._sid, 'sid-abc');
  assert.equal(values(await run('diskstation', { volume: 'volume_2' })).volumeAvailable, '1.5 TB');
  await assert.rejects(run('diskstation', { volume: 'volume_9' }), /no volume "volume_9"/);
});

test('openmediavault: services, S.M.A.R.T. in the background and downloads, with a session cookie', async () => {
  const out = await run('openmediavault');
  assert.deepEqual(values(out), { running: 2, stopped: 2, total: 4 });
  assert.equal(out.blocks[1].status, 'warn');
  const http = await import('node:http');
  const seen = [];
  let polls = 0;
  const srv = http.createServer((q, res) => {
    let body = '';
    q.on('data', (c) => (body += c));
    q.on('end', () => {
      const { service, method, params } = JSON.parse(body);
      seen.push(`${service}.${method} ${q.headers.cookie ?? '-'}`);
      const send = (response) => res.end(JSON.stringify({ response, error: null }));
      if (service === 'session') {
        if (params.password !== 'pw') return send({ authenticated: false });
        res.setHeader('set-cookie', ['X-OPENMEDIAVAULT-SESSIONID=s1; path=/', 'X-OPENMEDIAVAULT-LOGIN=admin; path=/']);
        return send({ authenticated: true, username: 'admin' });
      }
      if (!q.headers.cookie?.includes('SESSIONID=s1')) { res.statusCode = 401; return res.end('{}'); }
      if (method === 'getListBg') return send('/tmp/bgfile');
      if (method === 'getOutput') {
        polls++;
        const disks = JSON.stringify({ total: 3, data: [{ monitor: true, overallstatus: 'GOOD' }, { monitor: true, overallstatus: 'BAD_SECTOR' }, { monitor: false, overallstatus: 'GOOD' }] });
        return send(polls === 1 ? { output: disks.slice(0, 20), pos: 20, running: true } : { output: disks.slice(20), pos: disks.length, running: false });
      }
      send([{ downloading: true }, { downloading: false }]);
    });
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { default: omv } = await import(path.join(WIDGETS, 'openmediavault', 'server.js'));
  const ctx = (method, password = 'pw') => ({ options: { url: `http://127.0.0.1:${srv.address().port}`, username: 'admin', password, method }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) });
  try {
    const smart = await omv.fetch(ctx('smart.getListBg'));
    assert.deepEqual(values(smart), { passed: 1, failed: 1 });
    assert.equal(smart.blocks[1].status, 'error');
    assert.equal(polls, 2, 'the background output is read until it is done');
    assert.ok(seen[1].includes('X-OPENMEDIAVAULT-SESSIONID=s1'));
    assert.deepEqual(values(await omv.fetch(ctx('downloader.getDownloadList'))), { downloading: 1, total: 2 });
    await assert.rejects(omv.fetch(ctx('services.getStatus', 'wrong')), /OpenMediaVault login answered 401/);
  } finally {
    srv.close();
  }
});

test('speedtest: version 1 in Mbit/s, version 2 in bytes/s with a token, as decimal bit rates', async () => {
  assert.deepEqual(values(await run('speedtest')), { download: '912 Mbit/s', upload: '41 Mbit/s', ping: '12.3ms' });
  assert.deepEqual(values(await run('speedtest', { version: 2, key: 'tok', bitratePrecision: 1 })), { download: '912.4 Mbit/s', upload: '41.2 Mbit/s', ping: '8.2ms' });
  assert.equal(lastRequest('speedtest').headers.authorization, 'Bearer tok');
});

test('gitea: notifications (marked), issues, pull requests and repositories from X-Total-Count', async () => {
  const out = await run('gitea');
  assert.deepEqual(values(out), { notifications: 3, issues: 17, pulls: 17, repositories: 42 });
  assert.equal(out.blocks[0].status, 'warn');
  assert.equal(lastRequest('gitea').headers.authorization, 'Bearer test-key');
});

test('grafana: stats and firing alerts (marked), from the legacy API or an alertmanager', async () => {
  const out = await run('grafana');
  assert.deepEqual(values(out), { dashboards: 23, datasources: 4, totalalerts: 11, alertstriggered: 2 });
  assert.equal(out.blocks[3].status, 'warn');
  assert.equal(lastRequest('grafana').headers.authorization, `Basic ${Buffer.from('admin:pw').toString('base64')}`);
  assert.equal(values(await run('grafana', { version: 2, alerts: 'alertmanager' })).alertstriggered, 1);
});

test('tailscale: address, last seen and key expiry as spans, expiry soon and updates marked', async () => {
  const out = await run('tailscale');
  assert.equal(values(out).address, '100.101.102.103');
  assert.equal(lastRequest('tailscale').headers.authorization, 'Bearer test-key');
  const { default: tailscale } = await import(path.join(WIDGETS, 'tailscale', 'server.js'));
  const now = Date.now();
  const device = { addresses: ['100.1.2.3'], lastSeen: new Date(now - (3 * 3600 + 5 * 60) * 1000).toISOString(), expires: new Date(now + 3 * 86400_000 + 3600_000 + 60_000).toISOString(), updateAvailable: true, authorized: true, clientVersion: '1.88.3-t1234', created: '2025-03-01T10:00:00Z' };
  const ask = (d) => tailscale.fetch({ options: { deviceid: 'n1CNTRL', key: 'k', url: 'http://x' }, fetch: async () => new Response(JSON.stringify(d)) });
  const v = values(await ask(device));
  assert.deepEqual([v.last_seen, v.expires, v.client_version, v.created, v.update_available], ['3h 5m', '3d 1h', '1.88.3', '2025-03-01', 'yes']);
  const marks = Object.fromEntries((await ask(device)).blocks.map((b) => [b.key, b.status ?? null]));
  assert.deepEqual([marks.expires, marks.update_available, marks.authorized], ['warn', 'warn', null]);
  assert.equal(values(await ask({ ...device, keyExpiryDisabled: true, connectedToControl: true })).expires, 'never');
  assert.equal(values(await ask({ ...device, connectedToControl: true })).last_seen, 'now');
  assert.deepEqual((await ask({ ...device, expires: '2020-01-01T00:00:00Z' })).blocks[2], { key: 'expires', label: 'expires', value: 'expired', status: 'error' });
  await assert.rejects(ask({}).then(() => tailscale.fetch({ options: { deviceid: '../x', key: 'k', url: 'http://x' } })), /deviceid/);
});

test('authentik: users, and logins, failed logins (marked) and authorizations of the last day', async () => {
  const v2 = await run('authentik', { version: 2 });
  assert.deepEqual(values(v2), { users: 12, loginsLast24H: 40, failedLoginsLast24H: 2, authorizationsLast24H: 17 });
  assert.equal(v2.blocks[2].status, 'warn');
  assert.equal(lastRequest('authentik').headers.authorization, 'Bearer test-key');
  const { default: authentik } = await import(path.join(WIDGETS, 'authentik', 'server.js'));
  const now = Date.now();
  const v1 = await authentik.fetch({ options: { url: 'http://x', key: 'k', version: 1 }, fetch: async (u) => {
    const s = String(u);
    if (s.includes('core/users')) return new Response(JSON.stringify({ pagination: { count: 3 } }));
    const failed = s.includes('login_failed');
    return new Response(JSON.stringify([{ x_cord: now - 2 * 86400_000, y_cord: 100 }, { x_cord: now - 3600_000, y_cord: failed ? 1 : 7 }]));
  } });
  assert.deepEqual(values(v1), { users: 3, loginsLast24H: 7, failedLoginsLast24H: 1 });
});

test('audiobookshelf: podcasts and books with their length, summed over libraries', async () => {
  assert.deepEqual(values(await run('audiobookshelf')), { podcasts: 18, podcastsDuration: '20d 23h', books: 214, booksDuration: '63d 12h' });
  assert.equal(lastRequest('audiobookshelf').headers.authorization, 'Bearer test-key');
});

test('navidrome: a row per listener; nothing playing; a wrong token', async () => {
  const out = await run('navidrome');
  assert.deepEqual(out.rows, [
    { label: 'Pink Floyd - Breathe (anna)', value: 'The Dark Side of the Moon', icon: 'play' },
    { label: 'Massive Attack - Teardrop (bob)', value: 'Mezzanine', icon: 'play' },
  ]);
  assert.deepEqual([lastRequest('navidrome').query.u, lastRequest('navidrome').query.t, lastRequest('navidrome').query.s], ['anna', 't0k', 's4lt']);
  const { default: navidrome } = await import(path.join(WIDGETS, 'navidrome', 'server.js'));
  const ask = (body) => navidrome.fetch({ options: { url: 'http://x', user: 'u', token: 't', salt: 's' }, fetch: async () => new Response(JSON.stringify({ 'subsonic-response': body })) });
  assert.deepEqual((await ask({ status: 'ok', nowPlaying: {} })).rows, [{ label: 'nothingPlaying' }]);
  await assert.rejects(ask({ status: 'failed', error: { code: 40 } }), /Navidrome answered 401/);
});

test('frigate: cameras, uptime and version; recent events per row; a login on the authenticated port', async () => {
  const out = await run('frigate', { enableRecentEvents: true });
  assert.deepEqual(values(out), { cameras: 3, uptime: '2d 5h', version: '0.16.2' });
  assert.deepEqual(out.rows.map((r) => r.label), ['front · person 86%', 'garden · cat 71%']);
  assert.match(out.rows[0].value, /^\d+d \d+h$/);
  const http = await import('node:http');
  const seen = [];
  const srv = http.createServer((q, res) => {
    seen.push(`${q.method} ${q.url} ${q.headers.cookie ?? '-'}`);
    if (q.url === '/api/login') { res.setHeader('set-cookie', 'frigate_token=jwt; Path=/; HttpOnly'); return res.end('{}'); }
    if (q.headers.cookie !== 'frigate_token=jwt') { res.statusCode = 401; return res.end('{}'); }
    res.end(JSON.stringify({ cameras: {}, service: { uptime: 60, version: '0.16.0' } }));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const { default: frigate } = await import(path.join(WIDGETS, 'frigate', 'server.js'));
  try {
    const ctx = { options: { url: `http://127.0.0.1:${srv.address().port}`, username: 'admin', password: 'pw' }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) };
    await frigate.fetch(ctx);
    await frigate.fetch(ctx);
    assert.deepEqual(seen, ['POST /api/login -', 'GET /api/stats frigate_token=jwt', 'GET /api/stats frigate_token=jwt']);
  } finally {
    srv.close();
  }
});

test('scrutiny: passed, failed (marked) and unknown disks, archived ones left out', async () => {
  const out = await run('scrutiny');
  assert.deepEqual(values(out), { passed: 2, failed: 1, unknown: 1 });
  assert.equal(out.blocks[1].status, 'error');
});

test('watchtower: scanned, updated and failed (marked) from the Prometheus metrics', async () => {
  const out = await run('watchtower');
  assert.deepEqual(values(out), { containers_scanned: 33, containers_updated: 2, containers_failed: 1 });
  assert.equal(out.blocks[2].status, 'error');
  assert.equal(lastRequest('watchtower').headers.authorization, 'Bearer test-key');
});

test('syncthing: devices connected, in sync (marked below 100%), errors (marked) and storage', async () => {
  const out = await run('syncthing');
  assert.deepEqual(values(out), { connected: '2 / 3', synced: '97.4%', errors: 1, storage: '412.3 GB' });
  assert.deepEqual(out.blocks.map((b) => b.status ?? null), [null, 'warn', 'error', null]);
  assert.equal(lastRequest('syncthing').headers['x-api-key'], 'test-key');
});

test('calendar: events of the month in view from the *arrs and an iCal feed, one integration failing', async () => {
  const integrations = [
    { type: 'sonarr', url: `${mock.url}/calendar`, key: 'k', color: 'teal', baseUrl: 'https://sonarr.lan' },
    { type: 'radarr', url: `${mock.url}/calendar`, key: 'k' },
    { type: 'lidarr', url: `${mock.url}/calendar`, key: 'k' },
    { type: 'ical', url: `${mock.url}/calendar/family.ics`, name: 'Family', params: { showName: true } },
    { type: 'readarr', url: `${mock.url}/nothing`, key: 'k', name: 'Books' },
  ];
  const out = await run('calendar', { integrations }, { params: { month: '2026-10' } });
  const ev = out.data?.calendar ?? out.calendar;
  assert.equal(ev.month, '2026-10');
  assert.deepEqual(ev.failed, ['Books']);
  const req = mock.requests.filter((r) => r.route === 'GET /api/v3/calendar' && r.query.includeSeries).at(-1);
  assert.deepEqual([req.query.start, req.query.end, req.query.includeSeries], ['2026-09-24T00:00:00.000Z', '2026-11-08T00:00:00.000Z', 'true']);
  assert.equal(req.headers['x-api-key'], 'k');
  const brief = ev.events.map((e) => [e.date.slice(0, 16), e.title, e.detail ?? e.detailKey ?? null, e.source]);
  assert.deepEqual(brief, [
    ['2026-10-05T15:00', 'Family: Swimming, kids', null, 'Family'],
    ['2026-10-12T15:00', 'Family: Swimming, kids', null, 'Family'],
    ['2026-10-19T15:00', 'Family: Swimming, kids', null, 'Family'],
    ['2026-10-26T00:00', 'Family: Holiday', null, 'Family'],
    ['2026-10-26T16:00', 'Family: Swimming, kids', null, 'Family'],
    ['2026-10-28T02:00', 'Silo', 'S02E01', 'sonarr'],
    ['2026-10-29T00:00', 'Pink Floyd - Animals', null, 'lidarr'],
    ['2026-10-30T00:00', 'Pilot', 'inCinemas', 'radarr'],
    ['2026-11-02T16:00', 'Family: Swimming, kids', null, 'Family'],
  ]);
  assert.equal(ev.events.find((e) => e.title === 'Silo').url, 'https://sonarr.lan/series/silo');
  assert.equal(out.attributes.failed, 1);
  assert.equal(typeof out.attributes.eventsToday, 'number');
  const { eventsOn, dayIn } = await import(path.join(WIDGETS, 'calendar', 'server.js'));
  assert.equal(eventsOn(ev.events, '2026-10-26', 'UTC'), 2, 'an all-day event and a timed one');
  assert.equal(eventsOn(ev.events, '2026-10-28', 'UTC'), 1);
  assert.equal(eventsOn(ev.events, '2026-10-27', 'America/New_York'), 1, 'Silo at 02:00 UTC is the evening before in New York');
  assert.equal(dayIn(new Date('2026-10-28T02:00:00Z'), 'Nowhere/Else'), '2026-10-28', 'an unknown zone counts as UTC');
  await assert.rejects(run('calendar', { integrations: [{ type: 'ical', url: `${mock.url}/nothing/x.ics`, name: 'X' }] }), /no integration answered \(X\)/);
});

test('calendar client: a month with dots, the chosen day\'s events, paging asks for the month; an agenda', async () => {
  const { el, window } = await renderClient('calendar', {}, '2026-10-20T12:00:00Z');
  const asked = [];
  el.addEventListener('dash-widget-params', (e) => asked.push({ ...e.detail }));
  window.document.documentElement.lang = 'en';
  el.t = (k) => ({ today: 'Today', noEvents: 'No events', inCinemas: 'In cinemas', notAnswered: 'Did not answer' })[k] ?? k;
  const events = [
    { date: '2026-10-05T15:00:00.000Z', title: 'Swimming', color: 'zinc' },
    { date: '2026-10-05T18:00:00.000Z', title: 'Silo', detail: 'S02E01', color: 'teal', url: 'https://sonarr.lan/series/silo', done: true },
    { date: '2026-10-30T00:00:00.000Z', allDay: true, title: 'Pilot', detailKey: 'inCinemas', color: 'amber' },
  ];
  el.data = { blocks: [], calendar: { view: 'monthly', month: '2026-10', firstDayInWeek: 'monday', maxEvents: 10, timezone: 'UTC', events, failed: ['Books'] } };
  const root = el.shadowRoot;
  assert.equal(root.querySelector('.title').textContent.toLowerCase(), 'october 2026');
  const days = [...root.querySelectorAll('.day')];
  assert.equal(days.length, 35, 'Monday 28 September to Sunday 1 November');
  assert.equal(days[0].querySelector('.n').textContent, '28');
  const fifth = days.find((d) => d.getAttribute('aria-label').startsWith('Monday, October 5'));
  assert.equal(fifth.querySelectorAll('.dot').length, 2);
  fifth.click();
  const items = [...root.querySelectorAll('li')];
  assert.deepEqual(items.map((li) => li.querySelector('.t').textContent), ['Swimming', 'Silo · S02E01']);
  assert.equal(items[1].querySelector('a').getAttribute('href'), 'https://sonarr.lan/series/silo');
  assert.ok(items[1].classList.contains('done'));
  assert.equal(root.querySelector('.failed').textContent, 'Did not answer: Books');
  assert.deepEqual(asked, [], 'the data is for the month in view');
  root.querySelector('[aria-label="nextMonth"]').click();
  assert.deepEqual(asked, [{ month: '2026-11' }]);
  assert.equal(root.querySelector('.title').textContent.toLowerCase(), 'november 2026');

  // data for another month than the viewer's (the server's clock): it asks for the viewer's, once
  const other = await renderClient('calendar', {}, '2026-11-01T00:30:00Z');
  const asks = [];
  other.el.addEventListener('dash-widget-params', (e) => asks.push({ ...e.detail }));
  const october = { blocks: [], calendar: { view: 'monthly', month: '2026-10', timezone: 'UTC', events, failed: [] } };
  other.el.data = october;
  other.el.data = structuredClone(october);
  assert.deepEqual(asks, [{ month: '2026-11' }]);
  assert.equal(other.el.shadowRoot.querySelector('.title').textContent.toLowerCase(), 'november 2026');

  const agenda = await renderClient('calendar');
  agenda.el.t = (k) => k;
  const soon = new Date(Date.now() + 2 * 86400_000).toISOString();
  agenda.el.data = { blocks: [], calendar: { view: 'agenda', maxEvents: 1, timezone: 'UTC', events: [{ date: soon, title: 'Dentist', color: 'rose' }, { date: soon, title: 'Later', color: 'rose' }], failed: [] } };
  assert.deepEqual([...agenda.el.shadowRoot.querySelectorAll('li .t')].map((n) => n.textContent), ['Dentist'], 'maxEvents');
  assert.equal(agenda.el.shadowRoot.querySelectorAll('h4').length, 1);
});

test('apcups: status, load, charge and runtime over apcupsd\'s NIS protocol; on battery marked', async () => {
  const ups = await nis(['APC      : 001,036,0866', 'STATUS   : ONLINE ', 'LOADPCT  : 23.0 Percent', 'BCHARGE  : 100.0 Percent', 'TIMELEFT : 45.3 Minutes', 'END APC  : 2026-10-24 08:00:00 +0200']);
  const onBattery = await nis(['STATUS   : ONBATT', 'LOADPCT  : 30.0 Percent', 'BCHARGE  : 64.0 Percent', 'TIMELEFT : 75.0 Minutes']);
  try {
    const out = await run('apcups', { url: ups.url });
    assert.deepEqual(values(out), { status: 'online', load: '23%', bcharge: '100%', timeleft: '45:18' });
    const bat = await run('apcups', { url: onBattery.url });
    assert.deepEqual([values(bat).status, values(bat).timeleft, bat.blocks[0].status], ['onBattery', '1:15:00', 'warn']);
    await assert.rejects(run('apcups', { url: 'tcp://127.0.0.1:1' }), /apcupsd answered nothing \(ECONNREFUSED\)/);
  } finally {
    ups.close();
    onBattery.close();
  }
});

test('arcane, argocd, atsumeru and autobrr: their counts, with what needs you marked', async () => {
  const arcane = await run('arcane');
  assert.deepEqual(values(arcane), { running: 21, stopped: 3, total: 24, images: 40, images_used: 24, images_unused: 16, image_updates: 5 });
  assert.equal(arcane.blocks.at(-1).status, 'warn');
  assert.equal(lastRequest('arcane').headers['x-api-key'], 'test-key');
  const argo = await run('argocd');
  assert.deepEqual(values(argo), { apps: 4, synced: 3, outOfSync: 1, healthy: 2, progressing: 1, degraded: 1, suspended: 0, missing: 0 });
  assert.deepEqual(argo.blocks.filter((b) => b.status).map((b) => [b.key, b.status]), [['outOfSync', 'warn'], ['degraded', 'error']]);
  assert.equal(lastRequest('argocd').headers.authorization, 'Bearer test-key');
  assert.deepEqual(values(await run('atsumeru', { username: 'u', password: 'p' })), { series: 312, archives: 1840, chapters: 9214, categories: 12 });
  assert.equal(lastRequest('atsumeru').headers.authorization, `Basic ${Buffer.from('u:p').toString('base64')}`);
  assert.deepEqual(values(await run('autobrr')), { approvedPushes: 180, rejectedPushes: 30, filters: 2, indexers: 3 });
  assert.equal(lastRequest('autobrr').headers['x-api-token'], 'test-key');
});

test('azuredevops: the last pipeline run (failed marked) and open pull requests, with a token', async () => {
  const out = await run('azuredevops');
  assert.deepEqual(values(out), { result: 'failed', totalPrs: 3, myPrs: 2, approved: 1 });
  assert.equal(out.blocks[0].status, 'error');
  const build = mock.requests.filter((r) => r.route.endsWith('/build/builds')).at(-1);
  assert.deepEqual([build.query.definitions, build.query.$top], ['12', '1']);
  assert.equal(build.headers.authorization, `Basic ${Buffer.from(':test-key').toString('base64')}`);
  await assert.rejects(run('azuredevops', { definitionId: undefined, repositoryId: undefined }), /needs definitionId/);
});

test('backrest and booklore: backups (failures marked) and a reading list behind a login', async () => {
  const backrest = await run('backrest', { username: 'admin', password: 'pw' });
  assert.deepEqual(values(backrest), { num_plans: 3, num_success_latest: 2, num_failure_latest: 1, num_success_30: 62, num_failure_30: 2, bytes_added_30: '5 GB' });
  assert.deepEqual(backrest.blocks.filter((b) => b.status).map((b) => b.key), ['num_failure_latest', 'num_failure_30']);
  assert.equal(lastRequest('backrest').headers.authorization, `Basic ${Buffer.from('admin:pw').toString('base64')}`);
  assert.deepEqual(values(await run('booklore', { username: 'anna', password: 'pw' })), { libraries: 2, books: 4, reading: 1, finished: 2 });
  assert.equal(lastRequest('booklore').headers.authorization, 'Bearer jwt');
});

test('beszel: systems up of all (marked when not all), or one system in detail', async () => {
  const all = await run('beszel');
  assert.deepEqual(values(all), { systems: 3, up: '2 / 3' });
  assert.equal(all.blocks[1].status, 'warn');
  assert.equal(lastRequest('beszel').headers.authorization, 'pb-token');
  const one = await run('beszel', { systemId: 'nas' });
  const v = values(one);
  assert.deepEqual([v.name, v.status, v.cpu, v.memory, v.disk, v.network], ['nas', 'up', '12.3%', '61.2%', '70.1%', '1.5 MB/s']);
  assert.match(v.updated, /^\d+d \d+h$|^\d+h \d+m$|^\d+m$/);
  assert.equal((await run('beszel', { systemId: 'c3' })).blocks[1].status, 'error');
  await assert.rejects(run('beszel', { systemId: 'nope' }), /no system "nope"/);
  await run('beszel', { version: 1 });
  assert.ok(mock.requests.some((r) => r.route === 'POST /api/admins/auth-with-password'));
});

test('bookorbit, caddy and calibreweb', async () => {
  assert.deepEqual(values(await run('bookorbit', { username: 'anna', password: 'pw' })), { books: 812, authors: 301, series: 77, storage: '41.2 GB', reading: 3, finished: 128 });
  assert.equal(lastRequest('bookorbit').headers.authorization, 'Bearer access-1');
  const login = mock.requests.filter((r) => r.route === 'POST /api/v1/auth/login').at(-1);
  assert.equal(JSON.parse(login.body).clientKind, 'native');
  const caddy = await run('caddy');
  assert.deepEqual(values(caddy), { upstreams: 3, requests: 5, requests_failed: 2 });
  assert.equal(caddy.blocks[2].status, 'warn');
  assert.deepEqual(values(await run('calibreweb', { username: 'u', password: 'p' })), { books: 1543, authors: 702, categories: 48, series: 211 });
  assert.equal(lastRequest('calibreweb').headers.authorization, `Basic ${Buffer.from('u:p').toString('base64')}`);
});

test('changedetectionio, channelsdvrserver, checkmk, cloudflared, coinmarketcap and crowdsec', async () => {
  const cd = await run('changedetectionio');
  assert.deepEqual(values(cd), { diffsDetected: 1, totalObserved: 3 });
  assert.equal(cd.blocks[0].status, 'warn');
  assert.deepEqual(values(await run('channelsdvrserver')), { shows: 84, recordings: 1203, scheduled: 7, passes: 22 });
  const cmk = await run('checkmk');
  assert.deepEqual(values(cmk), { serviceErrors: 2, hostErrors: 0 });
  assert.equal(lastRequest('checkmk').headers.authorization, 'Bearer automation s3cret');
  assert.equal(lastRequest('checkmk').query.query, '{"op": "!=", "left": "state", "right": "0"}');
  const cf = await run('cloudflared');
  assert.deepEqual(values(cf), { status: 'degraded', origin_ip: '203.0.113.7' });
  assert.equal(cf.blocks[0].status, 'warn');
  const cmc = await run('coinmarketcap', { defaultinterval: '24h' });
  assert.deepEqual(cmc.rows, [{ label: 'Bitcoin', value: '61234.57 EUR ▼ -1.5%' }, { label: 'Ethereum', value: '2345.68 EUR ▲ +2%' }]);
  assert.deepEqual([lastRequest('coinmarketcap').query.symbol, lastRequest('coinmarketcap').headers['x-cmc_pro_api_key']], ['BTC,ETH', 'test-key']);
  assert.equal((await run('coinmarketcap', { defaultinterval: '30d' })).rows.length, 1, 'no change: left out, as in homepage');
  assert.deepEqual((await run('coinmarketcap', { symbols: [] })).rows, [{ label: 'noSymbols' }]);
  const cs = await run('crowdsec');
  assert.deepEqual(values(cs), { alerts: 3, bans: 3 });
  assert.equal(lastRequest('crowdsec').headers.authorization, 'Bearer jwt-1');
});

test('develancacheui, dispatcharr, dockhand, downloadstation, esphome and evcc', async () => {
  assert.deepEqual(values(await run('develancacheui')), { cachehitbytes: '4.8 TB', cachemissbytes: '612.4 GB' });
  const disp = await run('dispatcharr', { enableActiveStreams: true });
  assert.deepEqual(values(disp), { channels: 3, streams: 2 });
  assert.deepEqual(disp.rows, [{ label: 'NPO 1 HD', value: '2 · 6.4 Mbit/s', icon: 'play' }, { label: 'Sport 2', value: '1 · 8.2 Mbit/s', icon: 'play' }]);
  assert.equal(lastRequest('dispatcharr').headers.authorization, 'Bearer jwt-a');
  const dock = await run('dockhand', { key: 'k' });
  assert.deepEqual(values(dock), { running: 25, stopped: 2, paused: 0, pending_updates: 3, total: 27, cpu: '8%', memory: '40%', images: 36, volumes: 16, stacks: '6 / 7', events_today: 44 });
  assert.deepEqual(values(await run('dockhand', { key: 'k', environment: 'PI' })).running, 5);
  await assert.rejects(run('dockhand', { key: 'k', environment: 'nope' }), /no environment "nope"/);
  assert.deepEqual(values(await run('downloadstation')), { leech: 2, download: '3 MB/s', seed: 1, upload: '150 kB/s' });
  assert.equal(lastRequest('downloadstation').query._sid, 'sid-ds');
  const esp = await run('esphome', { username: 'u', password: 'p' });
  assert.deepEqual(values(esp), { online: 2, offline: 1, offline_alt: 2, unknown: 1, total: 4 });
  assert.deepEqual(values(await run('evcc')), { pv_power: '5.2kW', grid_power: '-1.2kW', home_power: '0.6kW', charge_power: '3.4kW' });
});

test('duplicati, feed, filebrowser, fileflows, firefly, flood, freshrss and fritzbox', async () => {
  const dup = await run('duplicati');
  const d = values(dup);
  assert.deepEqual({ ...d, lastBackup: undefined, nextRun: undefined }, { jobs: 2, stored: '425 GB', lastBackup: undefined, nextRun: undefined, running: 0, warnings: 0, errors: 1 });
  assert.match(d.lastBackup, /^\d+d \d+h$/);
  assert.match(d.nextRun, /^\d+d \d+h$/);
  assert.equal(dup.blocks.find((b) => b.key === 'errors').status, 'error');
  assert.equal(lastRequest('duplicati').headers.authorization, 'Bearer dup-token');
  assert.equal(JSON.parse(mock.requests.find((r) => r.widget === 'duplicati' && r.route.startsWith('POST')).body).Password, 'pw');

  const { parseFeed, recentItems } = await import(path.join(WIDGETS, 'feed', 'server.js'));
  const feed = await run('feed', { maxItems: 3 });
  assert.equal(feed.attributes.items, (await run('feed', { maxItems: 50 })).feed.items.length, 'items counts the whole feed, not maxItems');
  assert.equal(recentItems(feed.feed.items, Date.parse('2026-03-02T12:00:00Z')), 2, 'the last 24 hours; no date does not count');
  assert.equal(recentItems(feed.feed.items, Date.parse('2026-03-03T10:00:00Z')), 0);
  assert.deepEqual(feed.feed, { layout: 'list', items: [
    { title: 'Proxmox 9.1 & more', link: 'https://news.example.com/proxmox', date: '2026-03-02T09:00:00.000Z', image: 'https://img.example.com/pve.jpg' },
    { title: 'Unraid 7 released', link: `${mock.url}/unraid`, date: '2026-03-01T18:30:00.000Z', image: 'https://img.example.com/unraid.png' },
    { title: 'Self-hosting tips', link: 'https://news.example.com/tips', date: null, image: 'https://img.example.com/tips.webp' }] });
  assert.equal((await run('feed', { maxItems: 10 })).feed.items[3].link, null, 'a javascript: link is dropped');
  assert.ok((await run('feed', { images: false, layout: 'grid' })).feed.items.every((i) => i.image === null));
  const atom = parseFeed('<feed xmlns="http://www.w3.org/2005/Atom"><entry><title type="html">A &lt;i&gt;b&lt;/i&gt;</title><link rel="alternate" href="https://example.com/a"/><link rel="enclosure" type="image/jpeg" href="https://example.com/a.jpg"/><updated>2026-03-01T10:00:00Z</updated></entry></feed>', 'https://example.com/');
  assert.deepEqual(atom, [{ title: 'A <i>b</i>', link: 'https://example.com/a', date: '2026-03-01T10:00:00.000Z', image: 'https://example.com/a.jpg' }]);
  const { el } = await renderClient('feed');
  el.data = feed;
  const links = [...el.shadowRoot.querySelectorAll('a')];
  assert.deepEqual(links.map((a) => [a.href, a.target, a.querySelector('.t').textContent]), [
    ['https://news.example.com/proxmox', '_blank', 'Proxmox 9.1 & more'], [`${mock.url}/unraid`, '_blank', 'Unraid 7 released'], ['https://news.example.com/tips', '_blank', 'Self-hosting tips']]);
  assert.equal(el.shadowRoot.querySelectorAll('img.thumb').length, 3);
  el.data = { ...feed, feed: { ...feed.feed, layout: 'grid' } };
  assert.equal(el.shadowRoot.querySelectorAll('.grid .tile img').length, 3);
  el.data = { blocks: [], feed: { layout: 'list', items: [] } };
  assert.equal(el.shadowRoot.querySelector('.empty').textContent, 'noItems');

  assert.deepEqual(values(await run('filebrowser')), { available: '2.8 TB', used: '1.2 TB', total: '4 TB' });
  assert.equal(lastRequest('filebrowser').headers['x-auth'], 'jwt-fb');
  await run('filebrowser', { authHeader: 'X-Forwarded-User' });
  assert.equal(mock.requests.filter((r) => r.widget === 'filebrowser' && r.route === 'POST /api/login').at(-1).headers['x-forwarded-user'], 'dashboard');

  assert.deepEqual(values(await run('fileflows')), { queue: 12, processing: 1, processed: 340, time: '1:23:45' });
  const ff2 = await run('fileflows', { version: 2, key: 'tok' });
  assert.deepEqual(values(ff2), { queue: 12, processing: 1, processed: 340, failed: 2 });
  assert.equal(ff2.blocks[3].status, 'warn');
  assert.equal(lastRequest('fileflows').headers['x-webhook-token'], 'tok');

  assert.deepEqual(values(await run('firefly')), { networth: '€24,150.50', budget: '€312 / €1500' });
  assert.equal(lastRequest('firefly').headers.authorization, 'Bearer test-key');
  assert.match(lastRequest('firefly').query.start, /^\d{4}-\d\d-01$/);

  assert.deepEqual(values(await run('flood')), { leech: 2, download: '3 MB/s', seed: 1, upload: '150 kB/s' });

  assert.deepEqual(values(await run('freshrss')), { unread: 57, subscriptions: 3 });
  assert.equal(lastRequest('freshrss').headers.authorization, 'GoogleLogin auth=anna/abc123');

  const fritz = await run('fritzbox');
  assert.deepEqual(values(fritz), { connectionStatus: 'connected', uptime: '4d 3h', maxDown: '31.3 MB/s', maxUp: '5 MB/s', down: '1.3 MB/s', up: '12.5 kB/s', received: '1.5 TB', sent: '98 GB',
    externalIPAddress: '203.0.113.24', externalIPv6Address: '2001:db8:1::1', externalIPv6Prefix: null });
  assert.equal(lastRequest('fritzbox').headers.soapaction.split('#')[0], 'urn:schemas-upnp-org:service:WANIPConnection:1');
});

test('gamedig, gatus, ghostfolio, gitlab, gluetun, gotify, hdhomerun and headscale', async () => {
  const game = await run('gamedig');
  const g = values(game);
  assert.deepEqual({ ...g, ping: undefined }, { status: 'online', name: 'Homelab CS', map: 'de_dust2', currentPlayers: '12 / 24', players: 12, maxPlayers: 24, bots: 2, ping: undefined });
  assert.match(g.ping, /^\d+ms$/);
  assert.deepEqual([...a2s.asked.at(-1).subarray(25)], [1, 2, 3, 4], 'the challenge is sent back');
  const off = await run('gamedig', { url: 'udp://127.0.0.1:9', timeout: 0.2 });
  assert.deepEqual(off.blocks[0], { key: 'status', label: 'status', value: 'offline', status: 'error' });
  await assert.rejects(run('gamedig', { url: 'udp://127.0.0.1' }), /udp:\/\/host:port/);

  const gatus = await run('gatus');
  assert.deepEqual(values(gatus), { up: 2, down: 1, uptime: '77.8%' });
  assert.equal(gatus.blocks[1].status, 'warn');

  const gf = await run('ghostfolio');
  assert.deepEqual(values(gf), { gross_percent_today: '-0.42%', gross_percent_1y: '-0.42%', gross_percent_max: '-0.42%', net_worth: '48210.46 EUR' });
  assert.equal(gf.blocks[0].status, 'warn');
  assert.ok(mock.requests.some((r) => r.widget === 'ghostfolio' && r.query.range === '1y'));
  assert.equal(lastRequest('ghostfolio').headers.authorization, 'Bearer test-key');

  assert.deepEqual(values(await run('gitlab')), { groups: 3, issues: 9, merges: 2, projects: 17 });
  assert.equal(lastRequest('gitlab').headers['private-token'], 'test-key');
  await assert.rejects(run('gitlab', { user_id: '../x' }), /user_id/);

  assert.deepEqual(values(await run('gluetun', { version: 2 })), { public_ip: '198.51.100.77', region: 'North Holland', country: 'Netherlands', port_forwarded: 51413 });
  assert.equal(values(await run('gluetun')).port_forwarded, null, 'the old route is not allowed: no port');
  assert.equal(lastRequest('gluetun').headers['x-api-key'], 'test-key');

  assert.deepEqual(values(await run('gotify')), { apps: 2, clients: 3, messages: 4 });
  assert.equal(lastRequest('gotify').headers['x-gotify-key'], 'test-key');

  const hd = await run('hdhomerun');
  assert.deepEqual(values(hd), { channels: 3, hd: 2, tunerCount: '1 / 2', channelNumber: '1', channelNetwork: 'NPO 1', signalStrength: '82%', signalQuality: '45%', symbolQuality: '100%', clientIP: '192.0.2.20', networkRate: '8.5Mbit/s' });
  assert.equal(hd.blocks.find((b) => b.key === 'signalQuality').status, 'warn');
  assert.equal(values(await run('hdhomerun', { tuner: 1 })).channelNetwork, null);

  const hs = await run('headscale');
  const h = values(hs);
  assert.deepEqual([h.name, h.address, h.status], ['nas-lan', '100.64.0.3', 'offline']);
  assert.match(h.last_seen, /^\d+d \d+h$/);
  assert.equal(hs.blocks[3].status, 'warn');
  await assert.rejects(run('headscale', { nodeId: '3/../x' }), /nodeId/);
});

test('healthchecks, homebox, homebridge, jdownloader, jellystat, karakeep and kavita', async () => {
  const hc = await run('healthchecks');
  assert.deepEqual(values(hc), { up: 2, down: 1 });
  assert.equal(hc.blocks[1].status, 'error');
  assert.equal(lastRequest('healthchecks').headers['x-api-key'], 'test-key');
  const one = await run('healthchecks', { uuid: '5f1c3a2e-8b7d-4e6f-9a0b-1c2d3e4f5a6b' });
  assert.deepEqual([one.blocks[0].value, one.blocks[0].status], ['grace', 'warn']);
  assert.match(one.blocks[1].value, /^\d+d \d+h$/);
  await assert.rejects(run('healthchecks', { uuid: '../../x' }), /uuid/);

  assert.deepEqual(values(await run('homebox')), { items: 214, totalWithWarranty: 31, locations: 12, labels: 18, users: 2, totalValue: '18350.50 EUR' });
  assert.equal(lastRequest('homebox').headers.authorization, 'Bearer hb-token');

  const hb = await run('homebridge');
  assert.deepEqual(values(hb), { status: 'up', updates: 'updateAvailable', child_bridges: '1 / 2' });
  assert.deepEqual(hb.blocks.map((b) => b.status ?? null), [null, 'warn', 'warn']);
  assert.equal(lastRequest('homebridge').headers.authorization, 'Bearer hb-jwt');

  const ctx = { options: { ...REQUIRED.jdownloader }, cache: new Map(), log: silent, fetch: (u, i) => fetch(u, i) };
  const { default: jd } = await import(path.join(WIDGETS, 'jdownloader', 'server.js'));
  assert.deepEqual(values(await jd.fetch(ctx)), { downloadCount: 2, downloadTotalBytes: '5 GB', downloadBytesRemaining: '3 GB', downloadSpeed: '2.5 MB/s' });
  const before = myjd.calls.length;
  await jd.fetch(ctx);
  assert.deepEqual(myjd.calls.slice(before), ['/t_a1b2c3d4_dev1/downloadsV2/queryPackages'], 'the session is kept');
  ctx.cache.set('session', { ...ctx.cache.get('session'), device: 'gone' });
  assert.equal(values(await jd.fetch(ctx)).downloadCount, 2, 'a failing session is made anew');
  await assert.rejects(run('jdownloader', { client: 'other' }), /no JDownloader named "other".*JDownloader@nas/);
  await assert.rejects(run('jdownloader', { password: 'wrong' }), (err) => /My.JDownloader login answered 403/.test(err.message) && !err.message.includes('wrong'));

  assert.deepEqual(values(await run('jellystat', { days: 7 })), { songs: 312, movies: 14, episodes: 58, other: 2 });
  assert.deepEqual([lastRequest('jellystat').query.days, lastRequest('jellystat').headers['x-api-token']], ['7', 'test-key']);

  assert.deepEqual(values(await run('karakeep')), { bookmarks: 412, favorites: 37, archived: 120, highlights: 58, lists: 9, tags: 64 });

  assert.deepEqual(values(await run('kavita')), { seriesCount: 186, totalFiles: 2421 });
  assert.deepEqual(JSON.parse(mock.requests.filter((r) => r.widget === 'kavita' && r.route.startsWith('POST')).at(-1).body), { username: '', password: '', apiKey: 'test-key' });
  assert.equal(lastRequest('kavita').headers.authorization, 'Bearer kv-jwt');
});

test('komga, komodo, kopia, linkwarden, lubelogger, mailcow, maintainerr and mastodon', async () => {
  assert.deepEqual(values(await run('komga', { username: 'anna', password: 'pw' })), { libraries: 2, series: 128, books: 2210 });
  assert.equal(lastRequest('komga').headers.authorization, `Basic ${Buffer.from('anna:pw').toString('base64')}`);
  await run('komga', { version: 2 });
  assert.deepEqual([lastRequest('komga').route, lastRequest('komga').headers['x-api-key']], ['POST /api/v1/books/list', 'test-key']);

  const containers = await run('komodo');
  assert.deepEqual(values(containers), { total: 12, running: 10, stopped: 1, unhealthy: 1, unknown: 0 });
  assert.deepEqual([lastRequest('komodo').headers['x-api-key'], lastRequest('komodo').headers['x-api-secret'], JSON.parse(lastRequest('komodo').body).type], ['test-key', 's3cret', 'GetDockerContainersSummary']);
  assert.deepEqual(values(await run('komodo', { showStacks: true })), { total: 12, running: 10, down: 2, unhealthy: 1, unknown: 0 });
  const summary = await run('komodo', { showSummary: true, showStacks: true });
  assert.deepEqual(values(summary), { servers: '2 / 12', stacks: '10 / 12', containers: '10 / 12' });
  assert.ok(summary.blocks.every((b) => b.status === 'warn'));

  const kp = values(await run('kopia', { username: 'kopia', password: 'pw' }));
  assert.deepEqual({ ...kp, lastrun: undefined, nextrun: undefined }, { status: 'idle', size: '412.3 GB', lastrun: undefined, nextrun: undefined });
  assert.match(kp.lastrun, /^\d+d \d+h$/);
  assert.match(kp.nextrun, /^\d+d \d+h$/);
  const docs = await run('kopia', { snapshotPath: '/docs' });
  assert.deepEqual(values(docs), { status: 'uploading', size: '12.7 GB', lastrun: 'failed', nextrun: null });
  assert.equal(docs.blocks[2].status, 'error');
  await assert.rejects(run('kopia', { snapshotHost: 'pc' }), /no Kopia source for pc/);

  assert.deepEqual(values(await run('linkwarden')), { links: 31, collections: 2, tags: 3 });

  const lube = await run('lubelogger');
  assert.deepEqual(values(lube), { vehicles: 2, serviceRecords: 20, reminders: 4 });
  assert.equal(lube.blocks[2].status, 'warn');
  assert.deepEqual(values(await run('lubelogger', { vehicleID: 1 })), { vehicle: '2019 Volvo V60', serviceRecords: 14, reminders: 3, nextReminder: '2026-04-01' });
  assert.equal(values(await run('lubelogger', { vehicleID: 2 })).nextReminder, 'none');
  await assert.rejects(run('lubelogger', { vehicleID: 9 }), /no LubeLogger vehicle 9/);

  assert.deepEqual(values(await run('mailcow')), { domains: 2, mailboxes: 7, mails: 18640, storage: '4.3 GB' });
  assert.equal(lastRequest('mailcow').headers['x-api-key'], 'test-key');

  assert.deepEqual(values(await run('maintainerr')), { itemsHandled: 312, episodesHandled: 240, moviesHandled: 58, showsHandled: 9, seasonsHandled: 14, reclaimable: '1.8 TB', movieReclaimable: '610 GB', showReclaimable: '1.2 TB', totalCapacity: '24 TB' });

  assert.deepEqual(values(await run('mastodon')), { user_count: 1204, status_count: 98231, domain_count: 15002 });
});

test('mealie, medusa, mikrotik, minecraft, miniflux, mjpeg, moonraker and mylar', async () => {
  assert.deepEqual(values(await run('mealie')), { recipes: 182, users: 3, categories: 14, tags: 41 });
  await run('mealie', { version: 2 });
  assert.deepEqual([lastRequest('mealie').route, lastRequest('mealie').headers.authorization], ['GET /api/households/statistics', 'Bearer test-key']);

  assert.deepEqual(values(await run('medusa')), { wanted: 7, queued: 3, series: 42 });

  const mt = await run('mikrotik');
  assert.deepEqual(values(mt), { uptime: '9d 3h', cpuLoad: '7%', memoryUsed: '25%', numberOfLeases: 3 });
  assert.equal(lastRequest('mikrotik').headers.authorization, `Basic ${Buffer.from('dashboard:pw').toString('base64')}`);

  const up = await run('minecraft');
  assert.deepEqual(values(up), { status: 'up', players: '3 / 20', version: 'Paper 1.21.4' });
  assert.equal(mc.handshakes.at(-1).toString('latin1').includes('127.0.0.1'), true, 'the handshake names the host');
  const down = await run('minecraft', { url: 'minecraft://127.0.0.1:9', timeout: 0.3 });
  assert.deepEqual(down.blocks[0], { key: 'status', label: 'status', value: 'down', status: 'error' });

  assert.deepEqual(values(await run('miniflux')), { unread: 18, read: 154 });
  assert.equal(lastRequest('miniflux').headers['x-auth-token'], 'test-key');

  const { el } = await renderClient('mjpeg', { stream: 'http://printer.lan/webcam/?action=stream', fit: 'cover' });
  const imgs = [...el.shadowRoot.querySelectorAll('img')];
  assert.deepEqual(imgs.map((i) => [i.src, i.style.objectFit]), [['http://printer.lan/webcam/?action=stream', ''], ['http://printer.lan/webcam/?action=stream', 'cover']]);
  imgs[1].dispatchEvent(new el.ownerDocument.defaultView.Event('error'));
  assert.equal(el.shadowRoot.querySelector('.failed').textContent, 'noStream');
  assert.equal((await renderClient('mjpeg', { stream: 'javascript:alert(1)' })).el.shadowRoot.querySelector('img'), null);

  const moon = await run('moonraker', { key: undefined });
  assert.deepEqual(values(moon), { printer_state: 'ready', layers: '42 / 180', print_progress: '23%', print_status: 'printing' });
  assert.equal(lastRequest('moonraker').headers['x-api-key'], undefined);
  assert.ok('display_status' in lastRequest('moonraker').query);

  const mylar = await run('mylar');
  assert.deepEqual(values(mylar), { series: 2, issues: 116, wanted: 2 });
  assert.equal(mylar.blocks[2].status, 'warn');
  assert.equal(lastRequest('mylar').query.apikey, 'test-key');
});

test('myspeed, netalertx, netbird, netdata, nextdns, ntfy, octoprint and omada', async () => {
  assert.deepEqual(values(await run('myspeed', { password: 'pw' })), { download: '487.2Mbit/s', upload: '41.9Mbit/s', ping: '11ms' });
  assert.deepEqual([lastRequest('myspeed').headers.password, lastRequest('myspeed').query.limit], ['pw', '1']);

  const na = await run('netalertx');
  assert.deepEqual(values(na), { total: 48, connected: 31, new_devices: 2, down_alerts: 1 });
  assert.deepEqual(na.blocks.map((b) => b.status ?? null), [null, null, 'warn', 'error']);
  await run('netalertx', { version: 2 });
  assert.deepEqual([lastRequest('netalertx').route, lastRequest('netalertx').headers.authorization], ['GET /devices/totals', 'Bearer test-key']);

  const nb = await run('netbird');
  assert.deepEqual(values(nb), { online: '2 / 3', users: 2, login_expired: 1 });
  assert.equal(lastRequest('netbird').headers.authorization, 'Token test-key');

  const nd = await run('netdata');
  assert.deepEqual(values(nd), { warnings: 2, criticals: 0 });
  assert.equal(nd.blocks[0].status, 'warn');

  assert.deepEqual(values(await run('nextdns')), { default: 182340, blocked: 24120, allowed: 312, relayed: 0 });
  assert.equal(lastRequest('nextdns').headers['x-api-key'], 'test-key');
  await assert.rejects(run('nextdns', { profile: '../x' }), /profile/);

  const n = await run('ntfy', { key: 'tk_abc' });
  const nv = values(n);
  assert.deepEqual({ ...nv, lastReceived: undefined }, { title: 'Backup failed', message: 'Disk full on nas', priority: 'high', lastReceived: undefined, tags: 'warning, nas' });
  assert.match(nv.lastReceived, /^\d+d \d+h$/);
  assert.equal(n.blocks[2].status, 'warn');
  assert.deepEqual([lastRequest('ntfy').headers.authorization, lastRequest('ntfy').query.since], ['Bearer tk_abc', 'latest']);
  assert.deepEqual(values(await run('ntfy', { topic: 'empty', key: undefined })), { title: 'none', message: 'none', priority: 'none', lastReceived: 'none', tags: 'none' });
  await assert.rejects(run('ntfy', { topic: '../x' }), /topic/);

  assert.deepEqual(values(await run('octoprint')), { printer_state: 'printing', temp_tool: '214.8°C', temp_bed: '59.9°C', job_completion: '37.4%' });
  assert.equal(lastRequest('octoprint').headers['x-api-key'], 'test-key');

  const om = await run('omada');
  assert.deepEqual(values(om), { connectedAp: 3, activeUser: 37, alerts: 1, connectedGateways: 1, connectedSwitches: 2 });
  assert.deepEqual([lastRequest('omada').headers['csrf-token'], lastRequest('omada').headers.cookie, lastRequest('omada').query.token], ['omada-token', 'TPOMADA_SESSIONID=s3ss', 'omada-token']);
  await assert.rejects(run('omada', { site: 'Home' }), /no Omada site "Home" \(Default, Office\)/);
});

test('opendtu, opnsense, openwrt, pangolin, peanut, pfsense, photoprism and plantit', async () => {
  assert.deepEqual(values(await run('opendtu')), { yieldDay: '2318Wh', relativePower: '52%', absolutePower: '413W', limit: '800W' });

  assert.deepEqual(values(await run('opnsense')), { cpu: '5.7%', memory: '1.2 GB', wanUpload: '98.1 GB', wanDownload: '1.5 TB' });
  assert.equal(lastRequest('opnsense').headers.authorization, `Basic ${Buffer.from('k:s').toString('base64')}`);
  assert.equal(values(await run('opnsense', { wan: 'opt9' })).wanUpload, null);

  const sys = await run('openwrt');
  assert.deepEqual(values(sys), { uptime: '4d 3h', cpuLoad: 0.24 });
  const calls = mock.requests.filter((r) => r.widget === 'openwrt').map((r) => JSON.parse(r.body).params.slice(1, 3).join('.'));
  assert.deepEqual(calls.slice(-2), ['session.login', 'system.info']);
  const eth = await run('openwrt', { interfaceName: 'eth0' });
  assert.deepEqual(values(eth), { status: 'up', bytesTx: '98 GB', bytesRx: '1.5 TB' });
  assert.equal((await run('openwrt', { interfaceName: 'wan' })).blocks[0].status, 'error');
  await assert.rejects(run('openwrt', { interfaceName: 'eth9' }), /no OpenWrt device "eth9"/);

  const pg = await run('pangolin');
  assert.deepEqual(values(pg), { sites: '1 / 2', resources: '2 / 3', targets: '1 / 3', traffic: '1.6 GB', in: '1.2 GB', out: '342.3 MB' });
  assert.deepEqual(pg.blocks.slice(0, 3).map((b) => b.status), ['warn', 'warn', 'warn']);
  assert.equal(lastRequest('pangolin').headers.authorization, 'Bearer test-key');

  assert.deepEqual(values(await run('peanut')), { battery_charge: '100%', ups_load: '23%', ups_status: 'online' });
  const old = await run('peanut', { key: 'old' });
  assert.deepEqual(values(old), { battery_charge: '35%', ups_load: '41%', ups_status: 'on_battery' });
  assert.equal(old.blocks[2].status, 'warn');

  assert.deepEqual(values(await run('pfsense', { username: 'admin', password: 'pw' })), { load: 0.21, memory: '23.4%', temp: '48.5°C', wanStatus: 'up', wanIP: '203.0.113.9', disk: '12%' });
  const v2 = await run('pfsense', { version: 2, headers: { 'X-API-Key': 'pf-key' } });
  assert.deepEqual(values(v2), { load: 0.21, memory: '23.4%', temp: '48.5°C', wanStatus: 'down', wanIP: null, disk: '12%' });
  assert.equal(v2.blocks[3].status, 'error');
  assert.equal(lastRequest('pfsense').headers['x-api-key'], 'pf-key');
  await assert.rejects(run('pfsense', { wan: 'em9' }), /no pfSense interface "em9"/);

  assert.deepEqual(values(await run('photoprism')), { albums: 24, photos: 18420, videos: 312, people: 41 });
  assert.deepEqual([lastRequest('photoprism').headers.authorization, JSON.parse(lastRequest('photoprism').body)], ['Bearer test-key', { authToken: 'test-key' }]);

  assert.deepEqual(values(await run('plantit')), { events: 214, plants: 37, photos: 152, species: 29 });
  assert.equal(lastRequest('plantit').headers.key, 'test-key');
});

test('prometheus, prometheusmetric, pterodactyl, pulse, pyload, qnap, qui and romm', async () => {
  const prom = await run('prometheus');
  assert.deepEqual(values(prom), { targets_up: 2, targets_down: 1, targets_total: 3 });
  assert.equal(prom.blocks[1].status, 'warn');

  const { formatValue } = await import(path.join(WIDGETS, 'prometheusmetric', 'server.js'));
  const pm = await run('prometheusmetric', { metrics: [{ label: 'Disk free', query: 'node_filesystem_avail_bytes', format: { type: 'bytes' } }, { label: 'Raw', key: 'raw', query: 'up' }] });
  assert.deepEqual(pm.blocks, [{ key: 'Disk free', label: 'Disk free', value: '1.2 GB' }, { key: 'raw', label: 'Raw', value: '1234567890' }]);
  assert.equal(lastRequest('prometheusmetric').query.query, 'up');
  assert.deepEqual([
    formatValue('0.256', { type: 'percent', scale: 100, options: { maximumFractionDigits: 1 } }),
    formatValue('3', { type: 'number', scale: '1/2', prefix: '$' }),
    formatValue('93784', { type: 'duration' }),
    formatValue('2500000', { type: 'byterate' }),
    formatValue('8000', { type: 'bitrate', suffix: ' up' }),
    formatValue('', { type: 'number' }),
  ], ['25.6%', '$1.5', '1d 2h', '2.5 MB/s', '8 kbit/s up', null]);
  await assert.rejects(run('prometheusmetric', { metrics: [{ label: 'x' }] }), /metrics\[0\]: a query is needed/);

  assert.deepEqual(values(await run('pterodactyl')), { nodes: 2, servers: 3 });

  const pulse = await run('pulse');
  assert.deepEqual(values(pulse), { nodes: '2 / 2', vms: '2 / 3', lxcs: '2 / 2' });
  assert.equal(pulse.blocks[1].status, 'warn');
  assert.equal(lastRequest('pulse').headers['x-api-token'], 'test-key');
  assert.deepEqual(values(await run('pulse', { version: 2 })), { nodes: 2, vms: 3, lxcs: 2 });

  assert.deepEqual(values(await run('pyload')), { speed: '3.3 MB/s', active: 2, queue: 5, total: 12 });
  assert.equal(lastRequest('pyload').headers['x-api-key'], 'test-key');
  assert.deepEqual(values(await run('pyload', { key: undefined })), { speed: '512 kB/s', active: 1, queue: 3, total: 9 });
  assert.equal(lastRequest('pyload').body, 'session=sess-0.4');

  assert.deepEqual(values(await run('qnap')), { cpuUsage: '12%', memUsage: '70%', systemTempC: '46°C', poolUsage: '53%' });
  assert.equal(lastRequest('qnap').query.sid, 'qsid1');
  assert.equal(new URLSearchParams(mock.requests.find((r) => r.widget === 'qnap' && r.route.startsWith('POST')).body).get('pwd'), Buffer.from('pw').toString('base64'));
  const vol = await run('qnap', { volume: 'DataVol1' });
  assert.deepEqual(vol.blocks[3], { key: 'volumeUsage', label: 'volumeUsage', vars: { volume: 'DataVol1' }, value: 75, unit: '%' });
  await assert.rejects(run('qnap', { volume: 'Nope' }), /no QNAP volume "Nope" \(DataVol1, Backup\)/);

  assert.deepEqual(values(await run('qui')), { leech: '2 / 4', download: '4.2 MB/s', seed: '30 / 38', upload: '830 kB/s', total: 42, errored: 1 });
  assert.deepEqual(values(await run('qui', { instance: '1' })), { leech: '1 / 1', download: '1 MB/s', seed: '8 / 8', upload: '50 kB/s', total: 10, errored: 0, ratio: 2.46, freeSpace: '812 GB' });
  assert.equal(lastRequest('qui').headers['x-api-key'], 'test-key');

  assert.deepEqual(values(await run('romm')), { platforms: 14, totalRoms: 1842, saves: 96, states: 41, screenshots: 230, totalfilesize: '612.3 GB' });
});

test('rutorrent, slskd, sparkyfitness, spoolman, sportarr, strelaysrv, suwayomi and swagdashboard', async () => {
  assert.deepEqual(values(await run('rutorrent', { username: 'anna', password: 'pw' })), { active: 2, upload: '150 kB/s', download: '2.5 MB/s' });
  assert.deepEqual([lastRequest('rutorrent').body, lastRequest('rutorrent').headers.authorization], ['mode=list', `Basic ${Buffer.from('anna:pw').toString('base64')}`]);

  const sl = await run('slskd');
  assert.deepEqual(values(sl), { slskStatus: 'connected', updateStatus: 'updateAvailable', downloads: 2, uploads: 1, sharedFiles: 18342 });
  assert.equal(sl.blocks[1].status, 'warn');
  assert.equal(lastRequest('slskd').headers['x-api-key'], 'test-key');

  assert.deepEqual(values(await run('sparkyfitness')), { eaten: '1840kcal', burned: '520kcal', remaining: '380kcal', steps: 8412 });

  const sp = await run('spoolman');
  assert.deepEqual(sp.blocks.map((b) => [b.key, b.vars.name, b.value, b.status ?? null]), [['spool1', 'PLA Black', 64, null], ['spool2', 'PETG Orange', 7, 'warn'], ['spool3', 'TPU', 100, null]]);
  assert.deepEqual((await run('spoolman', { spoolIds: [3, 1] })).blocks.map((b) => b.key), ['spool3', 'spool1']);

  assert.deepEqual(values(await run('sportarr')), { wanted: 9, queued: 2, leagues: 3 });
  assert.equal(lastRequest('sportarr').query.apikey, 'test-key');

  assert.deepEqual(values(await run('strelaysrv')), { numActiveSessions: 12, numConnections: 31, dataRelayed: '48.2 GB', transferRate: '813 kbit/s' });

  assert.deepEqual(values(await run('suwayomi')), { download: 120, nondownload: 880, read: 400, unread: 600, downloadedread: 70, downloadedunread: 50, nondownloadedread: 330, nondownloadedunread: 550 });
  assert.equal(JSON.parse(lastRequest('suwayomi').body).operationName, 'Counts');
  const cat = values(await run('suwayomi', { category: 2 }));
  assert.deepEqual([cat.download, cat.nondownload, cat.read, cat.unread, cat.downloadedunread], [2, 1, 1, 2, 1]);
  assert.deepEqual(JSON.parse(lastRequest('suwayomi').body).variables, { id: 2 });

  const swag = await run('swagdashboard');
  assert.deepEqual(values(swag), { proxied: 24, auth: 9, outdated: 1, banned: 17 });
  assert.equal(swag.blocks[2].status, 'warn');
  assert.equal(lastRequest('swagdashboard').query.stats, 'true');
});

test('tandoor, technitium, tracearr, trilium, tubearchivist, unifi-drive, unmanic and uptimerobot', async () => {
  assert.deepEqual(values(await run('tandoor')), { users: 3, recipes: 248, keywords: 57 });
  assert.equal(lastRequest('tandoor').headers.authorization, 'Bearer test-key');

  const tech = await run('technitium', { range: 'LastDay' });
  assert.deepEqual(values(tech), { totalQueries: 14320, totalNoError: 13100, totalServerFailure: 12, totalNxDomain: 980, totalRefused: 0,
    totalAuthoritative: 2210, totalRecursive: 4100, totalCached: 7200, totalBlocked: 810, totalDropped: 0, totalClients: 23 });
  assert.equal(tech.blocks[2].status, 'warn');
  assert.deepEqual([lastRequest('technitium').query.type, lastRequest('technitium').query.token], ['LastDay', 'test-key']);

  const tr = await run('tracearr', { view: 'both', enableUser: true, showEpisodeNumber: true });
  assert.deepEqual(values(tr), { streams: 2, transcodes: 1, directplay: 1, bitrate: '28.4 Mbps' });
  assert.deepEqual(tr.rows, [
    { label: 'Severance: S02 · E01 - Hello, Ms. Cobel (ben)', icon: 'pause', value: '12:14 / 57:00', progress: 734000 / 3420000 * 100 },
    { label: 'Dune: Part Two (anna)', icon: 'play', value: '1:15:34 / 2:46:00', progress: 4534000 / 9960000 * 100 }]);
  assert.equal((await run('tracearr')).blocks, undefined, 'details: rows only');

  assert.deepEqual(values(await run('trilium')), { version: 'v0.97.2', notesCount: 3412, dbSize: '84.2 MB' });
  assert.equal(lastRequest('trilium').headers.authorization, 'test-key');

  assert.deepEqual(values(await run('tubearchivist')), { downloads: 14, videos: 3120, channels: 48, playlists: 17 });
  assert.equal(lastRequest('tubearchivist').headers.authorization, 'Token test-key');

  assert.deepEqual(values(await run('unifi-drive')), { total: '16 TB', used: '5.2 TB', available: '10.8 TB', status: 'healthy' });
  assert.deepEqual([lastRequest('unifi-drive').headers.cookie, lastRequest('unifi-drive').headers['x-csrf-token']], ['TOKEN=unas-jwt', 'csrf-1']);

  assert.deepEqual(values(await run('unmanic')), { active_workers: 1, total_workers: 3, records_total: 42 });

  const ur = await run('uptimerobot');
  const u = values(ur);
  assert.deepEqual({ ...u, lastDown: undefined }, { status: 'up', uptime: '4d 3h', lastDown: undefined, downDuration: '1h 0m' });
  assert.match(u.lastDown, /^\d+d \d+h$/);
  assert.equal(new URLSearchParams(lastRequest('uptimerobot').body).get('api_key'), 'test-key');
});

test('urbackup, vikunja, wallos, wgeasy, xteve, yourspotify and zabbix', async () => {
  const ub = await run('urbackup');
  assert.deepEqual(values(ub), { ok: 2, errored: 1, noRecent: 1, totalUsed: '1.5 TB' });
  assert.deepEqual(ub.blocks.slice(1, 3).map((b) => b.status), ['error', 'warn']);
  await assert.rejects(run('urbackup', { password: 'wrong' }), (err) => /UrBackup login answered 401/.test(err.message) && !err.message.includes('wrong'));

  const vk = await run('vikunja', { enableTaskList: true });
  assert.deepEqual(values(vk), { projects: 2, tasks7d: 1, tasksOverdue: 1, tasksInProgress: 1 });
  assert.deepEqual(vk.rows, [{ label: 'Renew certificate', value: '2026-01-10', status: 'warn' }, { label: 'Replace UPS battery', value: '2099-01-01' }, { label: 'Clean the attic' }]);
  assert.equal(lastRequest('vikunja').query.filter, 'done=false');
  await run('vikunja', { version: 2 });
  assert.equal(lastRequest('vikunja').route, 'GET /api/v1/tasks');

  assert.deepEqual(values(await run('wallos')), { activeSubscriptions: 3, nextRenewingSubscription: 'Domain renewal', previousMonthlyCost: '€41.97', thisMonthlyCost: '€41.97', nextMonthlyCost: '€41.97' });
  const months = mock.requests.filter((r) => r.widget === 'wallos' && r.route.endsWith('get_monthly_cost.php')).slice(-3).map((r) => r.query.month);
  assert.equal(new Set(months).size, 3, 'last, this and next month');

  assert.deepEqual(values(await run('wgeasy', { password: 'pw' })), { connected: 1, enabled: 2, disabled: 1, total: 3 });
  assert.equal(lastRequest('wgeasy').headers.authorization, 'pw');
  assert.deepEqual(values(await run('wgeasy', { version: 2, username: 'admin', password: 'pw' })), { connected: 1, enabled: 1, disabled: 0, total: 1 });
  assert.equal(lastRequest('wgeasy').headers.authorization, `Basic ${Buffer.from('admin:pw').toString('base64')}`);

  assert.deepEqual(values(await run('xteve', { username: 'u', password: 'p' })), { streams_all: 412, streams_active: 120, streams_xepg: 98 });
  assert.deepEqual(JSON.parse(lastRequest('xteve').body), { cmd: 'status', token: 'xt-token' });

  const { startOf } = await import(path.join(WIDGETS, 'yourspotify', 'server.js'));
  assert.deepEqual(values(await run('yourspotify', { interval: 'month' })), { songs: 842, time: '2d 4h', artists: 5 });
  assert.deepEqual([lastRequest('yourspotify').query.token, lastRequest('yourspotify').query.timeSplit], ['test-key', 'all']);
  assert.equal(startOf('week', new Date('2026-03-08T12:00:00Z')), '2026-03-01T12:00:00.000Z');

  const zb = await run('zabbix');
  assert.deepEqual(values(zb), { unclassified: 0, information: 1, warning: 2, average: 0, high: 1, disaster: 0 });
  assert.deepEqual(zb.blocks.map((b) => b.status ?? null), [null, null, 'warn', null, 'error', null]);
  assert.deepEqual([JSON.parse(lastRequest('zabbix').body).method, lastRequest('zabbix').headers.authorization], ['trigger.get', 'Bearer test-key']);
});

/** A fake Shelly: Gen2 behind digest auth (SHA-256, checked here) or Gen1 behind basic auth, with these answers. */
async function shellyDevice({ gen, password, routes }) {
  const http = await import('node:http');
  const crypto = await import('node:crypto');
  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
  const calls = [];
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    calls.push(req.url);
    const auth = req.headers.authorization ?? '';
    let ok = !password || u.pathname === '/shelly';
    if (!ok && gen === 1) ok = auth === `Basic ${Buffer.from(`admin:${password}`).toString('base64')}`;
    if (!ok && gen >= 2 && auth.startsWith('Digest ')) {
      const p = Object.fromEntries([...auth.matchAll(/(\w+)="?([^",]*)"?/g)].map((m) => [m[1], m[2]]));
      const expect = sha(`${sha(`admin:shelly-test:${password}`)}:n0nce:${p.nc}:${p.cnonce}:auth:${sha(`GET:${req.url}`)}`);
      ok = p.username === 'admin' && p.uri === req.url && p.response === expect;
    }
    if (!ok) {
      res.writeHead(401, gen >= 2 ? { 'www-authenticate': 'Digest qop="auth", realm="shelly-test", nonce="n0nce", algorithm=SHA-256' } : {});
      return res.end();
    }
    const answer = routes[u.pathname];
    if (answer === undefined) return res.writeHead(404).end('{}');
    res.end(JSON.stringify(typeof answer === 'function' ? answer(u) : answer));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}`, calls, close: () => srv.close() };
}

test('shelly: Gen2+ version and stable update (marked), checked once an hour, and the update through action', async () => {
  const { default: shelly, cleanVersion, compareVersions } = await import(path.join(WIDGETS, 'shelly', 'server.js'));
  const ctx = (options, cache = new Map()) => ({ options: { username: 'admin', ...options }, cache, log: silent, signal: new AbortController().signal, fetch });
  const cache = new Map();
  const out = await shelly.fetch(ctx({ url: `${mock.url}/shelly` }, cache));
  assert.deepEqual(out.blocks, [{ key: 'firmware', label: 'firmware', value: '1.4.4' }, { key: 'update', label: 'update', value: '1.5.0', status: 'warn' }]);
  assert.deepEqual(out.update, { available: true, version: '1.5.0', stage: 'stable' });
  assert.deepEqual(out.attributes, { update: true, version: '1.4.4', available: '1.5.0' }, 'attributes for a service filter');
  assert.equal(lastRequest('shelly').route, 'GET /rpc/Shelly.CheckForUpdate');
  await shelly.fetch(ctx({ url: `${mock.url}/shelly` }, cache));
  assert.equal(lastRequest('shelly').route, 'GET /rpc/Sys.GetStatus', 'the cloud check waits an hour; the device status in between');
  assert.deepEqual(await shelly.action(ctx({ url: `${mock.url}/shelly` }, cache)), { status: 'ok', output: 'Updating from 1.4.4 to 1.5.0; the device restarts when it is done.\n' });
  assert.deepEqual([lastRequest('shelly').route, lastRequest('shelly').query.stage], ['GET /rpc/Shelly.Update', 'stable']);

  // digest auth as admin, a beta only with beta: true, up to date otherwise
  const routes = { '/shelly': { gen: 2, ver: '1.4.4', auth_en: true }, '/rpc/Shelly.CheckForUpdate': { beta: { version: '1.5.1-beta1' } }, '/rpc/Shelly.Update': null };
  const dev = await shellyDevice({ gen: 2, password: 'pw', routes });
  try {
    const plain = await shelly.fetch(ctx({ url: dev.url, password: 'pw' }));
    assert.deepEqual([plain.blocks, plain.update.available], [[{ key: 'firmware', label: 'firmware', value: '1.4.4' }], false], 'up to date: only the version');
    assert.deepEqual(plain.attributes, { update: false, version: '1.4.4', available: null });
    assert.deepEqual((await shelly.action(ctx({ url: dev.url, password: 'pw' }))).status, 'error', 'nothing to install');
    const beta = await shelly.fetch(ctx({ url: dev.url, password: 'pw', beta: true }));
    assert.deepEqual(beta.update, { available: true, version: '1.5.1-beta1', stage: 'beta' });
    assert.equal((await shelly.action(ctx({ url: dev.url, password: 'pw', beta: true }))).status, 'ok');
    assert.equal(dev.calls.at(-1), '/rpc/Shelly.Update?stage=beta');
    await assert.rejects(shelly.fetch(ctx({ url: dev.url })), /^Error: Shelly Shelly.CheckForUpdate answered 401 \(no password set\)$/);
    await assert.rejects(shelly.fetch(ctx({ url: dev.url, password: 'wrong' })), (err) => /^Shelly Shelly.CheckForUpdate answered 401 \(password refused\)$/.test(err.message));
  } finally {
    dev.close();
  }
  await assert.rejects(shelly.fetch(ctx({ url: `${mock.url}/nothing-here` })), /Shelly shelly answered 404/);

  assert.equal(cleanVersion('20230913-112003/v1.14.0-gcb84623'), '1.14.0');
  assert.equal(cleanVersion('20231107-162425/v1.14.1-rc1-g7b4a7f8'), '1.14.1-rc1');
  assert.ok(compareVersions('1.14.1-rc1', '1.14.0') > 0 && compareVersions('1.14.1-rc1', '1.14.1') < 0 && compareVersions('1.10.0', '1.9.9') > 0);
});

test('shelly: Gen1 over /shelly and /ota with basic auth; a beta, an update that runs', async () => {
  const { default: shelly } = await import(path.join(WIDGETS, 'shelly', 'server.js'));
  const ctx = (options) => ({ options: { username: 'admin', password: 'pw', ...options }, cache: new Map(), log: silent, signal: new AbortController().signal, fetch });
  const ota = { status: 'idle', has_update: true, new_version: '20231107-162425/v1.14.1-gcb84623', old_version: '20230913-112003/v1.14.0-gcb84623', beta_version: '20231020-090000/v1.14.1-rc1-gab12cd3' };
  const routes = { '/shelly': { type: 'SHSW-1', fw: '20230913-112003/v1.14.0-gcb84623', auth: true }, '/ota/check': { status: 'ok' }, '/ota': () => ota };
  const dev = await shellyDevice({ gen: 1, password: 'pw', routes });
  try {
    const out = await shelly.fetch(ctx({ url: dev.url }));
    assert.deepEqual(values(out), { firmware: '1.14.0', update: '1.14.1' });
    assert.deepEqual(dev.calls.slice(-2), ['/ota/check', '/ota'], 'asks the device to look first');
    assert.equal((await shelly.action(ctx({ url: dev.url }))).status, 'ok');
    assert.equal(dev.calls.at(-1), '/ota?update=true');

    Object.assign(ota, { has_update: false, new_version: ota.old_version });
    assert.deepEqual(values(await shelly.fetch(ctx({ url: dev.url }))), { firmware: '1.14.0' }, 'up to date: no update block');
    assert.deepEqual((await shelly.fetch(ctx({ url: dev.url, beta: true }))).update, { available: true, version: '1.14.1-rc1', stage: 'beta' });
    await shelly.action(ctx({ url: dev.url, beta: true }));
    assert.equal(dev.calls.at(-1), '/ota?beta=true');

    ota.status = 'updating';
    const busy = await shelly.fetch(ctx({ url: dev.url, beta: true }));
    assert.deepEqual([busy.blocks[1], busy.update.available], [{ key: 'update', label: 'update', value: 'updating', status: 'warn' }, false]);
    assert.equal(busy.attributes.update, true, 'updating counts as an update');
    assert.equal((await shelly.action(ctx({ url: dev.url, beta: true }))).status, 'error');
    await assert.rejects(shelly.fetch(ctx({ url: dev.url, password: 'wrong' })), /Shelly ota\/check answered 401 \(password refused\)/);
    await assert.rejects(shelly.fetch(ctx({ url: dev.url, password: undefined })), /Shelly ota\/check answered 401 \(no password set\)/);
  } finally {
    dev.close();
  }
});

test('shelly client: blocks with the update marked, a button only for an update, busy, then started', async () => {
  const { el, window } = await renderClient('shelly');
  const data = { blocks: [{ key: 'firmware', label: 'firmware', value: '1.4.4' }, { key: 'update', label: 'update', value: '1.5.0', status: 'warn' }], update: { available: true, version: '1.5.0', stage: 'stable' } };
  el.data = data;
  const root = el.shadowRoot;
  const blocks = [...root.querySelectorAll('.block')];
  assert.deepEqual(blocks.map((b) => [b.className, b.querySelector('.l').textContent]), [['block', 'firmware'], ['block warn', 'update']]);
  assert.equal(blocks[1].querySelector('.v').textContent, '▲attention: 1.5.0');
  const button = root.querySelector('button');
  assert.deepEqual([button.hidden, button.disabled, button.textContent], [false, false, 'updateFirmware']);
  const events = [];
  window.document.body.addEventListener('dash-widget-action', (e) => events.push([e.bubbles, e.composed, e.detail.title, e.detail.showResult]));
  button.click();
  assert.deepEqual(events, [[true, true, 'updateFirmware', 'failure']]);
  el.busy = true;
  assert.deepEqual([button.disabled, button.getAttribute('aria-busy'), Boolean(button.querySelector('.spinner'))], [true, 'true', true]);
  button.click();
  assert.equal(events.length, 1, 'no second run while busy');
  el.actionResult = { status: 'ok' };
  el.busy = false;
  assert.deepEqual([button.disabled, button.textContent, root.querySelector('button') === button], [true, 'updateStarted', true]);
  el.data = data;
  assert.equal(button.textContent, 'updateStarted', 'still started while the device has not updated yet');
  el.data = { blocks: [{ key: 'firmware', label: 'firmware', value: '1.5.0' }], update: { available: false, version: null, stage: null } };
  assert.equal(button.hidden, true, 'no button without an update');
  el.data = data;
  assert.deepEqual([button.hidden, button.disabled, button.textContent], [false, false, 'updateFirmware'], 'ready for a next update');
  el.actionResult = { status: 'error' };
  assert.equal(button.disabled, false, 'a failed start can be tried again');
  el.error = 'Shelly shelly answered 404';
  assert.deepEqual([root.querySelector('.error').textContent, button.hidden], ['Shelly shelly answered 404', true]);
});

test('shelly client: a 401 becomes advice about the password, with the raw error as a detail', async () => {
  const { el } = await renderClient('shelly');
  const shown = () => [...el.shadowRoot.querySelector('.error').childNodes].map((n) => n.textContent);
  el.error = 'Shelly Shelly.CheckForUpdate answered 401 (password refused)';
  assert.deepEqual(shown(), ['wrongPassword', 'Shelly Shelly.CheckForUpdate answered 401 (password refused)']);
  el.error = 'Shelly ota/check answered 401 (no password set)';
  assert.deepEqual(shown(), ['passwordNeeded', 'Shelly ota/check answered 401 (no password set)']);
  el.error = 'Shelly shelly answered 404';
  assert.deepEqual(shown(), ['Shelly shelly answered 404'], 'other errors as they are');
});

// Raw numbers behind the formatted blocks, for a filter: the same value as the card, in the
// unit the attribute names (MB/s, GB, %, hours).
test('raw values behind formatted blocks: rates, free space and the time since a backup', async () => {
  const attrs = async (id, options = {}) => (await run(id, options)).attributes;
  assert.deepEqual(await attrs('qbittorrent'), { download: 2.5, upload: 0.5 });
  assert.deepEqual(await attrs('deluge'), { download: 3, upload: 0.5 });
  assert.deepEqual(await attrs('transmission'), { download: 2.8, upload: 0.5 });
  assert.deepEqual(await attrs('flood'), { download: 3, upload: 0.2 }, '150 kB/s rounds to 0.2 MB/s');
  assert.deepEqual(await attrs('downloadstation'), { download: 3, upload: 0.2 });
  assert.deepEqual(await attrs('sabnzbd'), { rate: 45.7, paused: false });
  assert.deepEqual(await attrs('diskstation'), { volumeFree: 600, volumeFreePercent: 7.5 });
  assert.deepEqual(await attrs('filebrowser'), { available: 2765.5, usedPercent: 30.9 });
  // Unraid counts KiB: 25.7 TB on the card is 25,697 GB
  assert.deepEqual(await attrs('unraid', { pool1: 'trunk' }), { arrayFree: 25697, pool1Free: 1300.3, pool2Free: null, pool3Free: null, pool4Free: null });
  const { default: sab } = await import(path.join(WIDGETS, 'sabnzbd', 'server.js'));
  const fake = (body) => ({ options: { url: 'http://sab.lan', key: 'k' }, fetch: async () => ({ ok: true, json: async () => body }) });
  assert.deepEqual((await sab.fetch(fake({ queue: { status: 'Paused', kbpersec: '900' } }))).attributes, { rate: 0, paused: true });
  // hours since the newest backup (the fixture's 2026-03-02 03:15 UTC)
  const hours = (iso) => Math.round((Date.now() - Date.parse(iso)) / 360000) / 10;
  const dup = await attrs('duplicati');
  assert.ok(Math.abs(dup.hoursSinceBackup - hours('2026-03-02T03:15:00Z')) < 0.2, `duplicati: ${dup.hoursSinceBackup}`);
  const kopia = await attrs('kopia');
  assert.equal(kopia.failed, false);
  assert.equal(typeof kopia.hoursSinceRun, 'number');
});
