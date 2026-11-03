# Flood

The torrents downloading and complete (seeding) in Flood, with the download and upload rates, as
homepage's flood widget. Fill in `username` and `password` when Flood's authentication is on.

Learn more about [Flood](https://github.com/jesec/flood).

## Fields

`leech`, `download`, `seed`, `upload`

## Example

```yaml
# services.yaml
- Downloads:
    - Flood:
        href: http://flood.lan:3000
        icon: flood
        widget:
          type: flood
          url: http://flood.lan:3000
          username: admin
          password: "{{DASHBOARD_VAR_FLOOD_PASSWORD}}"
```
