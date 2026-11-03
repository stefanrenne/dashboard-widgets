# Deluge

Torrents that are still downloading (leech) and complete (seed), with the total download and
upload rate, as homepage's deluge widget. With `enableLeechProgress: true` the downloads follow
one per row with their progress and time left, errored ones first and marked, up to
`queueLimit` and "+N more".

`password` is the Web UI password (**Preferences > Interface > Password**). The Web UI must be
connected to a daemon (**Connection Manager**).

Learn more about [Deluge](https://deluge-torrent.org/).

## Fields

`leech`, `download`, `seed`, `upload`

## Example

```yaml
# services.yaml
- Downloads:
    - Deluge:
        href: http://deluge.lan:8112
        icon: deluge
        widget:
          type: deluge
          url: http://deluge.lan:8112
          password: "{{DASHBOARD_VAR_DELUGE_PASSWORD}}"
          enableLeechProgress: true
```
