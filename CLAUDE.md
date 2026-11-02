# CLAUDE.md

Widget collection for homelab-dashboard (`../homelab-dashboard`): every widget it has. Each folder
in `widgets/` is one widget package following the dashboard's widget API 1
(`../homelab-dashboard/docs/widgets/api-reference.md`).

The dashboard creates `http-status`, `ping`, `docker`, `kubernetes-pods` and `proxmoxvm` itself for a
service's `siteMonitor:`, `ping:`, `container:`, `app:` and `proxmoxNode:`, and fills in their
options (`src/layout.js` there). Their ids and options are a contract with the dashboard: change
them only in a backward-compatible way.

## Structure

| Path | What |
|---|---|
| `widgets/<id>/` | `widget.yaml`, `server.js`, `i18n.json`, `README.md` (its docs page, rule 13), `fixture.json` (below), optionally `client.js` (its own look; mjpeg has only a `client.js`). Folder name = widget id. |
| `widgets/<id>/fixture.json` | The widget's API answers per route (`"GET /api/v3/movie": ...`; `{ "_headers": {...}, "_body": ... }` for headers, `"_text"` for a plain text body), used by tests and the mock. |
| `scripts/mock-homelab.mjs` | Serves the fixtures at `/<id>/...`; the tests start it, `npm run mock` too. |
| `scripts/readme-example.mjs` | A widget's README example as the options the dashboard would give it (providers, proxmox.yaml, option defaults), pointed at the mock; `tests/widgets.test.mjs` runs every example on its fixture. |
| `scripts/release-notes.mjs` | The GitHub release text: new and updated widgets since the previous tag, with their CHANGELOG lines; tested in `tests/release-notes.test.mjs`. |
| `scripts/fakes.mjs` | Fake services for widgets that do not speak HTTP with JSON, and the options each widget needs for its fixture; used by the tests and the dashboard's docs images. |
| `todo.md` | Open work; remove an item when it is done (the CHANGELOG records it). |
| `tests/widgets.test.mjs` | Every widget through the public `ctx` against the mock, plus package checks. |
| `tests/dashboard-widgets.test.mjs` | The widgets that came from the dashboard (service fields, header, generic), against small servers of their own. |

## Rules

1. **Each widget folder stands alone.** Only `node:` imports, no shared files between folders:
   users may install one folder (`subdir:` / `only:`). A test checks the imports.
2. **Keys and passwords are `secret: true`** in widget.yaml. A test checks names like key/password/token.
3. **Field keys follow homepage's widget** (block `key`), so `fields:` lists from homepage keep working.
4. **Every label has a translation in the dashboard's 17 languages**: en, nl, fr, de, es, ca, he,
   hr, hu, it, nb-NO, pt, ru, sv, vi, zh-Hans, zh-Hant (a test checks this).
5. **A new widget comes with a fixture, a test and a `README.md`**, and a row in the README table.
6. **Bump `version` in a widget's widget.yaml when it changes**, and tag the repo for a release.
7. Errors are thrown with a short message without secrets (`Radarr movie answered 401`); the
   dashboard turns "answered 401/404/5xx" into advice, so keep that wording.
8. **Labels are i18n keys, never sentences built in code.** Names in a label go in `vars`
   (`{ label: 'poolUsed', vars: { pool } }`), states are keys (`importBlocked`).
9. **Labels fit a phone**: whole words, no abbreviations, at most two lines at ~8 characters per
   line in a card with four blocks. `tests/widgets.test.mjs` estimates this per widget and language.
10. **Decimal units and one time format** (`m:ss`, `h:mm:ss`) in every widget.
11. **Mark what needs attention** with `status: 'warn'` (or `'error'`), on blocks and rows, and put
    problem rows first.
12. Show at most a handful of blocks by default; offer the rest through `defaultFields` + `fields`.
13. **`widgets/<id>/README.md` is the widget's page** on the dashboard's documentation site
    (https://getdashboard.dev/widgets/collection/<id>.html), generated
    from the newest release. It holds, in this order:
    1. `# <name>`: exactly the `name` in widget.yaml.
    2. What it shows, and the setup the user must do in the service: where the API key or token
       is (menu path), which ids or names to fill in (Portainer's `env`, Unraid's pools), when an
       option is only needed with authentication on, what is marked as needing attention.
    3. `Learn more about [<service>](<url>).`
    4. `## Fields`: every block `key` the widget can return, in backticks. A test runs the widget
       on its fixture and fails when a returned key is missing.
    5. `## Example`: a complete `services.yaml` entry with `type: <id>` (or a `widgets.yaml` entry
       `- <id>:` for a header widget), the key through
       `{{HD_VAR_...}}`, made-up hosts (`*.lan`). It must run on the widget's `fixture.json` as written (ids, options,
       API version): a test runs every example.
    No dashboard or collection versions in a README before the dashboard's 1.0 ("needs dashboard
    0.9.0 or newer"): they go in CHANGELOG.md. Versions of the service itself are fine.
    Filter attributes (widget.yaml `attributes:`, for the dashboard's service `filter:`) get a
    table on the page from widget.yaml too: give each a line comment, and no README section.
14. **Every widget publishes filter attributes** where it has something to filter on: plain
    number and state blocks with `from: <block key>`, `attention: { type: boolean, from:
    '@attention' }` when it marks anything, `status` from `'@status'` for status widgets, a row
    count from `'@rows'`, and raw numbers from `fetch` (`attributes: { ... }`) where the card shows
    formatted text (Proxmox, Speedtest). A test checks them on every fixture.
    On the page `## Fields` is shown as "Display fields" and the example gets `fields: [...]`
    with them, unless it has a `fields:` line already.
    The options table comes from widget.yaml: give an option a line comment (`# e.g.
    http://radarr:7878`, `# Settings > Management Access > API Keys`) when its name does not
    explain it. A changed option, field or setup step updates the README in the same commit.

## Releasing

Bump the changed widgets' `version`, add a CHANGELOG section, set `package.json`'s version, run
`npm run release-notes -- X.Y.Z`, tag `vX.Y.Z`, push with tags. **Every CHANGELOG line about a
widget names it in backticks** (`radarr`; several in one line when one change covers them): the
release text (`scripts/release-notes.mjs`) lists only the widgets that are new or whose `version`
went up since the previous tag, each with the lines that name it, and fails when an updated widget
has none; lines that name no widget come under "Other changes". CI checks the tag against
package.json and that it is a commit on `main` (a push to `main` alone releases nothing), and publishes the GitHub release with that text and one zip of the collection.
`npm run release-notes` shows the text before tagging. When a tag cannot be pushed, run the CI workflow by hand on
`main` (workflow_dispatch): it releases package.json's version (unless released already)
and creates the tag.

**Every widget update reaches the documentation site.** The site is built by the dashboard
repository and picks up a new release of this collection only once a day. After the release is
published, rebuild it: `gh workflow run pages.yml --repo stefanrenne/homelab-dashboard`, and check
that each new or changed widget's page is there
(`https://getdashboard.dev/widgets/collection/<id>.html`) and shows the
new version.

## Commands

```bash
npm ci && npm test
npm run mock
```
