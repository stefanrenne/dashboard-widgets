# ruTorrent

The started torrents and the upload and download rates in ruTorrent, as homepage's rutorrent
widget. It needs ruTorrent's `httprpc` plugin, which is on by default. Fill in `username` and
`password` when ruTorrent sits behind basic authentication.

Learn more about [ruTorrent](https://github.com/Novik/ruTorrent).

## Fields

`active`, `upload`, `download`

## Example

```yaml
# services.yaml
- Downloads:
    - ruTorrent:
        href: http://rutorrent.lan
        icon: rutorrent
        widget:
          type: rutorrent
          url: http://rutorrent.lan
          username: anna
          password: "{{DASHBOARD_VAR_RUTORRENT_PASSWORD}}"
```
