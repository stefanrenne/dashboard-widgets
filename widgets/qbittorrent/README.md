# qBittorrent

Torrents that are still downloading (leech) and complete (seed), with the total download and
upload rate, as homepage's qbittorrent widget. With `enableLeechProgress: true` the downloads
follow one per row with their progress and time left (with `enableLeechSize: true` also their
size), errored and stalled ones first and marked, up to `queueLimit` and "+N more".

Give the Web UI's `username` and `password` (**Tools > Options > WebUI > Authentication**), or
with qBittorrent 5.2 or later an API `key` from the same page. Leave them out when the Web UI
skips authentication for the dashboard's address.

Learn more about [qBittorrent](https://www.qbittorrent.org/).

## Fields

`leech`, `download`, `seed`, `upload`

## Example

```yaml
# services.yaml
- Downloads:
    - qBittorrent:
        href: http://qbittorrent.lan:8080
        icon: qbittorrent
        widget:
          type: qbittorrent
          url: http://qbittorrent.lan:8080
          username: admin
          password: "{{DASHBOARD_VAR_QBITTORRENT_PASSWORD}}"
          enableLeechProgress: true
```
