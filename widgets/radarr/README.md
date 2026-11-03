# Radarr

Wanted, missing, queued and downloaded movies. The API key is under **Settings › General › Security** in Radarr.

With `enableQueue: true` the card also lists the download queue: blocked or failed imports
first, marked, then the rest up to `queueLimit` and "+N more".

Learn more about [Radarr](https://radarr.video).

## Fields

`wanted`, `missing`, `queued`, `movies`

## Example

```yaml
# services.yaml
- Media:
    - Radarr:
        href: https://radarr.lan
        icon: radarr
        widget:
          type: radarr
          url: http://radarr:7878
          key: "{{DASHBOARD_VAR_RADARR_KEY}}"
          enableQueue: true
```
