# Sonarr

Wanted and queued episodes and the number of series. The API key is under **Settings › General › Security** in Sonarr.

With `enableQueue: true` the card also lists the download queue: blocked or failed imports
first, marked, then the rest up to `queueLimit` and "+N more".

Learn more about [Sonarr](https://sonarr.tv).

## Fields

`wanted`, `queued`, `series`

## Example

```yaml
# services.yaml
- Media:
    - Sonarr:
        href: https://sonarr.lan
        icon: sonarr
        widget:
          type: sonarr
          url: http://sonarr:8989
          key: "{{DASHBOARD_VAR_SONARR_KEY}}"
          enableQueue: true
          queueLimit: 3
```
