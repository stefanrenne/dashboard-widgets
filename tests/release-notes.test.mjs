// The GitHub release text (scripts/release-notes.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseNotes, changelogBullets, previousTag, widgetVersion, widgetDescription } from '../scripts/release-notes.mjs';

const CHANGELOG = `# Changelog

## [Unreleased]

## [1.2.0] - 2026-11-02

### Added
- \`radarr\` and \`sonarr\` mark a blocked import, so a card can show only
  while something waits.
- \`immich\`: a new widget.

### Fixed
- The mock serves fixtures with a BOM.

## [1.1.0] - 2026-11-01

### Fixed
- \`radarr\` counts again.
`;
const base = { version: '1.2.0', tag: 'v1.2.0', repo: 'me/widgets', previous: 'v1.1.0', changelog: CHANGELOG };

test('release notes: new and updated widgets with their own lines, the rest under Other changes', () => {
  const { notes, errors } = releaseNotes({
    ...base,
    before: { radarr: '0.2.0', sonarr: '0.3.0', ping: '1.0.0' },
    after: { radarr: '0.3.0', sonarr: '0.4.0', ping: '1.0.0', immich: '0.1.0' },
  });
  assert.deepEqual(errors, []);
  assert.equal(notes, `## New widgets

### \`immich\` 0.1.0

- \`immich\`: a new widget.

## Updated widgets

### 2 widgets

\`radarr\` 0.2.0 → 0.3.0, \`sonarr\` 0.3.0 → 0.4.0

- \`radarr\` and \`sonarr\` mark a blocked import, so a card can show only while something waits.

## Other changes

- The mock serves fixtures with a BOM.

4 widgets in this release, compared with v1.1.0. Pin it in the dashboard's \`settings.yaml\`:

\`\`\`yaml
plugins:
  - source: git+https://github.com/me/widgets#v1.2.0
\`\`\`
`);
  assert.ok(!notes.includes('`ping`'), 'an unchanged widget is not listed');
});

test('release notes: an updated widget no line names is an error; a new one gets its description', () => {
  const { notes, errors } = releaseNotes({
    ...base,
    before: { radarr: '0.2.0', ping: '1.0.0' },
    after: { radarr: '0.3.0', ping: '1.1.0', gitea: '0.1.0' },
    descriptions: { gitea: 'Repositories and issues of a Gitea server.' },
  });
  assert.deepEqual(errors, ['`ping` went from 1.0.0 to 1.1.0, but no line in CHANGELOG.md 1.2.0 names it']);
  assert.match(notes, /### `gitea` 0\.1\.0\n\n- Repositories and issues of a Gitea server\./);
});

test('release notes: removed widgets, nothing changed, and a version without a section', () => {
  const removed = releaseNotes({ ...base, before: { radarr: '0.3.0', old: '1.0.0' }, after: { radarr: '0.3.0' } });
  assert.match(removed.notes, /## Removed widgets\n\n- `old`/);
  const none = releaseNotes({ ...base, before: { radarr: '0.3.0' }, after: { radarr: '0.3.0' } });
  assert.match(none.notes, /No widget changed in this release\./);
  assert.match(none.notes, /`radarr` and `sonarr` mark/, 'its lines under Other changes then');
  assert.deepEqual(releaseNotes({ ...base, version: '9.9.9', before: {}, after: {} }).errors, ['CHANGELOG.md has no section for 9.9.9']);
});

test('release notes: helpers', () => {
  assert.deepEqual(changelogBullets(CHANGELOG, '1.1.0'), ['`radarr` counts again.']);
  assert.equal(changelogBullets(CHANGELOG, '0.1.0'), null);
  assert.equal(previousTag(['v1.0.0', 'v1.1.0', 'v1.10.0', 'v1.2.0', 'v2.0.0', 'x'], '1.10.0'), 'v1.2.0');
  assert.equal(previousTag(['v1.0.0'], '1.0.0'), null);
  assert.equal(widgetVersion('id: x\nversion: 1.6.0  # bump\n'), '1.6.0');
  assert.equal(widgetDescription('id: x\ndescription: "State of one container."\n'), 'State of one container.');
});
