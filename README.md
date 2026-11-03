# dashboard widgets

Every widget of [dashboard](https://github.com/stefanrenne/dashboard): the ones for the usual homelab
services, with the same fields as the matching [homepage](https://gethomepage.dev) widgets, the
header widgets (`datetime`, `search`, `resources`, ...) and the ones behind the dashboard's own
service fields (`siteMonitor:` uses `http-status`, `ping:` `ping`, `container:` `docker`, `app:`
`kubernetes-pods`, `proxmoxNode:` `proxmoxvm`). They live outside the dashboard on purpose: this
repository is an ordinary widget collection, installed like any third-party one.

Every widget has its own page with setup, fields and options on the
[documentation site](https://getdashboard.dev/widgets/collection/)
(and as `widgets/<id>/README.md` here).

| Widget | Shows | Options |
|---|---|---|
| `adguard` | queries, blocked, filtered, processing time | `url`, `username`, `password` |
| `apcups` | status, load, battery charge, runtime left (apcupsd) | `url` (`tcp://host:3551`) |
| `arcane` | containers running, stopped, total, image updates; images via `fields` | `url`, `key`, `env` |
| `argocd` | applications by sync and health status | `url`, `key` |
| `atsumeru` | series, archives, chapters, categories | `url`, `username`, `password` |
| `audiobookshelf` | podcasts, books and their length | `url`, `key` |
| `authentik` | users, logins, failed logins, authorizations (24 hours) | `url`, `key`, `version` |
| `autobrr` | approved and rejected pushes, filters, indexers | `url`, `key` |
| `azuredevops` | last pipeline run; open, your and approved pull requests | `organization`, `project`, `key`, `definitionId`, `branchName`, `repositoryId`, `userEmail` |
| `backrest` | latest backups succeeded and failed, failures and data of 30 days | `url`, `username`, `password` |
| `bazarr` | missing episodes, missing movies | `url`, `key` |
| `beszel` | systems up; one system's status, CPU, memory, disk, network with `systemId` | `url`, `username`, `password`, `systemId`, `version` |
| `booklore` | libraries, books, reading, finished | `url`, `username`, `password` |
| `bookorbit` | books, authors, reading, finished; series, storage via `fields` | `url`, `username`, `password` |
| `button` | a button that opens a link or runs a script or shell command on the server (card or header) | `text`, `href`, `script`, `command`, `timeout`, `inheritEnv`, `user` |
| `caddy` | upstreams, requests, failed requests | `url` (admin API) |
| `calendar` | a month or an agenda with Sonarr, Radarr, Lidarr, Readarr and iCal events | `view`, `firstDayInWeek`, `maxEvents`, `showTime`, `previousDays`, `timezone`, `integrations` |
| `calibreweb` | books, authors, categories, series | `url`, `username`, `password` |
| `changedetectionio` | unseen changes, watches | `url`, `key` |
| `channelsdvrserver` | shows, recordings, scheduled, passes | `url` |
| `checkmk` | services and hosts with problems | `url`, `site`, `username`, `password` |
| `cloudflared` | tunnel status, origin IP | `accountid`, `tunnelid`, `key` |
| `coinmarketcap` | a row per cryptocurrency with price and change | `key`, `symbols` or `slugs`, `currency`, `defaultinterval` |
| `crowdsec` | alerts (24 hours), active bans | `url`, `username`, `password` |
| `custom-api` | fields from any JSON API, as homepage's customapi | `url`, `method`, `headers`, `body`, `display`, `mappings` |
| `datetime` | the current date and time (header) | `locale`, `dateStyle`, `timeStyle` |
| `deluge` | leech, download rate, seed, upload rate; downloads per row with `enableLeechProgress` | `url`, `password`, `enableLeechProgress`, `queueLimit` (5) |
| `develancacheui` | data from the LAN cache and from the internet | `url` |
| `diskstation` | uptime, volume free, CPU, memory (Synology) | `url`, `username`, `password`, `volume`, `insecure` |
| `dispatcharr` | channels, active streams; streams per row with `enableActiveStreams` | `url`, `username`, `password` |
| `docker` | state, CPU and memory of one container; behind a service's `container:` | `container`, `socket` or `url`, `swarm`, `tlsCa`, `tlsCert`, `tlsKey` |
| `dockhand` | containers, CPU, memory; more via `fields` | `url`, `environment`, `username`/`password` or `key` |
| `downloadstation` | leech, download rate, seed, upload rate (Synology) | `url`, `username`, `password` |
| `duplicati` | backup jobs, last and next run, warnings and errors | `url`, `password` |
| `emby` | a row per stream; movies, series, episodes, songs with `enableBlocks` | `url`, `key`, `enableNowPlaying`, `enableBlocks`, `enableUser`, `showEpisodeNumber` |
| `esphome` | devices online, offline, not online, total | `url`, `username`, `password` |
| `evcc` | solar, grid, home and charging power | `url` |
| `feed` | the latest items of an RSS or Atom feed, as a list or a grid | `url`, `maxItems`, `layout`, `images` |
| `filebrowser` | free, used and total disk space | `url`, `username`, `password`, `authHeader` |
| `fileflows` | files waiting, processing, processed and failed | `url`, `version`, `key` |
| `firefly` | net worth and this month's budget | `url`, `key` |
| `flood` | torrents downloading and seeding, with rates | `url`, `username`, `password` |
| `freshrss` | unread articles and subscriptions | `url`, `username`, `password` |
| `frigate` | cameras, uptime, version; recent events with `enableRecentEvents` | `url`, `username`, `password`, `enableRecentEvents`, `insecure` |
| `fritzbox` | connection, uptime, line speed and traffic | `url`, `insecure` |
| `gamedig` | status, map, players and ping of a game server (Valve's server query) | `url`, `serverType`, `timeout` |
| `gatus` | endpoints up and down, uptime | `url` |
| `ghostfolio` | portfolio performance today, over a year and in total, net worth | `url`, `key` |
| `gitea` | notifications, issues, pull requests, repositories (also Forgejo) | `url`, `key` |
| `gitlab` | groups, issues, merge requests and projects of a user | `url`, `key`, `user_id` |
| `glances` | cpu, memory, CPU temperature, uptime, disks | `url`, `username`, `password`, `version`, `cputemp`, `uptime`, `disk`, `expanded` |
| `gluetun` | the VPN's public IP, region, country and forwarded port | `url`, `key`, `version` |
| `gotify` | applications, clients and messages | `url`, `key` |
| `grafana` | dashboards, data sources, alert rules, alerts firing | `url`, `username`, `password`, `version`, `alerts` |
| `greeting` | a line of text (header) | `text`, `text_size` |
| `hdhomerun` | channels, tuners in use, a tuner's channel and signal | `url`, `tuner` |
| `headscale` | a node's name, address, last seen and online state | `url`, `nodeId`, `key` |
| `healthchecks` | checks up and down, or one check's state and last ping | `url`, `key`, `uuid` |
| `homeassistant` | people home, lights on, switches on; or up to four states and templates (`custom`) | `url`, `key`, `custom` |
| `homebox` | items, locations, labels and the inventory's value | `url`, `username`, `password` |
| `homebridge` | status, updates and child bridges | `url`, `username`, `password` |
| `http-status` | status code and response time of a URL; behind a service's `siteMonitor:` | `url`, `method` |
| `iframe` | another page in a frame on the card | `src`, `height`, `allowPolicy`, `refreshInterval`, ... |
| `immich` | users, photos, videos, storage | `url`, `key`, `version` (1 or 2) |
| `jackett` | configured, errored indexers | `url`, `key`, `password` |
| `jdownloader` | packages, size, remaining and download rate (My.JDownloader) | `username`, `password`, `client` |
| `jellyfin` | a row per stream; movies, series, episodes, songs, albums with `enableBlocks` | `url`, `key`, `enableNowPlaying`, `enableBlocks`, `enableUser`, `showEpisodeNumber` |
| `jellystat` | songs, movies, episodes and other items played | `url`, `key`, `days` |
| `karakeep` | bookmarks, favorites, archived items, highlights, lists and tags | `url`, `key` |
| `kavita` | series and files | `url`, `username`, `password`, `key` |
| `komga` | libraries, series and books | `url`, `username`, `password`, `key`, `version` |
| `komodo` | containers, stacks, or a summary with servers | `url`, `key`, `secret`, `showStacks`, `showSummary` |
| `kopia` | a source's state, size, last and next snapshot | `url`, `username`, `password`, `snapshotHost`, `snapshotPath` |
| `kubernetes` | CPU and memory of a Kubernetes cluster, in total and per node | `cluster`, `nodes`, `url`, `token`, ... |
| `kubernetes-pods` | state, CPU and memory of an app's pods; behind a service's `app:` | `namespace`, `app`, `podSelector`, `url`, `token`, ... |
| `lidarr` | wanted, queued, artists | `url`, `key` |
| `linkwarden` | links, collections and tags | `url`, `key` |
| `logo` | the dashboard's mark or an icon (header) | `icon` |
| `longhorn` | storage used, in total and per node | `url`, `username`, `password` (or `provider: longhorn`), `include`, `expanded` |
| `lubelogger` | vehicles, service records and reminders, or one vehicle | `url`, `username`, `password`, `vehicleID` |
| `mailcow` | domains, mailboxes, messages and storage | `url`, `key` |
| `maintainerr` | what was cleaned up and the space to reclaim | `url` |
| `mastodon` | users, posts and known domains of an instance | `url` |
| `mealie` | recipes, users, categories and tags | `url`, `key`, `version` |
| `medusa` | episodes wanted and snatched, active shows | `url`, `key` |
| `mikrotik` | uptime, CPU, memory and DHCP leases of a router | `url`, `username`, `password`, `insecure` |
| `minecraft` | status, players and version of a Java server | `url`, `timeout` |
| `miniflux` | unread and read entries | `url`, `key` |
| `mjpeg` | a camera's MJPEG stream | `stream`, `fit`, `height` |
| `moonraker` | a Klipper printer's state, layers and progress | `url`, `key` |
| `mylar` | comic series, issues and wanted issues | `url`, `key` |
| `myspeed` | download, upload and ping of the latest speed test | `url`, `password` |
| `navidrome` | a row per listener | `url`, `user`, `token`, `salt` |
| `netalertx` | devices, connected, new devices and down alerts | `url`, `key`, `version` |
| `netbird` | peers online, users and expired logins | `url`, `key` |
| `netdata` | warning and critical alarms | `url` |
| `nextcloud` | free space, active users, files, shares (also cpuload, memoryusage via `fields`) | `url`, `key` or `username`/`password` |
| `nextdns` | queries resolved, blocked, allowed and relayed | `profile`, `key` |
| `npm` | proxy hosts enabled, disabled, total (Nginx Proxy Manager) | `url`, `username`, `password` |
| `ntfy` | the latest notification of a topic | `url`, `topic`, `key`, `username`, `password` |
| `nzbget` | rate, remaining, downloaded | `url`, `username`, `password` |
| `octoprint` | printer state, temperatures and job progress | `url`, `key` |
| `omada` | access points, clients, alerts, gateways and switches of a site | `url`, `username`, `password`, `site` |
| `ombi` | pending, approved, available | `url`, `key` |
| `opendtu` | today's yield, power and limit of solar inverters | `url`, `username`, `password` |
| `openmediavault` | services, S.M.A.R.T. or downloads, per `method` | `url`, `username`, `password`, `method` |
| `openmeteo` | the current weather, no account needed (a header widget) | `latitude`, `longitude` (else the viewer's location), `label`, `units`, `timezone`, `cache` |
| `openweathermap` | the current weather (a header widget) | `apiKey` (or `provider: openweathermap`), `latitude`, `longitude`, `label`, `units`, `cache` |
| `openwrt` | a router's uptime and load, or an interface's state and traffic | `url`, `username`, `password`, `interfaceName` |
| `opnsense` | CPU, memory and WAN traffic of a firewall | `url`, `username`, `password`, `wan` |
| `pangolin` | sites, resources, targets and traffic of an organization | `url`, `key`, `org` |
| `paperlessngx` | inbox, total documents | `url`, `key` or `username`/`password` |
| `peanut` | a UPS's charge, load and state (Network UPS Tools) | `url`, `key`, `username`, `password` |
| `pfsense` | load, memory, temperature, disk and the WAN of a firewall | `url`, `wan`, `version`, `username`, `password`, `headers` |
| `photoprism` | albums, photos, videos and people | `url`, `username`, `password`, `key` |
| `pihole` | queries, blocked (also as a share), blocklist size | `url`, `version` (5 or 6), `key` |
| `ping` | round-trip time to a host; behind a service's `ping:` | `host` |
| `plantit` | diary events, plants, photos and species | `url`, `key` |
| `plex` | streams, albums, movies, TV shows | `url`, `key` |
| `portainer` | running, stopped, total | `url`, `key`, `env` |
| `prometheus` | scrape targets up, down and in total | `url`, `username`, `password` |
| `prometheusmetric` | up to four PromQL results with your own labels | `url`, `metrics`, `username`, `password` |
| `prowlarr` | grabs, queries, failed grabs, failed queries | `url`, `key` |
| `proxmox` | VMs and containers running, CPU and memory of the cluster or a node | `url`, `username` (token id), `password` (secret), `node`, `insecure` |
| `proxmoxbackupserver` | datastore usage, failed tasks (24 hours), CPU, memory | `url`, `username` (token id), `password` (secret), `datastore`, `insecure` |
| `proxmoxvm` | state, CPU and memory of one Proxmox VM or LXC container; behind `proxmoxNode:` | `url`, `token`, `secret`, `node`, `vmid`, `type` |
| `pterodactyl` | nodes and game servers | `url`, `key` |
| `pulse` | Proxmox nodes, VMs and containers running | `url`, `key`, `version` |
| `pyload` | download rate, active and queued downloads | `url`, `username`, `password`, `key` |
| `qbittorrent` | leech, download rate, seed, upload rate; downloads per row with `enableLeechProgress` | `url`, `username`, `password` or `key`, `enableLeechProgress`, `enableLeechSize`, `queueLimit` (5) |
| `qnap` | CPU, memory, temperature and storage use of a NAS | `url`, `username`, `password`, `volume` |
| `qui` | torrents and rates across qBittorrent instances | `url`, `key`, `instance` |
| `radarr` | wanted, missing, queued, movies; the queue with `enableQueue: true` | `url`, `key`, `queueLimit` (5) |
| `readarr` | wanted, queued, books | `url`, `key` |
| `resources` | CPU, memory, disk, CPU temperature, uptime and network of the dashboard's machine (header) | `cpu`, `memory`, `disk`, `cputemp`, `uptime`, `network`, ... |
| `romm` | platforms, games, saves and states | `url`, `username`, `password` |
| `rutorrent` | active torrents, upload and download rates | `url`, `username`, `password` |
| `sabnzbd` | rate, queue, time left | `url`, `key` |
| `scrutiny` | disks passed, failed, unknown | `url` |
| `search` | filters the services as you type, or searches the web (header) | `provider`, `url`, `target`, `showSearchSuggestions` |
| `seerr` | pending, approved, completed (Overseerr, Jellyseerr, Seerr) | `url`, `key` |
| `shelly` | firmware version, an available update (marked) and a button that starts it | `url`, `password`, `beta` |
| `slskd` | Soulseek connection, transfers and shared files | `url`, `key` |
| `sonarr` | wanted, queued, series; the queue with `enableQueue: true` | `url`, `key`, `queueLimit` (5) |
| `sparkyfitness` | calories eaten, burned and remaining, steps | `url`, `key` |
| `speedtest` | download, upload, ping (Speedtest Tracker) | `url`, `version` (1 or 2), `key`, `bitratePrecision` |
| `spoolman` | filament left on up to four spools | `url`, `spoolIds` |
| `sportarr` | events wanted and queued, leagues | `url`, `key` |
| `stash` | scenes, performers, tags (also images, galleries, studios via `fields`) | `url`, `key` |
| `stocks` | price and day change of up to eight symbols, from Finnhub (a header widget) | `watchlist`, `apiKey` (or `provider: finnhub`), `color`, `cache` |
| `strelaysrv` | sessions, connections, data relayed and rate of a Syncthing relay | `url` |
| `suwayomi` | manga chapters downloaded and read | `url`, `username`, `password`, `category` |
| `swagdashboard` | proxied and protected hosts, outdated configs, banned IPs | `url` |
| `syncthing` | devices connected, synced, errors, storage | `url`, `key` |
| `tailscale` | address, last seen, key expiry of a device; more via `fields` | `deviceid`, `key` |
| `tandoor` | users, recipes and keywords | `url`, `key` |
| `tautulli` | current streams with progress | `url`, `key`, `enableUser`, `showEpisodeNumber` |
| `tdarr` | queue, processed, errored, saved | `url`, `key` (optional) |
| `technitium` | DNS queries by outcome, clients | `url`, `key`, `node`, `range` |
| `tracearr` | streams playing across media servers, or a summary | `url`, `key`, `view`, `enableUser`, `showEpisodeNumber` |
| `traefik` | routers, services, middlewares (marked with errors or warnings) | `url`, `username`, `password` |
| `transmission` | leech, download rate, seed, upload rate | `url`, `username`, `password`, `rpcUrl` |
| `trilium` | version, notes and database size | `url`, `key` |
| `truenas` | load, uptime, alerts; pools per row with `enablePools` | `url`, `key` or `username`/`password`, `version` (1 or 2), `enablePools`, `insecure` |
| `tubearchivist` | downloads waiting, videos, channels and playlists | `url`, `key` |
| `unifi` | uptime, WAN, LAN and WLAN users and devices (also as `unifi_console`) | `url`, `key` or `username`/`password`, `site`, `insecure` |
| `unifi-drive` | space and pool state of a UniFi NAS | `url`, `username`, `password` |
| `unmanic` | busy and total workers, pending tasks | `url` |
| `unraid` | memory %, cpu, array %, pool1 %; more via `fields` (homepage field names) | `url`, `key`, `pool1`–`pool4` |
| `uptimekuma` | up, down, uptime, incident of a status page | `url`, `slug` |
| `uptimerobot` | monitors up and down, or one monitor's state | `key` |
| `urbackup` | clients fine, failed and not recent, space used | `url`, `username`, `password`, `maxDays` |
| `vikunja` | projects, tasks due, overdue and in progress | `url`, `key`, `version`, `enableTaskList` |
| `wallos` | subscriptions, the next renewal and monthly costs | `url`, `key` |
| `watchtower` | containers scanned, updated, failed | `url`, `key` |
| `wgeasy` | WireGuard clients connected, enabled and in total | `url`, `version`, `username`, `password`, `threshold` |
| `whatsupdocker` | monitoring, updates | `url`, `username`, `password` |
| `xteve` | streams, active ones and those in the EPG | `url`, `username`, `password` |
| `yourspotify` | songs, listening time and artists | `url`, `key`, `interval` |
| `zabbix` | problems by severity | `url`, `key` |

Pick blocks with the dashboard's `fields`, e.g. `fields: [cpu, memoryPercent, pool1UsedPercent]`.

What the widgets have in common:
- **Queues lead with problems.** Blocked or failed imports come first, marked, followed by the
  rest up to `queueLimit` and "+N more". Rows name the movie or episode, not the release.
- **Counts that need you are marked**: failed grabs, errored files, pending requests, updates,
  unread Unraid alerts, a stopped array, a paused SABnzbd.
- **One unit system and one time format**: decimal (kB, MB, GB, TB) and `m:ss` / `h:mm:ss`.
- **Labels fit a phone**: short whole words in every language, at most two lines.

## Install

The dashboard always installs this collection at its newest release; there is
nothing to add. List it in `settings.yaml` only to pin a release or take some of the widgets;
that entry replaces the default:

```yaml
# settings.yaml of the dashboard
plugins:
  - source: git+https://github.com/stefanrenne/dashboard-widgets#latest   # or a tag: #v0.2.0
    only: [radarr, sonarr]        # optional: just these (plus the five behind the service fields)
  # while developing (wins over the installed collection):
  - path: ~/git/dashboard-widgets
```

```yaml
# services.yaml
- Media:
    - Radarr:
        href: https://radarr.lan
        icon: radarr
        widget:
          type: radarr
          url: http://radarr:7878
          key: "{{HOMEPAGE_VAR_RADARR_KEY}}"
          enableQueue: true
```

Containers with homepage labels (`homepage.widget.type: radarr`, ...) work as they are.

## Development

Every release on GitHub lists the widgets that are new or updated, with what changed, and has a
zip of the whole collection for installing without git.

```bash
npm ci && npm test        # every widget against its fixture.json, through a mock server
npm run mock              # the mock on http://127.0.0.1:4100/<widget>/... for trying things by hand
```

The fixtures (`widgets/<id>/fixture.json`) are API answers in the shape the real services give. All widgets
except tdarr and whatsupdocker were checked against live services (Radarr, Sonarr, Bazarr,
Prowlarr, SABnzbd, Seerr, Tautulli, Portainer CE, Unraid 7, Stash) on 2026-10-24.

## License

[MIT](LICENSE)
