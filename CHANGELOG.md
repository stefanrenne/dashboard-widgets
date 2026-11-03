# Changelog

Changes to the widget collection. Each widget also has its own `version` in its widget.yaml.

## [Unreleased]

### Added
- `ping` and `http-status` publish `available` and `unavailable`, for the dashboard's
  `filter: ping.unavailable` and `siteMonitor.unavailable`; for `http-status` a warning (another
  4xx) is neither.

## [0.12.2] - 2026-11-02

### Changed
- `search` no longer reads the old option name `filter`; use `filterServices`. Before 1.0 old
  names are not kept.

## [0.12.1] - 2026-11-02

### Changed
- `search`'s option `filter` is now `filterServices`, so `filter` stays the dashboard's word for
  hiding a card (and, later, a widget). The old name still works.

## [0.12.0] - 2026-11-02

### Added
- `proxmoxvm` publishes `cpu` (%) and `memory` (MB) as filter attributes, null while stopped.
- `homeassistant` publishes `peopleHome`, `lightsOn` and `switchesOn` as numbers, or with `custom`
  each entry's value as `custom1` to `custom4`.
- `calendar` publishes `eventsToday` (in its `timezone`, UTC without one) and `failed`, the
  integrations that did not answer.
- `feed` publishes `items` and `recent`, the items of the last 24 hours.
- Raw numbers behind formatted blocks, for a filter: `qbittorrent`, `deluge`, `transmission`,
  `flood` and `downloadstation` publish `download` and `upload` (MB/s); `sabnzbd` `rate` (MB/s)
  and `paused`; `diskstation` `volumeFree` (GB) and `volumeFreePercent`; `filebrowser`
  `available` (GB) and `usedPercent`; `unraid` `arrayFree` and `pool1Free` to `pool4Free` (GB);
  `duplicati` `hoursSinceBackup`; `kopia` `hoursSinceRun` and `failed`.

### Changed
- Each widget's fixture lives in its own folder, `widgets/<id>/fixture.json`, instead of
  `fixtures/<id>.json`, so a widget and its test data move together.
- A release is made only for a tag on a commit on `main`; a tag elsewhere fails the release.
- Every README example runs on its widget's fixture as written, checked by a test
  (`scripts/readme-example.mjs`). The fixtures of `arcane` (environment 0), `cloudflared` (the
  example's ids), `glances` (API 4 sensors, uptime and disks), `homeassistant` and `jackett`
  (the login) answer what their examples ask; TrueNAS's WebSocket fake moved to `scripts/fakes.mjs`.
- The `sabnzbd` fixture downloads three jobs (45.7 MB/s, 12:30 left) instead of an empty queue, so
  the docs image and the dashboard's screenshots show what the widget does.

## [0.11.2] - 2026-11-02

### Changed
- `calendar` shows the viewer's month again, as before 0.11.1, and asks the server for that month
  when the data is for another one (a server clock or time zone that is not the viewer's). 0.11.1
  showed the server's month instead, which put the docs site's example on a month without events.
  Its test runs on a fixed date now.
- The GitHub release text lists only the widgets that are new or updated since the previous
  release, each with what changed (`scripts/release-notes.mjs`), instead of every widget; the
  release has one zip of the collection instead of one per widget.

## [0.11.1] - 2026-11-02

### Fixed
- `calendar` shows the month its data names: drawn before the data arrived, it kept today's
  month. This also made a test fail from November on, which stopped the 0.11.0 release; 0.11.1
  is that release with this fix.

## [0.11.0] - 2026-11-02

### Added
- `docker` publishes `healthy` and `unhealthy` filter attributes from the container's Docker
  healthcheck (both false without one), for a service's `filter: container.healthy`.

## [0.10.1] - 2026-10-31

### Changed
- The fake services and the options every widget needs for its fixture moved from the tests to
  `scripts/fakes.mjs`, so the dashboard's docs site uses them for each widget's example image.

## [0.10.0] - 2026-10-31

### Added
- Filter attributes for every widget that has something to filter on (167 widgets), for the
  dashboard's service `filter:`: their number and state blocks, `attention` when they mark
  anything, `status` for status checks, `streams` for the media servers, and raw values for
  `proxmox` (VMs and containers running and stopped, nodes, CPU, memory) and `speedtest`
  (download and upload in Mbit/s). Each widget's docs page lists them. Every changed widget's
  minor version went up.

## [0.9.1] - 2026-10-31

### Changed
- READMEs no longer name the dashboard version a feature needs (`button`, `unifi`), and
  `shelly`'s attributes are listed on its docs page from widget.yaml instead of twice.
- `whatsupdocker`'s example spells What’s up Docker with a typographic apostrophe, so it
  highlights as YAML on the docs site; a test checks every README example for this.

## [0.9.0] - 2026-10-31

### Added
- `shelly` (1.1.0): publishes the attributes `update`, `version` and `available` for the
  dashboard's service `filter:` (dashboard 0.12.0 or newer), so a card can show only while a
  firmware update waits: `filter: widget.update == false`.

## [0.8.2] - 2026-10-31

### Changed
- `shelly` (1.0.2): no `update` block when the device is up to date, so the card shows only the
  firmware version; the block (marked) appears when an update is available or being installed.

## [0.8.1] - 2026-10-31

### Changed
- `shelly` (1.0.1): a refused password (401) says so on the card ("The password was refused –
  check "password""), or asks for `password` when none is set, with the raw error below it,
  instead of only "Shelly Shelly.CheckForUpdate answered 401".

## [0.8.0] - 2026-10-30

### Added
- `shelly` (1.0.0): a Shelly device's firmware version and an available update (marked), with an
  **Update firmware** button that starts it through the widget API's `action` call. Gen2, Gen3
  and Gen4 over the RPC API (digest auth as `admin`), Gen1 over `/shelly` and `/ota` (basic auth);
  `beta: true` also offers beta firmware. Needs dashboard 0.10.0 or newer for the button's quiet
  success (0.8.0 or newer for the button).

## [0.7.0] - 2026-10-25

### Changed
- `button` (1.2.0): a spinner instead of the label while the run lasts; a successful run shows a
  check for a moment and no dialog, a failed one opens the result dialog. Needs dashboard 0.10.0
  or newer for the quiet success (an older one shows the dialog every time).

## [0.6.0] - 2026-10-25

### Added
- `button` (1.1.0): `user: root` runs the script as root in the dashboard container, for files
  that must stay owned by root. Needs dashboard 0.9.0 or newer with `HD_ALLOW_ROOT_SCRIPTS=true`;
  without it the button says so.

## [0.5.0] - 2026-10-25

### Added
- `button` (1.0.0): a full-width button on a card or in the header that opens a link (`href`), or
  runs a bash script (`script`, relative to the config folder) or a shell command (`command`) on
  the dashboard's server through the widget API's new `action` call. The run gets only `PATH` and
  `HOME` unless `inheritEnv: true`, is stopped with everything it started after `timeout` seconds
  (default 300), and returns the last 64 kB of output and the exit code. Needs a dashboard with
  `action` support (0.8.0 or newer).

## [0.4.1] - 2026-10-25

### Added
- `docker` (1.4.0): `rx` and `tx`, the data received and sent over the container's networks, as
  homepage's RX and TX next to CPU and memory.

## [0.4.0] - 2026-10-25

The dashboard's built-in widgets moved here, so every widget is now in this collection; the
dashboard's next release needs this one.

### Added
- `http-status`, `ping`, `docker`, `kubernetes-pods` and `proxmoxvm`: the widgets behind a
  service's `siteMonitor:`, `ping:`, `container:`, `app:` and `proxmoxNode:`, moved here from the
  dashboard with the same options.
- `custom-api` (also `customapi`), `iframe`, `kubernetes`, and the header widgets `datetime`,
  `greeting`, `logo`, `resources` and `search`, moved here from the dashboard with the same
  options. The dashboard's built-in copies win over these until its next release.

### Changed
- `kubernetes-pods` has its own copy of the Kubernetes connection code instead of importing it
  from `kubernetes`, so the folder can be installed on its own.
- `resources`: shorter French and Croatian labels for CPU temperature and uptime, without
  abbreviations.

## [0.3.0] - 2026-10-25

Every service widget of homepage now has a counterpart here (or built into the dashboard): about
150 new widgets, each in the dashboard's 17 languages. openmeteo, openweathermap and stocks moved
here from the dashboard; this release is needed by dashboard 0.5.0.

### Added
- `glances`: CPU, memory, CPU temperature, uptime and disks from Glances (API 3 or 4), as
  homepage's glances info widget.
- `longhorn`: storage used in total and per node from the Longhorn API, with `provider: longhorn`,
  as homepage's longhorn info widget.
- `unifi` (also `unifi_console`): uptime, WAN status and LAN/WLAN users and devices from a UniFi
  Network controller, with an API key or a local account (UniFi OS or classic), as in homepage.
- `openmeteo`, `openweathermap` and `stocks` (Finnhub), moved here from the dashboard's built-in
  widgets: they talk to an outside service. Same options, plus `url` (another API server, e.g.
  your own Open-Meteo). A stock's block label is its symbol through `vars`. The dashboard keeps
  its built-in copies until its next release, and those win over these meanwhile.
- `pihole`: queries, blocked (also as a share) and the blocklist size, Pi-hole 5 and 6 (with a session from the password), as homepage's pihole widget.
- `adguard`: queries, blocked, filtered and processing time of AdGuard Home, as homepage's adguard widget.
- `plex`: active streams and the movie, TV and album counts of a Plex Media Server, as homepage's plex widget.
- `jellyfin` and `emby`: a row per stream with position and progress, and the library counts with `enableBlocks`, as homepage's widgets (without media control: the widgets only read).
- `homeassistant`: people at home, lights and switches on, or up to four states and templates of your own (`custom`), as homepage's homeassistant widget.
- `proxmox`: VMs and containers running, and the CPU and memory of a Proxmox VE cluster or one node, as homepage's proxmox widget.
- `proxmoxbackupserver`: datastore usage, failed tasks of the last 24 hours (marked), CPU and memory, as homepage's proxmoxbackupserver widget.
- `qbittorrent`: torrents downloading and seeding with their rates, downloads per row with `enableLeechProgress` (problems first), a login or an API key, as homepage's qbittorrent widget.
- `transmission`: torrents downloading and seeding with their rates, as homepage's transmission widget.
- `deluge`: torrents downloading and seeding with their rates, downloads per row with `enableLeechProgress`, as homepage's deluge widget.
- `nzbget`: download rate (paused is marked), remaining and downloaded, as homepage's nzbget widget.
- `lidarr` and `readarr`: wanted and queued (marked with errors or warnings), artists and books, as homepage's widgets.
- `jackett` (configured and errored indexers, also with an admin password) and `ombi` (pending, approved and available requests), as homepage's widgets.
- `nextcloud`: free space, active users, files and shares (and the older cpuload and memoryusage through `fields`), as homepage's nextcloud widget.
- `immich`: users, photos, videos and storage, as homepage's immich widget.
- `paperlessngx` (inbox and total documents) and `uptimekuma` (monitors up and down, uptime and the incident of a status page), as homepage's widgets.
- `traefik` (routers, services and middlewares, marked with errors or warnings) and `npm` (Nginx Proxy Manager proxy hosts), as homepage's widgets.
- `truenas`: load, uptime and alerts, and pools per row with `enablePools`, over the REST API or (`version: 2`, TrueNAS 25.04 and later) the WebSocket API, as homepage's truenas widget.
- `diskstation`: uptime, free space on a volume (marked below 10%), CPU and memory of a Synology NAS, as homepage's diskstation widget.
- `openmediavault`: services, S.M.A.R.T. results or Downloader downloads, chosen with `method`, as homepage's openmediavault widget.
- `speedtest` (Speedtest Tracker), `gitea` (also Forgejo) and `grafana`, as homepage's widgets; the mock can answer with headers.
- `tailscale`, `authentik`, `audiobookshelf` and `navidrome`, as homepage's widgets.
- `frigate`, `scrutiny` and `watchtower`, as homepage's widgets; the mock can answer plain text.
- `syncthing`: devices connected, how far in sync, errors and the shared data, as homepage's syncthing widget.
- `calendar`: a month or an agenda with releases from Sonarr, Radarr, Lidarr and Readarr and events from iCal feeds, integrations by `service_group`/`service_name` as in homepage (needs the dashboard's service references).
- `apcups`: status, load, battery charge and runtime left of an APC UPS over apcupsd's network protocol, as homepage's apcups widget.
- `arcane`, `argocd`, `atsumeru` and `autobrr`, as homepage's widgets.
- `azuredevops`: the last run of a pipeline (failed marked) and open pull requests, as homepage's azuredevops widget.
- `backrest` (latest and 30-day backups, failures marked) and `booklore` (libraries, books, reading and finished), as homepage's widgets.
- `beszel`, `bookorbit`, `caddy` and `calibreweb`, as homepage's widgets.
- `changedetectionio`, `channelsdvrserver`, `checkmk`, `cloudflared`, `coinmarketcap` and `crowdsec`, as homepage's widgets.
- `develancacheui`, `dispatcharr`, `dockhand`, `downloadstation`, `esphome` and `evcc`, as homepage's widgets.
- Widgets for Duplicati, RSS and Atom feeds, File Browser, FileFlows, Firefly III, Flood, FreshRSS and the FRITZ!Box.
- Widgets for game servers (Valve's server query), Gatus, Ghostfolio, GitLab, Gluetun, Gotify, HDHomeRun and Headscale.
- Widgets for Healthchecks, Homebox, Homebridge, JDownloader (through My.JDownloader), Jellystat, Karakeep and Kavita.
- Widgets for Komga, Komodo, Kopia, Linkwarden, LubeLogger, Mailcow, Maintainerr and Mastodon.
- Widgets for Mealie, Medusa, MikroTik, Minecraft, Miniflux, MJPEG streams, Moonraker (Klipper) and Mylar3.
- Widgets for MySpeed, NetAlertX, NetBird, Netdata, NextDNS, ntfy, OctoPrint and TP-Link Omada.
- Widgets for OpenDTU, OPNsense, OpenWrt, Pangolin, PeaNUT (Network UPS Tools), pfSense, PhotoPrism and Plant-it.
- Widgets for Prometheus, Prometheus Metric (PromQL queries), Pterodactyl, Pulse, pyLoad, QNAP, qui and RomM.
- Widgets for ruTorrent, slskd, SparkyFitness, Spoolman, Sportarr, the Syncthing Relay Server, Suwayomi and SWAG Dashboard.
- Widgets for Tandoor, Technitium DNS Server, Tracearr, Trilium, Tube Archivist, UniFi Drive (`unifi-drive`, also `unifi_drive`), Unmanic and UptimeRobot.
- Widgets for UrBackup, Vikunja, Wallos, wg-easy, xTeVe, Your Spotify and Zabbix.
- seerr also answers to homepage's `overseerr` (and `jellyseerr`).
- Twelve more languages for every widget, the dashboard's set: Catalan, Hebrew, Croatian,
  Hungarian, Italian, Norwegian Bokmål, Portuguese, Russian, Swedish, Vietnamese and Chinese
  (simplified and traditional), within the label length rules.
- The first widgets with a `client.js` (their own look in the browser); tests render them in jsdom.

## [0.2.1] - 2026-10-24

### Added
- A `README.md` per widget with the setup in the service, every field and an example. It is the
  widget's page on the [documentation site](https://stefanrenne.github.io/homelab-dashboard/widgets/collection/).

### Changed
- The dashboard installs this collection by default (`#latest`); list it in `settings.yaml` only
  to pin a release or use `only:`. No widget code changed, so the widget versions stay the same.

## [0.2.0] - 2026-10-24

### Added
- Twelve widgets with homepage's field names: radarr, sonarr, bazarr, prowlarr, sabnzbd, seerr,
  stash, tautulli, tdarr, whatsupdocker, portainer and unraid.
- Queues that lead with problems and stop at `queueLimit` with "+N more"; counts that need
  attention marked; labels that fit a phone in five languages; decimal units and one time format.
- Validated against live services (all but tdarr and whatsupdocker).
