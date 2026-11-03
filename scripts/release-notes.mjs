// The GitHub release text for a version: the widgets that are new and the widgets that were
// updated since the previous tag (by the `version` in their widget.yaml), each with the CHANGELOG
// lines of this version that name it in backticks (`radarr`); lines that name no widget come
// under "Other changes". An updated widget that no line names is an error: every widget update
// says what changed. Only node: imports, so the release job needs no npm ci.
//   node scripts/release-notes.mjs <version> [<previous tag>] > notes.md

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The version in a widget.yaml text, or null. */
export function widgetVersion(yaml) {
  return /^version:\s*['"]?([^\s'"#]+)/m.exec(yaml)?.[1] ?? null;
}

/** The description in a widget.yaml text, or null. */
export function widgetDescription(yaml) {
  return /^description:\s*(.+?)\s*$/m.exec(yaml)?.[1]?.replace(/^(['"])(.*)\1$/, '$2') ?? null;
}

/** The bullets of a version's CHANGELOG section, each as one string (continuation lines joined). */
export function changelogBullets(changelog, version) {
  const section = [];
  let on = false;
  for (const line of changelog.split('\n')) {
    if (/^## \[/.test(line)) {
      if (on) break;
      on = line.startsWith(`## [${version}]`);
      continue;
    }
    if (on) section.push(line);
  }
  if (!on && !section.length) return null;
  const bullets = [];
  for (const line of section) {
    if (/^- /.test(line)) bullets.push(line.slice(2).trim());
    else if (/^\s+\S/.test(line) && bullets.length) bullets[bullets.length - 1] += ` ${line.trim()}`;
  }
  return bullets;
}

/** The highest tag vX.Y.Z below `version`, or null. */
export function previousTag(tags, version) {
  const parse = (v) => v.replace(/^v/, '').split('.').map(Number);
  const below = (a, b) => { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i]; return false; };
  const current = parse(version);
  return tags.filter((t) => /^v\d+\.\d+\.\d+$/.test(t) && below(parse(t), current))
    .sort((a, b) => (below(parse(a), parse(b)) ? 1 : -1))[0] ?? null;
}

/**
 * The release text. `before` and `after` map widget ids to their version at the previous tag and
 * now; `descriptions` (id to widget.yaml description) describes a new widget no line names.
 * Returns { notes, errors }.
 */
export function releaseNotes({ version, tag, repo, previous, changelog, before, after, descriptions = {} }) {
  const errors = [];
  const bullets = changelogBullets(changelog, version);
  if (!bullets) return { notes: '', errors: [`CHANGELOG.md has no section for ${version}`] };
  const names = (b) => [...b.matchAll(/`([a-z0-9][a-z0-9_-]*)`/g)].map((m) => m[1]);
  const about = (id) => bullets.filter((b) => names(b).includes(id));
  const added = Object.keys(after).filter((id) => !(id in before)).sort();
  const updated = Object.keys(after).filter((id) => id in before && before[id] !== after[id]).sort();
  const removed = Object.keys(before).filter((id) => !(id in after)).sort();
  const widgetIds = new Set([...Object.keys(after), ...Object.keys(before)]);

  const out = [];
  const widget = (id, versions) => {
    out.push(`### \`${id}\` ${versions}`, '');
    const lines = about(id);
    if (lines.length) for (const b of lines) out.push(`- ${b}`);
    else out.push(`- ${descriptions[id] ?? 'New widget.'}`);
    out.push('');
  };
  if (added.length) {
    out.push('## New widgets', '');
    for (const id of added) widget(id, after[id]);
  }
  if (updated.length) {
    out.push('## Updated widgets', '');
    for (const id of updated) {
      if (!about(id).length) errors.push(`\`${id}\` went from ${before[id]} to ${after[id]}, but no line in CHANGELOG.md ${version} names it`);
      widget(id, `${before[id]} → ${after[id]}`);
    }
  }
  if (removed.length) {
    out.push('## Removed widgets', '', ...removed.map((id) => `- \`${id}\``), '');
  }
  const other = bullets.filter((b) => !names(b).some((n) => widgetIds.has(n) && (added.includes(n) || updated.includes(n) || removed.includes(n))));
  if (other.length) out.push('## Other changes', '', ...other.map((b) => `- ${b}`), '');
  if (!added.length && !updated.length && !removed.length) out.push('No widget changed in this release.', '');
  out.push(`${Object.keys(after).length} widgets in this release${previous ? `, compared with ${previous}` : ''}. Pin it in the dashboard's \`settings.yaml\`:`, '',
    '```yaml', 'plugins:', `  - source: git+https://github.com/${repo}#${tag}`, '```');
  return { notes: out.join('\n') + '\n', errors };
}

/** Widget id to version (and to description in `descriptions`), for the working tree or a git ref. */
function versionsAt(ref, descriptions = {}) {
  const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });
  const ids = ref
    ? git('ls-tree', '--name-only', `${ref}:widgets`).split('\n').filter(Boolean)
    : fs.readdirSync('widgets', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const out = {};
  for (const id of ids) {
    let yaml;
    try { yaml = ref ? git('show', `${ref}:widgets/${id}/widget.yaml`) : fs.readFileSync(`widgets/${id}/widget.yaml`, 'utf8'); } catch { continue; }
    out[id] = widgetVersion(yaml);
    descriptions[id] = widgetDescription(yaml);
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const version = process.argv[2]?.replace(/^v/, '');
  if (!version) {
    console.error('usage: node scripts/release-notes.mjs <version> [<previous tag>]');
    process.exit(2);
  }
  const tags = execFileSync('git', ['tag', '--list', 'v*'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const previous = process.argv[3] ?? previousTag(tags, version);
  const descriptions = {};
  const after = versionsAt(null, descriptions);
  const { notes, errors } = releaseNotes({
    version,
    tag: `v${version}`,
    repo: process.env.GITHUB_REPOSITORY ?? 'stefanrenne/dashboard-widgets',
    previous,
    changelog: fs.readFileSync('CHANGELOG.md', 'utf8'),
    before: previous ? versionsAt(previous) : {},
    after,
    descriptions,
  });
  for (const e of errors) console.error(process.env.GITHUB_ACTIONS ? `::error::${e}` : `error: ${e}`);
  if (errors.length) process.exit(1);
  process.stdout.write(notes);
}
